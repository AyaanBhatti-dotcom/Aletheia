const ITERATIONS = 200000
const KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16
const SALT_STORAGE_KEY = 'aletheia-pbkdf2-salt'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

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

function getStoredSalt() {
  const storedSalt = localStorage.getItem(SALT_STORAGE_KEY)

  return storedSalt ? base64ToBytes(storedSalt) : null
}

function getSaltBytes(salt) {
  if (salt instanceof Uint8Array) {
    localStorage.setItem(SALT_STORAGE_KEY, bytesToBase64(salt))
    return salt
  }

  if (typeof salt === 'string' && salt.length > 0) {
    const saltBytes = textEncoder.encode(salt)
    localStorage.setItem(SALT_STORAGE_KEY, bytesToBase64(saltBytes))
    return saltBytes
  }

  const storedSalt = getStoredSalt()

  if (storedSalt) {
    return storedSalt
  }

  const generatedSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  localStorage.setItem(SALT_STORAGE_KEY, bytesToBase64(generatedSalt))
  return generatedSalt
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
    true,
    ['encrypt', 'decrypt'],
  )
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

  return bytesToBase64(payload)
}

export async function decryptData(key, ciphertext) {
  const payload = base64ToBytes(ciphertext)
  const iv = payload.slice(0, IV_LENGTH)
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
