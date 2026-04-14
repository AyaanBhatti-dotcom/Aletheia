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
    'Awake before the sun? Log now—you won\'t have to re-guess the details later.',
    'Rough night. Pain level, where it is, whether anything helped. Done.',
    'Doesn\'t have to be an essay. Time, a number, one sentence is enough for most visits.',
    'Whatever hour this is, if it\'s written down, it\'s there when you need it.',
  ],
  morning: [
    'Before the day runs away—anything still hanging on from yesterday?',
    'Felt different when you woke up? Say it now, before the day smudges it.',
    'You\'ll misremember this by your next visit unless you jot it now.',
    'This isn\'t your whole story. You can add another entry anytime.',
  ],
  afternoon: [
    'Something set you off? Rough order of events, while you still remember.',
    'Meds, heat, food helped? Put that in—it matters when you look back.',
    'Boring steady day? Still worth a line. You need those days for the pattern.',
    'Two minutes now beats staring at the calendar next month going "what happened again?"',
  ],
  evening: [
    'Versus this morning: better, worse, same? They always ask that one.',
    'Did symptoms mess with food, sleep, or plans? Note it while you still remember.',
    'Half a thought is fine. Nobody needs a polished paragraph.',
    'Log now so you\'re not rebuilding this from scratch at 2 a.m. if it spikes.',
  ],
  night: [
    'Still up? Pain level, where, which position hurts least. Enough.',
    'Late log still counts.',
    'Appointment soon? Skim the week—you\'ll want the details straight.',
    'One sentence before you close the tab is enough.',
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

function buildCycleLogNumberMap(cycleEntries) {
  return new Map(
    [...cycleEntries]
      .filter((entry) => entry?.date)
      .sort((left, right) => new Date(left.date) - new Date(right.date))
      .map((entry, index) => [entry.id || entry.date, index + 1]),
  )
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
  const cycleLogNumbers = buildCycleLogNumberMap(cycleEntries)

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
        meta: `Log #${cycleLogNumbers.get(entry.id || entry.date) || 1}`,
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
          <h1 className="landing-title">Symptom and cycle logs in one place, on your device.</h1>
          <p className="landing-copy">
            Record pain, bleeding, and cycle details locally. Use your timeline for yourself or to prepare for appointments—nothing is uploaded unless you export it.
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
            <p className="landing-trust__copy">Data stays in this browser on this device until you export or clear it.</p>
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
            <p className="landing-history__subcopy">Your latest symptom and cycle entries, newest first.</p>
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
