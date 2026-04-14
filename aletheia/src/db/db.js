import {
  JournalLockedError,
  clearRememberedSessionKey,
  createSalt,
  decryptData,
  encryptData,
  generateKey,
  hasRememberedSessionKey,
  rememberSessionKey,
  requireSessionKey,
} from '../crypto/crypto.js'

const DATABASE_NAME = 'aletheia-db'
const DATABASE_VERSION = 2
const SYMPTOM_STORE = 'symptom_entries'
const CYCLE_STORE = 'cycle_entries'
const META_STORE = 'app_meta'
const PROTECTION_META_KEY = 'journal-protection'
const DATE_TIME_INDEX = 'dateTime'
const PROTECTION_CHECK_TEXT = 'aletheia-journal-check'
const SAFE_IMAGE_DATA_URL_PATTERN = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.addEventListener('upgradeneeded', () => {
      const database = request.result

      if (!database.objectStoreNames.contains(SYMPTOM_STORE)) {
        const symptomStore = database.createObjectStore(SYMPTOM_STORE, {
          keyPath: 'id',
        })
        symptomStore.createIndex(DATE_TIME_INDEX, DATE_TIME_INDEX)
      }

      if (!database.objectStoreNames.contains(CYCLE_STORE)) {
        const cycleStore = database.createObjectStore(CYCLE_STORE, {
          keyPath: 'id',
        })
        cycleStore.createIndex(DATE_TIME_INDEX, DATE_TIME_INDEX)
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, {
          keyPath: 'key',
        })
      }
    })

    request.addEventListener('success', () => {
      resolve(request.result)
    })

    request.addEventListener('error', () => {
      reject(request.error)
    })
  })
}

function runTransaction(storeNames, mode, callback) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeNames, mode)

        transaction.addEventListener('complete', () => {
          database.close()
        })

        transaction.addEventListener('error', () => {
          reject(transaction.error)
          database.close()
        })

        transaction.addEventListener('abort', () => {
          reject(transaction.error)
          database.close()
        })

        callback(transaction, resolve, reject)
      }),
  )
}

function getStoreItems(storeName) {
  return runTransaction(storeName, 'readonly', (transaction, resolve, reject) => {
    const request = transaction.objectStore(storeName).getAll()

    request.addEventListener('success', () => {
      resolve(request.result)
    })

    request.addEventListener('error', () => {
      reject(request.error)
    })
  })
}

function getMetaRecord(key) {
  return runTransaction(META_STORE, 'readonly', (transaction, resolve, reject) => {
    const request = transaction.objectStore(META_STORE).get(key)

    request.addEventListener('success', () => {
      resolve(request.result || null)
    })

    request.addEventListener('error', () => {
      reject(request.error)
    })
  })
}

function ensureProtectionConfig(record) {
  return {
    enabled: Boolean(record?.value?.enabled),
    salt: record?.value?.salt || '',
    unlockCheck: record?.value?.unlockCheck || null,
  }
}

function isProtectedRecord(entry) {
  return Boolean(entry?.protectedPayload)
}

function sanitizePhotoValue(photo) {
  if (typeof photo !== 'string') {
    return null
  }

  const trimmedPhoto = photo.trim()

  if (!SAFE_IMAGE_DATA_URL_PATTERN.test(trimmedPhoto)) {
    return null
  }

  return trimmedPhoto
}

function sanitizeEntryBeforeSave(entry) {
  if (!entry || typeof entry !== 'object') {
    return entry
  }

  if (!Object.prototype.hasOwnProperty.call(entry, 'photo')) {
    return entry
  }

  return {
    ...entry,
    photo: sanitizePhotoValue(entry.photo),
  }
}

async function protectEntry(entry, key) {
  const nextEntry = {
    ...sanitizeEntryBeforeSave(entry),
    id: entry?.id || crypto.randomUUID(),
  }
  const sealed = await encryptData(key, JSON.stringify(nextEntry))

  return {
    id: nextEntry.id,
    protectedPayload: sealed.payload,
    lockMarker: true,
    savedAt: nextEntry.dateTime || nextEntry.date || null,
    version: 1,
  }
}

async function unprotectEntry(entry, key) {
  if (!isProtectedRecord(entry)) {
    return sanitizeEntryBeforeSave(entry)
  }

  const plaintext = await decryptData(key, entry.protectedPayload)
  return sanitizeEntryBeforeSave(JSON.parse(plaintext))
}

async function getProtectionConfig() {
  return ensureProtectionConfig(await getMetaRecord(PROTECTION_META_KEY))
}

async function getUnprotectedStoreItems(storeName) {
  const items = await getStoreItems(storeName)
  return items.filter((item) => !isProtectedRecord(item))
}

async function getProtectedStoreItems(storeName) {
  const items = await getStoreItems(storeName)
  return items.filter((item) => isProtectedRecord(item))
}

async function rewriteStores({ symptomEntries, cycleEntries, protectionConfig }) {
  return runTransaction([SYMPTOM_STORE, CYCLE_STORE, META_STORE], 'readwrite', (transaction, resolve, reject) => {
    const symptomStore = transaction.objectStore(SYMPTOM_STORE)
    const cycleStore = transaction.objectStore(CYCLE_STORE)
    const metaStore = transaction.objectStore(META_STORE)
    const requests = [
      symptomStore.clear(),
      cycleStore.clear(),
      ...symptomEntries.map((entry) => symptomStore.add(entry)),
      ...cycleEntries.map((entry) => cycleStore.add(entry)),
      protectionConfig
        ? metaStore.put({
            key: PROTECTION_META_KEY,
            value: protectionConfig,
          })
        : metaStore.delete(PROTECTION_META_KEY),
    ]
    let pending = requests.length

    if (pending === 0) {
      resolve()
      return
    }

    requests.forEach((request) => {
      request.addEventListener('success', () => {
        pending -= 1

        if (pending === 0) {
          resolve()
        }
      })

      request.addEventListener('error', () => {
        reject(request.error)
      })
    })
  })
}

async function saveEntry(storeName, entry) {
  const protection = await getProtectionConfig()
  const nextEntry = {
    ...sanitizeEntryBeforeSave(entry),
    id: entry?.id || crypto.randomUUID(),
  }

  if (!protection.enabled) {
    return runTransaction(storeName, 'readwrite', (transaction, resolve, reject) => {
      const request = transaction.objectStore(storeName).put(nextEntry)

      request.addEventListener('success', () => {
        resolve(nextEntry)
      })

      request.addEventListener('error', () => {
        reject(request.error)
      })
    })
  }

  const protectedEntry = await protectEntry(nextEntry, requireSessionKey())

  return runTransaction(storeName, 'readwrite', (transaction, resolve, reject) => {
    const request = transaction.objectStore(storeName).put(protectedEntry)

    request.addEventListener('success', () => {
      resolve(nextEntry)
    })

    request.addEventListener('error', () => {
      reject(request.error)
    })
  })
}

async function getEntries(storeName) {
  const protection = await getProtectionConfig()
  const items = await getStoreItems(storeName)

  if (!protection.enabled) {
    return items
  }

  if (!hasRememberedSessionKey()) {
    throw new JournalLockedError()
  }

  const key = requireSessionKey()
  return Promise.all(items.map((entry) => unprotectEntry(entry, key)))
}

export async function getJournalStatus() {
  const protection = await getProtectionConfig()

  return {
    isLockEnabled: protection.enabled,
    isUnlocked: protection.enabled ? hasRememberedSessionKey() : false,
  }
}

export async function unlockJournal(passphrase) {
  const protection = await getProtectionConfig()

  if (!protection.enabled || !protection.salt || !protection.unlockCheck) {
    throw new Error('Lock is not set up yet.')
  }

  const key = await generateKey(passphrase, protection.salt)
  const checkText = await decryptData(key, protection.unlockCheck)

  if (checkText !== PROTECTION_CHECK_TEXT) {
    throw new Error('That passphrase did not open this journal.')
  }

  rememberSessionKey(key)
  return getJournalStatus()
}

export async function enableJournalLock(passphrase) {
  const protection = await getProtectionConfig()

  if (protection.enabled) {
    return unlockJournal(passphrase)
  }

  const salt = createSalt()
  const key = await generateKey(passphrase, salt)
  const unlockCheck = await encryptData(key, PROTECTION_CHECK_TEXT)
  const [symptomEntries, cycleEntries] = await Promise.all([
    getUnprotectedStoreItems(SYMPTOM_STORE),
    getUnprotectedStoreItems(CYCLE_STORE),
  ])
  const [protectedSymptoms, protectedCycles] = await Promise.all([
    Promise.all(symptomEntries.map((entry) => protectEntry(entry, key))),
    Promise.all(cycleEntries.map((entry) => protectEntry(entry, key))),
  ])

  await rewriteStores({
    symptomEntries: protectedSymptoms,
    cycleEntries: protectedCycles,
    protectionConfig: {
      enabled: true,
      salt,
      unlockCheck,
    },
  })

  rememberSessionKey(key)
  return getJournalStatus()
}

export async function disableJournalLock() {
  const protection = await getProtectionConfig()

  if (!protection.enabled) {
    clearRememberedSessionKey()
    return getJournalStatus()
  }

  const key = requireSessionKey()
  const [symptomEntries, cycleEntries] = await Promise.all([
    getProtectedStoreItems(SYMPTOM_STORE),
    getProtectedStoreItems(CYCLE_STORE),
  ])
  const [plainSymptoms, plainCycles] = await Promise.all([
    Promise.all(symptomEntries.map((entry) => unprotectEntry(entry, key))),
    Promise.all(cycleEntries.map((entry) => unprotectEntry(entry, key))),
  ])

  await rewriteStores({
    symptomEntries: plainSymptoms,
    cycleEntries: plainCycles,
    protectionConfig: null,
  })

  clearRememberedSessionKey()
  return getJournalStatus()
}

export function lockJournal() {
  clearRememberedSessionKey()
}

export async function saveSymptomEntry(entry) {
  return saveEntry(SYMPTOM_STORE, entry)
}

export async function getSymptomEntries() {
  return getEntries(SYMPTOM_STORE)
}

export async function saveCycleEntry(entry) {
  return saveEntry(CYCLE_STORE, entry)
}

export async function getCycleEntries() {
  return getEntries(CYCLE_STORE)
}

export async function clearAllData() {
  clearRememberedSessionKey()

  return runTransaction([SYMPTOM_STORE, CYCLE_STORE, META_STORE], 'readwrite', (transaction, resolve, reject) => {
    const requests = [
      transaction.objectStore(SYMPTOM_STORE).clear(),
      transaction.objectStore(CYCLE_STORE).clear(),
      transaction.objectStore(META_STORE).delete(PROTECTION_META_KEY),
    ]
    let pending = requests.length

    requests.forEach((request) => {
      request.addEventListener('success', () => {
        pending -= 1

        if (pending === 0) {
          resolve()
        }
      })

      request.addEventListener('error', () => {
        reject(request.error)
      })
    })
  })
}

export async function exportReadableData() {
  const [symptomEntries, cycleEntries] = await Promise.all([
    getSymptomEntries(),
    getCycleEntries(),
  ])

  return {
    format: 'aletheia-readable-export',
    version: 2,
    symptomEntries,
    cycleEntries,
  }
}

export async function exportProtectedData() {
  const protection = await getProtectionConfig()

  if (!protection.enabled) {
    throw new Error('Turn on the journal lock before making a protected export.')
  }

  const [symptomEntries, cycleEntries] = await Promise.all([
    getStoreItems(SYMPTOM_STORE),
    getStoreItems(CYCLE_STORE),
  ])

  return {
    format: 'aletheia-protected-export',
    version: 2,
    protection: {
      salt: protection.salt,
      unlockCheck: protection.unlockCheck,
    },
    symptomEntries,
    cycleEntries,
  }
}

export async function importReadableData(data) {
  const symptomEntries = Array.isArray(data?.symptomEntries) ? data.symptomEntries : null
  const cycleEntries = Array.isArray(data?.cycleEntries) ? data.cycleEntries : null

  if (!symptomEntries || !cycleEntries) {
    throw new Error('Please choose a readable Aletheia export.')
  }

  const protection = await getProtectionConfig()

  if (!protection.enabled) {
    await rewriteStores({
      symptomEntries: symptomEntries.map((entry) => ({
        ...sanitizeEntryBeforeSave(entry),
        id: entry?.id || crypto.randomUUID(),
      })),
      cycleEntries: cycleEntries.map((entry) => ({
        ...sanitizeEntryBeforeSave(entry),
        id: entry?.id || crypto.randomUUID(),
      })),
      protectionConfig: null,
    })
  } else {
    const key = requireSessionKey()
    const [protectedSymptoms, protectedCycles] = await Promise.all([
      Promise.all(
        symptomEntries.map((entry) =>
          protectEntry(
            {
              ...sanitizeEntryBeforeSave(entry),
              id: entry?.id || crypto.randomUUID(),
            },
            key,
          ),
        ),
      ),
      Promise.all(
        cycleEntries.map((entry) =>
          protectEntry(
            {
              ...sanitizeEntryBeforeSave(entry),
              id: entry?.id || crypto.randomUUID(),
            },
            key,
          ),
        ),
      ),
    ])

    await rewriteStores({
      symptomEntries: protectedSymptoms,
      cycleEntries: protectedCycles,
      protectionConfig: protection,
    })
  }

  return {
    symptomCount: symptomEntries.length,
    cycleCount: cycleEntries.length,
  }
}

export async function importProtectedData(data) {
  const symptomEntries = Array.isArray(data?.symptomEntries) ? data.symptomEntries : null
  const cycleEntries = Array.isArray(data?.cycleEntries) ? data.cycleEntries : null
  const salt = data?.protection?.salt
  const unlockCheck = data?.protection?.unlockCheck

  if (!symptomEntries || !cycleEntries || !salt || !unlockCheck) {
    throw new Error('Please choose a protected Aletheia export.')
  }

  await rewriteStores({
    symptomEntries: symptomEntries.map((entry) => ({
      ...sanitizeEntryBeforeSave(entry),
      id: entry?.id || crypto.randomUUID(),
    })),
    cycleEntries: cycleEntries.map((entry) => ({
      ...sanitizeEntryBeforeSave(entry),
      id: entry?.id || crypto.randomUUID(),
    })),
    protectionConfig: {
      enabled: true,
      salt,
      unlockCheck,
    },
  })

  clearRememberedSessionKey()

  return {
    symptomCount: symptomEntries.length,
    cycleCount: cycleEntries.length,
  }
}
