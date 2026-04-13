import { useState } from 'react'
import { clearAllData, getCycleEntries, getSymptomEntries } from '../db/db.js'
import { generateKey } from '../crypto/crypto.js'

const SESSION_KEY_STORAGE = 'aletheia-derived-key'

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function SettingsPage() {
  const [passphrase, setPassphrase] = useState('')
  const [isEncryptionActive, setIsEncryptionActive] = useState(
    Boolean(sessionStorage.getItem(SESSION_KEY_STORAGE)),
  )

  async function handleActivateEncryption(event) {
    event.preventDefault()

    const key = await generateKey(passphrase)
    const exportedKey = await crypto.subtle.exportKey('jwk', key)

    sessionStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(exportedKey))
    setIsEncryptionActive(true)
  }

  async function handleExportData() {
    const [symptomEntries, cycleEntries] = await Promise.all([
      getSymptomEntries(),
      getCycleEntries(),
    ])

    downloadJsonFile(
      {
        symptomEntries,
        cycleEntries,
      },
      'aletheia-data-export.json',
    )
  }

  async function handleClearData() {
    const confirmed = window.confirm(
      'This will permanently clear all stored data. This action cannot be undone.',
    )

    if (!confirmed) {
      return
    }

    await clearAllData()
  }

  return (
    <div style={{ width: '100%', maxWidth: '840px', display: 'grid', gap: '20px' }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Settings</h1>
      </div>

      <section className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>Encryption</h2>
        <form onSubmit={handleActivateEncryption} style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '8px' }}>
            <span>Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </label>
          <div>
            <button type="submit">Activate encryption</button>
          </div>
        </form>
        <p style={{ margin: 0 }}>
          Status: {isEncryptionActive ? 'Encryption active' : 'Encryption inactive'}
        </p>
      </section>

      <section className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>Export data</h2>
        <div>
          <button type="button" onClick={handleExportData}>
            Export JSON
          </button>
        </div>
      </section>

      <section className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>Clear data</h2>
        <div>
          <button type="button" onClick={handleClearData}>
            Clear all data
          </button>
        </div>
      </section>

      <section className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>Privacy notice</h2>
        <p style={{ margin: 0 }}>
          All data is stored locally in this browser. No data is transmitted to any server.
          Photos are stored as encrypted blobs.
        </p>
      </section>
    </div>
  )
}

export default SettingsPage
