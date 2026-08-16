/**
 * The employee fields a spreadsheet column can be mapped onto, plus the
 * normalisation/validation each one needs before it is handed to the existing
 * /api/users endpoints. Field names match the API contract exactly so the
 * import reuses the same server-side validation as the Add/Edit drawer.
 */

export type ImportFieldKey =
  | 'emp_code'
  | 'emp_first_name'
  | 'emp_last_name'
  | 'emp_full_name'
  | 'emp_email'
  | 'emp_contact'
  | 'emp_designation'
  | 'emp_department'
  | 'emp_branch_id'
  | 'emp_work_timings'
  | 'emp_grade'
  | 'emp_manager'
  | 'emp_informing_manager'
  | 'emp_shift_id'
  | 'emp_joined_date'
  | 'emp_date_of_birth'
  | 'emp_blood_group'
  | 'role'

export type ImportField = {
  key: ImportFieldKey
  label: string
  /** Header labels we auto-match against (lower-cased, punctuation-stripped). */
  aliases: string[]
  /** emp_code — the identity column used to match existing employees. */
  isKey?: boolean
  /** Required by POST /api/users when a row creates a new employee. */
  requiredForCreate?: boolean
  /** The backend only applies this on create; updates ignore it. */
  createOnly?: boolean
  hint?: string
  /** Returns the API-ready value, or an error message. */
  normalize?: (value: string) => { value: string } | { error: string }
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
export const ROLES = ['employee', 'admin', 'user_manager']

const normalizeEmail = (value: string) => {
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: `"${value}" is not a valid email address` }
  return { value: email }
}

const normalizeContact = (value: string) => {
  const contact = value.replace(/[\s\-()]/g, '')
  if (!/^\+?\d{6,15}$/.test(contact)) return { error: `"${value}" is not a valid phone number` }
  return { value: contact }
}

const normalizeInteger = (value: string) => {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return { error: `"${value}" must be a whole number` }
  return { value: trimmed }
}

const normalizeBloodGroup = (value: string) => {
  const group = value.trim().toUpperCase().replace(/\s+/g, '')
  const expanded = group
    .replace(/POSITIVE$/, '+')
    .replace(/NEGATIVE$/, '-')
    .replace(/POS$/, '+')
    .replace(/NEG$/, '-')
  if (!BLOOD_GROUPS.includes(expanded)) return { error: `"${value}" is not a known blood group` }
  return { value: expanded }
}

const normalizeRole = (value: string) => {
  const role = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!ROLES.includes(role)) return { error: `"${value}" is not a valid role (${ROLES.join(', ')})` }
  return { value: role }
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Accepts the shapes HR spreadsheets actually contain — ISO, dd/mm/yyyy,
 * dd-mmm-yyyy and raw Excel serials — and emits yyyy-mm-dd for the API.
 * Ambiguous d/m vs m/d is resolved as day-first (the app formats dates en-IN).
 */
export const normalizeDate = (value: string): { value: string } | { error: string } => {
  const raw = value.trim()
  if (!raw) return { value: '' }

  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) {
    const [, year, month, day] = iso
    return validDate(Number(year), Number(month), Number(day), raw)
  }

  const dayFirst = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
  if (dayFirst) {
    const [, first, second, yearPart] = dayFirst
    let day = Number(first)
    let month = Number(second)
    // Only flip when the first number cannot be a day.
    if (day > 12 && month <= 12) {
      // already day-first
    } else if (month > 12 && day <= 12) {
      ;[day, month] = [month, day]
    }
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart)
    return validDate(year, month, day, raw)
  }

  const named = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2}|\d{4})$/)
  if (named) {
    const [, day, monthName, yearPart] = named
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()]
    if (!month) return { error: `"${value}" is not a recognised date` }
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart)
    return validDate(year, month, Number(day), raw)
  }

  // Bare Excel serial (a numeric cell that was never styled as a date).
  if (/^\d{5}(\.\d+)?$/.test(raw)) {
    const date = new Date(Math.round((Number(raw) - 25569) * 86400 * 1000))
    if (!Number.isNaN(date.getTime())) return { value: date.toISOString().slice(0, 10) }
  }

  return { error: `"${value}" is not a recognised date (use YYYY-MM-DD or DD/MM/YYYY)` }
}

function validDate(year: number, month: number, day: number, raw: string) {
  const date = new Date(Date.UTC(year, month - 1, day))
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!roundTrips) return { error: `"${raw}" is not a real calendar date` }
  return { value: `${year}-${pad(month)}-${pad(day)}` }
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: 'emp_code',
    label: 'Employee ID',
    aliases: ['emp code', 'employee id', 'employee code', 'empid', 'emp id', 'employee no', 'employee number', 'staff id', 'code'],
    isKey: true,
    requiredForCreate: true,
    hint: 'Used to match existing employees',
  },
  {
    key: 'emp_first_name',
    label: 'First Name',
    aliases: ['first name', 'employee first name', 'given name'],
  },
  {
    key: 'emp_last_name',
    label: 'Last Name',
    aliases: ['last name', 'employee last name', 'surname', 'family name'],
  },
  {
    key: 'emp_full_name',
    label: 'Employee Name',
    aliases: ['employee name', 'full name', 'name', 'emp name', 'staff name', 'display name'],
    requiredForCreate: true,
  },
  {
    key: 'emp_email',
    label: 'Email',
    aliases: ['email', 'email id', 'email address', 'official email', 'work email', 'mail'],
    requiredForCreate: true,
    normalize: normalizeEmail,
  },
  {
    key: 'emp_contact',
    label: 'Contact Number',
    aliases: ['contact', 'contact number', 'mobile', 'mobile number', 'phone', 'phone number', 'cell'],
    normalize: normalizeContact,
  },
  {
    key: 'emp_designation',
    label: 'Designation',
    aliases: ['designation', 'job title', 'title', 'position', 'role title'],
  },
  {
    key: 'emp_department',
    label: 'Department',
    aliases: ['department', 'dept', 'division', 'function'],
  },
  {
    key: 'emp_branch_id',
    label: 'Branch ID',
    aliases: ['branch id', 'branch code', 'employee branch'],
    normalize: normalizeInteger,
  },
  {
    key: 'emp_work_timings',
    label: 'Work Timings',
    aliases: ['work timings', 'working hours', 'work hours', 'office timings'],
  },
  {
    key: 'emp_grade',
    label: 'Grade',
    aliases: ['grade', 'band', 'level', 'pay grade'],
  },
  {
    key: 'emp_manager',
    label: 'Manager (Employee ID)',
    aliases: ['manager', 'manager id', 'manager code', 'reporting manager', 'reports to', 'supervisor'],
    hint: 'Must be an Employee ID, not a name',
  },
  {
    key: 'emp_informing_manager',
    label: 'Informing Manager (Employee ID)',
    aliases: ['informing manager', 'informing manager id', 'secondary manager', 'alternate manager'],
    hint: 'Must be an Employee ID, not a name',
  },
  {
    key: 'emp_shift_id',
    label: 'Shift ID',
    aliases: ['shift', 'shift id', 'shift code'],
    normalize: normalizeInteger,
  },
  {
    key: 'emp_joined_date',
    label: 'Joining Date',
    aliases: ['joining date', 'date of joining', 'joined date', 'doj', 'hire date', 'start date', 'emp joining date'],
    normalize: normalizeDate,
  },
  {
    key: 'emp_date_of_birth',
    label: 'Date of Birth',
    aliases: ['date of birth', 'dob', 'birth date', 'birthday'],
    normalize: normalizeDate,
  },
  {
    key: 'emp_blood_group',
    label: 'Blood Group',
    aliases: ['blood group', 'blood', 'bloodgroup', 'blood type'],
    normalize: normalizeBloodGroup,
  },
  {
    key: 'role',
    label: 'System Role',
    aliases: ['role', 'system role', 'access role', 'user role', 'access level'],
    createOnly: true,
    hint: 'Applied to new employees only',
    normalize: normalizeRole,
  },
]

export const FIELD_BY_KEY = new Map(IMPORT_FIELDS.map((field) => [field.key, field]))

export const KEY_FIELD: ImportFieldKey = 'emp_code'

const canonical = (value: string) => value.toLowerCase().replace(/[\s_\-.()/]+/g, ' ').trim()

/**
 * Best-effort column → field guess. Exact alias matches win over partial ones,
 * and each field is only claimed once so two similar headers can't collide.
 */
export function autoMapColumns(headers: string[]): (ImportFieldKey | null)[] {
  const taken = new Set<ImportFieldKey>()
  const mapping: (ImportFieldKey | null)[] = headers.map(() => null)

  const claim = (index: number, key: ImportFieldKey) => {
    mapping[index] = key
    taken.add(key)
  }

  // Pass 1 — exact matches against the field key or a known alias.
  headers.forEach((header, index) => {
    const name = canonical(header)
    if (!name) return
    const match = IMPORT_FIELDS.find(
      (field) =>
        !taken.has(field.key) &&
        (canonical(field.key) === name || canonical(field.label) === name || field.aliases.some((alias) => canonical(alias) === name))
    )
    if (match) claim(index, match.key)
  })

  // Pass 2 — substring matches for headers like "Employee Department (HR)".
  headers.forEach((header, index) => {
    if (mapping[index]) return
    const name = canonical(header)
    if (!name) return
    const match = IMPORT_FIELDS.find(
      (field) => !taken.has(field.key) && field.aliases.some((alias) => name.includes(canonical(alias)))
    )
    if (match) claim(index, match.key)
  })

  return mapping
}
