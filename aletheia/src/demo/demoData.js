const painBodyAreas = ['pelvic pain', 'lower back', 'hip', 'leg/sciatic', 'shoulder']
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
const cycleLengths = [24, 23, 25]

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function formatDateTime(date) {
  const copy = new Date(date)

  copy.setHours(8 + (copy.getDate() % 8), 20, 0, 0)

  return copy.toISOString().slice(0, 16)
}

function createDate(offset) {
  const date = new Date()

  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - (59 - offset))

  return date
}

function getCycleContext(offset) {
  let dayOffset = offset + 4
  let cycleIndex = 0

  while (dayOffset >= cycleLengths[cycleIndex % cycleLengths.length]) {
    dayOffset -= cycleLengths[cycleIndex % cycleLengths.length]
    cycleIndex += 1
  }

  const cycleLength = cycleLengths[cycleIndex % cycleLengths.length]
  const cycleDay = dayOffset + 1
  const ovulationDay = Math.max(10, cycleLength - 14)
  const periodEndDay = cycleLength <= 23 ? 8 : 7

  return {
    cycleDay,
    cycleIndex,
    cycleLength,
    ovulationDay,
    periodEndDay,
  }
}

function getFlowLevel(cycleDay, periodEndDay) {
  if (cycleDay === 1 || cycleDay === 2) {
    return 'very heavy'
  }

  if (cycleDay === 3 || cycleDay === 4) {
    return 'heavy'
  }

  if (cycleDay === 5 || cycleDay === 6) {
    return 'moderate'
  }

  if (cycleDay === 7) {
    return 'light'
  }

  if (cycleDay <= periodEndDay) {
    return 'spotting'
  }

  if (cycleDay >= 11 && cycleDay <= 13) {
    return 'spotting'
  }

  return 'none'
}

function getBloodColor(flowLevel, cycleDay) {
  if (flowLevel === 'very heavy') {
    return ['dark red', 'bright red']
  }

  if (flowLevel === 'heavy') {
    return ['dark red']
  }

  if (flowLevel === 'moderate') {
    return ['bright red']
  }

  if (flowLevel === 'light') {
    return ['pink', 'brown']
  }

  if (flowLevel === 'spotting') {
    return cycleDay >= 11 ? ['pink', 'brown'] : ['brown']
  }

  if (cycleDay >= 20) {
    return ['brown']
  }

  return []
}

function getClots(flowLevel) {
  if (flowLevel === 'very heavy') {
    return ['large clots']
  }

  if (flowLevel === 'heavy' || flowLevel === 'moderate') {
    return ['small clots']
  }

  return []
}

function getDischarge(cycleDay, flowLevel, ovulationDay) {
  if (flowLevel !== 'none') {
    return cycleDay >= 6 ? ['brown/old blood'] : []
  }

  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay) {
    return ['egg white', 'watery cervical fluid']
  }

  if (cycleDay === ovulationDay + 1) {
    return ['watery cervical fluid']
  }

  if (cycleDay >= ovulationDay + 2 && cycleDay <= ovulationDay + 5) {
    return ['white/creamy']
  }

  if (cycleDay >= ovulationDay + 6) {
    return ['pasty']
  }

  return ['yellow']
}

function clampScore(value) {
  return Math.max(0, Math.min(10, value))
}

function getPainScore(cycleDay, periodEndDay, ovulationDay) {
  if (cycleDay <= 2) {
    return 10
  }

  if (cycleDay <= 4) {
    return 9
  }

  if (cycleDay <= periodEndDay) {
    return 7
  }

  if (cycleDay === ovulationDay) {
    return 8
  }

  if (cycleDay === ovulationDay - 1 || cycleDay === ovulationDay + 1) {
    return 7
  }

  if (cycleDay >= periodEndDay + 1 && cycleDay <= ovulationDay - 3) {
    return 4
  }

  if (cycleDay >= ovulationDay + 5) {
    return cycleDay >= ovulationDay + 8 ? 8 : 6
  }

  return 5
}

function getBodyAreas(cycleDay, periodEndDay, ovulationDay) {
  const symptoms = [painBodyAreas[0], painBodyAreas[1]]

  if (cycleDay <= periodEndDay) {
    symptoms.push(painBodyAreas[3], digestiveBodyAreas[5], systemicBodyAreas[0])

    if (cycleDay <= 4) {
      symptoms.push(digestiveBodyAreas[1], digestiveBodyAreas[3], systemicBodyAreas[1])
    } else {
      symptoms.push(digestiveBodyAreas[2])
    }
  } else if (cycleDay === ovulationDay || cycleDay === ovulationDay - 1) {
    symptoms.push(painBodyAreas[2], digestiveBodyAreas[4], digestiveBodyAreas[0])
  } else if (cycleDay >= ovulationDay + 5) {
    symptoms.push(digestiveBodyAreas[0], systemicBodyAreas[0], systemicBodyAreas[1], systemicBodyAreas[5])

    if (cycleDay >= ovulationDay + 8) {
      symptoms.push(digestiveBodyAreas[2])
    }
  } else {
    symptoms.push(systemicBodyAreas[0])
  }

  return [...new Set(symptoms)]
}

function getPainTypes(cycleDay, periodEndDay, ovulationDay) {
  if (cycleDay <= 3) {
    return [painTypes[2], painTypes[5], painTypes[1]]
  }

  if (cycleDay <= periodEndDay) {
    return [painTypes[2], painTypes[3]]
  }

  if (cycleDay === ovulationDay || cycleDay === ovulationDay - 1) {
    return [painTypes[0], painTypes[4]]
  }

  if (cycleDay >= ovulationDay + 5) {
    return [painTypes[1], painTypes[2], painTypes[3]]
  }

  return [painTypes[1], painTypes[2]]
}

function getUserSymptoms(cycleDay, periodEndDay, ovulationDay) {
  if (cycleDay <= 3) {
    return ['pain with bowel movement', 'pain with sex']
  }

  if (cycleDay <= periodEndDay) {
    return ['painful urination']
  }

  if (cycleDay === ovulationDay) {
    return ['mid-cycle spotting', 'pain with sex']
  }

  if (cycleDay >= ovulationDay + 5) {
    return ['endo belly', 'brain fog']
  }

  return ['chronic pelvic pain']
}

function getNotes(cycleDay, periodEndDay, ovulationDay, cycleLength) {
  if (cycleDay === 1) {
    return 'Period hit hard before sunrise. Heavy bleeding, clots, deep pelvic pain into my low back and legs. Changed pad constantly and bowel movements hurt.'
  }

  if (cycleDay === 2) {
    return 'Still very heavy today. OTC meds barely touched it. Felt shaky, nauseated, and wiped out after walking to the kitchen.'
  }

  if (cycleDay <= 4) {
    return 'Bleeding still intense with quarter-sized clots. Cramping stayed sharp and throbbing, plus painful urination and a lot of pelvic pressure.'
  }

  if (cycleDay <= periodEndDay) {
    return 'Flow finally eased but the pain kept going. Brown spotting, bowel pain, and a tender low-back ache most of the afternoon.'
  }

  if (cycleDay <= periodEndDay + 2) {
    return 'Small window of relief after the period. Still had baseline pelvic soreness, but I could function without curling around a heating pad.'
  }

  if (cycleDay === ovulationDay - 1) {
    return 'Pelvis started feeling pinchy and swollen heading into ovulation. Not full flare level, but definitely building.'
  }

  if (cycleDay === ovulationDay) {
    return 'Ovulation pain was sharp and stabbing on one side today, enough to stop me mid-step. Light spotting showed up by evening.'
  }

  if (cycleDay >= ovulationDay + 1 && cycleDay <= ovulationDay + 4) {
    return 'Pain settled back into the usual dull ache. Energy was better than luteal days, but pelvic heaviness never fully left.'
  }

  if (cycleDay >= cycleLength - 6) {
    return 'Classic endo belly phase. Abdomen felt swollen and hard, fatigue was rough, and mood dipped as the next bleed started creeping in early.'
  }

  if (cycleDay >= cycleLength - 9) {
    return 'Pre-period pain started early again. More bloating, brain fog, and low pelvic cramping than a typical PMS week.'
  }

  return 'Baseline chronic pelvic pain today with some fatigue. Manageable enough to keep moving, but never fully gone.'
}

function getCycleRatings(cycleDay, periodEndDay, ovulationDay, cycleLength) {
  const menstrualPeak = cycleDay <= 2 ? 10 : cycleDay <= 4 ? 8 : cycleDay <= periodEndDay ? 6 : 0
  const ovulationPeak = cycleDay === ovulationDay ? 8 : cycleDay === ovulationDay - 1 || cycleDay === ovulationDay + 1 ? 6 : 0
  const lutealBuildup = cycleDay >= cycleLength - 7 ? clampScore(5 + (cycleDay - (cycleLength - 7))) : 0

  return {
    breastTenderness: clampScore(Math.max(2, cycleDay >= cycleLength - 6 ? 6 + ((cycleDay + 1) % 3) : 2)),
    bloating: clampScore(Math.max(menstrualPeak - 2, lutealBuildup, cycleDay === ovulationDay ? 6 : 3)),
    pelvicPain: clampScore(Math.max(4, menstrualPeak, ovulationPeak, cycleDay >= cycleLength - 5 ? 7 : 4)),
    systemicPain: clampScore(Math.max(3, cycleDay <= periodEndDay ? 7 : 0, cycleDay >= cycleLength - 6 ? 6 : 0, cycleDay === ovulationDay ? 5 : 0)),
  }
}

export const symptomEntries = Array.from({ length: 60 }, (_, offset) => {
  const date = createDate(offset)
  const { cycleDay, cycleLength, ovulationDay, periodEndDay } = getCycleContext(offset)
  const bodyAreas = getBodyAreas(cycleDay, periodEndDay, ovulationDay)
  const userSymptoms = getUserSymptoms(cycleDay, periodEndDay, ovulationDay)
  const painScale = getPainScore(cycleDay, periodEndDay, ovulationDay)
  const symptomPainLevels = [...bodyAreas, ...userSymptoms].reduce((levels, symptom, index) => {
    const nextPain = Math.max(1, Math.min(10, painScale - (index % 3)))
    levels[symptom] = nextPain
    return levels
  }, {})

  return {
    id: `demo-symptom-${offset + 1}`,
    dateTime: formatDateTime(date),
    painScale,
    painTypes: getPainTypes(cycleDay, periodEndDay, ovulationDay),
    bodyAreas,
    userSymptoms,
    symptomPainLevels,
    notes: getNotes(cycleDay, periodEndDay, ovulationDay, cycleLength),
    photo: null,
  }
})

export const cycleEntries = Array.from({ length: 60 }, (_, offset) => {
  const date = createDate(offset)
  const { cycleDay, cycleLength, ovulationDay, periodEndDay } = getCycleContext(offset)
  const flowLevel = getFlowLevel(cycleDay, periodEndDay)
  const ratings = getCycleRatings(cycleDay, periodEndDay, ovulationDay, cycleLength)

  return {
    id: `demo-cycle-${offset + 1}`,
    date: formatDate(date),
    savedAt: formatDateTime(date),
    flowLevel,
    bloodColor: getBloodColor(flowLevel, cycleDay),
    clots: getClots(flowLevel),
    discharge: getDischarge(cycleDay, flowLevel, ovulationDay),
    breastTenderness: ratings.breastTenderness,
    bloating: ratings.bloating,
    pelvicPain: ratings.pelvicPain,
    systemicPain: ratings.systemicPain,
    cycleDay,
  }
})
