import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { useDemo } from '../context/DemoContext.jsx'
import { useTour } from '../context/TourContext.jsx'
import { consumeJournalWarnings, getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import { getEntryPainScale, getSymptomPainLevels } from '../patterns/engine.js'

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

function LogsPage() {
  const { isDemoMode } = useDemo()
  const { activeTourTarget, isTourOpen } = useTour()
  const [entries, setEntries] = useState([])
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

      const allEntries = [
        ...symptomEntries.map((entry) => ({
          id: entry.id,
          type: 'symptom',
          title: 'Symptom log',
          timestamp: entry.dateTime,
          summary: `${Object.keys(getSymptomPainLevels(entry)).length || 0} symptoms • peak ${getEntryPainScale(entry) ?? '—'}/10`,
        })),
        ...cycleEntries.map((entry) => ({
          id: entry.id,
          type: 'cycle',
          title: 'Cycle log',
          timestamp: entry.date,
          summary: entry.flowLevel || 'No flow noted',
        })),
      ].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))

      setEntries(allEntries)
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
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  if (isLocked) {
    return (
      <LockedState
        title="Your journal is locked"
        description="Unlock it in Settings to browse your symptom and cycle history."
      />
    )
  }

  if (loadError) {
    return <ErrorState description={loadError} />
  }

  return (
    <div className="page-shell" style={{ maxWidth: '920px', display: 'grid', gap: '20px' }}>
      <WarningNotice warnings={warnings} />
      <div>
        <h1 style={{ marginBottom: '6px' }}>All logs</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Browse your full symptom and cycle history.</p>
      </div>

      <div
        style={{ display: 'grid', gap: '12px' }}
        data-tour-target="logs-list"
        className={isTourOpen && activeTourTarget === 'logs-list' ? 'tour-highlight' : ''}
      >
        {entries.length > 0 ? (
          <>
          {entries.map((entry) => (
            <Link
              key={`${entry.type}-${entry.id}`}
              to={`/logs/${entry.type}/${entry.id}`}
              className="log-row"
            >
              <div>
                <p className="log-row__title">{entry.title}</p>
                <p className="log-row__time">
                  {entry.type === 'symptom'
                    ? formatDate(entry.timestamp, true)
                    : formatDate(entry.timestamp)}
                </p>
              </div>
              <p className="log-row__summary">{entry.summary}</p>
            </Link>
          ))}
          </>
        ) : (
          <div className="card">
            <p style={{ margin: 0 }}>No logs yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogsPage
