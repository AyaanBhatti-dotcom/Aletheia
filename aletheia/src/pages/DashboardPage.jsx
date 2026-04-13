import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import { averagePainLast30Days } from '../patterns/engine.js'
import { generateReport } from '../reports/generateReport.js'

const PAIN_COLORS = ['', '#5A8C6B', '#5A8C6B', '#5A8C6B', '#D4943A', '#D4943A', '#D4943A', '#B84040', '#B84040', '#B84040', '#B84040']

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

  return Math.floor((startOfToday - startOfDate) / (24 * 60 * 60 * 1000))
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function PainDot({ score }) {
  const color = PAIN_COLORS[Math.min(Math.max(score, 1), 10)] || '#ccc'

  return <span className="landing-entry__dot" style={{ background: color }} aria-hidden="true" />
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
  const allEntryDates = [...symptomEntries.map((entry) => entry.dateTime), ...cycleEntries.map((entry) => entry.date)]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right - left)

  const daysSinceLastEntry = allEntryDates.length > 0 ? getDaysAgo(allEntryDates[0]) : null
  const recentCycleEntry = [...cycleEntries]
    .filter((entry) => {
      const daysAgo = getDaysAgo(entry.date)
      return daysAgo !== null && daysAgo <= 35
    })
    .sort((left, right) => new Date(right.date) - new Date(left.date))[0]

  const recentEntries = [
    ...symptomEntries
      .filter((entry) => entry.dateTime)
      .map((entry) => ({
        id: entry.id || entry.dateTime,
        type: 'Symptom log',
        timestamp: entry.dateTime,
        meta: `Pain ${entry.painScale}/10`,
        score: entry.painScale,
      })),
    ...cycleEntries
      .filter((entry) => entry.date)
      .map((entry) => ({
        id: entry.id || entry.date,
        type: 'Cycle log',
        timestamp: entry.date,
        meta: entry.flowLevel || 'No flow noted',
        score: null,
      })),
  ]
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .slice(0, 7)

  const avgPain = averagePainLast30Days(symptomEntries)

  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-kicker">Aletheia</span>
          <h1 className="landing-title">A quieter way to track what your body has been trying to tell you.</h1>
          <p className="landing-copy">
            Keep symptoms, cycle changes, and private patterns in one local place designed for calm review, not clutter.
          </p>

          <div className="landing-actions">
            <Link to="/log" className="btn-primary landing-actions__primary">
              Log a symptom
            </Link>
            {!isDemoMode && (
              <button type="button" className="btn-secondary" onClick={toggleDemo}>
                Try demo
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => generateReport(symptomEntries, cycleEntries, getLast90DayRange())}
            >
              Export report
            </button>
          </div>

          <div className="landing-trust">
            <span className="privacy-badge">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Local only
            </span>
            <p className="landing-trust__copy">Stored in this browser, available when you need a clearer picture.</p>
          </div>
        </div>

        <div className="landing-hero__panel">
          <div className="landing-orbit" aria-hidden="true">
            <span className="landing-orbit__ring landing-orbit__ring--outer" />
            <span className="landing-orbit__ring landing-orbit__ring--mid" />
            <span className="landing-orbit__ring landing-orbit__ring--inner" />
            <span className="landing-orbit__core" />
          </div>

          <div className="landing-stats">
            <div className="landing-stat">
              <span className="landing-stat__value">{totalEntriesLogged}</span>
              <span className="landing-stat__label">Entries logged</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat__value">{daysSinceLastEntry === null ? '—' : daysSinceLastEntry}</span>
              <span className="landing-stat__label">Days since last entry</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat__value">{avgPain}</span>
              <span className="landing-stat__label">30-day avg pain</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat__value">{recentCycleEntry ? recentCycleEntry.cycleDay || '—' : '—'}</span>
              <span className="landing-stat__label">Current cycle day</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-history">
        <div className="landing-history__header">
          <div>
            <span className="landing-section-label">Recent activity</span>
            <h2>Last 7 entries</h2>
          </div>
          <p className="landing-history__subcopy">A quick glance at the most recent notes in your timeline.</p>
        </div>

        {recentEntries.length > 0 ? (
          <div className="landing-entry-list">
            {recentEntries.map((entry) => (
              <article key={entry.id} className="landing-entry">
                <div className="landing-entry__topline">
                  <span className="landing-entry__type">{entry.type}</span>
                  <time className="landing-entry__time">
                    {entry.type === 'Symptom log' ? formatDateTime(entry.timestamp) : formatDate(entry.timestamp)}
                  </time>
                </div>
                <div className="landing-entry__body">
                  {entry.score ? <PainDot score={entry.score} /> : <span className="landing-entry__pill" />}
                  <p className="landing-entry__meta">{entry.meta}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="landing-empty">
            <p>No entries yet. Start with a symptom log to build your timeline.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPage
