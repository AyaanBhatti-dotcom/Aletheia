import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import {
  clearAllData,
  consumeJournalWarnings,
  disableJournalLock,
  enableJournalLock,
  exportProtectedData,
  exportReadableData,
  getJournalStatus,
  importProtectedData,
  importReadableData,
  lockJournal,
  unlockJournal,
} from '../db/db.js'
import { useTour } from '../context/TourContext.jsx'

const ONBOARDING_STORAGE_KEY = 'aletheia-onboarding-complete'
const REPLAY_TOUR_EVENT = 'aletheia:replay-tour'
const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_IMPORT_RECORDS = 5000

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
  const [showReadableExportConfirm, setShowReadableExportConfirm] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [journalStatus, setJournalStatus] = useState({
    isLockEnabled: false,
    isUnlocked: false,
  })
  const [statusMessage, setStatusMessage] = useState('')
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    let isMounted = true

    getJournalStatus().then((status) => {
      if (isMounted) {
        setJournalStatus(status)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  function handleReplayWelcomeTour() {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))
  }

  async function refreshJournalStatus() {
    const status = await getJournalStatus()
    setJournalStatus(status)
    return status
  }

  function applyJournalWarnings(fallbackMessage) {
    const nextWarnings = consumeJournalWarnings()

    if (nextWarnings.length > 0) {
      setWarnings(nextWarnings)
      setStatusMessage(fallbackMessage)
      return true
    }

    setWarnings([])
    return false
  }

  async function handleTurnOnLock(event) {
    event.preventDefault()

    if (!passphrase.trim()) {
      setStatusMessage('Choose a passphrase to turn on the journal lock.')
      return
    }

    await enableJournalLock(passphrase)
    setPassphrase('')
    setWarnings([])
    await refreshJournalStatus()
    setStatusMessage('Journal lock is on, and your entries are open for this session.')
  }

  async function handleOpenJournal(event) {
    event.preventDefault()

    if (!passphrase.trim()) {
      setStatusMessage('Enter your passphrase to open this journal.')
      return
    }

    try {
      await unlockJournal(passphrase)
      setPassphrase('')
      setWarnings([])
      await refreshJournalStatus()
      setStatusMessage('Journal opened for this session.')
    } catch {
      setPassphrase('')
      setStatusMessage('That passphrase did not open this journal. Try again or use a different backup.')
    }
  }

  async function handleLockJournalNow() {
    lockJournal()
    setWarnings([])
    await refreshJournalStatus()
    setPassphrase('')
    setStatusMessage('Journal locked.')
  }

  async function handleTurnOffLock() {
    if (!journalStatus.isUnlocked) {
      setStatusMessage('Open your journal first, then you can turn off the lock.')
      return
    }

    try {
      await disableJournalLock()
      await refreshJournalStatus()
      setPassphrase('')
      if (!applyJournalWarnings('Journal lock turned off on this device.')) {
        setStatusMessage('Journal lock turned off on this device.')
      }
    } catch {
      await refreshJournalStatus()
      setStatusMessage('One or more records could not be read, so the journal lock was not removed.')
    }
  }

  async function handleProtectedExport() {
    try {
      const data = await exportProtectedData()
      downloadJsonFile(data, 'aletheia-protected-export.json')
      setWarnings([])
      setStatusMessage('Protected export saved.')
    } catch {
      setStatusMessage('Turn on the journal lock before making a protected export.')
    }
  }

  async function handleReadableExportConfirmed() {
    setShowReadableExportConfirm(false)
    try {
      const data = await exportReadableData()
      downloadJsonFile(data, 'aletheia-readable-export.json')
      if (!applyJournalWarnings('Readable export saved.')) {
        setStatusMessage('Readable export saved.')
      }
    } catch {
      setStatusMessage('Open your journal first to make a readable export.')
    }
  }

  async function handleClearData() {
    if (clearConfirmText.trim().toLowerCase() !== 'delete my data') return
    await clearAllData()
    setClearConfirmText('')
    setWarnings([])
    setStatusMessage('All data cleared.')
  }

  async function handleImportData(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type && file.type !== 'application/json') {
      setWarnings([])
      setStatusMessage('Please choose a JSON file.')
      event.target.value = ''
      return
    }

    try {
      if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
        throw new Error('too-large-file')
      }

      const rawText = await file.text()

      if (rawText.length > MAX_IMPORT_FILE_SIZE_BYTES) {
        throw new Error('too-large-file')
      }

      const parsed = JSON.parse(rawText)
      const symptomCount = Array.isArray(parsed?.symptomEntries) ? parsed.symptomEntries.length : 0
      const cycleCount = Array.isArray(parsed?.cycleEntries) ? parsed.cycleEntries.length : 0

      if (symptomCount + cycleCount > MAX_IMPORT_RECORDS) {
        throw new Error('too-many-records')
      }

      if (parsed?.format === 'aletheia-protected-export') {
        const result = await importProtectedData(parsed)
        await refreshJournalStatus()
        setPassphrase('')
        setWarnings([])
        setStatusMessage(`Protected journal restored with ${result.symptomCount} symptom entries and ${result.cycleCount} cycle entries. Enter your passphrase to open it.`)
        return
      }

      const result = await importReadableData(parsed)
      await refreshJournalStatus()
      if (!applyJournalWarnings(`Import complete: ${result.symptomCount} symptom entries and ${result.cycleCount} cycle entries restored.`)) {
        setStatusMessage(`Import complete: ${result.symptomCount} symptom entries and ${result.cycleCount} cycle entries restored.`)
      }
    } catch (error) {
      if (error instanceof JournalLockedError) {
        setWarnings([])
        setStatusMessage('Open your journal first before restoring a protected backup.')
      } else if (error instanceof Error && error.message === 'Journal metadata appears inconsistent. Please lock and unlock your journal before importing.') {
        setWarnings([])
        setStatusMessage('Journal metadata appears inconsistent. Please lock and unlock your journal before importing.')
      } else
      if (error instanceof Error && (error.message === 'too-large-file' || error.message === 'too-many-records')) {
        setWarnings([])
        setStatusMessage('This file is too large to import safely.')
      } else {
        setWarnings([])
        setStatusMessage('Import did not go through. Choose a readable or protected Aletheia backup, and if needed open your journal first.')
      }
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page-shell" style={{ maxWidth: '600px', display: 'grid', gap: '14px' }}>
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
            title="Journal lock"
            body="When your journal lock is on, entries are stored in a protected form and open only after you enter your passphrase for the current session."
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

      {/* Journal lock */}
      <SettingsSection
        title="Journal lock"
        description="Use a passphrase to keep your entries protected on this device."
      >
        <form
          onSubmit={journalStatus.isLockEnabled ? handleOpenJournal : handleTurnOnLock}
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
              placeholder={journalStatus.isLockEnabled ? 'Enter your passphrase…' : 'Create a passphrase…'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            {journalStatus.isLockEnabled ? 'Open journal' : 'Turn on journal lock'}
          </button>
          {journalStatus.isLockEnabled && journalStatus.isUnlocked && (
            <button type="button" className="btn-secondary" onClick={handleLockJournalNow}>
              Lock journal now
            </button>
          )}
          {journalStatus.isLockEnabled && (
            <button type="button" className="btn-secondary" onClick={handleTurnOffLock}>
              Turn off journal lock
            </button>
          )}
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: journalStatus.isLockEnabled ? 'var(--color-success-bg)' : 'var(--color-accent)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${journalStatus.isLockEnabled ? 'rgba(61,122,92,0.25)' : 'var(--color-border)'}`,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: journalStatus.isLockEnabled ? 'var(--color-success)' : 'var(--color-text-muted)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: journalStatus.isLockEnabled ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}>
            {journalStatus.isLockEnabled
              ? journalStatus.isUnlocked
                ? 'Journal open for this session'
                : 'Journal lock is on'
              : 'Journal lock is off'}
          </span>
        </div>
      </SettingsSection>

      {/* Export */}
      <SettingsSection
        title="Export data"
        description="Choose a backup you can keep protected, or one you can read anywhere."
      >
        <button type="button" className="btn-secondary" style={{ width: '100%', minHeight: 52 }} onClick={handleProtectedExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Protected export
        </button>
        <button type="button" className="btn-secondary" style={{ width: '100%', minHeight: 52 }} onClick={() => setShowReadableExportConfirm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Readable export
        </button>
        {showReadableExportConfirm && (
          <div className="card" style={{ display: 'grid', gap: '12px', border: '1px solid var(--color-warning, #c8892a)', background: 'var(--color-warning-bg, #fdf6e3)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>
              This export will be fully decrypted plaintext. Anyone with the file can read all your entries without a passphrase.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={handleReadableExportConfirmed}>
                Yes, export plaintext
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowReadableExportConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Import */}
      <SettingsSection
        title="Import data"
        description="Restore a protected backup or a readable backup. This replaces current data."
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
        <div style={{ display: 'grid', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }} htmlFor="clear-confirm">
            Type <strong>delete my data</strong> to confirm
          </label>
          <input
            id="clear-confirm"
            type="text"
            placeholder="delete my data"
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
          />
          <button
            type="button"
            className="btn-danger"
            onClick={handleClearData}
            disabled={clearConfirmText.trim().toLowerCase() !== 'delete my data'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
            Clear all data
          </button>
        </div>
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

      <WarningNotice warnings={warnings} />
    </div>
  )
}

export default SettingsPage
