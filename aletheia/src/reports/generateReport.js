import { jsPDF } from 'jspdf'
import { averagePainLast30Days, detectFlare, topSymptoms } from '../patterns/engine.js'

function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString()
}

function formatDateRange(dateRange) {
  if (!dateRange) {
    return ''
  }

  if (typeof dateRange === 'string') {
    return dateRange
  }

  const start = formatDate(dateRange.start)
  const end = formatDate(dateRange.end)

  if (start && end) {
    return `${start} - ${end}`
  }

  return start || end || ''
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawTable(doc, headers, rows, startY) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  const right = pageWidth - 14
  const tableWidth = right - left
  const columnWidth = tableWidth / headers.length
  let y = startY

  if (y > 260) {
    doc.addPage()
    y = 20
  }

  doc.setFont('helvetica', 'bold')
  headers.forEach((header, index) => {
    doc.text(header, left + index * columnWidth, y)
  })
  y += 8

  doc.setFont('helvetica', 'normal')

  rows.forEach((row) => {
    const lineCounts = row.map((cell) =>
      doc.splitTextToSize(String(cell), columnWidth - 4).length,
    )
    const rowHeight = Math.max(...lineCounts) * 6

    if (y + rowHeight > 280) {
      doc.addPage()
      y = 20
      doc.setFont('helvetica', 'bold')
      headers.forEach((header, index) => {
        doc.text(header, left + index * columnWidth, y)
      })
      y += 8
      doc.setFont('helvetica', 'normal')
    }

    row.forEach((cell, index) => {
      const lines = doc.splitTextToSize(String(cell), columnWidth - 4)
      doc.text(lines, left + index * columnWidth, y)
    })

    y += rowHeight
  })

  return y + 4
}

export function generateReport(symptomEntries, cycleEntries, dateRange) {
  const doc = new jsPDF()
  const formattedDateRange = formatDateRange(dateRange)
  const flares = detectFlare(symptomEntries)
  const averagePain = averagePainLast30Days(symptomEntries)
  const topFiveSymptoms = topSymptoms(symptomEntries, 5)

  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Aletheia Health Report', 14, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  if (formattedDateRange) {
    doc.text(formattedDateRange, 14, y)
    y += 8
  }
  doc.text('Generated locally. No data was transmitted.', 14, y)
  y += 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Section 1 - Symptom Timeline', 14, y)
  y += 8

  y = drawTable(
    doc,
    ['Date', 'Pain', 'Body areas', 'Notes'],
    symptomEntries.map((entry) => [
      formatDate(entry.dateTime),
      entry.painScale ?? '',
      (entry.bodyAreas || []).join(', '),
      entry.notes || '',
    ]),
    y,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  if (y > 260) {
    doc.addPage()
    y = 20
  }
  doc.text('Section 2 - Cycle Summary', 14, y)
  y += 8

  y = drawTable(
    doc,
    ['Date', 'Flow level', 'Hormonal scores'],
    cycleEntries.map((entry) => [
      formatDate(entry.date),
      entry.flowLevel || '',
      `Breast: ${entry.breastTenderness ?? ''}, Bloating: ${entry.bloating ?? ''}, Cervical: ${entry.cervicalPain ?? ''}`,
    ]),
    y,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.text('Section 3 - Pattern Summary', 14, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Flare count: ${flares.length}`, 14, y)
  y += 8
  doc.text(`Average pain: ${averagePain}`, 14, y)
  y += 8
  y = addWrappedText(
    doc,
    `Top 5 symptoms: ${topFiveSymptoms.map((item) => `${item.symptom} (${item.count})`).join(', ') || 'None'}`,
    14,
    y,
    doc.internal.pageSize.getWidth() - 28,
  )

  doc.save('aletheia-health-report.pdf')
}
