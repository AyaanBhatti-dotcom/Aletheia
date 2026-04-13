import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import { averagePainLast30Days } from '../patterns/engine.js'
import { generateReport } from '../reports/generateReport.js'

function getLast90DayRange() {
  const end = new Date()
  const start = new Date()

  start.setDate(end.getDate() - 89)

  return { start, end }
}

function getDaysAgo(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.floor((startOfToday - startOfDate) / millisecondsPerDay)
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString()
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{label}</h2>
      <p style={{ margin: 0 }}>{value}</p>
    </div>
  )
}

function DashboardPage() {
  const { isDemoMode, toggleDemo } = useDemo()
  const [symptomEntries, setSymptomEntries] = useState([])
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true

    const entriesPromise = isDemoMode
      ? Promise.resolve([demoSymptomEntries, demoCycleEntries])
      : Promise.all([getSymptomEntries(), getCycleEntries()])

    entriesPromise.then(([nextSymptomEntries, nextCycleEntries]) => {
      if (!isMounted) {
        return
      }

      setSymptomEntries(nextSymptomEntries)
      setCycleEntries(nextCycleEntries)
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  const totalEntriesLogged = symptomEntries.length + cycleEntries.length
  const allEntryDates = [
    ...symptomEntries.map((entry) => entry.dateTime),
    ...cycleEntries.map((entry) => entry.date),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right - left)

  const daysSinceLastEntry =
    allEntryDates.length > 0 ? getDaysAgo(allEntryDates[0]) : null

  const recentCycleEntry = [...cycleEntries]
    .filter((entry) => {
      const daysAgo = getDaysAgo(entry.date)

      return daysAgo !== null && daysAgo <= 35
    })
    .sort((left, right) => new Date(right.date) - new Date(left.date))[0]

  const recentSymptomEntries = [...symptomEntries]
    .filter((entry) => entry.dateTime)
    .sort((left, right) => new Date(right.dateTime) - new Date(left.dateTime))
    .slice(0, 7)

  return (
    <div style={{ width: '100%', maxWidth: '960px', display: 'grid', gap: '20px' }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Aletheia</h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '20px',
        }}
      >
        <StatCard label="Total entries logged" value={totalEntriesLogged} />
        <StatCard
          label="Days since last entry"
          value={daysSinceLastEntry === null ? 'No entries yet' : daysSinceLastEntry}
        />
        <StatCard label="30-day average pain" value={averagePainLast30Days(symptomEntries)} />
        <StatCard
          label="Current cycle day"
          value={recentCycleEntry ? recentCycleEntry.cycleDay || 'N/A' : 'N/A'}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          to="/log"
          style={{
            textDecoration: 'none',
            background: 'var(--color-primary)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 'var(--radius)',
          }}
        >
          Quick-add
        </Link>
        {!isDemoMode && (
          <button type="button" onClick={toggleDemo}>
            Try demo
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            generateReport(symptomEntries, cycleEntries, getLast90DayRange())
          }
        >
          Export report
        </button>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Last 7 entries</h2>
        {recentSymptomEntries.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recentSymptomEntries.map((entry) => (
              <div key={entry.id || entry.dateTime}>
                <p>{formatDate(entry.dateTime)}</p>
                <p>Pain score: {entry.painScale}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>No symptom entries yet.</p>
        )}
      </section>
    </div>
  )
}

export default DashboardPage
