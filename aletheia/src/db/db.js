const DATABASE_NAME = 'aletheia-db'
const DATABASE_VERSION = 1
const SYMPTOM_STORE = 'symptom_entries'
const CYCLE_STORE = 'cycle_entries'
const DATE_TIME_INDEX = 'dateTime'

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

function saveEntry(storeName, entry) {
  const nextEntry = {
    ...entry,
    id: crypto.randomUUID(),
  }

  return runTransaction(storeName, 'readwrite', (transaction, resolve, reject) => {
    const request = transaction.objectStore(storeName).add(nextEntry)

    request.addEventListener('success', () => {
      resolve(nextEntry)
    })

    request.addEventListener('error', () => {
      reject(request.error)
    })
  })
}

function getEntries(storeName) {
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
  return runTransaction([SYMPTOM_STORE, CYCLE_STORE], 'readwrite', (transaction, resolve, reject) => {
    const symptomRequest = transaction.objectStore(SYMPTOM_STORE).clear()
    const cycleRequest = transaction.objectStore(CYCLE_STORE).clear()

    let completedRequests = 0

    function handleSuccess() {
      completedRequests += 1

      if (completedRequests === 2) {
        resolve()
      }
    }

    symptomRequest.addEventListener('success', handleSuccess)
    cycleRequest.addEventListener('success', handleSuccess)

    symptomRequest.addEventListener('error', () => {
      reject(symptomRequest.error)
    })

    cycleRequest.addEventListener('error', () => {
      reject(cycleRequest.error)
    })
  })
}

export async function importAllData(data) {
  const symptomEntries = Array.isArray(data?.symptomEntries) ? data.symptomEntries : []
  const cycleEntries = Array.isArray(data?.cycleEntries) ? data.cycleEntries : []

  return runTransaction([SYMPTOM_STORE, CYCLE_STORE], 'readwrite', (transaction, resolve, reject) => {
    const symptomStore = transaction.objectStore(SYMPTOM_STORE)
    const cycleStore = transaction.objectStore(CYCLE_STORE)

    let pending = 2 + symptomEntries.length + cycleEntries.length

    function handleDone() {
      pending -= 1
      if (pending === 0) {
        resolve({
          symptomCount: symptomEntries.length,
          cycleCount: cycleEntries.length,
        })
      }
    }

    function handleError(error) {
      reject(error)
    }

    const clearSymptomsRequest = symptomStore.clear()
    clearSymptomsRequest.addEventListener('success', handleDone)
    clearSymptomsRequest.addEventListener('error', () => handleError(clearSymptomsRequest.error))

    const clearCyclesRequest = cycleStore.clear()
    clearCyclesRequest.addEventListener('success', handleDone)
    clearCyclesRequest.addEventListener('error', () => handleError(clearCyclesRequest.error))

    symptomEntries.forEach((entry) => {
      const request = symptomStore.add({
        ...entry,
        id: entry?.id || crypto.randomUUID(),
      })
      request.addEventListener('success', handleDone)
      request.addEventListener('error', () => handleError(request.error))
    })

    cycleEntries.forEach((entry) => {
      const request = cycleStore.add({
        ...entry,
        id: entry?.id || crypto.randomUUID(),
      })
      request.addEventListener('success', handleDone)
      request.addEventListener('error', () => handleError(request.error))
    })
  })
}
