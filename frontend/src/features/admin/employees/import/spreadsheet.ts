/**
 * Dependency-free spreadsheet reader for the employee bulk import.
 *
 * CSV/TSV is parsed inline (RFC 4180 rules: quoted fields, escaped quotes,
 * embedded newlines). XLSX is a ZIP of XML parts, so we walk the ZIP central
 * directory ourselves and inflate the entries we need with the browser's
 * native DecompressionStream — no third-party library involved.
 */

export type SheetData = {
  /** Header labels exactly as they appear in the first non-empty row. */
  headers: string[]
  /** Data rows, already aligned to headers.length (short rows are padded). */
  rows: string[][]
  /** Name of the worksheet the rows came from (XLSX only). */
  sheetName?: string
  /** Every worksheet found, so the UI can offer a sheet picker. */
  sheetNames?: string[]
}

const XLSX_EXTENSIONS = /\.(xlsx|xlsm)$/i
const LEGACY_EXCEL = /\.xls$/i

export function isSpreadsheetFile(file: File) {
  return XLSX_EXTENSIONS.test(file.name) || /\.(csv|tsv|txt)$/i.test(file.name)
}

/** Reads a CSV/TSV/XLSX file into headers + rows. */
export async function readSpreadsheet(file: File, sheetName?: string): Promise<SheetData> {
  if (LEGACY_EXCEL.test(file.name)) {
    throw new Error(
      'Legacy .xls files are not supported. Open the file in Excel and use "Save As" to create an .xlsx or .csv file.'
    )
  }
  if (XLSX_EXTENSIONS.test(file.name)) {
    return readXlsx(await file.arrayBuffer(), sheetName)
  }
  return readDelimitedText(await file.text())
}

/* ------------------------------------------------------------------ */
/* CSV / TSV                                                           */
/* ------------------------------------------------------------------ */

/** Picks the delimiter that yields the most columns on the header line. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'))
  const candidates = [',', ';', '\t', '|']
  let best = ','
  let bestCount = 0
  for (const candidate of candidates) {
    // Count only delimiters outside quotes.
    let count = 0
    let inQuotes = false
    for (let i = 0; i < firstLine.length; i += 1) {
      const char = firstLine[i]
      if (char === '"') inQuotes = !inQuotes
      else if (char === candidate && !inQuotes) count += 1
    }
    if (count > bestCount) {
      bestCount = count
      best = candidate
    }
  }
  return best
}

export function readDelimitedText(raw: string): SheetData {
  const text = raw.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(text)
  const matrix: string[][] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  const endValue = () => {
    row.push(value)
    value = ''
  }
  const endRow = () => {
    endValue()
    matrix.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        value += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      endValue()
    } else if (char === '\n') {
      endRow()
    } else if (char === '\r') {
      // handled by the \n that follows; a lone \r also ends the row
      if (text[i + 1] !== '\n') endRow()
    } else {
      value += char
    }
  }
  // Trailing value/row (file not ending in a newline).
  if (value !== '' || row.length > 0) endRow()

  return shapeMatrix(matrix)
}

/* ------------------------------------------------------------------ */
/* XLSX                                                                */
/* ------------------------------------------------------------------ */

type ZipEntry = { name: string; offset: number; compressedSize: number; method: number }

/** Reads the ZIP central directory. Returns entry metadata by file name. */
function readZipDirectory(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // The End Of Central Directory record lives in the last 64KB + 22 bytes.
  const scanFrom = Math.max(0, bytes.length - (0xffff + 22))
  let eocd = -1
  for (let i = bytes.length - 22; i >= scanFrom; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) {
    throw new Error('This file does not look like a valid .xlsx workbook.')
  }

  const entryCount = view.getUint16(eocd + 10, true)
  let pointer = view.getUint32(eocd + 16, true)
  const entries = new Map<string, ZipEntry>()
  const decoder = new TextDecoder()

  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break
    const method = view.getUint16(pointer + 10, true)
    const compressedSize = view.getUint32(pointer + 20, true)
    const nameLength = view.getUint16(pointer + 28, true)
    const extraLength = view.getUint16(pointer + 30, true)
    const commentLength = view.getUint16(pointer + 32, true)
    const localOffset = view.getUint32(pointer + 42, true)
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength))
    entries.set(name, { name, offset: localOffset, compressedSize, method })
    pointer += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** Inflates one ZIP entry to text. */
async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  if (view.getUint32(entry.offset, true) !== 0x04034b50) {
    throw new Error('The .xlsx file appears to be corrupted.')
  }
  // The local header repeats the name/extra lengths, which can differ from the
  // central directory's, so the data start must be computed from it.
  const nameLength = view.getUint16(entry.offset + 26, true)
  const extraLength = view.getUint16(entry.offset + 28, true)
  const dataStart = entry.offset + 30 + nameLength + extraLength
  const raw = bytes.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.method === 0) return new TextDecoder().decode(raw)
  if (entry.method !== 8) {
    throw new Error(`Unsupported compression in the .xlsx file (method ${entry.method}).`)
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read .xlsx files. Please upload a CSV instead.')
  }

  const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')

/** Converts an Excel column reference (A, B, ..., AA) to a zero-based index. */
function columnIndex(cellRef: string): number {
  let index = 0
  for (let i = 0; i < cellRef.length; i += 1) {
    const code = cellRef.charCodeAt(i)
    if (code < 65 || code > 90) break
    index = index * 26 + (code - 64)
  }
  return index - 1
}

/** Excel serial date → yyyy-mm-dd (1900 date system, including its leap-year quirk). */
function serialToDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return String(serial)
  return date.toISOString().slice(0, 10)
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

/** Style index → true when that style renders as a date. */
function readDateStyles(stylesXml: string | null): Set<number> {
  const dateStyles = new Set<number>()
  if (!stylesXml) return dateStyles
  const doc = parseXml(stylesXml)

  const customDateFormats = new Set<number>()
  doc.querySelectorAll('numFmts > numFmt').forEach((node) => {
    const id = Number(node.getAttribute('numFmtId'))
    const code = (node.getAttribute('formatCode') || '').replace(/\[[^\]]*\]|"[^"]*"/g, '')
    if (Number.isFinite(id) && /[dmyh]/i.test(code)) customDateFormats.add(id)
  })

  const cellXfs = doc.querySelector('cellXfs')
  if (!cellXfs) return dateStyles
  Array.from(cellXfs.children).forEach((node, index) => {
    const formatId = Number(node.getAttribute('numFmtId') || 0)
    if (BUILTIN_DATE_FORMATS.has(formatId) || customDateFormats.has(formatId)) {
      dateStyles.add(index)
    }
  })
  return dateStyles
}

/** Concatenates the text runs of one shared-string entry. */
function sharedStringText(node: Element): string {
  return Array.from(node.getElementsByTagName('t'))
    .map((textNode) => textNode.textContent || '')
    .join('')
}

async function readXlsx(buffer: ArrayBuffer, wantedSheet?: string): Promise<SheetData> {
  const entries = readZipDirectory(buffer)
  const readPart = async (name: string) => {
    const entry = entries.get(name)
    return entry ? readZipEntry(buffer, entry) : null
  }

  const workbookXml = await readPart('xl/workbook.xml')
  if (!workbookXml) throw new Error('This file does not contain a readable Excel workbook.')

  // Sheet name → target part, resolved through the workbook relationships.
  const relsXml = await readPart('xl/_rels/workbook.xml.rels')
  const relTargets = new Map<string, string>()
  if (relsXml) {
    parseXml(relsXml)
      .querySelectorAll('Relationship')
      .forEach((rel) => {
        const id = rel.getAttribute('Id')
        const target = (rel.getAttribute('Target') || '').replace(/^\/?xl\//, '').replace(/^\//, '')
        if (id) relTargets.set(id, target)
      })
  }

  const sheets = Array.from(parseXml(workbookXml).querySelectorAll('sheets > sheet')).map((sheet, index) => ({
    name: sheet.getAttribute('name') || `Sheet${index + 1}`,
    path:
      relTargets.get(sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || '') ||
      `worksheets/sheet${index + 1}.xml`,
  }))
  if (sheets.length === 0) throw new Error('This workbook has no worksheets.')

  const target = sheets.find((sheet) => sheet.name === wantedSheet) || sheets[0]
  const sheetXml = await readPart(`xl/${target.path}`)
  if (!sheetXml) throw new Error(`Could not read the "${target.name}" worksheet.`)

  const sharedXml = await readPart('xl/sharedStrings.xml')
  const sharedStrings = sharedXml
    ? Array.from(parseXml(sharedXml).getElementsByTagName('si')).map(sharedStringText)
    : []
  const dateStyles = readDateStyles(await readPart('xl/styles.xml'))

  const matrix: string[][] = []
  parseXml(sheetXml)
    .querySelectorAll('sheetData > row')
    .forEach((rowNode) => {
      const values: string[] = []
      rowNode.querySelectorAll('c').forEach((cell) => {
        const ref = cell.getAttribute('r') || ''
        const index = ref ? columnIndex(ref) : values.length
        const type = cell.getAttribute('t') || 'n'
        let text = ''

        if (type === 'inlineStr') {
          text = sharedStringText(cell)
        } else {
          const rawValue = cell.querySelector('v')?.textContent || ''
          if (type === 's') {
            text = sharedStrings[Number(rawValue)] ?? ''
          } else if (type === 'b') {
            text = rawValue === '1' ? 'TRUE' : 'FALSE'
          } else if (type === 'e') {
            text = ''
          } else {
            const styleIndex = Number(cell.getAttribute('s') || -1)
            const numeric = Number(rawValue)
            text =
              rawValue !== '' && Number.isFinite(numeric) && dateStyles.has(styleIndex)
                ? serialToDate(numeric)
                : rawValue
          }
        }

        while (values.length < index) values.push('')
        values[index] = text
      })
      matrix.push(values)
    })

  return {
    ...shapeMatrix(matrix),
    sheetName: target.name,
    sheetNames: sheets.map((sheet) => sheet.name),
  }
}

/* ------------------------------------------------------------------ */
/* Shared shaping                                                      */
/* ------------------------------------------------------------------ */

const isBlankRow = (row: string[]) => row.every((cell) => (cell ?? '').trim() === '')

/** Drops leading blank rows, takes the first as headers, pads every data row. */
function shapeMatrix(matrix: string[][]): SheetData {
  const meaningful = matrix.filter((row) => !isBlankRow(row))
  if (meaningful.length === 0) {
    throw new Error('This file appears to be empty.')
  }

  const headerRow = meaningful[0]
  // Trailing empty header cells are noise from spreadsheet exports.
  let width = headerRow.length
  while (width > 0 && (headerRow[width - 1] ?? '').trim() === '') width -= 1

  const headers = headerRow.slice(0, width).map((header, index) => {
    const label = (header ?? '').trim()
    return label || `Column ${index + 1}`
  })

  const rows = meaningful.slice(1).map((row) => {
    const padded = row.slice(0, width).map((cell) => (cell ?? '').trim())
    while (padded.length < width) padded.push('')
    return padded
  })

  return { headers, rows }
}
