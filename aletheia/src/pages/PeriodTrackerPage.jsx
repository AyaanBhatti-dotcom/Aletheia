import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, saveCycleEntry } from '../db/db.js'
import { cycleEntries as demoCycleEntries } from '../demo/demoData.js'

const flowLevels = ['none', 'spotting', 'light', 'moderate', 'heavy', 'very heavy']
const bloodColors = ['bright red', 'dark red', 'brown', 'pink', 'orange']
const clotOptions = ['none', 'small clots', 'large clots']
const dischargeOptions = ['none', 'clear', 'white/creamy', 'yellow', 'brown/old blood', 'unusual']
const severityLabels = ['None', 'Mild', 'Moderate', 'Severe', 'Very severe']

function formatTodayForDateInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - offset * 60000)
  return localDate.toISOString().slice(0, 10)
}

function sliderBackground(value, min, max) {
  const pct = ((value - min) / (max - min)) * 100
  return {
    background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-border) ${pct}%)`,
  }
}

function PillToggle({ label, active, onToggle }) {
  return (
    <button
      type="button"
      className={`pill${active ? ' pill--active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function SingleSelect({ options, value, onChange, label }) {
  return (
    <div className="card" style={{ display: 'grid', gap: '12px' }}>
      <div className="field-label">{label}</div>
      <div className="pill-group" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <PillToggle
            key={option}
            label={option}
            active={value === option}
            onToggle={() => onChange(option)}
          />
        ))}
      </div>
    </div>
  )
}

function ScaleField({ id, label, value, onChange }) {
  return (
    <div className="card" style={{ display: 'grid', gap: '14px' }}>
      <div className="field-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '2px' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.8rem',
          lineHeight: 1,
          color: 'var(--color-primary)',
        }}>
          {value}
        </span>
        <span style={{ fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: 500, paddingBottom: '5px' }}>
          {severityLabels[value]}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="4"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={sliderBackground(value, 0, 4)}
        aria-label={`${label}: ${value}, ${severityLabels[value]}`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        <span>None</span>
        <span>Very severe</span>
      </div>
    </div>
  )
}

function PeriodTrackerPage() {
  const { isDemoMode } = useDemo()
  const [date, setDate] = useState(formatTodayForDateInput)
  const [flowLevel, setFlowLevel] = useState('none')
  const [bloodColor, setBloodColor] = useState('bright red')
  const [clots, setClots] = useState('none')
  const [discharge, setDischarge] = useState('none')
  const [breastTenderness, setBreastTenderness] = useState(0)
  const [bloating, setBloating] = useState(0)
  const [cervicalPain, setCervicalPain] = useState(0)
  const [cycleDay, setCycleDay] = useState('')
  const [hasEntries, setHasEntries] = useState(false)
  const [loadedSource, setLoadedSource] = useState('')
  const [savedKey, setSavedKey] = useState(null)
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true
    const entriesPromise = isDemoMode ? Promise.resolve(demoCycleEntries) : getCycleEntries()
    entriesPromise.then((entries) => {
      if (!isMounted) return
      setHasEntries(entries.length > 0)
      setLoadedSource(sourceKey)
    })
    return () => { isMounted = false }
  }, [isDemoMode, sourceKey])

  async function handleSubmit(event) {
    event.preventDefault()
    await saveCycleEntry({
      date,
      flowLevel,
      bloodColor,
      clots,
      discharge,
      breastTenderness,
      bloating,
      cervicalPain,
      cycleDay: cycleDay === '' ? '' : Number(cycleDay),
    })
    setHasEntries(true)
    setSavedKey(Date.now())
    setTimeout(() => setSavedKey(null), 2800)
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      {savedKey !== null && (
        <div className="toast" key={savedKey} role="status" aria-live="polite">
          <span className="toast__dot" aria-hidden="true">✓</span>
          Cycle entry saved
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>

        {/* Header */}
        <div style={{ paddingBottom: '4px' }}>
          <h1 style={{ marginBottom: '6px' }}>Period tracker</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Log your cycle day by day.
          </p>
        </div>

        {!hasEntries && (
          <div className="card">
            <EmptyState
              title="Start your cycle record"
              description="Save your first entry to build day-by-day context for flow, symptoms, and timing."
            />
          </div>
        )}

        {/* Date */}
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="cycle-date">Date</label>
          <input
            id="cycle-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Cycle day */}
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="cycle-day">
            Cycle day
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '8px' }}>Optional</span>
          </label>
          <input
            id="cycle-day"
            type="number"
            min="1"
            placeholder="e.g. 14"
            value={cycleDay}
            onChange={(e) => setCycleDay(e.target.value)}
          />
        </div>

        {/* Flow level */}
        <SingleSelect
          label="Flow level"
          options={flowLevels}
          value={flowLevel}
          onChange={setFlowLevel}
        />

        {/* Blood color */}
        <SingleSelect
          label="Blood color"
          options={bloodColors}
          value={bloodColor}
          onChange={setBloodColor}
        />

        {/* Clots */}
        <SingleSelect
          label="Clots"
          options={clotOptions}
          value={clots}
          onChange={setClots}
        />

        {/* Discharge */}
        <SingleSelect
          label="Discharge"
          options={dischargeOptions}
          value={discharge}
          onChange={setDischarge}
        />

        {/* Severity scales */}
        <ScaleField
          id="breast-tenderness"
          label="Breast tenderness"
          value={breastTenderness}
          onChange={setBreastTenderness}
        />

        <ScaleField
          id="bloating"
          label="Bloating"
          value={bloating}
          onChange={setBloating}
        />

        <ScaleField
          id="cervical-pain"
          label="Cervical pain"
          value={cervicalPain}
          onChange={setCervicalPain}
        />

        {/* Save */}
        <button type="submit" className="btn-primary" style={{ marginTop: '4px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save cycle entry
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          🔒 Saved locally on your device
        </p>
      </form>
    </div>
  )
}

export default PeriodTrackerPage
