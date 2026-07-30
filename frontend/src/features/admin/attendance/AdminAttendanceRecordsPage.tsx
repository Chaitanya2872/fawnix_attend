import { useMemo, useState } from 'react'
import { isSameDate, toDateInputValue } from '../../../utils/date/dateUtils'
import type { AttendanceRow } from '../../../types/admin'
import AttendanceDatePicker from './AttendanceDatePicker'
import './AdminAttendanceRecordsPage.css'

type AttendanceRecordsStatusFilter = 'all' | 'completed' | 'open' | 'other'

type AdminAttendanceRecordsPageProps = {
  attendanceRows: AttendanceRow[]
  attendanceDateFilter: string
  formatDateOnly: (value?: string) => string
  formatDateTime: (value?: string) => string
  formatWorkingHours: (value?: number | string | null) => string
  loadDashboard: () => void | Promise<void>
  setAttendanceDateFilter: (value: string) => void
}

const STATUS_FILTERS: Array<{ value: AttendanceRecordsStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'open', label: 'Open sessions' },
  { value: 'other', label: 'Other' }
]

function getRecordDateValue(row: AttendanceRow) {
  return row.login_time || row.date || row.logout_time
}

function getRecordSortValue(row: AttendanceRow) {
  const value = row.login_time || row.logout_time || row.date
  if (!value) {
    return 0
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function formatRecordText(value?: string) {
  const rawValue = (value || '').trim()
  if (!rawValue) {
    return '--'
  }

  return rawValue
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function getRecordTypeValue(row: AttendanceRow) {
  const rawType = (row.attendance_type || '').trim().toLowerCase()
  return rawType || 'office'
}

function getRecordLifecycle(row: AttendanceRow): AttendanceRecordsStatusFilter {
  if (row.logout_time) {
    return 'completed'
  }

  if (row.login_time) {
    return 'open'
  }

  return 'other'
}

function getRecordStatusLabel(row: AttendanceRow) {
  const rawStatus = (row.status || '').trim()
  if (rawStatus) {
    return formatRecordText(rawStatus)
  }

  const lifecycle = getRecordLifecycle(row)
  if (lifecycle === 'completed') {
    return 'Completed'
  }

  if (lifecycle === 'open') {
    return 'Open'
  }

  return 'Unknown'
}

function getRecordStatusPillClass(row: AttendanceRow) {
  const lifecycle = getRecordLifecycle(row)
  const status = getRecordStatusLabel(row).toLowerCase()

  if (lifecycle === 'open' || status.includes('late') || status.includes('early')) {
    return 'table-pill warning'
  }

  if (status.includes('absent') || status.includes('missed') || status.includes('reject')) {
    return 'table-pill danger'
  }

  if (
    lifecycle === 'completed' ||
    status.includes('present') ||
    status.includes('approved') ||
    status.includes('office') ||
    status.includes('remote') ||
    status.includes('on time') ||
    status.includes('on_time')
  ) {
    return 'table-pill success'
  }

  return 'table-pill accent'
}

function getSearchText(row: AttendanceRow) {
  return [
    row.employee_name,
    row.employee_email,
    row.emp_designation,
    row.attendance_type,
    row.status,
    row.login_location,
    row.login_address,
    row.logout_location,
    row.logout_address,
    getRecordStatusLabel(row),
    getRecordDateValue(row)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getWorkingHoursValue(row: AttendanceRow) {
  const numericValue = Number(row.working_hours)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatHoursMetric(value: number | null) {
  if (value === null) {
    return '--'
  }

  return `${value.toFixed(2)} h`
}

export default function AdminAttendanceRecordsPage({
  attendanceRows,
  attendanceDateFilter,
  formatDateOnly,
  formatDateTime,
  formatWorkingHours,
  loadDashboard,
  setAttendanceDateFilter
}: AdminAttendanceRecordsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<AttendanceRecordsStatusFilter>('all')
  const selectedAttendanceDate = attendanceDateFilter || toDateInputValue(new Date())
  const normalizedSearch = searchQuery.trim().toLowerCase()

  const dateRows = useMemo(
    () => attendanceRows.filter((row) => isSameDate(getRecordDateValue(row), selectedAttendanceDate)),
    [attendanceRows, selectedAttendanceDate]
  )

  const typeOptions = useMemo(
    () => Array.from(new Set(dateRows.map(getRecordTypeValue))).sort((left, right) => left.localeCompare(right)),
    [dateRows]
  )

  const visibleRows = useMemo(() => {
    return dateRows
      .filter((row) => {
        const matchesType = typeFilter === 'all' || getRecordTypeValue(row) === typeFilter
        const matchesStatus = statusFilter === 'all' || getRecordLifecycle(row) === statusFilter
        const matchesSearch = !normalizedSearch || getSearchText(row).includes(normalizedSearch)
        return matchesType && matchesStatus && matchesSearch
      })
      .sort((left, right) => {
        const timeDelta = getRecordSortValue(right) - getRecordSortValue(left)
        if (timeDelta !== 0) {
          return timeDelta
        }

        return Number(right.id || 0) - Number(left.id || 0)
      })
  }, [dateRows, normalizedSearch, statusFilter, typeFilter])

  const completedRecords = useMemo(
    () => dateRows.filter((row) => getRecordLifecycle(row) === 'completed').length,
    [dateRows]
  )
  const openSessions = useMemo(
    () => dateRows.filter((row) => getRecordLifecycle(row) === 'open').length,
    [dateRows]
  )
  const workingHourValues = useMemo(
    () => dateRows.map(getWorkingHoursValue).filter((value): value is number => value !== null),
    [dateRows]
  )
  const totalHours = workingHourValues.length
    ? workingHourValues.reduce((total, value) => total + value, 0)
    : null
  const averageHours = workingHourValues.length ? totalHours! / workingHourValues.length : null
  const filtersActive = Boolean(searchQuery.trim()) || typeFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  return (
    <div className="admin-aligned-page admin-aligned-page--attendance-records">
      <div className="dashboard-section-head attendance-section-head attendance-records-head">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Attendance Records</h2>
        </div>

        <div className="attendance-controls-row attendance-records-controls">
          <AttendanceDatePicker value={selectedAttendanceDate} onChange={setAttendanceDateFilter} />

          <div className="attendance-search-shell attendance-records-search-shell">
            <span className="search-prefix-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              aria-label="Search attendance records"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search employee, status, location..."
            />
          </div>

          <select
            className="attendance-records-select"
            aria-label="Filter attendance type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {formatRecordText(type)}
              </option>
            ))}
          </select>

          <select
            className="attendance-records-select"
            aria-label="Filter attendance status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AttendanceRecordsStatusFilter)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filtersActive ? (
            <button className="ghost dashboard-button" type="button" onClick={clearFilters}>
              Clear
            </button>
          ) : null}

          <button
            className="ghost dashboard-button attendance-records-refresh"
            type="button"
            onClick={() => void loadDashboard()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="kpi-cards admin-kpi-cards attendance-records-kpis" aria-label="Attendance record summary">
        <article className="kpi-card admin-kpi-card-static attendance-records-kpi">
          <span className="attendance-records-kpi-label">Total Records</span>
          <strong className="kpi-count">{dateRows.length}</strong>
          <span className="kpi-label">{formatDateOnly(selectedAttendanceDate)}</span>
        </article>
        <article className="kpi-card admin-kpi-card-static attendance-records-kpi">
          <span className="attendance-records-kpi-label">Completed</span>
          <strong className="kpi-count">{completedRecords}</strong>
          <span className="kpi-label">Sessions with clock out</span>
        </article>
        <article className="kpi-card admin-kpi-card-static attendance-records-kpi">
          <span className="attendance-records-kpi-label">Open Sessions</span>
          <strong className="kpi-count">{openSessions}</strong>
          <span className="kpi-label">Clocked in, no clock out</span>
        </article>
        <article className="kpi-card admin-kpi-card-static attendance-records-kpi">
          <span className="attendance-records-kpi-label">Hours Logged</span>
          <strong className="kpi-count">{formatHoursMetric(totalHours)}</strong>
          <span className="kpi-label">Avg {formatHoursMetric(averageHours)}</span>
        </article>
      </div>

      <div className="table-card attendance-records-table-card">
        <div className="attendance-records-table-head">
          <div>
            <strong>Raw Attendance Sessions</strong>
            <span>
              {visibleRows.length} of {dateRows.length} record{dateRows.length === 1 ? '' : 's'}
            </span>
          </div>
          {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
        </div>

        {visibleRows.length ? (
          <div className="table-scroll">
            <table className="dashboard-table attendance-records-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Type</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={`${row.id || row.employee_email || 'record'}-${row.login_time || row.logout_time || index}`}>
                    <td>
                      <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                      <span className="table-meta">{row.emp_designation || row.employee_email || '--'}</span>
                    </td>
                    <td>{formatDateOnly(getRecordDateValue(row))}</td>
                    <td>
                      <strong>{formatDateTime(row.login_time)}</strong>
                      <span className="table-meta">{row.login_address || row.login_location || 'Location unavailable'}</span>
                    </td>
                    <td>
                      <strong>{formatDateTime(row.logout_time)}</strong>
                      <span className="table-meta">{row.logout_address || row.logout_location || 'Location unavailable'}</span>
                    </td>
                    <td>
                      <span className="type-badge">{formatRecordText(getRecordTypeValue(row))}</span>
                    </td>
                    <td className="col-numeric">{formatWorkingHours(row.working_hours)}</td>
                    <td>
                      <span className={getRecordStatusPillClass(row)}>
                        <span className="table-pill-dot" aria-hidden="true" />
                        {getRecordStatusLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            {filtersActive
              ? 'No attendance records match the current filters.'
              : 'No attendance records found for the selected date.'}
          </div>
        )}
      </div>
    </div>
  )
}
