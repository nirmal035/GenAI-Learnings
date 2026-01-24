import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit'
import Papa from 'papaparse'

export interface TestCase {
  id: string
  title: string
  category: string
  expectedResult: string
  steps: string[]
  testData?: string
}

export interface ExportData {
  storyTitle: string
  description?: string
  acceptanceCriteria?: string
  cases: TestCase[]
}

export function exportToCSV(data: ExportData): string {
  const rows: string[][] = []
  
  // Header row only
  rows.push(['Test Case ID', 'Title', 'Category', 'Expected Result', 'Test Data', 'Steps'])
  
  // Test cases data
  data.cases.forEach(testCase => {
    const stepsText = testCase.steps.join(' | ')
    rows.push([
      testCase.id,
      testCase.title,
      testCase.category,
      testCase.expectedResult,
      testCase.testData || 'N/A',
      stepsText
    ])
  })
  
  // Convert to CSV
  const csv = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  return csv
}

export function exportToXLSX(data: ExportData): Buffer {
  const workbook = XLSX.utils.book_new()
  
  // Test Cases sheet - with column headers only
  const testCasesData: (string | number)[][] = [
    ['Test Case ID', 'Title', 'Category', 'Expected Result', 'Test Data', 'Steps']
  ]
  
  data.cases.forEach(testCase => {
    const stepsText = testCase.steps.join('\n')
    testCasesData.push([
      testCase.id,
      testCase.title,
      testCase.category,
      testCase.expectedResult,
      testCase.testData || 'N/A',
      stepsText
    ])
  })
  
  const testCasesSheet = XLSX.utils.aoa_to_sheet(testCasesData)
  testCasesSheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 20 },
    { wch: 50 }
  ]
  
  // Style header row
  for (let col = 0; col < 6; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    testCasesSheet[cellRef].s = {
      fill: { fgColor: { rgb: 'FF0052CC' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'top', wrapText: true }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, testCasesSheet, 'Test Cases')
  
  // Convert to buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
  return buffer as Buffer
}

export function exportToPDF(data: ExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 25,
        size: 'A4',
        bufferPages: true
      })
      
      const chunks: Buffer[] = []
      
      doc.on('data', (chunk: any) => chunks.push(chunk as Buffer))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      // Title
      doc.fontSize(16).font('Helvetica-Bold').text('Test Cases Report', { align: 'center' })
      doc.moveDown(0.8)
      
      // Column widths and positions
      const leftMargin = 25
      const pageWidth = 550 // A4 width minus margins
      const colWidths = {
        id: 50,
        title: 140,
        category: 80,
        expected: 280
      }
      
      // Helper function to draw header
      const drawHeader = () => {
        const headerY = doc.y
        const headerHeight = 22
        
        // Header background
        doc.rect(leftMargin, headerY, pageWidth, headerHeight)
          .fillAndStroke('#0052CC', '#0052CC')
        
        // Header text
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
        
        let xPos = leftMargin + 4
        doc.text('ID', xPos, headerY + 6, { width: colWidths.id, align: 'center' })
        
        xPos += colWidths.id
        doc.text('Title', xPos, headerY + 6, { width: colWidths.title, align: 'left' })
        
        xPos += colWidths.title
        doc.text('Category', xPos, headerY + 6, { width: colWidths.category, align: 'center' })
        
        xPos += colWidths.category
        doc.text('Expected Result', xPos, headerY + 6, { width: colWidths.expected, align: 'left' })
        
        doc.moveDown(1.8)
      }
      
      // Draw initial header
      drawHeader()
      
      // Draw rows
      doc.fontSize(8).font('Helvetica').fillColor('#000000')
      
      data.cases.forEach((testCase, index) => {
        const rowY = doc.y
        const rowHeight = 35
        
        // Alternate row background
        const bgColor = index % 2 === 0 ? '#F9F9F9' : '#FFFFFF'
        doc.rect(leftMargin, rowY, pageWidth, rowHeight).fill(bgColor)
        
        // Row border
        doc.strokeColor('#DDDDDD').lineWidth(0.5)
        doc.rect(leftMargin, rowY, pageWidth, rowHeight).stroke()
        
        // Vertical column dividers
        let dividerX = leftMargin + colWidths.id
        doc.moveTo(dividerX, rowY).lineTo(dividerX, rowY + rowHeight).stroke()
        
        dividerX += colWidths.title
        doc.moveTo(dividerX, rowY).lineTo(dividerX, rowY + rowHeight).stroke()
        
        dividerX += colWidths.category
        doc.moveTo(dividerX, rowY).lineTo(dividerX, rowY + rowHeight).stroke()
        
        // Fill text with proper positioning
        doc.fillColor('#000000')
        const padding = 3
        
        // ID column
        let xPos = leftMargin + 4
        doc.text(testCase.id, xPos, rowY + 4, {
          width: colWidths.id - 2,
          align: 'center',
          height: rowHeight - 8
        })
        
        // Title column
        xPos = leftMargin + colWidths.id + padding
        doc.text(testCase.title, xPos, rowY + 4, {
          width: colWidths.title - 8,
          align: 'left',
          height: rowHeight - 8,
          lineGap: 2
        })
        
        // Category column
        xPos = leftMargin + colWidths.id + colWidths.title + padding
        doc.text(testCase.category, xPos, rowY + 4, {
          width: colWidths.category - 8,
          align: 'center',
          height: rowHeight - 8
        })
        
        // Expected Result column
        xPos = leftMargin + colWidths.id + colWidths.title + colWidths.category + padding
        doc.text(testCase.expectedResult, xPos, rowY + 4, {
          width: colWidths.expected - 8,
          align: 'left',
          height: rowHeight - 8,
          lineGap: 1
        })
        
        doc.moveDown(2.2)
        
        // Add new page if needed
        if (doc.y > doc.page.height - 50) {
          doc.addPage()
          drawHeader()
          doc.fontSize(8).font('Helvetica').fillColor('#000000')
        }
      })
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
