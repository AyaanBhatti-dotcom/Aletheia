import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, getSymptomEntries } from '../db/db.js'
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

function LogsPage() {
  const { isDemoMode } = useDemo()
  const [entries, setEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
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
          summary: `Pain ${entry.painScale}/10`,
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
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ width: '100%', maxWidth: '920px', display: 'grid', gap: '20px' }}>
      <div>
        <h1 style={{ marginBottom: '6px' }}>All logs</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Browse your full symptom and cycle history.</p>
      </div>

      {entries.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
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
        </div>
      ) : (
        <div className="card">
          <p style={{ margin: 0 }}>No logs yet.</p>
        </div>
      )}
    </div>
  )
}

export default LogsPage
