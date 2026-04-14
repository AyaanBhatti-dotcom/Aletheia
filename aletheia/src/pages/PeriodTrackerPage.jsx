import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LockedState from '../components/LockedState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import WarningNotice from '../components/WarningNotice.jsx'
import { JournalLockedError } from '../crypto/crypto.js'
import { useDemo } from '../context/DemoContext.jsx'
import { useTour } from '../context/TourContext.jsx'
import { consumeJournalWarnings, getCycleEntries, saveCycleEntry } from '../db/db.js'
import { cycleEntries as demoCycleEntries } from '../demo/demoData.js'
import { getCyclePhase } from '../patterns/engine.js'

const flowLevels = ['none', 'spotting', 'light', 'moderate', 'heavy', 'very heavy']
const bloodColors = ['bright red', 'dark red', 'brown', 'pink', 'purple', 'green']
const clotOptions = ['none', 'small clots', 'large clots']
const dischargeOptions = [
  'none',
  'egg white',
  'pasty',
  'watery cervical fluid',
  'white/creamy',
  'yellow',
  'brown/old blood',
  'unusual texture',
]
const severityLabels = ['None', 'Very mild', 'Mild', 'Noticeable', 'Moderate', 'Uncomfortable', 'Distressing', 'Severe', 'Intense', 'Very intense', 'Extreme']
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BLEEDING_FLOW_LEVELS = new Set(['spotting', 'light', 'moderate', 'heavy', 'very heavy'])
const MS_PER_DAY = 24 * 60 * 60 * 1000

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

function formatLongDate(value) {
  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatFullDate(value) {
  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatSavedLogLabel(savedAt, fallbackDate) {
  const value = savedAt || fallbackDate

  if (!value) {
    return 'Saved entry'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Saved entry'
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSavedLogCompactLabel(savedAt, fallbackDate) {
  const value = savedAt || fallbackDate

  if (!value) {
    return 'Saved'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Saved'
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
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

function parseDateKey(value) {
  return new Date(`${value}T12:00:00`)
}

function addDays(value, days) {
  const date = parseDateKey(value)

  date.setDate(date.getDate() + days)

  return formatDateKey(date)
}

function differenceInDays(start, end) {
  return Math.round((parseDateKey(end) - parseDateKey(start)) / MS_PER_DAY)
}

function isDateWithinRange(value, start, end) {
  return value >= start && value <= end
}

function isBleedingDay(entry) {
  return BLEEDING_FLOW_LEVELS.has(entry?.flowLevel)
}

function roundToNearestInt(value) {
  return Math.round(value)
}

function formatListValue(value, emptyLabel = 'Not logged') {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : emptyLabel
  }

  return value || emptyLabel
}

function getUniqueCycleEntries(entries) {
  const latestByDate = new Map()

  entries.forEach((entry) => {
    if (entry?.date) {
      latestByDate.set(entry.date, entry)
    }
  })

  return [...latestByDate.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function analyzeCycle(entries) {
  const sortedEntries = getUniqueCycleEntries(entries)
  const periodStarts = []
  const periodLengths = []
  let currentPeriodStart = null
  let currentPeriodLength = 0
  let previousBleedingDate = null

  sortedEntries.forEach((entry) => {
    const bleeding = isBleedingDay(entry)

    if (!bleeding) {
      if (currentPeriodStart) {
        periodStarts.push(currentPeriodStart)
        periodLengths.push(currentPeriodLength)
        currentPeriodStart = null
        currentPeriodLength = 0
      }

      return
    }

    const isNewPeriod = !previousBleedingDate || differenceInDays(previousBleedingDate, entry.date) > 1

    if (isNewPeriod) {
      if (currentPeriodStart) {
        periodStarts.push(currentPeriodStart)
        periodLengths.push(currentPeriodLength)
      }

      currentPeriodStart = entry.date
      currentPeriodLength = 1
    } else {
      currentPeriodLength += 1
    }

    previousBleedingDate = entry.date
  })

  if (currentPeriodStart) {
    periodStarts.push(currentPeriodStart)
    periodLengths.push(currentPeriodLength)
  }

  const cycleLengths = []

  for (let index = 1; index < periodStarts.length; index += 1) {
    const length = differenceInDays(periodStarts[index - 1], periodStarts[index])

    if (length >= 18 && length <= 45) {
      cycleLengths.push(length)
    }
  }

  const recentCycleLengths = cycleLengths.slice(-6)
  const recentPeriodLengths = periodLengths.slice(-6)
  const averageCycleLength = recentCycleLengths.length > 0
    ? roundToNearestInt(recentCycleLengths.reduce((sum, value) => sum + value, 0) / recentCycleLengths.length)
    : null
  const averagePeriodLength = recentPeriodLengths.length > 0
    ? Math.max(2, Math.min(8, roundToNearestInt(recentPeriodLengths.reduce((sum, value) => sum + value, 0) / recentPeriodLengths.length)))
    : null
  const lastPeriodStart = periodStarts.at(-1) || null
  const predictedNextPeriodStart = lastPeriodStart && averageCycleLength
    ? addDays(lastPeriodStart, averageCycleLength)
    : null
  const predictedPeriodEnd = predictedNextPeriodStart && averagePeriodLength
    ? addDays(predictedNextPeriodStart, averagePeriodLength - 1)
    : null
  const predictedOvulation = predictedNextPeriodStart
    ? addDays(predictedNextPeriodStart, -14)
    : null
  const fertileWindowStart = predictedOvulation ? addDays(predictedOvulation, -5) : null
  const fertileWindowEnd = predictedOvulation ? addDays(predictedOvulation, 1) : null

  return {
    sortedEntries,
    averageCycleLength,
    averagePeriodLength,
    periodStarts,
    cycleLengths: recentCycleLengths,
    lastPeriodStart,
    predictedNextPeriodStart,
    predictedPeriodEnd,
    predictedOvulation,
    fertileWindowStart,
    fertileWindowEnd,
    hasPrediction: Boolean(lastPeriodStart && averageCycleLength && averagePeriodLength),
  }
}

function formatPhaseName(phase) {
  if (!phase) {
    return 'Not enough data'
  }

  return `${phase.charAt(0).toUpperCase()}${phase.slice(1)} phase`
}

function getSelectedCycleInsights(selectedDate, selectedEntry, cycleAnalysis) {
  if (!selectedDate) {
    return {
      phase: null,
      cycleDay: null,
      source: null,
    }
  }

  const explicitCycleDay = Number(selectedEntry?.cycleDay)

  if (Number.isFinite(explicitCycleDay) && explicitCycleDay > 0) {
    return {
      phase: getCyclePhase(explicitCycleDay),
      cycleDay: explicitCycleDay,
      source: 'logged',
    }
  }

  const relevantStart = [...cycleAnalysis.periodStarts]
    .reverse()
    .find((periodStart) => periodStart <= selectedDate)

  if (!relevantStart) {
    return {
      phase: null,
      cycleDay: null,
      source: null,
    }
  }

  const inferredCycleDay = differenceInDays(relevantStart, selectedDate) + 1

  if (inferredCycleDay < 1 || inferredCycleDay > 60) {
    return {
      phase: null,
      cycleDay: null,
      source: null,
    }
  }

  return {
    phase: getCyclePhase(inferredCycleDay),
    cycleDay: inferredCycleDay,
    source: 'estimated',
  }
}

function getCalendarPrediction(dayKey, cycleAnalysis, hasLoggedEntry) {
  if (hasLoggedEntry || !cycleAnalysis.hasPrediction) {
    return { marker: null, label: '' }
  }

  if (
    cycleAnalysis.predictedNextPeriodStart &&
    cycleAnalysis.predictedPeriodEnd &&
    isDateWithinRange(dayKey, cycleAnalysis.predictedNextPeriodStart, cycleAnalysis.predictedPeriodEnd)
  ) {
    return { marker: 'period', label: 'Expected period' }
  }

  if (dayKey === cycleAnalysis.predictedOvulation) {
    return { marker: 'ovulation', label: 'Estimated ovulation' }
  }

  if (
    cycleAnalysis.fertileWindowStart &&
    cycleAnalysis.fertileWindowEnd &&
    isDateWithinRange(dayKey, cycleAnalysis.fertileWindowStart, cycleAnalysis.fertileWindowEnd)
  ) {
    return { marker: 'fertile', label: 'Estimated fertile window' }
  }

  return { marker: null, label: '' }
}

function replaceEntryForDate(entries, savedEntry) {
  const nextEntries = entries.filter((entry) => entry.date !== savedEntry.date)

  nextEntries.push(savedEntry)

  return nextEntries
}

function getFlowClass(flowLevel) {
  return flowLevel ? `cycle-calendar__day--${flowLevel.replace(/\s+/g, '-')}` : ''
}

function getCompactPredictionLabel(marker) {
  switch (marker) {
    case 'period':
      return 'Period'
    case 'fertile':
      return 'Fertile'
    case 'ovulation':
      return 'Ovu'
    default:
      return ''
  }
}

function getDefaultFormState(dateValue) {
  return {
    id: null,
    date: dateValue,
    flowLevel: 'none',
    bloodColor: [],
    clots: [],
    discharge: [],
    breastTenderness: 0,
    bloating: 0,
    pelvicPain: 0,
    systemicPain: 0,
    cycleDay: '',
  }
}

function normalizeMultiSelectValue(value) {
  if (Array.isArray(value)) {
    const normalizedValues = value.filter((item) => typeof item === 'string' && item.trim().length > 0)
    return normalizedValues
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value]
  }

  return []
}

function getFormStateFromEntry(entry, dateValue) {
  if (!entry) {
    return getDefaultFormState(dateValue)
  }

  return {
    id: entry.id || null,
    date: dateValue,
    flowLevel: entry.flowLevel || 'none',
    bloodColor: normalizeMultiSelectValue(entry.bloodColor),
    clots: normalizeMultiSelectValue(entry.clots),
    discharge: normalizeMultiSelectValue(entry.discharge),
    breastTenderness: entry.breastTenderness ?? 0,
    bloating: entry.bloating ?? 0,
    pelvicPain: entry.pelvicPain ?? entry.cervicalPain ?? 0,
    systemicPain: entry.systemicPain ?? 0,
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

function MultiSelect({ options, values, onChange, label }) {
  function toggleValue(option) {
    const nextValues = values.includes(option)
      ? values.filter((value) => value !== option)
      : [...values, option]

    onChange(nextValues)
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '12px' }}>
      <div className="field-label">{label}</div>
      <div className="pill-group" role="group" aria-label={label}>
        {options.map((option) => (
          <PillToggle
            key={option}
            label={option}
            active={values.includes(option)}
            onToggle={() => toggleValue(option)}
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
          {severityLabels[value] || ''}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={sliderBackground(value, 0, 10)}
        aria-label={`${label}: ${value}, ${severityLabels[value] || ''}`}
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
        <span>10 · Extreme</span>
      </div>
    </div>
  )
}

function PeriodTrackerPage() {
  const { isDemoMode } = useDemo()
  const { activeTourTarget, isTourOpen } = useTour()
  const [formState, setFormState] = useState(() => getDefaultFormState(formatTodayForDateInput()))
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const [savedKey, setSavedKey] = useState(null)
  const [cycleDayError, setCycleDayError] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => createMonthDate(formatTodayForDateInput()))
  const [isLocked, setIsLocked] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isDaySpotlightOpen, setIsDaySpotlightOpen] = useState(false)
  const [warnings, setWarnings] = useState([])
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
      setIsLocked(false)
      setLoadError('')
      setWarnings(consumeJournalWarnings())
      setLoadedSource(sourceKey)
    })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        if (error instanceof JournalLockedError) {
          setIsLocked(true)
          setLoadError('')
          setWarnings([])
          setLoadedSource(sourceKey)
          return
        }

        setIsLocked(false)
        setWarnings([])
        setLoadError('Something went wrong loading your data. Please try again.')
        setLoadedSource(sourceKey)
      })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  useEffect(() => {
    if (!isDaySpotlightOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isDaySpotlightOpen])

  const entryByDate = new Map()
  const uniqueCycleEntries = getUniqueCycleEntries(cycleEntries)
  uniqueCycleEntries.forEach((entry) => {
    entryByDate.set(entry.date, entry)
  })

  function updateForm(nextPartialState) {
    setFormState((currentState) => ({ ...currentState, ...nextPartialState }))
  }

  function selectDate(dateValue) {
    setFormState(getFormStateFromEntry(entryByDate.get(dateValue), dateValue))
    setVisibleMonth(createMonthDate(dateValue))
  }

  function handleCalendarDayClick(dateValue) {
    selectDate(dateValue)
    setIsDaySpotlightOpen(true)
  }

  function closeDaySpotlight() {
    setIsDaySpotlightOpen(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formState.cycleDay !== '') {
      const parsed = parseInt(formState.cycleDay, 10)
      if (!Number.isInteger(parsed) || String(parsed) !== String(formState.cycleDay).trim()) {
        setCycleDayError('Cycle day must be a whole number.')
        return
      }
    }
    setCycleDayError('')

    const savedEntry = await saveCycleEntry({
      id: formState.id,
      date: formState.date,
      flowLevel: formState.flowLevel,
      bloodColor: formState.bloodColor,
      clots: formState.clots,
      discharge: formState.discharge,
      breastTenderness: formState.breastTenderness,
      bloating: formState.bloating,
      pelvicPain: formState.pelvicPain,
      systemicPain: formState.systemicPain,
      cycleDay: formState.cycleDay === '' ? '' : parseInt(formState.cycleDay, 10),
    })

    if (!isDemoMode) {
      setCycleEntries((currentEntries) => replaceEntryForDate(currentEntries, savedEntry))
      setFormState(getFormStateFromEntry(savedEntry, savedEntry.date))
    }

    setSavedKey(Date.now())
    setTimeout(() => setSavedKey(null), 2800)
  }

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  if (isLocked) {
    return (
      <LockedState
        title="Your journal is locked"
        description="Unlock it in Settings before viewing or updating your cycle calendar."
      />
    )
  }

  if (loadError) {
    return <ErrorState description={loadError} />
  }

  const calendarDays = getCalendarDays(visibleMonth)
  const todayKey = formatTodayForDateInput()
  const selectedEntry = entryByDate.get(formState.date)
  const cycleAnalysis = analyzeCycle(cycleEntries)
  const selectedCycleInsights = getSelectedCycleInsights(formState.date, selectedEntry, cycleAnalysis)
  const selectedPrediction = getCalendarPrediction(formState.date, cycleAnalysis, Boolean(selectedEntry))
  const forecastCards = [
    {
      label: 'Current phase',
      value: formatPhaseName(selectedCycleInsights.phase),
      note:
        selectedCycleInsights.cycleDay
          ? `Cycle day ${selectedCycleInsights.cycleDay}${selectedCycleInsights.source === 'estimated' ? ' · estimated from bleeding history' : ''}`
          : 'Log flow or cycle day to improve this view.',
    },
    {
      label: 'Next period',
      value: cycleAnalysis.predictedNextPeriodStart ? formatLongDate(cycleAnalysis.predictedNextPeriodStart) : 'Not enough data',
      note:
        cycleAnalysis.predictedNextPeriodStart && cycleAnalysis.averagePeriodLength
          ? `Estimated ${cycleAnalysis.averagePeriodLength}-day bleed`
          : 'Needs at least two logged periods.',
    },
    {
      label: 'Ovulation',
      value: cycleAnalysis.predictedOvulation ? formatLongDate(cycleAnalysis.predictedOvulation) : 'Not enough data',
      note:
        cycleAnalysis.fertileWindowStart && cycleAnalysis.fertileWindowEnd
          ? `Fertile window ${formatLongDate(cycleAnalysis.fertileWindowStart)} to ${formatLongDate(cycleAnalysis.fertileWindowEnd)}`
          : 'Shown once a cycle estimate is available.',
    },
    {
      label: 'Average cycle',
      value: cycleAnalysis.averageCycleLength ? `${cycleAnalysis.averageCycleLength} days` : 'Not enough data',
      note:
        cycleAnalysis.cycleLengths.length > 0
          ? `Based on ${cycleAnalysis.cycleLengths.length} recent cycle${cycleAnalysis.cycleLengths.length > 1 ? 's' : ''}`
          : 'Needs recurring bleed starts to estimate.',
    },
  ]

  return (
    <div className="page-shell" style={{ maxWidth: '860px' }}>
      <WarningNotice warnings={warnings} />
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

        <section className="tracker-forecast">
          <div className="tracker-forecast__header">
            <div>
              <p className="privacy-badge">Cycle estimates</p>
              <h2 style={{ marginTop: '10px', marginBottom: '6px' }}>Phases, ovulation, and next period</h2>
            </div>
            <p className="tracker-forecast__copy">
              Estimates are based on recorded bleeding patterns and should be treated as directional, not exact.
            </p>
          </div>

          <div className="tracker-forecast__grid">
            {forecastCards.map((card) => (
              <div key={card.label} className="tracker-forecast__card">
                <span className="tracker-forecast__label">{card.label}</span>
                <strong className="tracker-forecast__value">{card.value}</strong>
                <p className="tracker-forecast__note">{card.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          data-tour-target="cycle-calendar"
          className={`tracker-calendar-shell${isTourOpen && activeTourTarget === 'cycle-calendar' ? ' tour-highlight' : ''}`}
        >
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
            <div className="tracker-calendar-legend__item">
              <span className="tracker-calendar-legend__swatch tracker-calendar-legend__swatch--period" />
              <span>Expected period</span>
            </div>
            <div className="tracker-calendar-legend__item">
              <span className="tracker-calendar-legend__swatch tracker-calendar-legend__swatch--fertile" />
              <span>Fertile window</span>
            </div>
            <div className="tracker-calendar-legend__item">
              <span className="tracker-calendar-legend__swatch tracker-calendar-legend__swatch--ovulation" />
              <span>Ovulation</span>
            </div>
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
              const prediction = getCalendarPrediction(day.key, cycleAnalysis, Boolean(entry))

              return (
                <button
                  key={day.key}
                  type="button"
                  className={`cycle-calendar__day${day.inMonth ? '' : ' cycle-calendar__day--outside'}${isSelected ? ' cycle-calendar__day--selected' : ''}${isToday ? ' cycle-calendar__day--today' : ''}${entry ? ` ${getFlowClass(entry.flowLevel)}` : ''}${prediction.marker ? ` cycle-calendar__day--predicted-${prediction.marker}` : ''}`}
                  onClick={() => handleCalendarDayClick(day.key)}
                  aria-label={`${formatLongDate(day.key)}${prediction.label ? `. ${prediction.label}.` : ''}`}
                >
                  <span className="cycle-calendar__day-number">{day.date.getDate()}</span>
                  {entry && (
                    <>
                      <span className="cycle-calendar__day-meta">
                        <span className="cycle-calendar__day-meta-full">
                          {formatSavedLogLabel(entry.savedAt, entry.date)}
                        </span>
                        <span className="cycle-calendar__day-meta-compact">
                          {formatSavedLogCompactLabel(entry.savedAt, entry.date)}
                        </span>
                      </span>
                      {entry.cycleDay && (
                        <span className="cycle-calendar__day-cycle">Day {entry.cycleDay}</span>
                      )}
                    </>
                  )}
                  {!entry && prediction.label && (
                    <span className="cycle-calendar__day-prediction">
                      <span className="cycle-calendar__day-prediction-full">{prediction.label}</span>
                      <span className="cycle-calendar__day-prediction-compact">
                        {getCompactPredictionLabel(prediction.marker)}
                      </span>
                    </span>
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
          {cycleDayError && (
            <p style={{ fontSize: '13px', color: 'var(--color-danger, #c0392b)', fontWeight: 600, margin: 0 }}>
              {cycleDayError}
            </p>
          )}
        </div>

        <SingleSelect
          label="Flow level"
          options={flowLevels}
          value={formState.flowLevel}
          onChange={(value) => updateForm({ flowLevel: value })}
        />

        <MultiSelect
          label="Blood color"
          options={bloodColors}
          values={formState.bloodColor}
          onChange={(value) => updateForm({ bloodColor: value })}
        />

        <MultiSelect
          label="Clots"
          options={clotOptions}
          values={formState.clots}
          onChange={(value) => updateForm({ clots: value })}
        />

        <MultiSelect
          label="Discharge"
          options={dischargeOptions}
          values={formState.discharge}
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
          id="pelvic-pain"
          label="Pelvic pain"
          value={formState.pelvicPain}
          onChange={(value) => updateForm({ pelvicPain: value })}
        />

        <ScaleField
          id="systemic-pain"
          label="Systemic pain"
          value={formState.systemicPain}
          onChange={(value) => updateForm({ systemicPain: value })}
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

      {isDaySpotlightOpen && createPortal(
        <div
          className="tracker-day-spotlight-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Selected day details"
          aria-live="polite"
          onClick={closeDaySpotlight}
        >
          <div className="tracker-day-spotlight" onClick={(event) => event.stopPropagation()}>
            <div className="tracker-day-spotlight__header">
              <div>
                <p className="privacy-badge">
                  {selectedEntry ? formatSavedLogLabel(selectedEntry.savedAt, selectedEntry.date) : 'Selected day'}
                </p>
                <h3 className="tracker-day-spotlight__title">{formatFullDate(formState.date)}</h3>
                <p className="tracker-day-spotlight__copy">
                  {selectedEntry
                    ? selectedCycleInsights.cycleDay
                      ? `Cycle day ${selectedCycleInsights.cycleDay} in your ${formatPhaseName(selectedCycleInsights.phase).toLowerCase()} phase.`
                      : `Saved entry in your ${formatPhaseName(selectedCycleInsights.phase).toLowerCase()} phase.`
                    : selectedPrediction.label || 'Pick any day to review what was logged or what the calendar estimates there.'}
                </p>
              </div>
              <div className="tracker-day-spotlight__marker">
                <button
                  type="button"
                  className="tracker-day-spotlight__close"
                  onClick={closeDaySpotlight}
                  aria-label="Close selected day details"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
                <span className="tracker-day-spotlight__marker-label">Status</span>
                <strong className="tracker-day-spotlight__marker-value">
                  {selectedEntry ? (formState.flowLevel === 'none' ? 'Saved entry' : formState.flowLevel) : 'No saved entry'}
                </strong>
              </div>
            </div>

            <div className="tracker-day-spotlight__stats">
              <div className="tracker-day-spotlight__stat">
                <span className="tracker-day-spotlight__stat-label">Flow</span>
                <strong className="tracker-day-spotlight__stat-value">
                  {selectedEntry ? (formState.flowLevel === 'none' ? 'Logged' : formState.flowLevel) : 'Not logged'}
                </strong>
              </div>
              <div className="tracker-day-spotlight__stat">
                <span className="tracker-day-spotlight__stat-label">Cycle day</span>
                <strong className="tracker-day-spotlight__stat-value">{formState.cycleDay || '—'}</strong>
              </div>
              <div className="tracker-day-spotlight__stat">
                <span className="tracker-day-spotlight__stat-label">Phase</span>
                <strong className="tracker-day-spotlight__stat-value">{formatPhaseName(selectedCycleInsights.phase)}</strong>
              </div>
              <div className="tracker-day-spotlight__stat">
                <span className="tracker-day-spotlight__stat-label">Calendar note</span>
                <strong className="tracker-day-spotlight__stat-value">{selectedPrediction.label || 'Saved day'}</strong>
              </div>
            </div>

            <div className="tracker-day-spotlight__grid">
              <div className="tracker-day-spotlight__section">
                <span className="tracker-day-spotlight__section-label">Logged details</span>
                <div className="tracker-day-spotlight__list">
                  <div className="tracker-day-spotlight__row">
                    <span>Blood</span>
                    <strong>{formatListValue(formState.bloodColor)}</strong>
                  </div>
                  <div className="tracker-day-spotlight__row">
                    <span>Clots</span>
                    <strong>{formatListValue(formState.clots)}</strong>
                  </div>
                  <div className="tracker-day-spotlight__row">
                    <span>Discharge</span>
                    <strong>{formatListValue(formState.discharge)}</strong>
                  </div>
                </div>
              </div>

              <div className="tracker-day-spotlight__section">
                <span className="tracker-day-spotlight__section-label">Body ratings</span>
                <div className="tracker-day-spotlight__ratings">
                  <div className="tracker-day-spotlight__rating">
                    <span>Breast</span>
                    <strong>{formState.breastTenderness}/10</strong>
                  </div>
                  <div className="tracker-day-spotlight__rating">
                    <span>Bloating</span>
                    <strong>{formState.bloating}/10</strong>
                  </div>
                  <div className="tracker-day-spotlight__rating">
                    <span>Pelvic</span>
                    <strong>{formState.pelvicPain}/10</strong>
                  </div>
                  <div className="tracker-day-spotlight__rating">
                    <span>Systemic</span>
                    <strong>{formState.systemicPain}/10</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default PeriodTrackerPage
