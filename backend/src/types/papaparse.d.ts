declare module 'papaparse' {
  interface ParseConfig {
    header?: boolean
    dynamicTyping?: boolean
    skipEmptyLines?: boolean
    delimiter?: string
    transformHeader?: (h: string) => string
    transform?: (value: string) => any
  }

  interface ParseResult {
    data: any[]
    errors: any[]
    meta: {
      delimiter: string
      linebreak: string
      aborted: boolean
      truncated: boolean
      cursor: number
    }
  }

  export function parse(input: string | File, config?: ParseConfig): ParseResult
  export function unparse(data: any[], config?: any): string

  const Papa: {
    parse: typeof parse
    unparse: typeof unparse
  }

  export default Papa
}
