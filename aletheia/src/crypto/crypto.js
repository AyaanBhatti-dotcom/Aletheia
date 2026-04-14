const ITERATIONS = 200000
const KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
let sessionKey = null
let autoLockTimer = null
const AUTO_LOCK_MS = 15 * 60 * 1000
export const JOURNAL_LOCKED_EVENT = 'aletheia:journal-locked'

export class JournalLockedError extends Error {
  constructor(message = 'Journal is locked.') {
    super(message)
    this.name = 'JournalLockedError'
  }
}

function bytesToBase64(bytes) {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function getSaltBytes(salt) {
  if (salt instanceof Uint8Array) {
    return salt
  }

  if (typeof salt === 'string' && salt.length > 0) {
    return base64ToBytes(salt)
  }

  throw new Error('A valid salt is required.')
}

export function createSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)))
}

export async function generateKey(passphrase, salt) {
  const passphraseBytes = textEncoder.encode(passphrase)
  const saltBytes = getSaltBytes(salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: ITERATIONS,
      salt: saltBytes,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function resetAutoLockTimer() {
  if (!sessionKey) return
  clearTimeout(autoLockTimer)
  autoLockTimer = setTimeout(() => {
    sessionKey = null
    window.dispatchEvent(new Event(JOURNAL_LOCKED_EVENT))
  }, AUTO_LOCK_MS)
}

export function rememberSessionKey(key) {
  sessionKey = key
  resetAutoLockTimer()
}

export function clearRememberedSessionKey() {
  clearTimeout(autoLockTimer)
  autoLockTimer = null
  sessionKey = null
  window.dispatchEvent(new Event(JOURNAL_LOCKED_EVENT))
}

export function hasRememberedSessionKey() {
  return Boolean(sessionKey)
}

export function requireSessionKey() {
  if (!sessionKey) {
    throw new JournalLockedError()
  }

  return sessionKey
}

export async function encryptData(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const plaintextBytes = textEncoder.encode(plaintext)
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintextBytes,
  )
  const ciphertextBytes = new Uint8Array(ciphertextBuffer)
  const payload = new Uint8Array(iv.length + ciphertextBytes.length)

  payload.set(iv, 0)
  payload.set(ciphertextBytes, iv.length)

  return {
    iv: bytesToBase64(iv),
    payload: bytesToBase64(payload),
  }
}

export async function decryptData(key, encryptedValue) {
  const payload = typeof encryptedValue === 'string'
    ? base64ToBytes(encryptedValue)
    : base64ToBytes(encryptedValue.payload)
  const iv = typeof encryptedValue === 'string'
    ? payload.slice(0, IV_LENGTH)
    : base64ToBytes(encryptedValue.iv)
  const encryptedBytes = payload.slice(IV_LENGTH)
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedBytes,
  )

  return textDecoder.decode(plaintextBuffer)
}
