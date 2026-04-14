import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { useDemo } from '../context/DemoContext.jsx'
import { useTour } from '../context/TourContext.jsx'
import { consumeJournalWarnings, getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import { averagePainLast30Days } from '../patterns/engine.js'
import { generateReport } from '../reports/generateReport.js'

const PAIN_COLORS = ['', '#5A8C6B', '#5A8C6B', '#5A8C6B', '#D4943A', '#D4943A', '#D4943A', '#B84040', '#B84040', '#B84040', '#B84040']
const ENCOURAGEMENT_BY_TIME = {
  early: [
    'A gentle start still counts. You are showing up for yourself today.',
    'One small check-in can make the rest of the day feel more manageable.',
    'You do not need a perfect morning to make meaningful progress.',
    'A quiet start is still a strong one. Your consistency matters.',
  ],
  morning: [
    'You are building clarity one entry at a time, and that effort matters.',
    'Today is a good day to notice what your body is asking for.',
    'Small moments of care add up. You are doing better than you think.',
    'The fact that you are checking in is already a meaningful win.',
  ],
  afternoon: [
    'You have made it through a lot already today. Keep being kind to yourself.',
    'A midday pause can be powerful. Thank you for taking this moment.',
    'Even brief check-ins help turn patterns into answers over time.',
    'You are paying attention in a way that future-you will appreciate.',
  ],
  evening: [
    'You made it to the evening. That is worth honoring.',
    'Closing the day with a quick note is a quiet kind of care.',
    'However today went, checking in now is still progress.',
    'You do not need to do everything today. This step is enough.',
  ],
  night: [
    'Rest is productive too. Thank you for taking care of yourself tonight.',
    'Even a late-night check-in can bring tomorrow a little more clarity.',
    'You are allowed to end the day gently and still call it progress.',
    'A few notes now can make the next day feel less heavy.',
  ],
}

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

function getDayOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date - startOfYear

  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

function getTimeBucket(date) {
  const hour = date.getHours()

  if (hour < 6) {
    return { key: 'early', label: 'Early hours' }
  }

  if (hour < 12) {
    return { key: 'morning', label: 'This morning' }
  }

  if (hour < 17) {
    return { key: 'afternoon', label: 'This afternoon' }
  }

  if (hour < 22) {
    return { key: 'evening', label: 'This evening' }
  }

  return { key: 'night', label: 'Tonight' }
}

function getEncouragement(totalEntriesLogged) {
  if (totalEntriesLogged === 0) {
    return null
  }

  const now = new Date()
  const { key, label } = getTimeBucket(now)
  const messages = ENCOURAGEMENT_BY_TIME[key]
  const messageIndex = (getDayOfYear(now) + totalEntriesLogged) % messages.length

  return {
    label,
    message: messages[messageIndex],
  }
}

function PainDot({ score }) {
  const color = PAIN_COLORS[Math.min(Math.max(score, 1), 10)] || '#ccc'

  return <span className="landing-entry__dot" style={{ background: color }} aria-hidden="true" />
}

function DashboardPage() {
  const { isDemoMode, toggleDemo } = useDemo()
  const { activeTourTarget, isTourOpen } = useTour()
  const [symptomEntries, setSymptomEntries] = useState([])
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [warnings, setWarnings] = useState([])
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
      setIsLocked(false)
      setWarnings(consumeJournalWarnings())
      setLoadedSource(sourceKey)
    })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        if (error instanceof JournalLockedError) {
          setIsLocked(true)
          setLoadedSource(sourceKey)
          return
        }

        throw error
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
        description="Unlock it in Settings to see your entries, patterns, and report tools for this session."
      />
    )
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
        entryType: 'symptom',
        type: 'Symptom log',
        timestamp: entry.dateTime,
        meta: `Pain ${entry.painScale}/10`,
        score: entry.painScale,
      })),
    ...cycleEntries
      .filter((entry) => entry.date)
      .map((entry) => ({
        id: entry.id || entry.date,
        entryType: 'cycle',
        type: 'Cycle log',
        timestamp: entry.date,
        meta: entry.flowLevel || 'No flow noted',
        score: null,
      })),
  ]
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .slice(0, 7)

  const avgPain = averagePainLast30Days(symptomEntries)
  const encouragement = getEncouragement(totalEntriesLogged)

  return (
    <div className="landing-shell">
      <WarningNotice warnings={warnings} />
      <section className="landing-hero">
        <div
          data-tour-target="dashboard-hero"
          className={`landing-hero__copy${isTourOpen && activeTourTarget === 'dashboard-hero' ? ' tour-highlight' : ''}`}
        >
          <span className="landing-kicker">Aletheia</span>
          <h1 className="landing-title">A quieter way to track what your body has been trying to tell you.</h1>
          <p className="landing-copy">
            Keep symptoms, cycle changes, and private patterns in one local place designed for calm review, not clutter.
          </p>

          {encouragement && (
            <div className="landing-encouragement" aria-live="polite">
              <span className="landing-encouragement__label">{encouragement.label}</span>
              <p className="landing-encouragement__message">{encouragement.message}</p>
            </div>
          )}

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
              data-tour-target="dashboard-export"
              className={`btn-secondary${isTourOpen && activeTourTarget === 'dashboard-export' ? ' tour-highlight' : ''}`}
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
          <div className="landing-history__actions">
            <p className="landing-history__subcopy">A quick glance at the most recent notes in your timeline.</p>
            <Link to="/logs" className="btn-secondary landing-history__link">
              View all logs
            </Link>
          </div>
        </div>

        {recentEntries.length > 0 ? (
          <div className="landing-entry-list">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id}
                to={`/logs/${entry.entryType}/${entry.id}`}
                className="landing-entry"
              >
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
              </Link>
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
