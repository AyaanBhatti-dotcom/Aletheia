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
import { getEntryPainScale, getSymptomPainLevels } from '../patterns/engine.js'

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

function normalizeSymptomPainLevels(levels) {
  if (!levels || typeof levels !== 'object') {
    return {}
  }

  return Object.entries(levels).reduce((nextLevels, [symptom, value]) => {
    const numericValue = Math.min(Math.max(Number(value) || 1, 1), 10)
    nextLevels[symptom] = numericValue
    return nextLevels
  }, {})
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function PainLevelField({ symptom, value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>{symptom}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {PAIN_LABELS[value]}
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={sliderBackground(value, 1, 10)}
        aria-label={`${symptom} pain level: ${value} out of 10, ${PAIN_LABELS[value]}`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        <span>1 · Minimal</span>
        <span>10 · Unbearable</span>
      </div>
    </div>
  )
}

function InlinePainEditor({ symptom, value, onChange, onConfirm, onRemove }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '10px',
        padding: '14px 16px 16px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-raised)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <PainLevelField symptom={symptom} value={value} onChange={onChange} />
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={onRemove} style={{ minWidth: '110px' }}>
          Remove
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm} style={{ width: 'auto', minWidth: '110px', minHeight: '48px', padding: '12px 20px' }}>
          OK
        </button>
      </div>
    </div>
  )
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

function SymptomChoiceRow({ label, selected, score, isEditing, onToggle, onChangeScore, onConfirm, onRemove }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '10px',
        padding: '12px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${isEditing ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
        background: isEditing ? 'color-mix(in srgb, var(--color-surface) 84%, var(--color-accent) 16%)' : 'var(--color-surface)',
        transition: 'border-color var(--ease), background var(--ease), box-shadow var(--ease)',
        boxShadow: isEditing ? '0 6px 22px rgba(63, 42, 86, 0.12)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          width: '100%',
          padding: 0,
          background: 'transparent',
          color: 'inherit',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'grid', gap: '2px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {selected ? `${score}/10 · tap to adjust` : 'Tap to add and rate'}
          </span>
        </span>
        <span
          style={{
            flexShrink: 0,
            minWidth: '76px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-pill)',
            background: selected ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            color: selected ? '#fff' : 'var(--color-text-muted)',
            border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {selected ? `${score}/10` : 'Add'}
        </span>
      </button>
      {isEditing && selected && (
        <InlinePainEditor
          symptom={label}
          value={score}
          onChange={onChangeScore}
          onConfirm={onConfirm}
          onRemove={onRemove}
        />
      )}
    </div>
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
  const [painTypes, setPainTypes] = useState([])
  const [bodyAreas, setBodyAreas] = useState([])
  const [userSymptoms, setUserSymptoms] = useState([])
  const [selectedUserSymptoms, setSelectedUserSymptoms] = useState([])
  const [symptomPainLevels, setSymptomPainLevels] = useState({})
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
  const [activeSymptomEditor, setActiveSymptomEditor] = useState(null)
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
      setPainTypes(Array.isArray(entryToEdit?.painTypes) ? entryToEdit.painTypes : [])
      setBodyAreas(Array.isArray(entryToEdit?.bodyAreas) ? entryToEdit.bodyAreas : [])
      setSelectedUserSymptoms(Array.isArray(entryToEdit?.userSymptoms) ? entryToEdit.userSymptoms : [])
      setSymptomPainLevels(normalizeSymptomPainLevels(getSymptomPainLevels(entryToEdit)))
      setNotes(entryToEdit?.notes || '')
      setPhoto(entryToEdit?.photo || null)
      setPhotoMessage('')
      setIsLocked(false)
      setLoadError('')
      setWarnings(consumeJournalWarnings())
      setActiveSymptomEditor(null)
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
        setLoadError(getErrorMessage(error, 'Something went wrong loading your data. Please try again.'))
        setLoadedSource(sourceKey)
      })
    return () => { isMounted = false }
  }, [editEntryId, isDemoMode, sourceKey])

  function toggleValue(value, setValues) {
    setValues((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    )
  }

  function setSymptomPainLevel(symptom, value) {
    setSymptomPainLevels((current) => ({
      ...current,
      [symptom]: value,
    }))
  }

  function removeSymptomSelection(symptom, currentValues, setValues) {
    setValues(currentValues.filter((value) => value !== symptom))
    setSymptomPainLevels((current) => {
      const nextLevels = { ...current }
      delete nextLevels[symptom]
      return nextLevels
    })
    setActiveSymptomEditor((current) => (current === symptom ? null : current))
  }

  function handleSymptomSelection(symptom, currentValues, setValues) {
    const isSelected = currentValues.includes(symptom)

    if (isSelected) {
      setActiveSymptomEditor(symptom)
      return
    }

    setValues([...currentValues, symptom])
    setSymptomPainLevels((current) => ({
      ...current,
      [symptom]: current[symptom] || overallPainScale || 1,
    }))
    setActiveSymptomEditor(symptom)
  }

  function handleJournalLockState() {
    setIsLocked(true)
    setLoadError('')
    setWarnings([])
  }

  async function handleAddUserSymptom(event) {
    event.preventDefault()
    const trimmed = newSymptom.trim()
    if (!trimmed || userSymptoms.includes(trimmed)) return
    const next = [...userSymptoms, trimmed]

    try {
      await saveUserSymptoms(next)
      setUserSymptoms(next)
      setNewSymptom('')
    } catch (error) {
      if (error instanceof JournalLockedError) {
        handleJournalLockState()
        return
      }

      setLoadError(getErrorMessage(error, 'Something went wrong saving your custom symptom. Please try again.'))
    }
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
    const painScale = getEntryPainScale({
      bodyAreas,
      userSymptoms: selectedUserSymptoms,
      symptomPainLevels,
    })

    try {
      const savedEntry = await saveSymptomEntry({
        id: entryId,
        dateTime,
        painScale,
        painTypes,
        bodyAreas,
        userSymptoms: selectedUserSymptoms,
        symptomPainLevels: normalizeSymptomPainLevels(symptomPainLevels),
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
    } catch (error) {
      if (error instanceof JournalLockedError) {
        handleJournalLockState()
        return
      }

      setLoadError(getErrorMessage(error, 'Something went wrong saving your entry. Please try again.'))
    }
  }

  const overallPainScale = getEntryPainScale({
    bodyAreas,
    userSymptoms: selectedUserSymptoms,
    symptomPainLevels,
  }) ?? 0
  const selectedSymptoms = [...bodyAreas, ...selectedUserSymptoms].sort((left, right) =>
    left.localeCompare(right),
  )

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

        {/* Symptom pain */}
        <div className="card" style={{ display: 'grid', gap: '14px' }}>
          <div className="field-label">Symptom pain levels</div>
          {selectedSymptoms.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {selectedSymptoms.map((symptom) => (
                <div
                  key={symptom}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{symptom}</span>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {symptomPainLevels[symptom] || 1}/10
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
              No symptoms selected yet.
            </p>
          )}
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
              <div style={{ display: 'grid', gap: '10px' }} role="group" aria-label={group.title}>
                {group.options.map((option) => (
                  <SymptomChoiceRow
                    key={option}
                    label={option}
                    selected={bodyAreas.includes(option)}
                    score={symptomPainLevels[option] || overallPainScale || 1}
                    isEditing={activeSymptomEditor === option}
                    onToggle={() => handleSymptomSelection(option, bodyAreas, setBodyAreas)}
                    onChangeScore={(value) => setSymptomPainLevel(option, value)}
                    onConfirm={() => setActiveSymptomEditor(null)}
                    onRemove={() => removeSymptomSelection(option, bodyAreas, setBodyAreas)}
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
            <div style={{ display: 'grid', gap: '10px' }} role="group" aria-label="Your custom symptoms">
              {userSymptoms.map((symptom) => (
                <SymptomChoiceRow
                  key={symptom}
                  label={symptom}
                  selected={selectedUserSymptoms.includes(symptom)}
                  score={symptomPainLevels[symptom] || overallPainScale || 1}
                  isEditing={activeSymptomEditor === symptom}
                  onToggle={() => handleSymptomSelection(symptom, selectedUserSymptoms, setSelectedUserSymptoms)}
                  onChangeScore={(value) => setSymptomPainLevel(symptom, value)}
                  onConfirm={() => setActiveSymptomEditor(null)}
                  onRemove={() => removeSymptomSelection(symptom, selectedUserSymptoms, setSelectedUserSymptoms)}
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
