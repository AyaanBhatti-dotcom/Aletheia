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
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((startOfToday - startOfDate) / (24 * 60 * 60 * 1000))
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
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
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginTop: 2,
      }}
      aria-hidden="true"
    />
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
      if (!isMounted) return
      setSymptomEntries(nextSymptomEntries)
      setCycleEntries(nextCycleEntries)
      setLoadedSource(sourceKey)
    })

    return () => { isMounted = false }
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  const totalEntriesLogged = symptomEntries.length + cycleEntries.length
  const allEntryDates = [
    ...symptomEntries.map((e) => e.dateTime),
    ...cycleEntries.map((e) => e.date),
  ]
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a)

  const daysSinceLastEntry = allEntryDates.length > 0 ? getDaysAgo(allEntryDates[0]) : null

  const recentCycleEntry = [...cycleEntries]
    .filter((e) => { const d = getDaysAgo(e.date); return d !== null && d <= 35 })
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]

  const sortedSymptomEntries = [...symptomEntries]
    .filter((e) => e.dateTime)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
  const sortedCycleEntries = [...cycleEntries]
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const allEntries = [
    ...sortedSymptomEntries.map((entry) => ({
      type: 'symptom',
      timestamp: entry.dateTime,
      entry,
    })),
    ...sortedCycleEntries.map((entry) => ({
      type: 'cycle',
      timestamp: entry.date,
      entry,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const avgPain = averagePainLast30Days(symptomEntries)

  return (
    <div style={{ width: '100%', maxWidth: '680px', display: 'grid', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', paddingBottom: '4px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', marginBottom: '6px' }}>Aletheia</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Your private health journal
          </p>
        </div>
        <span className="privacy-badge" style={{ flexShrink: 0, marginTop: '6px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Local only
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div className="card stat-card">
          <div className="stat-card__value">{totalEntriesLogged}</div>
          <div className="stat-card__label">Entries logged</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__value">
            {daysSinceLastEntry === null ? '—' : daysSinceLastEntry}
          </div>
          <div className="stat-card__label">Days since last</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__value" style={{ fontSize: '1.8rem' }}>{avgPain}</div>
          <div className="stat-card__label">30-day avg pain</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__value">
            {recentCycleEntry ? recentCycleEntry.cycleDay || '—' : '—'}
          </div>
          <div className="stat-card__label">Cycle day</div>
        </div>
      </div>

      {/* Primary CTA */}
      <Link to="/log" className="btn-primary" style={{ textDecoration: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Log a symptom
      </Link>

      {/* Secondary actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isDemoMode && (
          <button type="button" className="btn-secondary" style={{ flex: 1, minWidth: '110px' }} onClick={toggleDemo}>
            Try demo
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, minWidth: '110px' }}
          onClick={() => generateReport(symptomEntries, cycleEntries, getLast90DayRange())}
        >
          Export report
        </button>
      </div>

      {/* Detailed entry history */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <h2 style={{ marginBottom: '16px' }}>Entry history</h2>
        {allEntries.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {allEntries.map(({ type, entry }, i) => (
              <div
                key={entry.id || `${type}-${entry.dateTime || entry.date}-${i}`}
                style={{
                  display: 'grid',
                  gap: '8px',
                  padding: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--color-accent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {type === 'symptom' ? 'Symptom log' : 'Cycle log'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {type === 'symptom' ? formatDateTime(entry.dateTime) : formatDate(entry.date)}
                  </span>
                </div>

                {type === 'symptom' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <PainDot score={entry.painScale} />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: PAIN_COLORS[Math.min(Math.max(entry.painScale, 1), 10)],
                      }}>
                        Pain: {entry.painScale}/10
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Pain types: {entry.painTypes?.length ? entry.painTypes.join(', ') : 'None logged'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Body areas: {entry.bodyAreas?.length ? entry.bodyAreas.join(', ') : 'None logged'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Custom symptoms: {entry.userSymptoms?.length ? entry.userSymptoms.join(', ') : 'None logged'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Notes: {entry.notes?.trim() ? entry.notes : 'No notes'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Photo attached: {entry.photo ? 'Yes' : 'No'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Cycle day: {entry.cycleDay || 'Not set'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Flow: {entry.flowLevel || 'Not set'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Blood color: {entry.bloodColor || 'Not set'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Clots: {entry.clots || 'Not set'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Discharge: {entry.discharge || 'Not set'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Tenderness/Bloating/Cervical pain: {entry.breastTenderness ?? 0}/{entry.bloating ?? 0}/{entry.cervicalPain ?? 0}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No entries yet — log your first symptom to start tracking.
          </p>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
