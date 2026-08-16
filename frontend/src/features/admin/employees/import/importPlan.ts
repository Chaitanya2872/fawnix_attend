/**
 * Turns a mapped spreadsheet into a reviewable change plan: what each row will
 * do to the database, and exactly which fields would be overwritten.
 *
 * Two rules drive everything here, per the import contract:
 *  1. Only mapped columns can change a value. Unmapped/absent fields keep
 *     whatever the database already holds.
 *  2. A blank uploaded cell never erases an existing value unless the operator
 *     explicitly turns on "replace with blank".
 */

import { FIELD_BY_KEY, IMPORT_FIELDS, KEY_FIELD } from './importFields'
import type { ImportFieldKey } from './importFields'
import type { EmployeeRow } from '../../../../types/admin'

export type RowStatus = 'new' | 'update' | 'unchanged' | 'error'

export type FieldChange = {
  field: ImportFieldKey
  label: string
  from: string
  to: string
  /** True when the change clears an existing value (replace-with-blank). */
  clearing?: boolean
}

export type PlannedRow = {
  /** 1-based row number as it appears in the uploaded file (header = row 1). */
  sourceRow: number
  status: RowStatus
  empCode: string
  /** Display name for the row — uploaded name, else the matched employee's. */
  name: string
  /** Normalised, API-ready values for every mapped field that has a value. */
  values: Partial<Record<ImportFieldKey, string>>
  /** Raw cell text keyed by field, for the preview grid. */
  raw: Partial<Record<ImportFieldKey, string>>
  changes: FieldChange[]
  errors: string[]
  /** The employee this row matched, when it is an update/unchanged row. */
  existing?: EmployeeRow
}

export type ImportPlan = {
  rows: PlannedRow[]
  counts: Record<RowStatus, number>
  /** Fields present in the mapping, in canonical field order. */
  mappedFields: ImportFieldKey[]
}

export type PlanOptions = {
  /** When true, a blank uploaded cell clears the stored value. */
  allowBlankOverwrite: boolean
}

/** Reads whichever column the API happens to expose for a field. */
export function existingValue(employee: EmployeeRow, field: ImportFieldKey): string {
  const record = employee as unknown as Record<string, unknown>
  const candidates: string[] =
    field === 'emp_joined_date'
      ? ['emp_joined_date', 'emp_joining_date', 'joining_date', 'joined_date', 'date_of_joining']
      : [field]

  for (const candidate of candidates) {
    const value = record[candidate]
    if (value === null || value === undefined || value === '') continue
    // Dates arrive as timestamps or ISO strings; compare on the date part only.
    const text = String(value)
    if (field === 'emp_joined_date' || field === 'emp_date_of_birth') {
      const match = text.match(/^\d{4}-\d{2}-\d{2}/)
      return match ? match[0] : text.trim()
    }
    return text.trim()
  }
  return ''
}

/** Field-aware equality so casing/format noise isn't reported as a change. */
function isSameValue(field: ImportFieldKey, incoming: string, current: string): boolean {
  if (field === 'emp_email') return incoming.toLowerCase() === current.toLowerCase()
  if (field === 'emp_shift_id') return Number(incoming) === Number(current)
  if (field === 'emp_contact') return incoming.replace(/\D/g, '') === current.replace(/\D/g, '')
  return incoming.trim().toLowerCase() === current.trim().toLowerCase()
}

const normalizeKey = (value: string) => value.trim().toLowerCase()

export function buildImportPlan(
  rows: string[][],
  mapping: (ImportFieldKey | null)[],
  employees: EmployeeRow[],
  options: PlanOptions
): ImportPlan {
  const mappedFields = IMPORT_FIELDS.map((field) => field.key).filter((key) => mapping.includes(key))

  const byCode = new Map<string, EmployeeRow>()
  const codeByEmail = new Map<string, string>()
  for (const employee of employees) {
    if (employee.emp_code) byCode.set(normalizeKey(employee.emp_code), employee)
    if (employee.emp_email) codeByEmail.set(normalizeKey(employee.emp_email), normalizeKey(employee.emp_code || ''))
  }

  const seenCodes = new Map<string, number>()
  const seenEmails = new Map<string, number>()
  const planned: PlannedRow[] = []

  rows.forEach((cells, index) => {
    const sourceRow = index + 2 // +1 for zero-index, +1 for the header row
    const errors: string[] = []
    const values: Partial<Record<ImportFieldKey, string>> = {}
    const raw: Partial<Record<ImportFieldKey, string>> = {}
    const blankFields = new Set<ImportFieldKey>()
    const invalidFields = new Set<ImportFieldKey>()

    mapping.forEach((field, columnIndex) => {
      if (!field) return
      const cell = (cells[columnIndex] ?? '').trim()
      raw[field] = cell
      if (!cell) {
        blankFields.add(field)
        return
      }
      const normalize = FIELD_BY_KEY.get(field)?.normalize
      if (!normalize) {
        values[field] = cell
        return
      }
      const result = normalize(cell)
      if ('error' in result) {
        errors.push(`${FIELD_BY_KEY.get(field)?.label}: ${result.error}`)
        invalidFields.add(field)
        return
      }
      if (result.value) values[field] = result.value
    })

    const empCode = (values[KEY_FIELD] || '').trim()
    const codeKey = normalizeKey(empCode)

    if (!empCode) {
      errors.push('Employee ID is missing')
    } else if (seenCodes.has(codeKey)) {
      errors.push(`Duplicate Employee ID — already used on row ${seenCodes.get(codeKey)}`)
    } else {
      seenCodes.set(codeKey, sourceRow)
    }

    const existing = codeKey ? byCode.get(codeKey) : undefined

    // Email must stay unique across employees, otherwise the API returns 409.
    const email = values.emp_email
    if (email) {
      const emailKey = normalizeKey(email)
      const owner = codeByEmail.get(emailKey)
      if (owner && owner !== codeKey) {
        errors.push(`Email is already used by employee ${owner.toUpperCase()}`)
      }
      if (seenEmails.has(emailKey)) {
        errors.push(`Duplicate email — already used on row ${seenEmails.get(emailKey)}`)
      } else {
        seenEmails.set(emailKey, sourceRow)
      }
    }

    const name = values.emp_full_name || existing?.emp_full_name || ''
    const base: Omit<PlannedRow, 'status' | 'changes'> = {
      sourceRow,
      empCode,
      name,
      values,
      raw,
      errors,
      existing,
    }

    if (!existing) {
      // Creating: the API demands code, name and email on POST /api/users.
      for (const field of IMPORT_FIELDS.filter((item) => item.requiredForCreate)) {
        if (field.key === KEY_FIELD) continue
        // The value was supplied but rejected — that error is already reported.
        if (invalidFields.has(field.key)) continue
        if (!values[field.key]) {
          const wasMapped = mapping.includes(field.key)
          errors.push(
            wasMapped
              ? `${field.label} is required to create a new employee`
              : `${field.label} is required to create a new employee (column not mapped)`
          )
        }
      }
      planned.push({ ...base, status: errors.length ? 'error' : 'new', changes: [] })
      return
    }

    // Updating: diff only the mapped fields.
    const changes: FieldChange[] = []
    for (const field of mappedFields) {
      if (field === KEY_FIELD) continue
      const meta = FIELD_BY_KEY.get(field)
      if (meta?.createOnly) continue // e.g. role — the update API ignores it

      const current = existingValue(existing, field)
      const incoming = values[field]

      if (incoming === undefined) {
        // Blank cell: leave the stored value alone unless explicitly clearing.
        if (options.allowBlankOverwrite && blankFields.has(field) && current) {
          changes.push({ field, label: meta?.label || field, from: current, to: '', clearing: true })
        }
        continue
      }
      if (!isSameValue(field, incoming, current)) {
        changes.push({ field, label: meta?.label || field, from: current, to: incoming })
      }
    }

    const status: RowStatus = errors.length ? 'error' : changes.length ? 'update' : 'unchanged'
    planned.push({ ...base, status, changes })
  })

  const counts: Record<RowStatus, number> = { new: 0, update: 0, unchanged: 0, error: 0 }
  for (const row of planned) counts[row.status] += 1

  return { rows: planned, counts, mappedFields }
}

/** Payload for POST /api/users — every mapped value, plus a default role. */
export function buildCreatePayload(row: PlannedRow): Record<string, string> {
  const payload: Record<string, string> = {}
  for (const [field, value] of Object.entries(row.values)) {
    if (value) payload[field] = value
  }
  if (!payload.role) payload.role = 'employee'
  return payload
}

/**
 * Payload for PUT /api/users/{emp_code} — only the fields that actually differ.
 * emp_code is omitted deliberately: the API rejects it as a protected field.
 */
export function buildUpdatePayload(row: PlannedRow): Record<string, string> {
  const payload: Record<string, string> = {}
  for (const change of row.changes) {
    if (change.field === KEY_FIELD) continue
    payload[change.field] = change.to
  }
  return payload
}
