import { useCallback, useState, type ReactNode } from 'react'
import AttendanceKpiCards from './components/AttendanceKpiCards'
import AttendanceFilterBar from './components/AttendanceFilterBar'
import ColumnVisibilitySelector, { type ColumnDef } from './components/ColumnVisibilitySelector'
import AttendanceExceptionDrawer from './components/AttendanceExceptionDrawer'
import FilterDropdown from '../../../components/FilterDropdown'
import './AdminAttendanceExceptionsPage.css'
import type {
  AdminAttendanceExceptionFilterOptions,
  AdminAttendanceExceptionFilterState,
  AdminAttendanceExceptionKpis,
  AdminAttendanceExceptionPagination,
  AdminAttendanceExceptionRecord,
} from '../../../types/admin'

// ─── Column definitions ────────────────────────────────────────────────────────
const ALL_COLUMNS: ColumnDef[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'attendance_date', label: 'Date' },
  { key: 'exception_type', label: 'Exception' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Details' },
  // Available, hidden by default
  { key: 'department', label: 'Department' },
  { key: 'planned_arrival', label: 'Planned Arrival' },
  { key: 'planned_leave', label: 'Planned Leave' },
  { key: 'late_by', label: 'Late (min)' },
  { key: 'early_by', label: 'Early (min)' },
  { key: 'manager_remarks', label: 'Manager Remarks' },
  { key: 'reviewed_by', label: 'Reviewed By' },
  { key: 'attendance_id', label: 'Attendance ID' },
  { key: 'login_time', label: 'Login Time' },
  { key: 'logout_time', label: 'Logout Time' },
  { key: 'notes', label: 'Notes' },
  { key: 'reviewed_at', label: 'Reviewed At' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
  { key: 'working_hours', label: 'Hours Logged' },
  { key: 'prior_exceptions', label: 'Prior (90d)' },
]

const DEFAULT_VISIBLE = new Set([
  'employee', 'attendance_date', 'exception_type', 'reason', 'status', 'actions',
])

const STORAGE_KEY = 'fawnix_exc_columns_v2'

function loadVisibleKeys(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const arr = JSON.parse(stored) as string[]
      if (Array.isArray(arr) && arr.length > 0) return new Set(arr)
    }
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE)
}

function saveVisibleKeys(keys: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys])) } catch { /* ignore */ }
}

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'early_leave', label: 'Early Leave' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'resolved', label: 'Resolved' },
]

const CSV_COLUMNS: Array<{ key: keyof AdminAttendanceExceptionRecord; header: string }> = [
  { key: 'employee_name', header: 'Employee' },
  { key: 'employee_code', header: 'Employee Code' },
  { key: 'department', header: 'Department' },
  { key: 'attendance_date', header: 'Date' },
  { key: 'exception_type', header: 'Exception Type' },
  { key: 'status', header: 'Status' },
  { key: 'late_by_minutes', header: 'Late By (min)' },
  { key: 'early_by_minutes', header: 'Early By (min)' },
  { key: 'reason', header: 'Reason' },
  { key: 'manager_remarks', header: 'Manager Remarks' },
  { key: 'reviewed_by', header: 'Reviewed By' },
]

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtExType(v?: string) {
  if (v === 'late_arrival') return 'Late Arrival'
  if (v === 'early_leave') return 'Early Leave'
  return v || '--'
}

function fmtStatus(v?: string) {
  if (!v) return 'Unknown'
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')
}

function statusPillClass(v?: string) {
  const n = (v || '').toLowerCase()
  if (n === 'approved' || n === 'resolved') return 'active'
  if (n === 'pending') return 'accent'
  if (n === 'rejected') return 'danger'
  return 'inactive'
}

function fmtTime(v: string | undefined, formatDateTime: (v?: string) => string) {
  const raw = (v || '').trim()
  if (!raw) return '--'
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) return raw.slice(0, 5)
  return formatDateTime(raw)
}

// Compact "07 Aug" rendering for the exceptions table's Date column, parsed
// manually from the backend's YYYY-MM-DD string to avoid timezone drift.
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtCompactDate(v?: string) {
  const raw = (v || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!match) return raw || '--'
  const day = match[3]
  const monthIndex = Number(match[2]) - 1
  return `${day} ${SHORT_MONTHS[monthIndex] || ''}`.trim()
}

function truncate(v: string | null | undefined, max = 48) {
  if (!v) return '--'
  return v.length > max ? v.slice(0, max) + '…' : v
}

// Presentation-only bucketing of an already-computed minute value into a
// visual severity tier. No attendance business logic is derived here — the
// minute values themselves always come from the backend.
function severityTier(minutes: number | null | undefined): 'high' | 'medium' | 'low' {
  const value = minutes ?? 0
  if (value >= 60) return 'high'
  if (value >= 25) return 'medium'
  return 'low'
}

function deltaLabel(row: AdminAttendanceExceptionRecord): string | null {
  const type = (row.exception_type || '').toLowerCase()
  if (type === 'late_arrival' && row.late_by_minutes != null) return `+${row.late_by_minutes} min late`
  if (type === 'early_leave' && row.early_by_minutes != null) return `−${row.early_by_minutes} min early`
  return null
}

function fmtHours(v: number | null | undefined) {
  if (v == null) return '--'
  return `${v.toFixed(1)} h`
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadRecordsAsCsv(records: AdminAttendanceExceptionRecord[]) {
  const header = CSV_COLUMNS.map((col) => csvEscape(col.header)).join(',')
  const lines = records.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col.key])).join(','))
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance-exceptions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function PlainTh({ label, visible, children }: { label: string; visible: boolean; children?: ReactNode }) {
  if (!visible) return null
  return <th className="exc-th">{children || label}</th>
}

// ─── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  error: string
  filters: AdminAttendanceExceptionFilterState
  filterOptions: AdminAttendanceExceptionFilterOptions
  formatDate: (value?: string) => string
  formatDateTime: (value?: string) => string
  kpis: AdminAttendanceExceptionKpis
  loading: boolean
  lastSyncedAt: Date | null
  onChangePage: (page: number) => void
  onClearFilters: () => void
  onRefresh: () => void
  onPresetFilter: <K extends keyof AdminAttendanceExceptionFilterState>(
    key: K,
    value: AdminAttendanceExceptionFilterState[K]
  ) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  pagination: AdminAttendanceExceptionPagination
  records: AdminAttendanceExceptionRecord[]
  updateFilter: <K extends keyof AdminAttendanceExceptionFilterState>(
    key: K,
    value: AdminAttendanceExceptionFilterState[K]
  ) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
  accessToken: string
}

// ─── Page Component ────────────────────────────────────────────────────────────
export default function AdminAttendanceExceptionsPage({
  error,
  filters,
  filterOptions,
  formatDate,
  formatDateTime,
  kpis,
  loading,
  lastSyncedAt,
  onChangePage,
  onClearFilters,
  onRefresh,
  onPresetFilter,
  onSort,
  pagination,
  records,
  updateFilter,
  apiRequest,
  accessToken,
}: Props) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(loadVisibleKeys)
  const [drawerRecord, setDrawerRecord] = useState<AdminAttendanceExceptionRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      saveVisibleKeys(next)
      return next
    })
  }, [])

  const resetColumns = useCallback(() => {
    setVisibleKeys(new Set(DEFAULT_VISIBLE))
    saveVisibleKeys(new Set(DEFAULT_VISIBLE))
  }, [])

  const openDrawer = useCallback((row: AdminAttendanceExceptionRecord) => {
    setDrawerRecord(row)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const vis = (key: string) => visibleKeys.has(key)

  // Quick filter helpers (from KPI card click)
  const handleKpiStatusFilter = (status: string) => onPresetFilter('status', status)
  const handleKpiTypeFilter = (type: string) => onPresetFilter('exceptionType', type)

  const headline = `${kpis.pending.toLocaleString()} pending review · ${kpis.repeat_offenders.exception_count.toLocaleString()} flagged as repeat patterns`
  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const oldestPendingLabel = kpis.pending > 0 && kpis.oldest_pending_days != null
    ? `oldest pending is ${kpis.oldest_pending_days} day${kpis.oldest_pending_days === 1 ? '' : 's'} old`
    : null

  const rangeStart = records.length ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const rangeEnd = rangeStart ? rangeStart + records.length - 1 : 0
  const pageLabel = records.length
    ? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${pagination.total_records.toLocaleString()}`
    : 'Nothing to show'

  return (
    <div className="admin-aligned-page admin-aligned-page--attendance-exceptions">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="exc-page-head">
        <div>
          <h1 className="exc-page-title">Attendance Exceptions</h1>
          <p className="exc-page-sub">{headline}</p>
        </div>
        <div className="exc-header-actions">
          {syncedLabel && <span className="exc-synced-label">synced {syncedLabel}</span>}
          <button
            className="exc-btn"
            onClick={onRefresh}
            disabled={loading}
            type="button"
            aria-label="Refresh exception records"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="exc-btn exc-btn--primary"
            onClick={() => downloadRecordsAsCsv(records)}
            disabled={loading || records.length === 0}
            type="button"
            title="Exports the currently loaded page of results"
          >
            Export
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ─────────────────────────────────────── */}
      <AttendanceKpiCards
        kpis={kpis}
        loading={loading}
        onFilterByStatus={handleKpiStatusFilter}
        onFilterByType={handleKpiTypeFilter}
      />

      {/* ─── Filter Row ─────────────────────────────────────── */}
      <AttendanceFilterBar
        filters={filters}
        departmentOptions={filterOptions.departments}
        loading={loading}
        onClear={onClearFilters}
        updateFilter={updateFilter}
        onSort={onSort}
      />

      {/* ─── Table Card ─────────────────────────────────────── */}
      <div className="table-card exc-table-card">
        <div className="exc-toolbar">
          <span className="exc-toolbar__count">
            {loading
              ? 'Loading…'
              : `${pagination.total_records.toLocaleString()} result${pagination.total_records === 1 ? '' : 's'}`}
          </span>
          {oldestPendingLabel && <span className="exc-toolbar__sub">{oldestPendingLabel}</span>}
          <div className="exc-toolbar__right">
            <ColumnVisibilitySelector
              columns={ALL_COLUMNS}
              visibleKeys={visibleKeys}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state exc-loading-state">
            <span className="exc-spinner" aria-hidden="true" />
            Loading attendance exceptions…
          </div>
        ) : error && records.length === 0 ? (
          <div className="empty-state">
            <strong>Attendance exceptions didn’t load.</strong>
            <p>{error}</p>
            <button className="exc-btn" onClick={onRefresh} type="button">Try again</button>
          </div>
        ) : records.length ? (
          <>
            <div className="table-scroll exc-table-scroll">
              <table className="dashboard-table exc-table" aria-label="Attendance exceptions">
                <thead>
                  <tr>
                    <PlainTh label="Employee" visible={vis('employee')} />
                    <PlainTh label="Date" visible={vis('attendance_date')} />
                    <PlainTh label="Exception" visible={vis('exception_type')}>
                      <FilterDropdown
                        id="exc-type-filter"
                        label="Exception"
                        value={filters.exceptionType}
                        options={TYPE_FILTER_OPTIONS}
                        onChange={(value) => updateFilter('exceptionType', value)}
                        compact
                      />
                    </PlainTh>
                    <PlainTh label="Department" visible={vis('department')} />
                    <PlainTh label="Planned Arrival" visible={vis('planned_arrival')} />
                    <PlainTh label="Planned Leave" visible={vis('planned_leave')} />
                    <PlainTh label="Late (min)" visible={vis('late_by')} />
                    <PlainTh label="Early (min)" visible={vis('early_by')} />
                    <PlainTh label="Reason" visible={vis('reason')} />
                    <PlainTh label="Status" visible={vis('status')}>
                      <FilterDropdown
                        id="exc-status-filter"
                        label="Status"
                        value={filters.status}
                        options={STATUS_FILTER_OPTIONS}
                        onChange={(value) => updateFilter('status', value)}
                        compact
                        menuAlign="right"
                      />
                    </PlainTh>
                    <PlainTh label="Manager Remarks" visible={vis('manager_remarks')} />
                    <PlainTh label="Reviewed By" visible={vis('reviewed_by')} />
                    <PlainTh label="Attendance ID" visible={vis('attendance_id')} />
                    <PlainTh label="Login Time" visible={vis('login_time')} />
                    <PlainTh label="Logout Time" visible={vis('logout_time')} />
                    <PlainTh label="Notes" visible={vis('notes')} />
                    <PlainTh label="Reviewed At" visible={vis('reviewed_at')} />
                    <PlainTh label="Created At" visible={vis('created_at')} />
                    <PlainTh label="Updated At" visible={vis('updated_at')} />
                    <PlainTh label="Hours Logged" visible={vis('working_hours')} />
                    <PlainTh label="Prior (90d)" visible={vis('prior_exceptions')} />
                    <PlainTh label="Details" visible={vis('actions')} />
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => {
                    const rowKey = `${row.id ?? row.employee_code ?? 'r'}-${row.attendance_date || row.exception_date || 'x'}`
                    const isPending = (row.status || '').toLowerCase() === 'pending'
                    const tier = severityTier(row.late_by_minutes ?? row.early_by_minutes)
                    const hasPriorPattern = (row.prior_exceptions_90d ?? 0) >= 3
                    const employeeMeta = [row.employee_code, row.department].filter(Boolean).join(' · ')
                    const delta = deltaLabel(row)
                    return (
                      <tr
                        key={rowKey}
                        className="exc-row"
                        onClick={() => openDrawer(row)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') openDrawer(row)
                        }}
                      >
                        {vis('employee') && (
                          <td className="exc-td exc-td--employee">
                            <div className="exc-td--employee-wrap">
                              <span
                                className={`exc-severity-bar exc-severity-bar--${tier}`}
                                aria-hidden="true"
                                style={{ opacity: isPending ? 1 : 0.35 }}
                              />
                              <span className="exc-td--employee-info">
                                <strong>{row.employee_name || row.emp_name || 'Unknown'}</strong>
                                {employeeMeta && <span className="exc-sub">{employeeMeta}</span>}
                              </span>
                            </div>
                          </td>
                        )}
                        {vis('attendance_date') && (
                          <td className="exc-td exc-td--mono exc-td--date">
                            {fmtCompactDate(row.attendance_date)}
                          </td>
                        )}
                        {vis('exception_type') && (
                          <td className="exc-td">
                            <strong className="exc-type-label">{fmtExType(row.exception_type)}</strong>
                            {(delta || hasPriorPattern) && (
                              <span className="exc-sub exc-sub--delta">
                                {delta}
                                {delta && hasPriorPattern ? '  ·  ' : ''}
                                {hasPriorPattern ? `${row.prior_exceptions_90d}× prior` : ''}
                              </span>
                            )}
                          </td>
                        )}
                        {vis('department') && (
                          <td className="exc-td exc-td--trunc" title={row.department || ''}>
                            {row.department || '--'}
                          </td>
                        )}
                        {vis('planned_arrival') && (
                          <td className="exc-td exc-td--mono">{fmtTime(row.planned_arrival_time, formatDateTime)}</td>
                        )}
                        {vis('planned_leave') && (
                          <td className="exc-td exc-td--mono">{fmtTime(row.planned_leave_time, formatDateTime)}</td>
                        )}
                        {vis('late_by') && (
                          <td className="exc-td exc-td--num">
                            {row.late_by_minutes != null ? (
                              <span className="exc-min-badge exc-min-badge--late">{row.late_by_minutes}</span>
                            ) : '--'}
                          </td>
                        )}
                        {vis('early_by') && (
                          <td className="exc-td exc-td--num">
                            {row.early_by_minutes != null ? (
                              <span className="exc-min-badge exc-min-badge--early">{row.early_by_minutes}</span>
                            ) : '--'}
                          </td>
                        )}
                        {vis('reason') && (
                          <td className="exc-td exc-td--trunc exc-td--reason" title={row.reason || ''}>
                            {truncate(row.reason)}
                          </td>
                        )}
                        {vis('status') && (
                          <td className="exc-td exc-td--status">
                            <span className={`table-pill ${statusPillClass(row.status)}`}>
                              {fmtStatus(row.status)}
                            </span>
                          </td>
                        )}
                        {vis('manager_remarks') && (
                          <td className="exc-td exc-td--trunc" title={row.manager_remarks || ''}>
                            {truncate(row.manager_remarks)}
                          </td>
                        )}
                        {vis('reviewed_by') && (
                          <td className="exc-td exc-td--trunc">{row.reviewed_by || '--'}</td>
                        )}
                        {vis('attendance_id') && (
                          <td className="exc-td exc-td--num">{row.attendance_id ?? '--'}</td>
                        )}
                        {vis('login_time') && (
                          <td className="exc-td exc-td--mono">{fmtTime(row.login_time, formatDateTime)}</td>
                        )}
                        {vis('logout_time') && (
                          <td className="exc-td exc-td--mono">{fmtTime(row.logout_time, formatDateTime)}</td>
                        )}
                        {vis('notes') && (
                          <td className="exc-td exc-td--trunc" title={row.notes || ''}>{truncate(row.notes)}</td>
                        )}
                        {vis('reviewed_at') && (
                          <td className="exc-td">{row.reviewed_at ? formatDateTime(row.reviewed_at) : '--'}</td>
                        )}
                        {vis('created_at') && (
                          <td className="exc-td">{row.created_at ? formatDateTime(row.created_at) : '--'}</td>
                        )}
                        {vis('updated_at') && (
                          <td className="exc-td">{row.updated_at ? formatDateTime(row.updated_at) : '--'}</td>
                        )}
                        {vis('working_hours') && (
                          <td className="exc-td exc-td--mono">{fmtHours(row.working_hours)}</td>
                        )}
                        {vis('prior_exceptions') && (
                          <td className="exc-td exc-td--num">{row.prior_exceptions_90d ?? 0}</td>
                        )}
                        {vis('actions') && (
                          <td className="exc-td exc-td--action">
                            <button
                              type="button"
                              className="exc-action-btn"
                              onClick={(event) => { event.stopPropagation(); openDrawer(row) }}
                              aria-label={`View exception for ${row.employee_name || row.emp_name || ''}`}
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

            {/* Pagination */}
            <div className="exc-pagination">
              <div className="exc-pagination__info">
                <strong>{pageLabel}</strong>
              </div>
              <div className="exc-pagination__actions">
                <button
                  className="exc-page-btn"
                  type="button"
                  onClick={() => onChangePage(pagination.page - 1)}
                  disabled={!pagination.has_previous || loading}
                >
                  Previous
                </button>
                <button
                  className="exc-page-btn"
                  type="button"
                  onClick={() => onChangePage(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">No exceptions match these filters.</div>
        )}
      </div>

      {/* ─── Drawer ─────────────────────────────────────────── */}
      <AttendanceExceptionDrawer
        record={drawerRecord}
        open={drawerOpen}
        onClose={closeDrawer}
        onReviewed={onRefresh}
        apiRequest={apiRequest}
        accessToken={accessToken}
        formatDateTime={formatDateTime}
        formatDate={formatDate}
      />
    </div>
  )
}