import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { useDemo } from '../context/DemoContext.jsx'
import { consumeJournalWarnings, getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'

function formatDate(value, includeTime = false) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  if (includeTime) {
    return date.toLocaleString()
  }

  return date.toLocaleDateString()
}

function isSafePhotoSource(value) {
  return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value.trim())
}

function formatListValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ') || 'Not set'
  }

  return value || 'Not set'
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  )
}

function LogDetailPage() {
  const { isDemoMode } = useDemo()
  const { entryId, entryType } = useParams()
  const [entry, setEntry] = useState(null)
  const [loadedSource, setLoadedSource] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [warnings, setWarnings] = useState([])
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true

    const entriesPromise = isDemoMode
      ? Promise.resolve([demoSymptomEntries, demoCycleEntries])
      : Promise.all([getSymptomEntries(), getCycleEntries()])

    entriesPromise.then(([symptomEntries, cycleEntries]) => {
      if (!isMounted) {
        return
      }

      const foundEntry =
        entryType === 'symptom'
          ? symptomEntries.find((item) => item.id === entryId)
          : cycleEntries.find((item) => item.id === entryId)

      setEntry(foundEntry || null)
      setIsLocked(false)
      setLoadError('')
      setWarnings(consumeJournalWarnings())
      setLoadedSource(sourceKey)
    })
      .catch((error) => {
        if (!isMounted) {
          return
        }

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

    return () => {
      isMounted = false
    }
  }, [entryId, entryType, isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  if (isLocked) {
    return (
      <LockedState
        title="Your journal is locked"
        description="Unlock it in Settings to read this entry."
      />
    )
  }

  if (loadError) {
    return <ErrorState description={loadError} />
  }

  if (!entry) {
    return (
      <div className="page-shell" style={{ maxWidth: '760px' }}>
        <div className="card" style={{ display: 'grid', gap: '14px' }}>
          <h1 style={{ margin: 0 }}>Log not found</h1>
          <Link to="/logs" className="btn-secondary" style={{ width: 'fit-content' }}>
            Back to all logs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell" style={{ maxWidth: '760px', display: 'grid', gap: '20px' }}>
      <WarningNotice warnings={warnings} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>
            {entryType === 'symptom' ? 'Symptom log details' : 'Cycle log details'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {entryType === 'symptom'
              ? formatDate(entry.dateTime, true)
              : formatDate(entry.date)}
          </p>
        </div>
        <Link to="/logs" className="btn-secondary" style={{ width: 'fit-content' }}>
          Back to all logs
        </Link>
      </div>

      <div className="card" style={{ display: 'grid', gap: '10px' }}>
        {entryType === 'symptom' ? (
          <>
            <DetailRow label="Pain score" value={`${entry.painScale}/10`} />
            <DetailRow label="Pain types" value={entry.painTypes?.join(', ') || 'None'} />
            <DetailRow label="Body areas" value={entry.bodyAreas?.join(', ') || 'None'} />
            <DetailRow label="Custom symptoms" value={entry.userSymptoms?.join(', ') || 'None'} />
            <DetailRow label="Notes" value={entry.notes?.trim() || 'No notes'} />
            <DetailRow label="Photo" value={isSafePhotoSource(entry.photo) ? 'Attached' : 'None'} />
            {isSafePhotoSource(entry.photo) && (
              <img
                src={entry.photo}
                alt="Symptom log attachment"
                style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}
              />
            )}
          </>
        ) : (
          <>
            <DetailRow label="Cycle day" value={entry.cycleDay || 'Not set'} />
            <DetailRow label="Flow level" value={entry.flowLevel || 'Not set'} />
            <DetailRow label="Blood color" value={formatListValue(entry.bloodColor)} />
            <DetailRow label="Clots" value={formatListValue(entry.clots)} />
            <DetailRow label="Discharge" value={formatListValue(entry.discharge)} />
            <DetailRow label="Breast tenderness" value={entry.breastTenderness ?? 0} />
            <DetailRow label="Bloating" value={entry.bloating ?? 0} />
            <DetailRow label="Pelvic pain" value={entry.pelvicPain ?? entry.cervicalPain ?? 0} />
            <DetailRow label="Systemic pain" value={entry.systemicPain ?? 0} />
          </>
        )}
      </div>
    </div>
  )
}

export default LogDetailPage
