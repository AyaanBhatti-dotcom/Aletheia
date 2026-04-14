import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { consumeJournalWarnings, getUserSymptoms, getSymptomEntries, saveSymptomEntry, saveUserSymptoms } from '../db/db.js'
import { useDemo } from '../context/DemoContext.jsx'
import { useTour } from '../context/TourContext.jsx'
import { symptomEntries as demoSymptomEntries } from '../demo/demoData.js'

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024

const PAIN_LABELS = ['', 'Minimal', 'Mild', 'Noticeable', 'Moderate', 'Uncomfortable', 'Distressing', 'Severe', 'Intense', 'Agonizing', 'Unbearable']

const painTypeOptions = ['sharp', 'dull', 'cramping', 'burning', 'stabbing', 'throbbing']

const bodyAreaGroups = [
  {
    title: 'Pain & Pelvic',
    options: ['pelvic pain', 'lower back', 'hip', 'leg / sciatic', 'shoulder'],
  },
  {
    title: 'Digestive & Bladder',
    options: ['bloating', 'nausea', 'constipation', 'diarrhea', 'bladder urgency', 'painful urination'],
  },
  {
    title: 'Systemic',
    options: ['fatigue', 'brain fog', 'headache', 'chest pain', 'shortness of breath', 'mood changes'],
  },
]

function formatNowForDateTimeInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - offset * 60000)
  return localDate.toISOString().slice(0, 16)
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

function sliderBackground(value, min, max) {
  const pct = ((value - min) / (max - min)) * 100
  return {
    background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-border) ${pct}%)`,
  }
}

function PillToggle({ label, active, onToggle }) {
  return (
    <button
      type="button"
      className={`pill${active ? ' pill--active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function SectionDivider({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  )
}

function SymptomLogPage() {
  const { isDemoMode } = useDemo()
  const { activeTourTarget, isTourOpen } = useTour()
  const [searchParams] = useSearchParams()
  const [entryId, setEntryId] = useState(null)
  const [dateTime, setDateTime] = useState(formatNowForDateTimeInput)
  const [painScale, setPainScale] = useState(1)
  const [painTypes, setPainTypes] = useState([])
  const [bodyAreas, setBodyAreas] = useState([])
  const [userSymptoms, setUserSymptoms] = useState([])
  const [selectedUserSymptoms, setSelectedUserSymptoms] = useState([])
  const [newSymptom, setNewSymptom] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoMessage, setPhotoMessage] = useState('')
  const [hasEntries, setHasEntries] = useState(false)
  const [, setSymptomEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const [savedKey, setSavedKey] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [warnings, setWarnings] = useState([])
  const sourceKey = isDemoMode ? 'demo' : 'db'
  const isEditingEntry = entryId !== null
  const editEntryId = searchParams.get('entryId')

  useEffect(() => {
    let isMounted = true
    const entriesPromise = isDemoMode ? Promise.resolve(demoSymptomEntries) : getSymptomEntries()
    const symptomsPromise = isDemoMode ? Promise.resolve([]) : getUserSymptoms()
    Promise.all([entriesPromise, symptomsPromise]).then(([entries, symptoms]) => {
      if (!isMounted) return
      const entryToEdit = editEntryId ? entries.find((entry) => entry.id === editEntryId) : null
      setSymptomEntries(entries)
      setHasEntries(entries.length > 0)
      setUserSymptoms(symptoms)
      setEntryId(entryToEdit?.id || null)
      setDateTime(entryToEdit?.dateTime || formatNowForDateTimeInput())
      setPainScale(entryToEdit?.painScale ?? 1)
      setPainTypes(Array.isArray(entryToEdit?.painTypes) ? entryToEdit.painTypes : [])
      setBodyAreas(Array.isArray(entryToEdit?.bodyAreas) ? entryToEdit.bodyAreas : [])
      setSelectedUserSymptoms(Array.isArray(entryToEdit?.userSymptoms) ? entryToEdit.userSymptoms : [])
      setNotes(entryToEdit?.notes || '')
      setPhoto(entryToEdit?.photo || null)
      setPhotoMessage('')
      setIsLocked(false)
      setLoadError('')
      setWarnings(consumeJournalWarnings())
      setLoadedSource(sourceKey)
    })
      .catch((error) => {
        if (!isMounted) return

        if (error instanceof JournalLockedError) {
          setIsLocked(true)
          setLoadError('')
          setWarnings([])
          setLoadedSource(sourceKey)
          return
        }

        setIsLocked(false)
        setWarnings([])
        setLoadError('Something went wrong loading your data. Please try again.')
        setLoadedSource(sourceKey)
      })
    return () => { isMounted = false }
  }, [editEntryId, isDemoMode, sourceKey])

  function toggleValue(value, setValues) {
    setValues((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    )
  }

  async function handleAddUserSymptom(event) {
    event.preventDefault()
    const trimmed = newSymptom.trim()
    if (!trimmed || userSymptoms.includes(trimmed)) return
    const next = [...userSymptoms, trimmed]
    await saveUserSymptoms(next)
    setUserSymptoms(next)
    setNewSymptom('')
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setPhoto(null)
      setPhotoMessage('')
      return
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhoto(null)
      setPhotoMessage('This image is too large to add safely. Choose one under 5 MB.')
      event.target.value = ''
      return
    }

    const base64 = await readFileAsBase64(file)
    setPhoto(base64)
    setPhotoMessage('Photo added.')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const savedEntry = await saveSymptomEntry({
      id: entryId,
      dateTime,
      painScale,
      painTypes,
      bodyAreas,
      userSymptoms: selectedUserSymptoms,
      notes,
      photo,
    })
    setEntryId(savedEntry.id)
    setSymptomEntries((currentEntries) => {
      const nextEntries = currentEntries.filter((entry) => entry.id !== savedEntry.id)
      nextEntries.push(savedEntry)
      return nextEntries
    })
    setHasEntries(true)
    setSavedKey(Date.now())
    setTimeout(() => setSavedKey(null), 2800)
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  if (isLocked) {
    return (
      <LockedState
        title="Your journal is locked"
        description="Unlock it in Settings before adding or reviewing symptom entries in this session."
      />
    )
  }

  if (loadError) {
    return <ErrorState description={loadError} />
  }

  return (
    <div className="page-shell" style={{ maxWidth: '600px' }}>
      <WarningNotice warnings={warnings} />
      {savedKey !== null && (
        <div className="toast" key={savedKey} role="status" aria-live="polite">
          <span className="toast__dot" aria-hidden="true">✓</span>
          {isEditingEntry ? 'Entry updated' : 'Entry saved'}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'grid', gap: '14px' }}
        data-tour-target="symptom-form"
        className={isTourOpen && activeTourTarget === 'symptom-form' ? 'tour-highlight' : ''}
      >

        {/* Header */}
        <div style={{ paddingBottom: '4px' }}>
          <h1 style={{ marginBottom: '6px' }}>Symptom log</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Track what you feel, when you feel it.
          </p>
        </div>

        <div className="card" style={{ display: 'grid', gap: '6px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isEditingEntry ? 'Editing saved entry' : 'New entry'}
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {isEditingEntry
              ? 'Saving now will update this log instead of creating another one.'
              : 'Saving will create a new symptom log for this date and time.'}
          </p>
        </div>

        {!hasEntries && (
          <div className="card">
            <EmptyState
              title="Your history starts here"
              description="Log your first entry to begin building a picture of pain patterns over time."
            />
          </div>
        )}

        {/* Date & time */}
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="log-datetime">Date & time</label>
          <input
            id="log-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </div>

        {/* Pain scale */}
        <div className="card" style={{ display: 'grid', gap: '14px' }}>
          <div className="field-label">Pain scale</div>
          <div className="pain-display">
            <span className="pain-display__number">{painScale}</span>
            <span className="pain-display__label">{PAIN_LABELS[painScale]}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={painScale}
            onChange={(e) => setPainScale(Number(e.target.value))}
            style={sliderBackground(painScale, 1, 10)}
            aria-label={`Pain scale: ${painScale} out of 10, ${PAIN_LABELS[painScale]}`}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            <span>1 · Minimal</span>
            <span>10 · Unbearable</span>
          </div>
        </div>

        {/* Pain type */}
        <div className="card" style={{ display: 'grid', gap: '12px' }}>
          <div className="field-label">Pain type</div>
          <div className="pill-group" role="group" aria-label="Pain type">
            {painTypeOptions.map((option) => (
              <PillToggle
                key={option}
                label={option}
                active={painTypes.includes(option)}
                onToggle={() => toggleValue(option, setPainTypes)}
              />
            ))}
          </div>
        </div>

        {/* Body areas */}
        <div className="card" style={{ display: 'grid', gap: '18px' }}>
          <div className="field-label">Body area</div>
          {bodyAreaGroups.map((group) => (
            <div key={group.title} style={{ display: 'grid', gap: '10px' }}>
              <SectionDivider title={group.title} />
              <div className="pill-group" role="group" aria-label={group.title}>
                {group.options.map((option) => (
                  <PillToggle
                    key={option}
                    label={option}
                    active={bodyAreas.includes(option)}
                    onToggle={() => toggleValue(option, setBodyAreas)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom symptoms */}
        <div className="card" style={{ display: 'grid', gap: '14px' }}>
          <div className="field-label">Custom symptoms</div>

          {userSymptoms.length > 0 && (
            <div className="pill-group" role="group" aria-label="Your custom symptoms">
              {userSymptoms.map((symptom) => (
                <PillToggle
                  key={symptom}
                  label={symptom}
                  active={selectedUserSymptoms.includes(symptom)}
                  onToggle={() => toggleValue(symptom, setSelectedUserSymptoms)}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="new-symptom" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Add your own
              </label>
              <input
                id="new-symptom"
                type="text"
                placeholder="e.g. jaw pain"
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddUserSymptom(e) }}
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddUserSymptom}
              style={{ flexShrink: 0, minWidth: 'auto', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}
              aria-label="Add custom symptom"
            >
              Add
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="log-notes">Notes</label>
          <textarea
            id="log-notes"
            placeholder="e.g. what triggered it, what helped, work/school impact, sleep"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="4"
          />
        </div>

        {/* Photo */}
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="log-photo">Photo</label>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Optional — attach an image for reference.
          </p>
          <input
            id="log-photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ padding: '10px 14px', fontSize: '14px' }}
          />
          {photoMessage && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {photoMessage}
            </p>
          )}
        </div>

        {/* Save */}
        <button type="submit" className="btn-primary" style={{ marginTop: '4px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {isEditingEntry ? 'Update entry' : 'Save entry'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          🔒 Saved locally on your device
        </p>
      </form>
    </div>
  )
}

export default SymptomLogPage
