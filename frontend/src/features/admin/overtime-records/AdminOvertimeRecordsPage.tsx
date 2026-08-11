import { useCallback, useEffect, useState, type ReactNode } from 'react'
import ColumnVisibilitySelector, { type ColumnDef } from '../attendance-exceptions/components/ColumnVisibilitySelector'
import './AdminOvertimeRecordsPage.css'
import type {
  AdminOvertimeDatePreset,
  AdminOvertimeFilterOptions,
  AdminOvertimeFilterState,
  AdminOvertimeKpis,
  AdminOvertimeMutationPayload,
  AdminOvertimePagination,
  AdminOvertimeRecord,
  AdminOvertimeStatus,
} from '../../../types/admin'

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'work_date', label: 'Dates' },
  { key: 'day', label: 'Day' },
  { key: 'extra_hours', label: 'Extra Hours' },
  { key: 'comp_off_days', label: 'Comp-Off Days' },
  { key: 'status', label: 'Status' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'details', label: 'Details' },
  { key: 'email', label: 'Email' },
  { key: 'designation', label: 'Designation' },
  { key: 'attendance_id', label: 'Attendance ID' },
  { key: 'clock_in', label: 'Clock In' },
  { key: 'clock_out', label: 'Clock Out' },
  { key: 'clock_in_sequence', label: 'Clock-In Sequence' },
  { key: 'actual_hours', label: 'Actual Hours' },
  { key: 'standard_hours', label: 'Standard Hours' },
  { key: 'compoff_request_id', label: 'Comp-Off Request ID' },
  { key: 'expires_at', label: 'Expires At' },
  { key: 'approved_at', label: 'Approved At' },
  { key: 'utilized_at', label: 'Utilized At' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
  { key: 'activities', label: 'Activities' },
]

const DEFAULT_VISIBLE = new Set([
  'employee',
  'work_date',
  'extra_hours',
  'comp_off_days',
  'status',
  'deadline',
  'details',
])

const STORAGE_KEY = 'fawnix_overtime_columns_v2'

const OVERTIME_STATUS_OPTIONS: AdminOvertimeStatus[] = [
  'eligible',
  'requested',
  'approved',
  'rejected',
  'expired',
  'utilized',
]

const DATE_PRESETS: Array<{ value: AdminOvertimeDatePreset; label: string }> = [
  { value: '', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

const SORT_OPTIONS = [
  { value: 'work_date', label: 'Work Date' },
  { value: 'employee_name', label: 'Employee Name' },
  { value: 'employee_code', label: 'Employee Code' },
  { value: 'extra_hours', label: 'Extra Hours' },
  { value: 'comp_off_days', label: 'Comp-Off Days' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Created At' },
  { value: 'updated_at', label: 'Updated At' },
]

const PAGE_SIZE_OPTIONS = ['10', '15', '25', '50', '100']

type AdminOvertimeRecordsPageProps = {
  actionLoading: boolean
  actionStatus: string
  canWriteAdminData: boolean
  error: string
  filterOptions: AdminOvertimeFilterOptions
  filters: AdminOvertimeFilterState
  formatDateOnly: (value?: string) => string
  formatDateTime: (value?: string) => string
  kpis: AdminOvertimeKpis
  lastSyncedAt: Date | null
  loading: boolean
  pagination: AdminOvertimePagination
  records: AdminOvertimeRecord[]
  validationError: string
  approveRecord: (recordId: number, action: 'approved' | 'rejected', remarks?: string) => Promise<AdminOvertimeRecord | undefined>
  applyDatePreset: (preset: AdminOvertimeDatePreset) => void
  clearFilters: () => void
  createRecord: (payload: AdminOvertimeMutationPayload) => Promise<AdminOvertimeRecord | undefined>
  deleteRecord: (recordId: number, force?: boolean) => Promise<AdminOvertimeRecord | undefined>
  onChangePage: (page: number) => void
  refresh: () => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  updateRecord: (recordId: number, payload: AdminOvertimeMutationPayload) => Promise<AdminOvertimeRecord | undefined>
  updateFilter: <K extends keyof AdminOvertimeFilterState>(
    key: K,
    value: AdminOvertimeFilterState[K]
  ) => void
  updateStatus: (recordId: number, status: AdminOvertimeStatus, remarks?: string) => Promise<AdminOvertimeRecord | undefined>
}

function loadVisibleKeys(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed)
      }
    }
  } catch {
    // Local preference storage should not affect the records page.
  }

  return new Set(DEFAULT_VISIBLE)
}

function saveVisibleKeys(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]))
  } catch {
    // Ignore unavailable storage.
  }
}

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatDecimal(value: number | string | null | undefined, suffix: string, digits = 2) {
  const numericValue = toNumber(value)
  if (numericValue === null) {
    return '--'
  }

  return `${numericValue.toFixed(digits)} ${suffix}`
}

function formatCount(value: number | string | null | undefined) {
  const numericValue = toNumber(value)
  return numericValue === null ? '--' : numericValue.toLocaleString()
}

function normalizeOvertimeStatus(value?: string): AdminOvertimeStatus {
  const normalized = (value || '').toLowerCase()
  return OVERTIME_STATUS_OPTIONS.includes(normalized as AdminOvertimeStatus)
    ? normalized as AdminOvertimeStatus
    : 'eligible'
}

function formatStatus(value?: string) {
  const raw = (value || '').trim()
  if (!raw) {
    return 'Unknown'
  }

  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function statusPillClass(value?: string) {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'approved') return 'active'
  if (normalized === 'eligible') return 'success'
  if (normalized === 'requested') return 'accent'
  if (normalized === 'rejected' || normalized === 'expired') return 'danger'
  if (normalized === 'utilized') return 'inactive'
  return 'inactive'
}

function parseDateValue(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return null

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toDateInputText(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) {
    return ''
  }

  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw)
  if (match) {
    return match[1]
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function toDateTimeInputText(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) {
    return ''
  }

  const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw)
  if (match) {
    return `${match[1]}T${match[2]}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const pad = (part: number) => String(part).padStart(2, '0')
  return [
    parsed.getFullYear(),
    '-',
    pad(parsed.getMonth() + 1),
    '-',
    pad(parsed.getDate()),
    'T',
    pad(parsed.getHours()),
    ':',
    pad(parsed.getMinutes()),
  ].join('')
}

function formatCompactDate(value?: string | null) {
  const parsed = parseDateValue(value)
  if (!parsed) {
    return '--'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function formatWorkDateRange(record: AdminOvertimeRecord) {
  const dateLabel = formatCompactDate(record.work_date)
  return `${dateLabel} - ${dateLabel}`
}

function getDayLabel(record: AdminOvertimeRecord) {
  const existing = (record.day_of_week || '').trim()
  if (existing) {
    return formatStatus(existing)
  }

  const parsed = parseDateValue(record.work_date)
  if (!parsed) {
    return '--'
  }

  return parsed.toLocaleDateString('en-IN', { weekday: 'long' })
}

function getEmployeeName(record: AdminOvertimeRecord) {
  return record.emp_full_name || record.emp_name || record.emp_code || 'Unknown employee'
}

function getEmployeeMeta(record: AdminOvertimeRecord) {
  const code = (record.emp_code || record.employee_code || '').trim()
  const department = (record.emp_department || record.department || '').trim()
  const meta = [code, department].filter(Boolean).join('.')
  return meta || record.emp_email || '--'
}

function getDeadlineValue(record: AdminOvertimeRecord) {
  return record.recording_deadline || record.expires_at || record.expired_at || ''
}

function getDeadlineState(record: AdminOvertimeRecord): 'expired' | 'soon' | 'ok' | 'missing' {
  const status = (record.status || '').toLowerCase()
  if (status === 'expired' || record.expired_at) {
    return 'expired'
  }

  const parsed = parseDateValue(getDeadlineValue(record))
  if (!parsed) {
    return 'missing'
  }

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const soon = new Date(startToday)
  soon.setDate(startToday.getDate() + 7)
  const deadlineDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  if (deadlineDay < startToday) {
    return 'expired'
  }

  if (deadlineDay <= soon) {
    return 'soon'
  }

  return 'ok'
}

function formatDeadline(record: AdminOvertimeRecord, formatDateOnly: (value?: string) => string) {
  const deadline = getDeadlineValue(record)
  return deadline ? formatDateOnly(deadline) : '--'
}

function formatActivityType(value?: string) {
  return formatStatus(value || 'Activity')
}

function formatDurationMinutes(value?: number | string | null) {
  const minutes = toNumber(value)
  if (minutes === null) {
    return '--'
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function getActivitiesSummary(record: AdminOvertimeRecord) {
  const activities = record.activities || []
  if (!activities.length) {
    return 'No activities'
  }

  return activities
    .map((activity) => {
      const parts = [
        formatActivityType(activity.activity_type),
        activity.status ? formatStatus(activity.status) : '',
        formatDurationMinutes(activity.duration_minutes),
      ].filter(Boolean)
      return parts.join(' - ')
    })
    .join('; ')
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function getCsvValue(
  record: AdminOvertimeRecord,
  columnKey: string,
  formatDateOnly: (value?: string) => string,
  formatDateTime: (value?: string) => string
) {
  switch (columnKey) {
    case 'employee':
      return getEmployeeName(record)
    case 'work_date':
      return `${formatWorkDateRange(record)} ${getDayLabel(record)}`
    case 'day':
      return getDayLabel(record)
    case 'extra_hours':
      return formatDecimal(record.extra_hours, 'h')
    case 'comp_off_days':
      return formatDecimal(record.comp_off_days, 'd')
    case 'status':
      return formatStatus(record.status)
    case 'deadline':
      return formatDeadline(record, formatDateOnly)
    case 'email':
      return record.emp_email || ''
    case 'designation':
      return record.emp_designation || ''
    case 'attendance_id':
      return record.attendance_id ?? ''
    case 'clock_in':
      return record.clock_in_time ? formatDateTime(record.clock_in_time) : ''
    case 'clock_out':
      return record.clock_out_time ? formatDateTime(record.clock_out_time) : ''
    case 'clock_in_sequence':
      return record.clock_in_sequence ?? ''
    case 'actual_hours':
      return formatDecimal(record.actual_hours, 'h')
    case 'standard_hours':
      return formatDecimal(record.standard_hours, 'h')
    case 'compoff_request_id':
      return record.compoff_request_id ?? ''
    case 'expires_at':
      return record.expires_at ? formatDateOnly(record.expires_at) : ''
    case 'approved_at':
      return record.approval_completed_at ? formatDateTime(record.approval_completed_at) : ''
    case 'utilized_at':
      return record.utilized_at ? formatDateTime(record.utilized_at) : ''
    case 'created_at':
      return record.created_at ? formatDateTime(record.created_at) : ''
    case 'updated_at':
      return record.updated_at ? formatDateTime(record.updated_at) : ''
    case 'activities':
      return getActivitiesSummary(record)
    default:
      return ''
  }
}

function downloadRecordsAsCsv(
  records: AdminOvertimeRecord[],
  visibleKeys: Set<string>,
  formatDateOnly: (value?: string) => string,
  formatDateTime: (value?: string) => string
) {
  const exportColumns = ALL_COLUMNS.filter((column) => column.key !== 'details' && visibleKeys.has(column.key))
  const columns = exportColumns.length
    ? exportColumns
    : ALL_COLUMNS.filter((column) => DEFAULT_VISIBLE.has(column.key) && column.key !== 'details')
  const header = columns.map((column) => csvEscape(column.label)).join(',')
  const lines = records.map((record) =>
    columns
      .map((column) => csvEscape(getCsvValue(record, column.key, formatDateOnly, formatDateTime)))
      .join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `overtime-records-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

type OvertimeFormValues = {
  attendance_id: string
  emp_code: string
  work_date: string
  clock_in_sequence: string
  actual_hours: string
  extra_hours: string
  standard_hours: string
  comp_off_days: string
  status: AdminOvertimeStatus
  recording_deadline: string
  expires_at: string
  expired_at: string
  approval_completed_at: string
  utilized_at: string
  compoff_request_id: string
}

const EMPTY_FORM_VALUES: OvertimeFormValues = {
  attendance_id: '',
  emp_code: '',
  work_date: '',
  clock_in_sequence: '1',
  actual_hours: '',
  extra_hours: '',
  standard_hours: '',
  comp_off_days: '',
  status: 'eligible',
  recording_deadline: '',
  expires_at: '',
  expired_at: '',
  approval_completed_at: '',
  utilized_at: '',
  compoff_request_id: '',
}

function recordToFormValues(record: AdminOvertimeRecord | null): OvertimeFormValues {
  if (!record) {
    return EMPTY_FORM_VALUES
  }

  return {
    attendance_id: record.attendance_id == null ? '' : String(record.attendance_id),
    emp_code: record.emp_code || record.employee_code || '',
    work_date: toDateInputText(record.work_date),
    clock_in_sequence: record.clock_in_sequence == null ? '' : String(record.clock_in_sequence),
    actual_hours: record.actual_hours == null ? '' : String(record.actual_hours),
    extra_hours: record.extra_hours == null ? '' : String(record.extra_hours),
    standard_hours: record.standard_hours == null ? '' : String(record.standard_hours),
    comp_off_days: record.comp_off_days == null ? '' : String(record.comp_off_days),
    status: normalizeOvertimeStatus(record.status),
    recording_deadline: toDateInputText(record.recording_deadline),
    expires_at: toDateInputText(record.expires_at),
    expired_at: toDateTimeInputText(record.expired_at),
    approval_completed_at: toDateTimeInputText(record.approval_completed_at),
    utilized_at: toDateTimeInputText(record.utilized_at),
    compoff_request_id: record.compoff_request_id == null ? '' : String(record.compoff_request_id),
  }
}

function isNonNegativeNumber(value: string) {
  if (!value.trim()) {
    return true
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0
}

function isPositiveInteger(value: string) {
  if (!value.trim()) {
    return true
  }

  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue > 0
}

function validateFormValues(values: OvertimeFormValues) {
  if (!values.emp_code.trim()) {
    return 'Employee code is required.'
  }

  if (!values.work_date) {
    return 'Work date is required.'
  }

  const numberFields = [
    ['actual hours', values.actual_hours],
    ['extra hours', values.extra_hours],
    ['standard hours', values.standard_hours],
    ['comp-off days', values.comp_off_days],
  ]
  const invalidNumber = numberFields.find(([, value]) => !isNonNegativeNumber(value))
  if (invalidNumber) {
    return `${invalidNumber[0]} must be zero or greater.`
  }

  const integerFields = [
    ['attendance ID', values.attendance_id],
    ['clock-in sequence', values.clock_in_sequence],
    ['comp-off request ID', values.compoff_request_id],
  ]
  const invalidInteger = integerFields.find(([, value]) => !isPositiveInteger(value))
  if (invalidInteger) {
    return `${invalidInteger[0]} must be a positive whole number.`
  }

  return ''
}

function buildMutationPayload(values: OvertimeFormValues, includeBlankNulls: boolean): AdminOvertimeMutationPayload {
  const optionalValue = (value: string) => {
    const trimmed = value.trim()
    return trimmed || (includeBlankNulls ? null : undefined)
  }
  const payload: AdminOvertimeMutationPayload = {
    emp_code: values.emp_code.trim(),
    work_date: values.work_date,
    status: values.status,
  }

  const optionalFields: Array<keyof OvertimeFormValues> = [
    'attendance_id',
    'clock_in_sequence',
    'actual_hours',
    'extra_hours',
    'standard_hours',
    'comp_off_days',
    'recording_deadline',
    'expires_at',
    'expired_at',
    'approval_completed_at',
    'utilized_at',
    'compoff_request_id',
  ]

  optionalFields.forEach((fieldName) => {
    const value = optionalValue(values[fieldName])
    if (value !== undefined) {
      ;(payload as Record<string, string | null | undefined>)[fieldName] = value
    }
  })

  return payload
}

function PlainTh({
  columnKey,
  label,
  visible,
  children,
}: {
  columnKey: string
  label: string
  visible: boolean
  children?: ReactNode
}) {
  if (!visible) {
    return null
  }

  return <th className={`otr-th otr-col--${columnKey}`}>{children || label}</th>
}

function ToolbarIcon({
  name,
}: {
  name: 'refresh' | 'download' | 'clear' | 'search' | 'plus' | 'edit' | 'trash' | 'check'
}) {
  if (name === 'download') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 18h14" />
      </svg>
    )
  }

  if (name === 'clear') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    )
  }

  if (name === 'edit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  }

  if (name === 'trash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 13 4 4L19 7" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4.5-4.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.9 6.3L4 9" />
      <path d="M5.5 15A7 7 0 0 0 17.1 17.7L20 15" />
    </svg>
  )
}

function DetailFactList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="otr-drawer-facts">
      {items.map((item) => (
        <div className="otr-drawer-fact" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || '--'}</dd>
        </div>
      ))}
    </dl>
  )
}

function OvertimeRecordFormDialog({
  actionLoading,
  error,
  mode,
  onChange,
  onClose,
  onSubmit,
  values,
}: {
  actionLoading: boolean
  error: string
  mode: 'create' | 'edit' | null
  onChange: <K extends keyof OvertimeFormValues>(key: K, value: OvertimeFormValues[K]) => void
  onClose: () => void
  onSubmit: () => void
  values: OvertimeFormValues
}) {
  if (!mode) {
    return null
  }

  const title = mode === 'create' ? 'New Overtime Record' : 'Edit Overtime Record'
  const submitLabel = mode === 'create' ? 'Create Record' : 'Save Changes'

  return (
    <div className="otr-modal-shell" role="presentation">
      <button className="otr-modal-overlay" type="button" onClick={onClose} aria-label="Close overtime form" />
      <form
        className="otr-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className="otr-modal-header">
          <div>
            <p className="otr-drawer-kicker">Overtime Records</p>
            <h3>{title}</h3>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close form">
            x
          </button>
        </header>

        <div className="otr-modal-body">
          <div className="otr-form-grid">
            <label className="otr-form-field">
              <span>Employee Code</span>
              <input
                value={values.emp_code}
                onChange={(event) => onChange('emp_code', event.target.value)}
                placeholder="EMP001"
                required
              />
            </label>
            <label className="otr-form-field">
              <span>Work Date</span>
              <input
                type="date"
                value={values.work_date}
                onChange={(event) => onChange('work_date', event.target.value)}
                required
              />
            </label>
            <label className="otr-form-field">
              <span>Status</span>
              <select
                value={values.status}
                onChange={(event) => onChange('status', event.target.value as AdminOvertimeStatus)}
              >
                {OVERTIME_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="otr-form-field">
              <span>Attendance ID</span>
              <input
                type="number"
                min={1}
                step={1}
                value={values.attendance_id}
                onChange={(event) => onChange('attendance_id', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Clock-In Sequence</span>
              <input
                type="number"
                min={1}
                step={1}
                value={values.clock_in_sequence}
                onChange={(event) => onChange('clock_in_sequence', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Actual Hours</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.actual_hours}
                onChange={(event) => onChange('actual_hours', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Extra Hours</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.extra_hours}
                onChange={(event) => onChange('extra_hours', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Standard Hours</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.standard_hours}
                onChange={(event) => onChange('standard_hours', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Comp-Off Days</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.comp_off_days}
                onChange={(event) => onChange('comp_off_days', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Recording Deadline</span>
              <input
                type="date"
                value={values.recording_deadline}
                onChange={(event) => onChange('recording_deadline', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Expires At</span>
              <input
                type="date"
                value={values.expires_at}
                onChange={(event) => onChange('expires_at', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Comp-Off Request ID</span>
              <input
                type="number"
                min={1}
                step={1}
                value={values.compoff_request_id}
                onChange={(event) => onChange('compoff_request_id', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Approved At</span>
              <input
                type="datetime-local"
                value={values.approval_completed_at}
                onChange={(event) => onChange('approval_completed_at', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Expired At</span>
              <input
                type="datetime-local"
                value={values.expired_at}
                onChange={(event) => onChange('expired_at', event.target.value)}
              />
            </label>
            <label className="otr-form-field">
              <span>Utilized At</span>
              <input
                type="datetime-local"
                value={values.utilized_at}
                onChange={(event) => onChange('utilized_at', event.target.value)}
              />
            </label>
          </div>
          {error ? <p className="otr-filter-error">{error}</p> : null}
        </div>

        <footer className="otr-modal-footer">
          <button className="otr-btn" type="button" onClick={onClose} disabled={actionLoading}>
            Cancel
          </button>
          <button className="otr-btn otr-btn--primary" type="submit" disabled={actionLoading}>
            <ToolbarIcon name="check" />
            {actionLoading ? 'Saving...' : submitLabel}
          </button>
        </footer>
      </form>
    </div>
  )
}

function DeleteOvertimeRecordDialog({
  actionLoading,
  forceDelete,
  onChangeForce,
  onClose,
  onConfirm,
  record,
}: {
  actionLoading: boolean
  forceDelete: boolean
  onChangeForce: (value: boolean) => void
  onClose: () => void
  onConfirm: () => void
  record: AdminOvertimeRecord | null
}) {
  if (!record) {
    return null
  }

  return (
    <div className="otr-modal-shell" role="presentation">
      <button className="otr-modal-overlay" type="button" onClick={onClose} aria-label="Close delete confirmation" />
      <section className="otr-modal otr-modal--narrow" role="dialog" aria-modal="true" aria-label="Delete overtime record">
        <header className="otr-modal-header">
          <div>
            <p className="otr-drawer-kicker">Delete Record</p>
            <h3>{getEmployeeName(record)}</h3>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close delete confirmation">
            x
          </button>
        </header>
        <div className="otr-modal-body">
          <p className="otr-confirm-copy">
            This removes the overtime record for {formatStatus(record.status)} status on {toDateInputText(record.work_date) || 'the selected work date'}.
          </p>
          <label className="otr-checkbox-field">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(event) => onChangeForce(event.target.checked)}
            />
            <span>Force delete linked or finalized records</span>
          </label>
        </div>
        <footer className="otr-modal-footer">
          <button className="otr-btn" type="button" onClick={onClose} disabled={actionLoading}>
            Cancel
          </button>
          <button className="otr-btn otr-btn--danger" type="button" onClick={onConfirm} disabled={actionLoading}>
            <ToolbarIcon name="trash" />
            {actionLoading ? 'Deleting...' : 'Delete'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function DetailDrawer({
  record,
  open,
  onClose,
  actionLoading,
  canWriteAdminData,
  formatDateOnly,
  formatDateTime,
  onApprove,
  onDelete,
  onEdit,
  onRemarksChange,
  onStatusValueChange,
  onUpdateStatus,
  remarks,
  statusValue,
}: {
  record: AdminOvertimeRecord | null
  open: boolean
  onClose: () => void
  actionLoading: boolean
  canWriteAdminData: boolean
  formatDateOnly: (value?: string) => string
  formatDateTime: (value?: string) => string
  onApprove: (record: AdminOvertimeRecord, action: 'approved' | 'rejected', remarks: string) => void
  onDelete: (record: AdminOvertimeRecord) => void
  onEdit: (record: AdminOvertimeRecord) => void
  onRemarksChange: (value: string) => void
  onStatusValueChange: (value: AdminOvertimeStatus) => void
  onUpdateStatus: (record: AdminOvertimeRecord, status: AdminOvertimeStatus, remarks: string) => void
  remarks: string
  statusValue: AdminOvertimeStatus
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!record) {
    return null
  }

  const activities = record.activities || []
  const employeeFacts = [
    { label: 'Employee Code', value: record.emp_code || '--' },
    { label: 'Email', value: record.emp_email || '--' },
    { label: 'Designation', value: record.emp_designation || '--' },
  ]
  const attendanceFacts = [
    { label: 'Attendance ID', value: record.attendance_id ?? '--' },
    { label: 'Clock In', value: record.clock_in_time ? formatDateTime(record.clock_in_time) : '--' },
    { label: 'Clock Out', value: record.clock_out_time ? formatDateTime(record.clock_out_time) : '--' },
    { label: 'Clock-In Sequence', value: record.clock_in_sequence ?? '--' },
    { label: 'Actual Hours', value: formatDecimal(record.actual_hours, 'h') },
    { label: 'Standard Hours', value: formatDecimal(record.standard_hours, 'h') },
    { label: 'Extra Hours', value: formatDecimal(record.extra_hours, 'h') },
    { label: 'Comp-Off Days', value: formatDecimal(record.comp_off_days, 'd') },
  ]
  const lifecycleFacts = [
    { label: 'Recording Deadline', value: record.recording_deadline ? formatDateOnly(record.recording_deadline) : '--' },
    { label: 'Expires At', value: record.expires_at ? formatDateOnly(record.expires_at) : '--' },
    { label: 'Expired At', value: record.expired_at ? formatDateTime(record.expired_at) : '--' },
    { label: 'Approved At', value: record.approval_completed_at ? formatDateTime(record.approval_completed_at) : '--' },
    { label: 'Utilized At', value: record.utilized_at ? formatDateTime(record.utilized_at) : '--' },
    { label: 'Comp-Off Request ID', value: record.compoff_request_id ?? '--' },
    { label: 'Created At', value: record.created_at ? formatDateTime(record.created_at) : '--' },
    { label: 'Updated At', value: record.updated_at ? formatDateTime(record.updated_at) : '--' },
  ]

  return (
    <>
      <button
        type="button"
        className={`otr-drawer-overlay${open ? ' otr-drawer-overlay--open' : ''}`}
        onClick={onClose}
        aria-label="Close overtime record details"
      />
      <aside
        className={`otr-drawer${open ? ' otr-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Overtime record details"
      >
        <header className="otr-drawer-header">
          <div>
            <p className="otr-drawer-kicker">{formatDateOnly(record.work_date)} - {getDayLabel(record)}</p>
            <h3>{getEmployeeName(record)}</h3>
            <span className={`table-pill ${statusPillClass(record.status)}`}>
              {formatStatus(record.status)}
            </span>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close details">
            x
          </button>
        </header>

        <div className="otr-drawer-body">
          <section className="otr-drawer-summary" aria-label="Overtime summary">
            <div>
              <span>Extra hours</span>
              <strong>{formatDecimal(record.extra_hours, 'h')}</strong>
            </div>
            <div>
              <span>Comp-off</span>
              <strong>{formatDecimal(record.comp_off_days, 'd')}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>{formatDeadline(record, formatDateOnly)}</strong>
            </div>
          </section>

          {canWriteAdminData ? (
            <section className="otr-drawer-section otr-drawer-actions" aria-label="Record actions">
              <div className="otr-action-row">
                <button className="otr-btn" type="button" onClick={() => onEdit(record)} disabled={actionLoading}>
                  <ToolbarIcon name="edit" />
                  Edit
                </button>
                <button className="otr-btn otr-btn--danger-soft" type="button" onClick={() => onDelete(record)} disabled={actionLoading}>
                  <ToolbarIcon name="trash" />
                  Delete
                </button>
                <button className="otr-btn otr-btn--primary" type="button" onClick={() => onApprove(record, 'approved', remarks)} disabled={actionLoading}>
                  Approve
                </button>
                <button className="otr-btn" type="button" onClick={() => onApprove(record, 'rejected', remarks)} disabled={actionLoading}>
                  Reject
                </button>
              </div>
              <div className="otr-status-editor">
                <label className="otr-form-field">
                  <span>Status Update</span>
                  <select
                    value={statusValue}
                    onChange={(event) => onStatusValueChange(event.target.value as AdminOvertimeStatus)}
                    disabled={actionLoading}
                  >
                    {OVERTIME_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="otr-form-field otr-form-field--wide">
                  <span>Remarks</span>
                  <input
                    value={remarks}
                    onChange={(event) => onRemarksChange(event.target.value)}
                    placeholder="Optional note"
                    disabled={actionLoading}
                  />
                </label>
                <button
                  className="otr-btn"
                  type="button"
                  onClick={() => onUpdateStatus(record, statusValue, remarks)}
                  disabled={actionLoading}
                >
                  Save Status
                </button>
              </div>
            </section>
          ) : null}

          <section className="otr-drawer-section">
            <h4>Employee</h4>
            <DetailFactList items={employeeFacts} />
          </section>

          <section className="otr-drawer-section">
            <h4>Attendance Context</h4>
            <DetailFactList items={attendanceFacts} />
          </section>

          <section className="otr-drawer-section">
            <h4>Record Lifecycle</h4>
            <DetailFactList items={lifecycleFacts} />
          </section>

          <section className="otr-drawer-section">
            <h4>Activities</h4>
            {activities.length ? (
              <ol className="otr-activity-list">
                {activities.map((activity, index) => (
                  <li key={`${activity.field_visit_id || activity.start_time || 'activity'}-${index}`}>
                    <div className="otr-activity-head">
                      <strong>{formatActivityType(activity.activity_type)}</strong>
                      <span>{activity.status ? formatStatus(activity.status) : 'Unknown'}</span>
                    </div>
                    <div className="otr-activity-meta">
                      <span>{activity.start_time ? formatDateTime(activity.start_time) : '--'}</span>
                      <span>{activity.end_time ? formatDateTime(activity.end_time) : '--'}</span>
                      <span>{formatDurationMinutes(activity.duration_minutes)}</span>
                    </div>
                    {activity.field_visit_id ? (
                      <p className="otr-activity-note">Field visit ID {activity.field_visit_id}</p>
                    ) : null}
                    {activity.notes ? <p className="otr-activity-note">{activity.notes}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="otr-drawer-empty">No activities were attached to this attendance session.</p>
            )}
          </section>
        </div>
      </aside>
    </>
  )
}

export default function AdminOvertimeRecordsPage({
  actionLoading,
  actionStatus,
  canWriteAdminData,
  error,
  filterOptions,
  filters,
  formatDateOnly,
  formatDateTime,
  kpis,
  lastSyncedAt,
  loading,
  pagination,
  records,
  validationError,
  approveRecord,
  applyDatePreset,
  clearFilters,
  createRecord,
  deleteRecord,
  onChangePage,
  refresh,
  onSort,
  updateRecord,
  updateFilter,
  updateStatus,
}: AdminOvertimeRecordsPageProps) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(loadVisibleKeys)
  const [drawerRecord, setDrawerRecord] = useState<AdminOvertimeRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStatus, setDrawerStatus] = useState<AdminOvertimeStatus>('eligible')
  const [drawerRemarks, setDrawerRemarks] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [formRecord, setFormRecord] = useState<AdminOvertimeRecord | null>(null)
  const [formValues, setFormValues] = useState<OvertimeFormValues>(EMPTY_FORM_VALUES)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminOvertimeRecord | null>(null)
  const [forceDelete, setForceDelete] = useState(false)
  const [mutationError, setMutationError] = useState('')

  const filtersActive = Boolean(
    filters.search.trim() ||
    filters.status ||
    filters.empCode.trim() ||
    filters.department.trim() ||
    filters.fromDate ||
    filters.toDate ||
    filters.pageSize !== '15' ||
    filters.sortBy !== 'work_date' ||
    filters.sortOrder !== 'desc'
  )

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys)
      if (nextKeys.has(key)) {
        nextKeys.delete(key)
      } else {
        nextKeys.add(key)
      }
      saveVisibleKeys(nextKeys)
      return nextKeys
    })
  }, [])

  const resetColumns = useCallback(() => {
    const nextKeys = new Set(DEFAULT_VISIBLE)
    setVisibleKeys(nextKeys)
    saveVisibleKeys(nextKeys)
  }, [])

  const openDrawer = useCallback((record: AdminOvertimeRecord) => {
    setDrawerRecord(record)
    setDrawerStatus(normalizeOvertimeStatus(record.status))
    setDrawerRemarks('')
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const openCreateForm = useCallback(() => {
    setFormMode('create')
    setFormRecord(null)
    setFormValues(EMPTY_FORM_VALUES)
    setFormError('')
    setMutationError('')
  }, [])

  const openEditForm = useCallback((record: AdminOvertimeRecord) => {
    setFormMode('edit')
    setFormRecord(record)
    setFormValues(recordToFormValues(record))
    setFormError('')
    setMutationError('')
  }, [])

  const closeForm = useCallback(() => {
    if (actionLoading) {
      return
    }

    setFormMode(null)
    setFormRecord(null)
    setFormError('')
  }, [actionLoading])

  const updateFormValue = useCallback(
    <K extends keyof OvertimeFormValues>(key: K, value: OvertimeFormValues[K]) => {
      setFormValues((previousValues) => ({
        ...previousValues,
        [key]: value,
      }))
    },
    []
  )

  const submitForm = useCallback(async () => {
    const nextFormError = validateFormValues(formValues)
    setFormError(nextFormError)
    setMutationError('')
    if (nextFormError) {
      return
    }

    try {
      const payload = buildMutationPayload(formValues, formMode === 'edit')
      if (formMode === 'edit') {
        if (!formRecord?.id) {
          setFormError('This record is missing an ID and cannot be updated.')
          return
        }
        await updateRecord(formRecord.id, payload)
        setDrawerOpen(false)
      } else {
        await createRecord(payload)
      }
      setFormMode(null)
      setFormRecord(null)
      setFormError('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save overtime record.')
    }
  }, [createRecord, formMode, formRecord, formValues, updateRecord])

  const openDeleteDialog = useCallback((record: AdminOvertimeRecord) => {
    setDeleteTarget(record)
    setForceDelete(false)
    setMutationError('')
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) {
      setMutationError('This record is missing an ID and cannot be deleted.')
      return
    }

    try {
      setMutationError('')
      await deleteRecord(deleteTarget.id, forceDelete)
      setDeleteTarget(null)
      setDrawerOpen(false)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Unable to delete overtime record.')
    }
  }, [deleteRecord, deleteTarget, forceDelete])

  const handleStatusUpdate = useCallback(
    async (record: AdminOvertimeRecord, status: AdminOvertimeStatus, remarks: string) => {
      if (!record.id) {
        setMutationError('This record is missing an ID and cannot be updated.')
        return
      }

      try {
        setMutationError('')
        await updateStatus(record.id, status, remarks)
        setDrawerStatus(status)
        setDrawerRemarks('')
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : 'Unable to update overtime status.')
      }
    },
    [updateStatus]
  )

  const handleApproval = useCallback(
    async (record: AdminOvertimeRecord, action: 'approved' | 'rejected', remarks: string) => {
      if (!record.id) {
        setMutationError('This record is missing an ID and cannot be approved or rejected.')
        return
      }

      try {
        setMutationError('')
        await approveRecord(record.id, action, remarks)
        setDrawerStatus(action)
        setDrawerRemarks('')
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : 'Unable to update overtime approval.')
      }
    },
    [approveRecord]
  )

  const vis = (key: string) => visibleKeys.has(key)
  const hasOptionalColumns = ALL_COLUMNS.some((column) => visibleKeys.has(column.key) && !DEFAULT_VISIBLE.has(column.key))
  const tableClassName = `dashboard-table otr-table${hasOptionalColumns ? ' otr-table--wide' : ' otr-table--default'}`
  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const headline = `${formatDecimal(kpis.total_extra_hours, 'h')} extra - ${formatDecimal(kpis.eligible_comp_off_days, 'd')} eligible comp-off`
  const loadingLabel = loading && records.length ? 'Refreshing...' : 'Refresh'
  const firstRecordIndex = pagination.total_records ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const lastRecordIndex = Math.min(pagination.page * pagination.page_size, pagination.total_records)
  const visibleLabel = pagination.total_records
    ? `Showing ${firstRecordIndex.toLocaleString()}-${lastRecordIndex.toLocaleString()} of ${pagination.total_records.toLocaleString()} records`
    : 'No overtime records loaded'
  const statusFilterOptions = filterOptions.statuses.length
    ? filterOptions.statuses
    : OVERTIME_STATUS_OPTIONS
  const operationMessage = mutationError || actionStatus
  const activeDrawerRecord = drawerRecord?.id
    ? records.find((record) => record.id === drawerRecord.id) || drawerRecord
    : drawerRecord

  return (
    <div className="admin-aligned-page admin-aligned-page--overtime-records">
      <div className="otr-page-head">
        <div>
          <p className="eyebrow">Attendance</p>
          <h1 className="otr-page-title">Overtime Records</h1>
          <p className="otr-page-sub">{headline}</p>
        </div>
        <div className="otr-header-actions">
          {syncedLabel ? <span className="otr-synced-label">synced {syncedLabel}</span> : null}
          <button
            className="otr-btn"
            onClick={refresh}
            disabled={loading}
            type="button"
            aria-label="Refresh overtime records"
          >
            <ToolbarIcon name="refresh" />
            {loadingLabel}
          </button>
          {canWriteAdminData ? (
            <button
              className="otr-btn otr-btn--primary"
              onClick={openCreateForm}
              disabled={actionLoading}
              type="button"
              aria-label="Create overtime record"
            >
              <ToolbarIcon name="plus" />
              New Record
            </button>
          ) : null}
          <button
            className="otr-btn"
            onClick={() => downloadRecordsAsCsv(records, visibleKeys, formatDateOnly, formatDateTime)}
            disabled={loading || records.length === 0}
            type="button"
            aria-label="Export visible overtime records"
          >
            <ToolbarIcon name="download" />
            Export
          </button>
        </div>
      </div>

      <div className="otr-kpi-grid" aria-label="Overtime summary">
        <article className="otr-kpi-card">
          <span>Total Records</span>
          <strong>{kpis.total.toLocaleString()}</strong>
          <small>{kpis.total_loaded.toLocaleString()} loaded on this page</small>
        </article>
        <article className="otr-kpi-card">
          <span>Extra Hours</span>
          <strong>{formatDecimal(kpis.total_extra_hours, 'h')}</strong>
          <small>Across matching records</small>
        </article>
        <article className="otr-kpi-card">
          <span>Eligible Comp-Off</span>
          <strong>{formatDecimal(kpis.eligible_comp_off_days, 'd')}</strong>
          <small>Status eligible only</small>
        </article>
        <article className="otr-kpi-card otr-kpi-card--watch">
          <span>Expiring / Expired</span>
          <strong>{kpis.expiring_or_expired.toLocaleString()}</strong>
          <small>Deadline within 7 days</small>
        </article>
        <article className="otr-kpi-card">
          <span>Requested / Approved</span>
          <strong>{kpis.requested.toLocaleString()} / {kpis.approved.toLocaleString()}</strong>
          <small>Comp-off pipeline</small>
        </article>
      </div>

      <section className="otr-filter-card" aria-label="Overtime filters">
        <div className="otr-filter-grid">
          <label className="otr-search-shell">
            <ToolbarIcon name="search" />
            <span className="sr-only">Search overtime records</span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search employee, code, email..."
              aria-label="Search overtime records"
            />
          </label>

          <label className="otr-filter-field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value as AdminOvertimeFilterState['status'])}
              disabled={loading}
            >
              {[{ value: '', label: 'All statuses' }, ...statusFilterOptions.map((status) => ({
                value: status,
                label: formatStatus(status),
              }))].map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="otr-filter-field">
            <span>Employee Code</span>
            <input
              value={filters.empCode}
              onChange={(event) => updateFilter('empCode', event.target.value)}
              placeholder="EMP001"
              disabled={loading}
            />
          </label>

          <label className="otr-filter-field">
            <span>Department</span>
            <select
              value={filters.department}
              onChange={(event) => updateFilter('department', event.target.value)}
              disabled={loading}
            >
              <option value="">All departments</option>
              {filterOptions.departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="otr-filter-field">
            <span>Date Range</span>
            <select
              value={filters.datePreset}
              onChange={(event) => applyDatePreset(event.target.value as AdminOvertimeDatePreset)}
              disabled={loading}
            >
              {DATE_PRESETS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="otr-filter-field otr-filter-field--date">
            <span>From</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter('fromDate', event.target.value)}
              disabled={loading}
            />
          </label>

          <label className="otr-filter-field otr-filter-field--date">
            <span>To</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter('toDate', event.target.value)}
              disabled={loading}
            />
          </label>

          <label className="otr-filter-field otr-filter-field--limit">
            <span>Page Size</span>
            <select
              value={filters.pageSize}
              onChange={(event) => updateFilter('pageSize', event.target.value)}
              disabled={loading}
            >
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>

          <label className="otr-filter-field">
            <span>Sort By</span>
            <select
              value={filters.sortBy}
              onChange={(event) => onSort(event.target.value, filters.sortOrder)}
              disabled={loading}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="otr-filter-field">
            <span>Order</span>
            <select
              value={filters.sortOrder}
              onChange={(event) => onSort(filters.sortBy, event.target.value as 'asc' | 'desc')}
              disabled={loading}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>

          {filtersActive ? (
            <button className="otr-btn otr-btn--clear" type="button" onClick={clearFilters} disabled={loading}>
              <ToolbarIcon name="clear" />
              Clear
            </button>
          ) : null}
        </div>

        {validationError ? <p className="otr-filter-error">{validationError}</p> : null}
        {operationMessage ? (
          <p className={`otr-action-message${mutationError ? ' otr-action-message--error' : ''}`}>
            {operationMessage}
          </p>
        ) : null}
      </section>

      <div className="table-card otr-table-card">
        <div className="otr-toolbar">
          <div>
            <strong>{loading && !records.length ? 'Loading records...' : visibleLabel}</strong>
            <span>Search, filters, sorting, and pagination are backed by the API.</span>
          </div>
          <div className="otr-toolbar__right">
            {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
            <ColumnVisibilitySelector
              columns={ALL_COLUMNS}
              visibleKeys={visibleKeys}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </div>

        {loading && !records.length ? (
          <div className="empty-state otr-loading-state">
            <span className="otr-spinner" aria-hidden="true" />
            Loading overtime records...
          </div>
        ) : error && !records.length ? (
          <div className="empty-state otr-error-state">
            <strong>Unable to load overtime records</strong>
            <p>{error}</p>
            <button className="otr-btn" type="button" onClick={refresh}>
              <ToolbarIcon name="refresh" />
              Retry
            </button>
          </div>
        ) : records.length ? (
          <div className="table-scroll otr-table-scroll">
            <table className={tableClassName} aria-label="Overtime records">
              <thead>
                <tr>
                  <PlainTh columnKey="employee" label="Employee" visible={vis('employee')} />
                  <PlainTh columnKey="work_date" label="Dates" visible={vis('work_date')} />
                  <PlainTh columnKey="day" label="Day" visible={vis('day')} />
                  <PlainTh columnKey="extra_hours" label="Extra Hours" visible={vis('extra_hours')} />
                  <PlainTh columnKey="comp_off_days" label="Comp-Off Days" visible={vis('comp_off_days')} />
                  <PlainTh columnKey="status" label="Status" visible={vis('status')} />
                  <PlainTh columnKey="deadline" label="Deadline" visible={vis('deadline')} />
                  <PlainTh columnKey="email" label="Email" visible={vis('email')} />
                  <PlainTh columnKey="designation" label="Designation" visible={vis('designation')} />
                  <PlainTh columnKey="attendance_id" label="Attendance ID" visible={vis('attendance_id')} />
                  <PlainTh columnKey="clock_in" label="Clock In" visible={vis('clock_in')} />
                  <PlainTh columnKey="clock_out" label="Clock Out" visible={vis('clock_out')} />
                  <PlainTh columnKey="clock_in_sequence" label="Clock-In Sequence" visible={vis('clock_in_sequence')} />
                  <PlainTh columnKey="actual_hours" label="Actual Hours" visible={vis('actual_hours')} />
                  <PlainTh columnKey="standard_hours" label="Standard Hours" visible={vis('standard_hours')} />
                  <PlainTh columnKey="compoff_request_id" label="Comp-Off Request ID" visible={vis('compoff_request_id')} />
                  <PlainTh columnKey="expires_at" label="Expires At" visible={vis('expires_at')} />
                  <PlainTh columnKey="approved_at" label="Approved At" visible={vis('approved_at')} />
                  <PlainTh columnKey="utilized_at" label="Utilized At" visible={vis('utilized_at')} />
                  <PlainTh columnKey="created_at" label="Created At" visible={vis('created_at')} />
                  <PlainTh columnKey="updated_at" label="Updated At" visible={vis('updated_at')} />
                  <PlainTh columnKey="activities" label="Activities" visible={vis('activities')} />
                  <PlainTh columnKey="details" label="Details" visible={vis('details')} />
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const rowKey = `${record.id ?? record.attendance_id ?? record.emp_code ?? 'overtime'}-${record.work_date || index}`
                  const deadlineState = getDeadlineState(record)
                  return (
                    <tr
                      key={rowKey}
                      className="otr-row"
                      onClick={() => openDrawer(record)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          openDrawer(record)
                        }
                      }}
                    >
                      {vis('employee') && (
                        <td className="otr-td otr-td--employee otr-col--employee">
                          <div className="otr-employee-cell">
                            <span className={`otr-status-rail otr-status-rail--${statusPillClass(record.status)}`} aria-hidden="true" />
                            <div>
                              <strong>{getEmployeeName(record)}</strong>
                              <span>{getEmployeeMeta(record)}</span>
                            </div>
                          </div>
                        </td>
                      )}
                      {vis('work_date') && (
                        <td className="otr-td otr-td--date otr-col--work_date">
                          <span className="otr-date-range">{formatWorkDateRange(record)}</span>
                          <span className="otr-date-day">{getDayLabel(record)}</span>
                        </td>
                      )}
                      {vis('day') && <td className="otr-td otr-col--day">{getDayLabel(record)}</td>}
                      {vis('extra_hours') && <td className="otr-td otr-td--num otr-col--extra_hours">{formatDecimal(record.extra_hours, 'h')}</td>}
                      {vis('comp_off_days') && <td className="otr-td otr-td--num otr-col--comp_off_days">{formatDecimal(record.comp_off_days, 'd')}</td>}
                      {vis('status') && (
                        <td className="otr-td otr-col--status">
                          <span className={`table-pill ${statusPillClass(record.status)}`}>
                            {formatStatus(record.status)}
                          </span>
                        </td>
                      )}
                      {vis('deadline') && (
                        <td className="otr-td otr-col--deadline">
                          <span className={`otr-deadline otr-deadline--${deadlineState}`}>
                            {formatDeadline(record, formatDateOnly)}
                          </span>
                        </td>
                      )}
                      {vis('email') && <td className="otr-td otr-td--trunc otr-col--email" title={record.emp_email || ''}>{record.emp_email || '--'}</td>}
                      {vis('designation') && <td className="otr-td otr-td--trunc otr-col--designation" title={record.emp_designation || ''}>{record.emp_designation || '--'}</td>}
                      {vis('attendance_id') && <td className="otr-td otr-td--num otr-col--attendance_id">{record.attendance_id ?? '--'}</td>}
                      {vis('clock_in') && <td className="otr-td otr-td--mono otr-col--clock_in">{record.clock_in_time ? formatDateTime(record.clock_in_time) : '--'}</td>}
                      {vis('clock_out') && <td className="otr-td otr-td--mono otr-col--clock_out">{record.clock_out_time ? formatDateTime(record.clock_out_time) : '--'}</td>}
                      {vis('clock_in_sequence') && <td className="otr-td otr-td--num otr-col--clock_in_sequence">{record.clock_in_sequence ?? '--'}</td>}
                      {vis('actual_hours') && <td className="otr-td otr-td--num otr-col--actual_hours">{formatDecimal(record.actual_hours, 'h')}</td>}
                      {vis('standard_hours') && <td className="otr-td otr-td--num otr-col--standard_hours">{formatDecimal(record.standard_hours, 'h')}</td>}
                      {vis('compoff_request_id') && <td className="otr-td otr-td--num otr-col--compoff_request_id">{record.compoff_request_id ?? '--'}</td>}
                      {vis('expires_at') && <td className="otr-td otr-col--expires_at">{record.expires_at ? formatDateOnly(record.expires_at) : '--'}</td>}
                      {vis('approved_at') && <td className="otr-td otr-col--approved_at">{record.approval_completed_at ? formatDateTime(record.approval_completed_at) : '--'}</td>}
                      {vis('utilized_at') && <td className="otr-td otr-col--utilized_at">{record.utilized_at ? formatDateTime(record.utilized_at) : '--'}</td>}
                      {vis('created_at') && <td className="otr-td otr-col--created_at">{record.created_at ? formatDateTime(record.created_at) : '--'}</td>}
                      {vis('updated_at') && <td className="otr-td otr-col--updated_at">{record.updated_at ? formatDateTime(record.updated_at) : '--'}</td>}
                      {vis('activities') && (
                        <td className="otr-td otr-col--activities">
                          <span className="otr-activity-count">{formatCount(record.activities?.length || 0)}</span>
                        </td>
                      )}
                      {vis('details') && (
                        <td className="otr-td otr-td--action otr-col--details">
                          <button
                            type="button"
                            className="otr-action-btn"
                            onClick={(event) => {
                              event.stopPropagation()
                              openDrawer(record)
                            }}
                            aria-label={`View overtime record for ${getEmployeeName(record)}`}
                          >
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state otr-empty-state">
            No overtime records found for the current filters.
          </div>
        )}

        <footer className="otr-pagination">
          <span>
            Page {pagination.total_pages ? pagination.page : 0} of {pagination.total_pages || 0}
          </span>
          <div>
            <button
              className="otr-btn"
              type="button"
              onClick={() => onChangePage(pagination.page - 1)}
              disabled={loading || !pagination.has_previous}
            >
              Previous
            </button>
            <button
              className="otr-btn"
              type="button"
              onClick={() => onChangePage(pagination.page + 1)}
              disabled={loading || !pagination.has_next}
            >
              Next
            </button>
          </div>
        </footer>
      </div>

      <DetailDrawer
        record={activeDrawerRecord}
        open={drawerOpen}
        onClose={closeDrawer}
        actionLoading={actionLoading}
        canWriteAdminData={canWriteAdminData}
        formatDateOnly={formatDateOnly}
        formatDateTime={formatDateTime}
        onApprove={handleApproval}
        onDelete={openDeleteDialog}
        onEdit={openEditForm}
        onRemarksChange={setDrawerRemarks}
        onStatusValueChange={setDrawerStatus}
        onUpdateStatus={handleStatusUpdate}
        remarks={drawerRemarks}
        statusValue={drawerStatus}
      />

      <OvertimeRecordFormDialog
        actionLoading={actionLoading}
        error={formError}
        mode={formMode}
        onChange={updateFormValue}
        onClose={closeForm}
        onSubmit={submitForm}
        values={formValues}
      />

      <DeleteOvertimeRecordDialog
        actionLoading={actionLoading}
        forceDelete={forceDelete}
        onChangeForce={setForceDelete}
        onClose={() => {
          if (!actionLoading) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={confirmDelete}
        record={deleteTarget}
      />
    </div>
  )
}
