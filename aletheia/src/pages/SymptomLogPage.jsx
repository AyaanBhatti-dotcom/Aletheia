import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import DOMPurify from 'dompurify'
import { getSymptomEntries, saveSymptomEntry } from '../db/db.js'
import { useDemo } from '../context/DemoContext.jsx'
import { symptomEntries as demoSymptomEntries } from '../demo/demoData.js'

const USER_SYMPTOMS_STORAGE_KEY = 'userSymptoms'

const painTypeOptions = [
  'sharp',
  'dull',
  'cramping',
  'burning',
  'stabbing',
  'throbbing',
]

const bodyAreaGroups = [
  {
    title: 'Pain/Pelvic',
    options: ['pelvic pain', 'lower back', 'hip', 'leg/sciatic', 'shoulder tip'],
  },
  {
    title: 'Digestive/Bladder',
    options: [
      'bloating',
      'nausea',
      'constipation',
      'diarrhea',
      'bladder urgency',
      'painful urination',
    ],
  },
  {
    title: 'Systemic',
    options: [
      'fatigue',
      'brain fog',
      'headache',
      'chest pain',
      'shortness of breath',
      'mood changes',
    ],
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

    reader.addEventListener('load', () => {
      resolve(reader.result)
    })

    reader.addEventListener('error', () => {
      reject(reader.error)
    })

    reader.readAsDataURL(file)
  })
}

function getStoredUserSymptoms() {
  const storedSymptoms = localStorage.getItem(USER_SYMPTOMS_STORAGE_KEY)

  return storedSymptoms ? JSON.parse(storedSymptoms) : []
}

function SymptomLogPage() {
  const { isDemoMode } = useDemo()
  const [dateTime, setDateTime] = useState(formatNowForDateTimeInput)
  const [painScale, setPainScale] = useState(1)
  const [painTypes, setPainTypes] = useState([])
  const [bodyAreas, setBodyAreas] = useState([])
  const [userSymptoms, setUserSymptoms] = useState(getStoredUserSymptoms)
  const [selectedUserSymptoms, setSelectedUserSymptoms] = useState([])
  const [newSymptom, setNewSymptom] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [hasEntries, setHasEntries] = useState(false)
  const [loadedSource, setLoadedSource] = useState('')
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true

    const entriesPromise = isDemoMode ? Promise.resolve(demoSymptomEntries) : getSymptomEntries()

    entriesPromise.then((entries) => {
      if (!isMounted) {
        return
      }

      setHasEntries(entries.length > 0)
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  function toggleValue(value, setValues) {
    setValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    )
  }

  function handleAddUserSymptom(event) {
    event.preventDefault()

    const trimmedSymptom = newSymptom.trim()

    if (!trimmedSymptom || userSymptoms.includes(trimmedSymptom)) {
      return
    }

    const nextUserSymptoms = [...userSymptoms, trimmedSymptom]

    localStorage.setItem(USER_SYMPTOMS_STORAGE_KEY, JSON.stringify(nextUserSymptoms))
    setUserSymptoms(nextUserSymptoms)
    setNewSymptom('')
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setPhoto(null)
      return
    }

    const base64Photo = await readFileAsBase64(file)
    setPhoto(base64Photo)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    await saveSymptomEntry({
      dateTime,
      painScale,
      painTypes,
      bodyAreas,
      userSymptoms: selectedUserSymptoms.map((symptom) => DOMPurify.sanitize(symptom)),
      notes: DOMPurify.sanitize(notes),
      photo,
    })
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ width: '100%', maxWidth: '720px' }}>
      <form className="card" onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px' }}>
        <h1>Symptom log</h1>
        {!hasEntries && (
          <EmptyState
            title="Your symptom history starts here"
            description="Log your first entry to begin building a clearer picture of pain patterns over time."
          />
        )}

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Date/time</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
          />
        </label>

        <div style={{ display: 'grid', gap: '8px' }}>
          <label htmlFor="pain-scale">Pain scale</label>
          <input
            id="pain-scale"
            type="range"
            min="1"
            max="10"
            value={painScale}
            onChange={(event) => setPainScale(Number(event.target.value))}
            style={{ padding: 0 }}
          />
          <span>{painScale}</span>
        </div>

        <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'grid', gap: '12px' }}>
          <legend>Pain type</legend>
          <div style={{ display: 'grid', gap: '10px' }}>
            {painTypeOptions.map((option) => (
              <label
                key={option}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <input
                  type="checkbox"
                  checked={painTypes.includes(option)}
                  onChange={() => toggleValue(option, setPainTypes)}
                  style={{ width: 'auto' }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'grid', gap: '16px' }}>
          <legend>Body area</legend>
          {bodyAreaGroups.map((group) => (
            <div key={group.title} style={{ display: 'grid', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>{group.title}</h2>
              <div style={{ display: 'grid', gap: '10px' }}>
                {group.options.map((option) => (
                  <label
                    key={option}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={bodyAreas.includes(option)}
                      onChange={() => toggleValue(option, setBodyAreas)}
                      style={{ width: 'auto' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <div style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '8px' }}>
            <span>Add your own symptom</span>
            <input
              type="text"
              value={newSymptom}
              onChange={(event) => setNewSymptom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAddUserSymptom(event)
                }
              }}
            />
          </label>
          <div>
            <button type="button" onClick={handleAddUserSymptom}>
              Add symptom
            </button>
          </div>

          {userSymptoms.length > 0 && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {userSymptoms.map((symptom) => (
                <label
                  key={symptom}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserSymptoms.includes(symptom)}
                    onChange={() => toggleValue(symptom, setSelectedUserSymptoms)}
                    style={{ width: 'auto' }}
                  />
                  <span>{symptom}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="5" />
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Photo upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ padding: 0 }}
          />
        </label>

        <div>
          <button type="submit">Save symptom entry</button>
        </div>
      </form>
    </div>
  )
}

export default SymptomLogPage
