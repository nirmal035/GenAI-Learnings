declare module 'pdfkit' {
  interface PDFKitOptions {
    margin?: number | { top?: number; bottom?: number; left?: number; right?: number }
    size?: string | [number, number]
    layout?: string
  }

  interface PDFDocument {
    fontSize(size: number): this
    font(name: string): this
    text(text: string, x?: number, y?: number, options?: any): this
    moveDown(lines?: number): this
    rect(x: number, y: number, width: number, height: number): this
    fill(color?: string): this
    fillAndStroke(fillColor?: string, strokeColor?: string): this
    fillColor(color: string): this
    on(event: string, callback: (data: any) => void): void
    end(): void
  }

  export default class PDFDocument extends PDFDocument {
    constructor(options?: PDFKitOptions)
  }
}
