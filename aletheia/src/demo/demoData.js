const painBodyAreas = ['pelvic pain', 'lower back', 'hip', 'leg/sciatic', 'shoulder tip']
const digestiveBodyAreas = [
  'bloating',
  'nausea',
  'constipation',
  'diarrhea',
  'bladder urgency',
  'painful urination',
]
const systemicBodyAreas = [
  'fatigue',
  'brain fog',
  'headache',
  'chest pain',
  'shortness of breath',
  'mood changes',
]
const painTypes = ['sharp', 'dull', 'cramping', 'burning', 'stabbing', 'throbbing']
const bloodColors = ['bright red', 'dark red', 'brown', 'pink', 'orange', 'purple']
const flareOffsets = new Set([6, 7, 8, 24, 25, 26, 27, 44, 45, 46, 47, 48])

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function formatDateTime(date) {
  const copy = new Date(date)

  copy.setHours(10 + (copy.getDate() % 6), 30, 0, 0)

  return copy.toISOString().slice(0, 16)
}

function createDate(offset) {
  const date = new Date()

  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - (59 - offset))

  return date
}

function getCycleDay(offset) {
  return ((offset + 10) % 28) + 1
}

function getFlowLevel(cycleDay) {
  if (cycleDay === 1) {
    return 'moderate'
  }

  if (cycleDay === 2 || cycleDay === 3) {
    return 'heavy'
  }

  if (cycleDay === 4) {
    return 'very heavy'
  }

  if (cycleDay === 5 || cycleDay === 6) {
    return 'light'
  }

  if (cycleDay === 7) {
    return 'spotting'
  }

  return 'none'
}

function getBloodColor(flowLevel, cycleDay) {
  if (flowLevel === 'none') {
    return cycleDay > 23 ? 'brown' : bloodColors[cycleDay % bloodColors.length]
  }

  if (flowLevel === 'very heavy' || flowLevel === 'heavy') {
    return 'dark red'
  }

  if (flowLevel === 'moderate') {
    return 'bright red'
  }

  if (flowLevel === 'light') {
    return 'pink'
  }

  return 'brown'
}

function getClots(flowLevel) {
  if (flowLevel === 'very heavy') {
    return 'large clots'
  }

  if (flowLevel === 'heavy' || flowLevel === 'moderate') {
    return 'small clots'
  }

  return 'none'
}

function getDischarge(cycleDay, flowLevel) {
  if (flowLevel !== 'none') {
    return cycleDay > 5 ? 'brown/old blood' : 'none'
  }

  if (cycleDay >= 11 && cycleDay <= 15) {
    return 'clear'
  }

  if (cycleDay >= 16 && cycleDay <= 20) {
    return 'white/creamy'
  }

  if (cycleDay >= 21 && cycleDay <= 24) {
    return 'unusual texture'
  }

  return 'yellow'
}

function getScaleValue(base, offset) {
  return Math.max(0, Math.min(4, base + (offset % 2)))
}

function getPainScore(offset) {
  if (flareOffsets.has(offset)) {
    return 7 + (offset % 3)
  }

  return 2 + (offset % 3)
}

function getBodyAreas(offset, isFlare) {
  const symptoms = [
    painBodyAreas[offset % painBodyAreas.length],
    digestiveBodyAreas[(offset + 1) % digestiveBodyAreas.length],
    systemicBodyAreas[(offset + 2) % systemicBodyAreas.length],
  ]

  if (isFlare) {
    symptoms.push(
      painBodyAreas[(offset + 2) % painBodyAreas.length],
      digestiveBodyAreas[(offset + 3) % digestiveBodyAreas.length],
      systemicBodyAreas[(offset + 4) % systemicBodyAreas.length],
    )
  }

  return [...new Set(symptoms)]
}

function getPainTypes(offset, isFlare) {
  const types = [painTypes[offset % painTypes.length]]

  if (offset % 2 === 0) {
    types.push(painTypes[(offset + 2) % painTypes.length])
  }

  if (isFlare) {
    types.push(painTypes[(offset + 4) % painTypes.length])
  }

  return [...new Set(types)]
}

function getNotes(offset, isFlare) {
  if (isFlare) {
    return 'Severe pelvic pain flare with increased fatigue and bowel symptoms.'
  }

  if (offset % 5 === 0) {
    return 'Symptoms were present but manageable with rest and heat.'
  }

  return 'Baseline symptoms with mild interference during the day.'
}

export const symptomEntries = Array.from({ length: 60 }, (_, offset) => {
  const date = createDate(offset)
  const isFlare = flareOffsets.has(offset)

  return {
    id: `demo-symptom-${offset + 1}`,
    dateTime: formatDateTime(date),
    painScale: getPainScore(offset),
    painTypes: getPainTypes(offset, isFlare),
    bodyAreas: getBodyAreas(offset, isFlare),
    userSymptoms: offset % 4 === 0 ? ['pain with bowel movement'] : ['pain with sex'],
    notes: getNotes(offset, isFlare),
    photo: null,
  }
})

export const cycleEntries = Array.from({ length: 60 }, (_, offset) => {
  const date = createDate(offset)
  const cycleDay = getCycleDay(offset)
  const flowLevel = getFlowLevel(cycleDay)

  return {
    id: `demo-cycle-${offset + 1}`,
    date: formatDate(date),
    flowLevel,
    bloodColor: getBloodColor(flowLevel, cycleDay),
    clots: getClots(flowLevel),
    discharge: getDischarge(cycleDay, flowLevel),
    breastTenderness: getScaleValue(cycleDay >= 21 ? 2 : 0, offset),
    bloating: getScaleValue(flowLevel === 'none' ? 1 : 2, offset + 1),
    pelvicPain: getScaleValue(flareOffsets.has(offset) ? 2 : 1, offset),
    systemicPain: getScaleValue(flareOffsets.has(offset) ? 1 : 0, offset + 1),
    cycleDay,
  }
})
