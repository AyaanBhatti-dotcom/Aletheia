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
const severityLabels = ['None', 'Mild', 'Moderate', 'Severe', 'Very severe']
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function createMonthDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startDay + 1
    const date = new Date(year, month, dayNumber)
    return {
      date,
      key: formatDateKey(date),
      inMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
    }
  })
}

function getFlowClass(flowLevel) {
  return flowLevel ? `cycle-calendar__day--${flowLevel.replace(/\s+/g, '-')}` : ''
}

function getCompactFlowLabel(flowLevel) {
  switch (flowLevel) {
    case 'spotting':
      return 'Spot'
    case 'light':
      return 'Light'
    case 'moderate':
      return 'Mod'
    case 'heavy':
      return 'Heavy'
    case 'very heavy':
      return 'V heavy'
    default:
      return 'None'
  }
}

function getDefaultFormState(dateValue) {
  return {
    date: dateValue,
    flowLevel: 'none',
    bloodColor: 'bright red',
    clots: 'none',
    discharge: 'none',
    breastTenderness: 0,
    bloating: 0,
    cervicalPain: 0,
    cycleDay: '',
  }
}

function getFormStateFromEntry(entry, dateValue) {
  if (!entry) {
    return getDefaultFormState(dateValue)
  }

  return {
    date: dateValue,
    flowLevel: entry.flowLevel || 'none',
    bloodColor: entry.bloodColor || 'bright red',
    clots: entry.clots || 'none',
    discharge: entry.discharge || 'none',
    breastTenderness: entry.breastTenderness ?? 0,
    bloating: entry.bloating ?? 0,
    cervicalPain: entry.cervicalPain ?? 0,
    cycleDay: entry.cycleDay === '' || entry.cycleDay === undefined ? '' : String(entry.cycleDay),
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
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.8rem',
            lineHeight: 1,
            color: 'var(--color-primary)',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: '15px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            paddingBottom: '5px',
          }}
        >
          {severityLabels[value]}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="4"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={sliderBackground(value, 0, 4)}
        aria-label={`${label}: ${value}, ${severityLabels[value]}`}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
        }}
      >
        <span>None</span>
        <span>Very severe</span>
      </div>
    </div>
  )
}

function PeriodTrackerPage() {
  const { isDemoMode } = useDemo()
  const [formState, setFormState] = useState(() => getDefaultFormState(formatTodayForDateInput()))
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const [savedKey, setSavedKey] = useState(null)
  const [visibleMonth, setVisibleMonth] = useState(() => createMonthDate(formatTodayForDateInput()))
  const sourceKey = isDemoMode ? 'demo' : 'db'
  const hasEntries = cycleEntries.length > 0

  useEffect(() => {
    let isMounted = true
    const entriesPromise = isDemoMode ? Promise.resolve(demoCycleEntries) : getCycleEntries()

    entriesPromise.then((entries) => {
      if (!isMounted) {
        return
      }

      setCycleEntries(entries)
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  const entryByDate = new Map()
  cycleEntries.forEach((entry) => {
    entryByDate.set(entry.date, entry)
  })

  function updateForm(nextPartialState) {
    setFormState((currentState) => ({ ...currentState, ...nextPartialState }))
  }

  function selectDate(dateValue) {
    setFormState(getFormStateFromEntry(entryByDate.get(dateValue), dateValue))
    setVisibleMonth(createMonthDate(dateValue))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const savedEntry = await saveCycleEntry({
      date: formState.date,
      flowLevel: formState.flowLevel,
      bloodColor: formState.bloodColor,
      clots: formState.clots,
      discharge: formState.discharge,
      breastTenderness: formState.breastTenderness,
      bloating: formState.bloating,
      cervicalPain: formState.cervicalPain,
      cycleDay: formState.cycleDay === '' ? '' : Number(formState.cycleDay),
    })

    if (!isDemoMode) {
      setCycleEntries((currentEntries) => [...currentEntries, savedEntry])
    }

    setSavedKey(Date.now())
    setTimeout(() => setSavedKey(null), 2800)
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  const calendarDays = getCalendarDays(visibleMonth)
  const todayKey = formatTodayForDateInput()

  return (
    <div style={{ width: '100%', maxWidth: '860px' }}>
      {savedKey !== null && (
        <div className="toast" key={savedKey} role="status" aria-live="polite">
          <span className="toast__dot" aria-hidden="true">
            ✓
          </span>
          Cycle entry saved
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
        <div className="tracker-header">
          <div>
            <h1 style={{ marginBottom: '6px' }}>Period tracker</h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              View your month at a glance and log the day you want to update.
            </p>
          </div>
        </div>

        {!hasEntries && (
          <div className="card">
            <EmptyState
              title="Start your cycle record"
              description="Save your first entry to build day-by-day context for flow, symptoms, and timing."
            />
          </div>
        )}

        <section className="tracker-calendar-shell">
          <div className="tracker-calendar-topline">
            <div>
              <p className="privacy-badge">Cycle calendar</p>
              <h2 style={{ marginTop: '10px' }}>{formatMonthLabel(visibleMonth)}</h2>
            </div>
            <div className="tracker-calendar-nav">
              <button
                type="button"
                className="tracker-calendar-nav__button"
                onClick={() =>
                  setVisibleMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className="tracker-calendar-nav__button"
                onClick={() =>
                  setVisibleMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="tracker-calendar-legend">
            {flowLevels.map((flowLevel) => (
              <div key={flowLevel} className="tracker-calendar-legend__item">
                <span className={`tracker-calendar-legend__swatch ${getFlowClass(flowLevel)}`} />
                <span>{flowLevel}</span>
              </div>
            ))}
          </div>

          <div className="cycle-calendar">
            {weekdayLabels.map((label) => (
              <div key={label} className="cycle-calendar__weekday">
                {label}
              </div>
            ))}

            {calendarDays.map((day) => {
              const entry = entryByDate.get(day.key)
              const isSelected = formState.date === day.key
              const isToday = day.key === todayKey

              return (
                <button
                  key={day.key}
                  type="button"
                  className={`cycle-calendar__day${day.inMonth ? '' : ' cycle-calendar__day--outside'}${isSelected ? ' cycle-calendar__day--selected' : ''}${isToday ? ' cycle-calendar__day--today' : ''}${entry ? ` ${getFlowClass(entry.flowLevel)}` : ''}`}
                  onClick={() => selectDate(day.key)}
                >
                  <span className="cycle-calendar__day-number">{day.date.getDate()}</span>
                  {entry && (
                    <>
                      <span className="cycle-calendar__day-meta">
                        <span className="cycle-calendar__day-meta-full">{entry.flowLevel}</span>
                        <span className="cycle-calendar__day-meta-compact">
                          {getCompactFlowLabel(entry.flowLevel)}
                        </span>
                      </span>
                      {entry.cycleDay && (
                        <span className="cycle-calendar__day-cycle">Day {entry.cycleDay}</span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="cycle-date">
            Date
          </label>
          <input
            id="cycle-date"
            type="date"
            value={formState.date}
            onChange={(event) => selectDate(event.target.value)}
          />
        </div>

        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <label className="field-label" htmlFor="cycle-day">
            Cycle day
            <span
              style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
                marginLeft: '8px',
              }}
            >
              Optional
            </span>
          </label>
          <input
            id="cycle-day"
            type="number"
            min="1"
            placeholder="e.g. 14"
            value={formState.cycleDay}
            onChange={(event) => updateForm({ cycleDay: event.target.value })}
          />
        </div>

        <SingleSelect
          label="Flow level"
          options={flowLevels}
          value={formState.flowLevel}
          onChange={(value) => updateForm({ flowLevel: value })}
        />

        <SingleSelect
          label="Blood color"
          options={bloodColors}
          value={formState.bloodColor}
          onChange={(value) => updateForm({ bloodColor: value })}
        />

        <SingleSelect
          label="Clots"
          options={clotOptions}
          value={formState.clots}
          onChange={(value) => updateForm({ clots: value })}
        />

        <SingleSelect
          label="Discharge"
          options={dischargeOptions}
          value={formState.discharge}
          onChange={(value) => updateForm({ discharge: value })}
        />

        <ScaleField
          id="breast-tenderness"
          label="Breast tenderness"
          value={formState.breastTenderness}
          onChange={(value) => updateForm({ breastTenderness: value })}
        />

        <ScaleField
          id="bloating"
          label="Bloating"
          value={formState.bloating}
          onChange={(value) => updateForm({ bloating: value })}
        />

        <ScaleField
          id="cervical-pain"
          label="Cervical pain"
          value={formState.cervicalPain}
          onChange={(value) => updateForm({ cervicalPain: value })}
        />

        <button type="submit" className="btn-primary" style={{ marginTop: '4px' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save cycle entry
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          🔒 Saved locally on your device
        </p>
      </form>
    </div>
  )
}

export default PeriodTrackerPage
