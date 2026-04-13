import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAllData, getCycleEntries, getSymptomEntries, importAllData } from '../db/db.js'
import { generateKey } from '../crypto/crypto.js'
import { useTour } from '../context/TourContext.jsx'

const SESSION_KEY_STORAGE = 'aletheia-derived-key'
const ONBOARDING_STORAGE_KEY = 'aletheia-onboarding-complete'
const REPLAY_TOUR_EVENT = 'aletheia:replay-tour'

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function SettingsSection({ title, description, children }) {
  return (
    <div className="card" style={{ display: 'grid', gap: '16px' }}>
      <div>
        <h2 style={{ marginBottom: description ? '4px' : 0 }}>{title}</h2>
        {description && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function SecurityPillar({ title, body, icon }) {
  return (
    <div className="security-pillar">
      <div className="security-pillar__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="security-pillar__content">
        <h3 className="security-pillar__title">{title}</h3>
        <p className="security-pillar__body">{body}</p>
      </div>
    </div>
  )
}

function SettingsPage() {
  const { activeTourTarget, isTourOpen } = useTour()
  const [passphrase, setPassphrase] = useState('')
  const [isEncryptionActive, setIsEncryptionActive] = useState(
    Boolean(sessionStorage.getItem(SESSION_KEY_STORAGE)),
  )
  const [statusMessage, setStatusMessage] = useState('')

  function handleReplayWelcomeTour() {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))
  }

  async function handleActivateEncryption(event) {
    event.preventDefault()
    if (!passphrase.trim()) return
    const key = await generateKey(passphrase)
    const exportedKey = await crypto.subtle.exportKey('jwk', key)
    sessionStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(exportedKey))
    setIsEncryptionActive(true)
    setStatusMessage('Session encryption activated.')
  }

  function handleDeactivateEncryption() {
    sessionStorage.removeItem(SESSION_KEY_STORAGE)
    setIsEncryptionActive(false)
    setPassphrase('')
    setStatusMessage('Session encryption deactivated.')
  }

  async function handleExportData() {
    const [symptomEntries, cycleEntries] = await Promise.all([
      getSymptomEntries(),
      getCycleEntries(),
    ])
    downloadJsonFile({ symptomEntries, cycleEntries }, 'aletheia-data-export.json')
  }

  async function handleClearData() {
    const confirmed = window.confirm(
      'This will permanently clear all stored data. This action cannot be undone.',
    )
    if (!confirmed) return
    await clearAllData()
    setStatusMessage('All data cleared.')
  }

  async function handleImportData(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText)
      const symptomEntries = Array.isArray(parsed?.symptomEntries) ? parsed.symptomEntries : null
      const cycleEntries = Array.isArray(parsed?.cycleEntries) ? parsed.cycleEntries : null

      if (!symptomEntries || !cycleEntries) {
        throw new Error('Invalid data format')
      }

      const result = await importAllData(parsed)
      setStatusMessage(`Import complete: ${result.symptomCount} symptom entries and ${result.cycleCount} cycle entries restored.`)
    } catch {
      setStatusMessage('Import failed. Please choose a valid Aletheia export JSON file.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'grid', gap: '14px' }}>
      <div style={{ paddingBottom: '4px' }}>
        <h1 style={{ marginBottom: '6px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Manage your data and privacy.
        </p>
      </div>

      <section className="security-brief">
        <div className="security-brief__hero">
          <div className="security-brief__badge">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l7 4v5c0 4.6-2.7 7.9-7 9-4.3-1.1-7-4.4-7-9V7l7-4z" />
              <path d="M9.5 12.5l1.8 1.8 3.7-4.1" />
            </svg>
            Security and privacy
          </div>
          <h2 className="security-brief__title">Your health notes stay in your browser, under your control.</h2>
          <p className="security-brief__copy">
            Aletheia is designed as a local-first app. Symptom logs, cycle entries, and exports are handled on your device instead of being uploaded to a remote account or shared server.
          </p>
        </div>

        <div className="security-brief__grid">
          <SecurityPillar
            title="Local-only storage"
            body="Entries are stored in this browser on this device. There is no default cloud sync, no account login, and no background transfer of your records to an Aletheia server."
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M5 7h14" />
                <path d="M5 17h14" />
                <path d="M3 12h18" />
              </svg>
            )}
          />
          <SecurityPillar
            title="Session encryption tools"
            body="When you activate encryption, the app derives an AES-GCM key from your passphrase in the browser using PBKDF2 with SHA-256. That session key stays local to the current browser session and is not sent anywhere."
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V8a5 5 0 0110 0v3" />
              </svg>
            )}
          />
          <SecurityPillar
            title="Access stays with this device"
            body="Because data is local-first, remote third parties cannot open your entries through an online dashboard. In practice, access is limited to people who can use this browser profile, this device, or any exported files you choose to save."
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 10-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          />
          <SecurityPillar
            title="Export stays intentional"
            body="Reports and JSON exports are created only when you request them. Nothing is shared automatically, so you decide whether a file stays private, is backed up, or is shown to a clinician."
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            )}
          />
          <SecurityPillar
            title="Open source and inspectable"
            body="Aletheia is open source, which means its privacy and security approach can be reviewed in the code instead of hidden behind closed infrastructure or vague promises."
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 18l6-6-6-6" />
                <path d="M8 6l-6 6 6 6" />
                <path d="M14 4l-4 16" />
              </svg>
            )}
          />
        </div>

        <div className="security-brief__note">
          <strong>What this means for you:</strong> Aletheia keeps your information off a central server, and its privacy model is visible in the open-source codebase, but your protection still depends on the security of your own device, browser profile, and any files you export.
        </div>
      </section>

      {/* Encryption */}
      <SettingsSection
        title="Session encryption"
        description="Protect your data with a passphrase for this browser session."
        
      >
        <form
          onSubmit={handleActivateEncryption}
          style={{ display: 'grid', gap: '12px' }}
          data-tour-target="settings-encryption"
          className={isTourOpen && activeTourTarget === 'settings-encryption' ? 'tour-highlight' : ''}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }} htmlFor="passphrase">
              Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              placeholder="Enter a passphrase…"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Activate encryption
          </button>
          {isEncryptionActive && (
            <button type="button" className="btn-secondary" onClick={handleDeactivateEncryption}>
              Deactivate encryption
            </button>
          )}
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: isEncryptionActive ? 'var(--color-success-bg)' : 'var(--color-accent)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${isEncryptionActive ? 'rgba(61,122,92,0.25)' : 'var(--color-border)'}`,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isEncryptionActive ? 'var(--color-success)' : 'var(--color-text-muted)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isEncryptionActive ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}>
            {isEncryptionActive ? 'Encryption active' : 'Encryption inactive'}
          </span>
        </div>
      </SettingsSection>

      {/* Export */}
      <SettingsSection
        title="Export data"
        description="Download all your entries as a JSON file."
      >
        <button type="button" className="btn-secondary" style={{ width: '100%', minHeight: 52 }} onClick={handleExportData}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export JSON
        </button>
      </SettingsSection>

      {/* Import */}
      <SettingsSection
        title="Import data"
        description="Restore entries from a previously exported JSON file. This replaces current data."
      >
        <label
          className="btn-secondary"
          style={{ width: '100%', minHeight: 52, justifyContent: 'center', cursor: 'pointer' }}
          htmlFor="import-json"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import JSON
          <input
            id="import-json"
            type="file"
            accept="application/json,.json"
            onChange={handleImportData}
            style={{ display: 'none' }}
          />
        </label>
      </SettingsSection>

      {/* Doctor guide link */}
      <SettingsSection
        title="Doctor guide"
        description="Questions to help you prepare for medical appointments."
      >
        <Link
          to="/faq"
          className="btn-secondary"
          style={{ width: '100%', minHeight: 52, textDecoration: 'none', justifyContent: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          View doctor guide
        </Link>
      </SettingsSection>

      {/* Welcome tour */}
      <SettingsSection
        title="Welcome tour"
        description="Replay the onboarding walkthrough."
      >
        <button type="button" className="btn-secondary" onClick={handleReplayWelcomeTour}>
          Replay welcome tour
        </button>
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection
        title="Danger zone"
        description="These actions are permanent and cannot be undone."
      >
        <button type="button" className="btn-danger" onClick={handleClearData}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Clear all data
        </button>
      </SettingsSection>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="card"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  )
}

export default SettingsPage
