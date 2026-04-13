const DEFAULT_HIGH_FREQUENCY_THRESHOLD = 0.7

function toDateString(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

function differenceInDays(start, end) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return Math.round((endDate - startDate) / millisecondsPerDay)
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10
}

function getEntrySymptoms(entry) {
  return [...(entry.painTypes || []), ...(entry.bodyAreas || []), ...(entry.userSymptoms || [])]
}

function getCyclePhase(cycleDay) {
  if (!Number.isFinite(cycleDay) || cycleDay < 1) {
    return null
  }

  if (cycleDay <= 5) {
    return 'menstrual'
  }

  if (cycleDay <= 13) {
    return 'follicular'
  }

  if (cycleDay <= 16) {
    return 'ovulatory'
  }

  return 'luteal'
}

export function detectFlare(entries) {
  const dailyPain = new Map()

  entries.forEach((entry) => {
    const date = toDateString(entry.dateTime)

    if (!date || !Number.isFinite(entry.painScale)) {
      return
    }

    const currentPain = dailyPain.get(date)

    if (currentPain === undefined || entry.painScale > currentPain) {
      dailyPain.set(date, entry.painScale)
    }
  })

  const sortedDays = [...dailyPain.entries()].sort(([leftDate], [rightDate]) =>
    leftDate.localeCompare(rightDate),
  )
  const flares = []
  let currentFlare = null

  sortedDays.forEach(([date, pain]) => {
    const isHighPain = pain >= 7

    if (!isHighPain) {
      if (currentFlare && currentFlare.duration >= 3) {
        flares.push(currentFlare)
      }

      currentFlare = null
      return
    }

    if (!currentFlare) {
      currentFlare = {
        startDate: date,
        endDate: date,
        duration: 1,
      }
      return
    }

    const dayGap = differenceInDays(currentFlare.endDate, date)

    if (dayGap === 1) {
      currentFlare = {
        startDate: currentFlare.startDate,
        endDate: date,
        duration: currentFlare.duration + 1,
      }
      return
    }

    if (currentFlare.duration >= 3) {
      flares.push(currentFlare)
    }

    currentFlare = {
      startDate: date,
      endDate: date,
      duration: 1,
    }
  })

  if (currentFlare && currentFlare.duration >= 3) {
    flares.push(currentFlare)
  }

  return flares
}

export function averagePainLast30Days(entries) {
  const datedEntries = entries
    .map((entry) => ({
      date: toDateString(entry.dateTime),
      painScale: entry.painScale,
    }))
    .filter(
      (entry) => entry.date && Number.isFinite(entry.painScale),
    )

  if (datedEntries.length === 0) {
    return 0
  }

  const latestDate = datedEntries.reduce((latest, entry) =>
    entry.date > latest ? entry.date : latest,
  datedEntries[0].date)
  const totalPain = datedEntries.reduce((sum, entry) => {
    const dayDifference = differenceInDays(entry.date, latestDate)

    return dayDifference >= 0 && dayDifference < 30 ? sum + entry.painScale : sum
  }, 0)
  const entryCount = datedEntries.filter((entry) => {
    const dayDifference = differenceInDays(entry.date, latestDate)

    return dayDifference >= 0 && dayDifference < 30
  }).length

  if (entryCount === 0) {
    return 0
  }

  return roundToOneDecimal(totalPain / entryCount)
}

export function topSymptoms(entries, n) {
  const symptomCounts = new Map()
  const totalEntries = entries.length

  if (totalEntries === 0 || n <= 0) {
    return []
  }

  entries.forEach((entry) => {
    const uniqueSymptoms = new Set(getEntrySymptoms(entry))

    uniqueSymptoms.forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1)
    })
  })

  return [...symptomCounts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, n)
    .map(([symptom, count]) => ({
      symptom,
      count,
      percentage: roundToOneDecimal(count / totalEntries),
    }))
}

export function highFrequencySymptoms(entries, threshold = DEFAULT_HIGH_FREQUENCY_THRESHOLD) {
  return topSymptoms(entries, Number.POSITIVE_INFINITY).filter(
    (item) => item.percentage > threshold,
  )
}

export function cyclePhaseSummary(symptomEntries, cycleEntries) {
  const phaseByDate = new Map()
  const phasePain = {
    menstrual: [],
    follicular: [],
    ovulatory: [],
    luteal: [],
  }

  cycleEntries.forEach((entry) => {
    const date = toDateString(entry.date)
    const phase = getCyclePhase(Number(entry.cycleDay))

    if (date && phase) {
      phaseByDate.set(date, phase)
    }
  })

  symptomEntries.forEach((entry) => {
    const date = toDateString(entry.dateTime)
    const phase = phaseByDate.get(date)

    if (phase && Number.isFinite(entry.painScale)) {
      phasePain[phase].push(entry.painScale)
    }
  })

  return {
    menstrual:
      phasePain.menstrual.length > 0
        ? roundToOneDecimal(
            phasePain.menstrual.reduce((sum, pain) => sum + pain, 0) / phasePain.menstrual.length,
          )
        : 0,
    follicular:
      phasePain.follicular.length > 0
        ? roundToOneDecimal(
            phasePain.follicular.reduce((sum, pain) => sum + pain, 0) /
              phasePain.follicular.length,
          )
        : 0,
    ovulatory:
      phasePain.ovulatory.length > 0
        ? roundToOneDecimal(
            phasePain.ovulatory.reduce((sum, pain) => sum + pain, 0) /
              phasePain.ovulatory.length,
          )
        : 0,
    luteal:
      phasePain.luteal.length > 0
        ? roundToOneDecimal(
            phasePain.luteal.reduce((sum, pain) => sum + pain, 0) / phasePain.luteal.length,
          )
        : 0,
  }
}
