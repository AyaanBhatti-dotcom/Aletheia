import { jsPDF } from 'jspdf'
import { averagePainLast30Days, detectFlare, topSymptoms } from '../patterns/engine.js'

const PAGE = {
  width: 210,
  height: 297,
  marginX: 16,
  marginTop: 18,
  marginBottom: 18,
}

const PALETTE = {
  ink: [42, 34, 52],
  muted: [108, 100, 122],
  line: [220, 214, 228],
  plum: [100, 78, 126],
  plumSoft: [236, 229, 244],
  blush: [248, 240, 245],
  sage: [229, 238, 234],
  white: [255, 255, 255],
}

function formatDate(value, options) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString(undefined, options)
}

function formatDateRange(dateRange) {
  if (!dateRange) {
    return ''
  }

  if (typeof dateRange === 'string') {
    return dateRange
  }

  const start = formatDate(dateRange.start, { month: 'short', day: 'numeric', year: 'numeric' })
  const end = formatDate(dateRange.end, { month: 'short', day: 'numeric', year: 'numeric' })

  if (start && end) {
    return `${start} - ${end}`
  }

  return start || end || ''
}

function formatDateTime(value) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function color(doc, value) {
  doc.setTextColor(...value)
}

function fill(doc, value) {
  doc.setFillColor(...value)
}

function stroke(doc, value) {
  doc.setDrawColor(...value)
}

function ensureSpace(doc, y, neededHeight) {
  if (y + neededHeight <= PAGE.height - PAGE.marginBottom) {
    return y
  }

  doc.addPage()
  return PAGE.marginTop
}

function drawPageFrame(doc) {
  stroke(doc, PALETTE.line)
  doc.setLineWidth(0.35)
  doc.rect(10, 10, PAGE.width - 20, PAGE.height - 20)
}

function drawFooter(doc) {
  const pageNumber = doc.getCurrentPageInfo().pageNumber
  stroke(doc, PALETTE.line)
  doc.setLineWidth(0.25)
  doc.line(PAGE.marginX, PAGE.height - 12, PAGE.width - PAGE.marginX, PAGE.height - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  color(doc, PALETTE.muted)
  doc.text('Aletheia private report', PAGE.marginX, PAGE.height - 7)
  doc.text(`Page ${pageNumber}`, PAGE.width - PAGE.marginX, PAGE.height - 7, { align: 'right' })
}

function beginPage(doc) {
  drawPageFrame(doc)
  drawFooter(doc)
  return PAGE.marginTop
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5.6) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawHero(doc, formattedDateRange, symptomEntries, cycleEntries) {
  fill(doc, PALETTE.blush)
  doc.roundedRect(PAGE.marginX, 18, PAGE.width - PAGE.marginX * 2, 56, 6, 6, 'F')

  fill(doc, PALETTE.plumSoft)
  doc.circle(172, 34, 16, 'F')
  fill(doc, PALETTE.sage)
  doc.circle(156, 54, 10, 'F')
  fill(doc, PALETTE.white)
  doc.circle(168, 45, 5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  color(doc, PALETTE.plum)
  doc.text('ALETHEIA', 24, 30)

  doc.setFontSize(23)
  color(doc, PALETTE.ink)
  doc.text('Health summary report', 24, 44)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  color(doc, PALETTE.muted)
  const subtitle = formattedDateRange
    ? `Reporting period: ${formattedDateRange}`
    : 'Generated from your current local record'
  doc.text(subtitle, 24, 54)
  doc.text('Prepared locally on this device. No data was transmitted.', 24, 61)

  let y = 88
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  color(doc, PALETTE.ink)
  doc.text('Report scope', 16, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  color(doc, PALETTE.muted)
  y = addWrappedText(
    doc,
    `This document summarizes ${symptomEntries.length} symptom entries and ${cycleEntries.length} cycle entries. It is designed for calm review, personal tracking, or optional sharing with a clinician.`,
    16,
    y,
    178,
    5.2,
  )

  return y + 10
}

function drawMetricCard(doc, x, y, width, height, label, value, tone = 'plum') {
  const background = tone === 'sage' ? PALETTE.sage : tone === 'blush' ? PALETTE.blush : PALETTE.plumSoft
  fill(doc, background)
  doc.roundedRect(x, y, width, height, 5, 5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  color(doc, PALETTE.muted)
  doc.text(label.toUpperCase(), x + 7, y + 10)

  doc.setFontSize(21)
  color(doc, PALETTE.ink)
  doc.text(String(value), x + 7, y + 22)
}

function drawSectionHeading(doc, y, label, title, description) {
  y = ensureSpace(doc, y, 26)

  fill(doc, PALETTE.plumSoft)
  doc.roundedRect(PAGE.marginX, y, 178, 20, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  color(doc, PALETTE.plum)
  doc.text(label.toUpperCase(), PAGE.marginX + 8, y + 7)

  doc.setFontSize(15)
  color(doc, PALETTE.ink)
  doc.text(title, PAGE.marginX + 8, y + 15)

  y += 27
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  color(doc, PALETTE.muted)
  y = addWrappedText(doc, description, PAGE.marginX, y, 178, 5)

  return y + 4
}

function drawSummaryGrid(doc, y, summaryItems) {
  y = ensureSpace(doc, y, 40)
  const cardWidth = 56
  const gap = 5

  summaryItems.forEach((item, index) => {
    drawMetricCard(
      doc,
      PAGE.marginX + index * (cardWidth + gap),
      y,
      cardWidth,
      28,
      item.label,
      item.value,
      item.tone,
    )
  })

  return y + 36
}

function drawNarrativeBlock(doc, y, title, body) {
  y = ensureSpace(doc, y, 28)

  fill(doc, PALETTE.white)
  stroke(doc, PALETTE.line)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAGE.marginX, y, 178, 24, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  color(doc, PALETTE.ink)
  doc.text(title, PAGE.marginX + 8, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  color(doc, PALETTE.muted)
  return addWrappedText(doc, body, PAGE.marginX + 8, y + 15, 162, 4.8) + 3
}

function drawStyledTable(doc, y, columns, rows) {
  const tableWidth = 178
  const left = PAGE.marginX
  const right = left + tableWidth
  const paddingX = 4

  y = ensureSpace(doc, y, 16)

  fill(doc, PALETTE.ink)
  doc.roundedRect(left, y, tableWidth, 10, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  color(doc, PALETTE.white)

  let columnX = left
  columns.forEach((column) => {
    doc.text(column.label, columnX + paddingX, y + 6.5)
    columnX += column.width
  })

  y += 12

  if (rows.length === 0) {
    fill(doc, PALETTE.blush)
    doc.roundedRect(left, y, tableWidth, 14, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    color(doc, PALETTE.muted)
    doc.text('No entries available for this section.', left + 6, y + 8.5)
    return y + 18
  }

  rows.forEach((row, rowIndex) => {
    const lineGroups = row.map((cell, index) =>
      doc.splitTextToSize(String(cell || '—'), columns[index].width - paddingX * 2),
    )
    const rowHeight = Math.max(...lineGroups.map((lines) => lines.length)) * 4.8 + 6

    y = ensureSpace(doc, y, rowHeight + 2)

    fill(doc, rowIndex % 2 === 0 ? PALETTE.white : PALETTE.blush)
    stroke(doc, PALETTE.line)
    doc.setLineWidth(0.2)
    doc.roundedRect(left, y, tableWidth, rowHeight, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    color(doc, PALETTE.ink)

    let x = left
    row.forEach((cell, index) => {
      const lines = lineGroups[index]
      doc.text(lines, x + paddingX, y + 5.5)
      x += columns[index].width
    })

    y += rowHeight + 2
  })

  stroke(doc, PALETTE.line)
  doc.setLineWidth(0.25)
  doc.line(left, y + 1, right, y + 1)
  return y + 5
}

function buildTopSymptoms(topFiveSymptoms) {
  if (topFiveSymptoms.length === 0) {
    return 'No repeated symptoms are available yet.'
  }

  return topFiveSymptoms
    .map((item) => `${item.symptom} (${item.count})`)
    .join(', ')
}

export function generateReport(symptomEntries, cycleEntries, dateRange) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  })

  const formattedDateRange = formatDateRange(dateRange)
  const flares = detectFlare(symptomEntries)
  const averagePain = averagePainLast30Days(symptomEntries)
  const topFiveSymptoms = topSymptoms(symptomEntries, 5)
  const recentSymptomDate = symptomEntries[0]?.dateTime || symptomEntries.at(-1)?.dateTime || ''
  const cycleSpan = cycleEntries.length > 0
    ? `${formatDate(cycleEntries.at(-1)?.date, { month: 'short', day: 'numeric' })} to ${formatDate(cycleEntries[0]?.date, { month: 'short', day: 'numeric' })}`
    : 'No cycle entries'

  let y = beginPage(doc)
  y = drawHero(doc, formattedDateRange, symptomEntries, cycleEntries)

  y = drawSummaryGrid(doc, y, [
    { label: 'Symptom logs', value: symptomEntries.length, tone: 'plum' },
    { label: 'Cycle logs', value: cycleEntries.length, tone: 'sage' },
    { label: 'Average pain', value: averagePain || '—', tone: 'blush' },
  ])

  y = drawNarrativeBlock(
    doc,
    y,
    'Snapshot',
    `Recent symptom log: ${recentSymptomDate ? formatDateTime(recentSymptomDate) : 'None yet'}. Cycle coverage: ${cycleSpan}. Flare episodes identified: ${flares.length}.`,
  )

  y = drawSectionHeading(
    doc,
    y + 4,
    'Section 1',
    'Symptom timeline',
    'A structured review of symptom logs, including pain intensity, body areas, and notes captured during the selected period.',
  )

  y = drawStyledTable(
    doc,
    y,
    [
      { label: 'Date', width: 36 },
      { label: 'Pain', width: 18 },
      { label: 'Body areas', width: 48 },
      { label: 'Notes', width: 76 },
    ],
    symptomEntries.map((entry) => [
      formatDateTime(entry.dateTime),
      entry.painScale ?? '—',
      (entry.bodyAreas || []).join(', ') || '—',
      entry.notes || '—',
    ]),
  )

  y = drawSectionHeading(
    doc,
    y + 3,
    'Section 2',
    'Cycle record',
    'Cycle entries are summarized below to preserve timing, flow level, and hormone-related discomfort notes in a review-friendly format.',
  )

  y = drawStyledTable(
    doc,
    y,
    [
      { label: 'Date', width: 36 },
      { label: 'Flow', width: 26 },
      { label: 'Cycle day', width: 24 },
      { label: 'Hormonal notes', width: 92 },
    ],
    cycleEntries.map((entry) => [
      formatDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' }),
      entry.flowLevel || '—',
      entry.cycleDay ?? '—',
      `Breast ${entry.breastTenderness ?? '—'}  •  Bloating ${entry.bloating ?? '—'}  •  Cervical ${entry.cervicalPain ?? '—'}`,
    ]),
  )

  y = drawSectionHeading(
    doc,
    y + 3,
    'Section 3',
    'Pattern summary',
    'A concise overview of the trend lines most likely to help with reflection, comparison over time, or sharing context during care visits.',
  )

  y = drawSummaryGrid(doc, y, [
    { label: 'Flares', value: flares.length, tone: 'plum' },
    { label: 'Top symptoms', value: topFiveSymptoms.length, tone: 'blush' },
    { label: 'Coverage', value: symptomEntries.length + cycleEntries.length, tone: 'sage' },
  ])

  y = drawNarrativeBlock(
    doc,
    y,
    'Top recurring symptoms',
    buildTopSymptoms(topFiveSymptoms),
  )

  drawNarrativeBlock(
    doc,
    y + 4,
    'Privacy note',
    'This report was generated locally within Aletheia. Entries remain in this browser unless you choose to share the resulting PDF yourself.',
  )

  doc.save('aletheia-health-report.pdf')
}
