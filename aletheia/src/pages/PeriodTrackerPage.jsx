import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, saveCycleEntry } from '../db/db.js'
import { cycleEntries as demoCycleEntries } from '../demo/demoData.js'

const flowLevels = ['none', 'spotting', 'light', 'moderate', 'heavy', 'very heavy']
const bloodColors = ['bright red', 'dark red', 'brown', 'pink', 'orange']
const clotOptions = ['none', 'small clots', 'large clots']
const dischargeOptions = [
  'none',
  'clear',
  'white/creamy',
  'yellow',
  'brown/old blood',
  'unusual texture',
]
const severityLabels = ['none', 'mild', 'moderate', 'severe', 'very severe']

function formatTodayForDateInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - offset * 60000)

  return localDate.toISOString().slice(0, 10)
}

function ScaleField({ id, label, value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min="0"
        max="4"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ padding: 0 }}
      />
      <span>
        {value} - {severityLabels[value]}
      </span>
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
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true

    const entriesPromise = isDemoMode ? Promise.resolve(demoCycleEntries) : getCycleEntries()

    entriesPromise.then((entries) => {
      if (!isMounted) {
        return
      }

      setHasEntries(entries.length > 0)
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
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
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ width: '100%', maxWidth: '720px' }}>
      <form className="card" onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px' }}>
        <h1>Period tracker</h1>
        {!hasEntries && (
          <EmptyState
            title="Start your cycle record"
            description="Save your first cycle entry to build day-by-day context for flow, symptoms, and timing."
          />
        )}

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Flow level</span>
          <select value={flowLevel} onChange={(event) => setFlowLevel(event.target.value)}>
            {flowLevels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Blood color</span>
          <select value={bloodColor} onChange={(event) => setBloodColor(event.target.value)}>
            {bloodColors.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Clots</span>
          <select value={clots} onChange={(event) => setClots(event.target.value)}>
            {clotOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Discharge</span>
          <select value={discharge} onChange={(event) => setDischarge(event.target.value)}>
            {dischargeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

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

        <label style={{ display: 'grid', gap: '8px' }}>
          <span>Cycle day number</span>
          <input
            type="number"
            min="1"
            value={cycleDay}
            onChange={(event) => setCycleDay(event.target.value)}
          />
        </label>

        <div>
          <button type="submit">Save cycle entry</button>
        </div>
      </form>
    </div>
  )
}

export default PeriodTrackerPage
