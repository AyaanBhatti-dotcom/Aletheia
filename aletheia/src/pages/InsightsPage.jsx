import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { useDemo } from '../context/DemoContext.jsx'
import { useTour } from '../context/TourContext.jsx'
import { getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import {
  averagePainLast30Days,
  cyclePhaseSummary,
  detectFlare,
  highFrequencySymptoms,
  topSymptoms,
} from '../patterns/engine.js'

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function painColor(score) {
  const n = Number(score)
  if (Number.isNaN(n)) return 'var(--color-text-muted)'
  if (n <= 3) return '#3D7A5C'
  if (n <= 6) return '#D4943A'
  return '#B84040'
}

function InsightBar({ percentage }) {
  return (
    <div className="insight-bar" aria-hidden="true">
      <div
        className="insight-bar__fill"
        style={{ width: `${Math.round(percentage * 100)}%` }}
      />
    </div>
  )
}

function PhaseValue({ value }) {
  const n = Number(value)
  const display = Number.isNaN(n) ? '—' : n.toFixed(1)
  return (
    <div className="phase-card__value" style={{ color: Number.isNaN(n) ? 'var(--color-text-muted)' : painColor(n) }}>
      {display}
    </div>
  )
}

function InsightsPage() {
  const { isDemoMode } = useDemo()
  const { activeTourTarget, isTourOpen } = useTour()
  const [symptomEntries, setSymptomEntries] = useState([])
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const [isLocked, setIsLocked] = useState(false)
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
      setIsLocked(false)
      setLoadedSource(sourceKey)
    })
      .catch((error) => {
        if (!isMounted) return

        if (error instanceof JournalLockedError) {
          setIsLocked(true)
          setLoadedSource(sourceKey)
        }
      })

    return () => { isMounted = false }
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  if (isLocked) {
    return (
      <LockedState
        title="Your journal is locked"
        description="Unlock it in Settings to see your trends and insights for this session."
      />
    )
  }

  const totalEntries = symptomEntries.length + cycleEntries.length

  if (totalEntries < 7) {
    return (
      <div className="page-shell" style={{ maxWidth: '600px' }}>
        <div style={{ paddingBottom: '4px', marginBottom: '14px' }}>
          <h1 style={{ marginBottom: '6px' }}>Insights</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Patterns discovered from your data.
          </p>
        </div>
        <div
          data-tour-target="insights-summary"
          className={isTourOpen && activeTourTarget === 'insights-summary' ? 'tour-highlight' : ''}
        >
          <div className="card">
          <EmptyState
            title="No patterns yet"
            description="Add at least 7 entries to start seeing patterns and summaries here."
          />
          </div>
        </div>
      </div>
    )
  }

  const flares = detectFlare(symptomEntries)
  const averagePain = averagePainLast30Days(symptomEntries)
  const topFiveSymptoms = topSymptoms(symptomEntries, 5)
  const frequentSymptoms = highFrequencySymptoms(symptomEntries)
  const phasePain = cyclePhaseSummary(symptomEntries, cycleEntries)

  const avgPainNum = Number(averagePain)

  return (
    <div className="page-shell" style={{ maxWidth: '680px', display: 'grid', gap: '14px' }}>

      {/* Header */}
      <div style={{ paddingBottom: '4px' }}>
        <h1 style={{ marginBottom: '6px' }}>Insights</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Patterns discovered from your data.
        </p>
      </div>

      {/* Average pain — featured */}
      <div
        data-tour-target="insights-summary"
        className={`card${isTourOpen && activeTourTarget === 'insights-summary' ? ' tour-highlight' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            30-day avg pain
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '4rem',
            lineHeight: 1,
            color: Number.isNaN(avgPainNum) ? 'var(--color-text-muted)' : painColor(avgPainNum),
          }}>
            {averagePain}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '6px' }}>
            out of 10
          </div>
        </div>
        {!Number.isNaN(avgPainNum) && (
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `conic-gradient(${painColor(avgPainNum)} ${(avgPainNum / 10) * 360}deg, var(--color-accent) 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--color-surface)',
            }} />
          </div>
        )}
      </div>

      {/* Top symptoms */}
      <div className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2>Top symptoms</h2>
        {topFiveSymptoms.length > 0 ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            {topFiveSymptoms.map((item) => (
              <div key={item.symptom} className="insight-row">
                <div className="insight-row__header">
                  <span className="insight-row__name">{item.symptom}</span>
                  <span className="insight-row__pct">
                    {item.count}× · {Math.round(item.percentage * 100)}%
                  </span>
                </div>
                <InsightBar percentage={item.percentage} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No symptom data yet.
          </p>
        )}
      </div>

      {/* High frequency symptoms */}
      {frequentSymptoms.length > 0 && (
        <div className="card" style={{ display: 'grid', gap: '16px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>High-frequency symptoms</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Symptoms appearing in over 50% of your entries.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            {frequentSymptoms.map((item) => (
              <div key={item.symptom} className="insight-row">
                <div className="insight-row__header">
                  <span className="insight-row__name">{item.symptom}</span>
                  <span className="insight-row__pct">
                    {Math.round(item.percentage * 100)}%
                  </span>
                </div>
                <InsightBar percentage={item.percentage} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle phase pain */}
      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Pain by cycle phase</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Average pain score per phase.
          </p>
        </div>
        <div className="phase-grid">
          {[
            { name: 'Menstrual', value: phasePain.menstrual },
            { name: 'Follicular', value: phasePain.follicular },
            { name: 'Ovulatory', value: phasePain.ovulatory },
            { name: 'Luteal', value: phasePain.luteal },
          ].map(({ name, value }) => (
            <div key={name} className="phase-card">
              <div className="phase-card__name">{name}</div>
              <PhaseValue value={value} />
            </div>
          ))}
        </div>
      </div>

      {/* Flare history */}
      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Flare history</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Periods of elevated pain detected in your data.
          </p>
        </div>
        {flares.length > 0 ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {flares.map((flare) => (
              <div
                key={`${flare.startDate}-${flare.endDate}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--color-accent)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--color-danger)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {formatDate(flare.startDate)} – {formatDate(flare.endDate)}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '2px' }}>
                    {flare.duration} day{flare.duration !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No flare patterns detected yet.
          </p>
        )}
      </div>
    </div>
  )
}

export default InsightsPage
