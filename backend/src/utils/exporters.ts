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
        margin: 40,
        size: 'A4'
      })
      
      const chunks: Buffer[] = []
      
      doc.on('data', (chunk: any) => chunks.push(chunk as Buffer))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Test Cases Report', { align: 'center' })
      doc.moveDown(0.5)
      
      // Table header
      const tableTop = doc.y
      const colWidths = {
        id: 50,
        title: 120,
        category: 70,
        expected: 120
      }
      
      const headerY = doc.y
      doc.fontSize(9).font('Helvetica-Bold')
      
      // Header cells
      doc.rect(40, headerY, colWidths.id, 20).fillAndStroke('#0052CC', '#000')
      doc.fillColor('#FFFFFF').text('ID', 45, headerY + 4, { width: colWidths.id - 10, align: 'left' })
      
      doc.fillColor('#000').rect(40 + colWidths.id, headerY, colWidths.title, 20).fillAndStroke('#0052CC', '#000')
      doc.fillColor('#FFFFFF').text('Title', 45 + colWidths.id, headerY + 4, { width: colWidths.title - 10, align: 'left' })
      
      doc.fillColor('#000').rect(40 + colWidths.id + colWidths.title, headerY, colWidths.category, 20).fillAndStroke('#0052CC', '#000')
      doc.fillColor('#FFFFFF').text('Category', 45 + colWidths.id + colWidths.title, headerY + 4, { width: colWidths.category - 10, align: 'left' })
      
      doc.fillColor('#000').rect(40 + colWidths.id + colWidths.title + colWidths.category, headerY, colWidths.expected, 20).fillAndStroke('#0052CC', '#000')
      doc.fillColor('#FFFFFF').text('Expected Result', 45 + colWidths.id + colWidths.title + colWidths.category, headerY + 4, { width: colWidths.expected - 10, align: 'left' })
      
      doc.moveDown()
      doc.fillColor('#000')
      
      // Table rows
      data.cases.forEach((testCase, index) => {
        const rowY = doc.y
        const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF'
        
        doc.rect(40, rowY, colWidths.id + colWidths.title + colWidths.category + colWidths.expected, 20).fill(bgColor)
        
        doc.fontSize(8).font('Helvetica')
        doc.text(testCase.id, 45, rowY + 4, { width: colWidths.id - 10, align: 'left' })
        doc.text(testCase.title, 45 + colWidths.id, rowY + 4, { width: colWidths.title - 10, align: 'left' })
        doc.text(testCase.category, 45 + colWidths.id + colWidths.title, rowY + 4, { width: colWidths.category - 10, align: 'left' })
        doc.text(testCase.expectedResult, 45 + colWidths.id + colWidths.title + colWidths.category, rowY + 4, { width: colWidths.expected - 10, align: 'left' })
        
        doc.moveDown()
      })
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
