import { useCallback, useState, type ReactNode } from 'react'
import LeaveKpiCards from './components/Leavekpicards'
import LeaveFilterBar from './components/LeaveFilterBar'
import LeaveDrawer from './components/LeaveDrawer'
import ColumnVisibilitySelector, { type ColumnDef } from '../attendance-exceptions/components/ColumnVisibilitySelector'
import FilterDropdown from '../../../components/FilterDropdown'
import './AdminLeavesPage.css'
import type {
  AdminLeaveFilterOptions,
  AdminLeaveFilterState,
  AdminLeaveKpis,
  AdminLeavePagination,
  AdminLeaveRecord,
  LeaveRow,
} from '../../../types/admin'

// â”€â”€â”€ Column definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALL_COLUMNS: ColumnDef[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'leave_type', label: 'Leave Type' },
  { key: 'dates', label: 'Dates' },
  { key: 'days', label: 'Days' },
  { key: 'manager', label: 'Manager' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Details' },
  // Available, hidden by default
  { key: 'department', label: 'Department' },
  { key: 'applied_at', label: 'Applied On' },
  { key: 'reviewed_by', label: 'Reviewed By' },
  { key: 'reviewed_at', label: 'Reviewed At' },
  { key: 'remarks', label: 'Manager Remark' },
  { key: 'notes', label: 'Employee Note' },
  { key: 'prior_requests', label: 'Prior (90d)' },
]

const DEFAULT_VISIBLE = new Set([
  'employee', 'leave_type', 'dates', 'days', 'manager', 'status', 'actions',
])

const STORAGE_KEY = 'fawnix_leaves_columns_v1'

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
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const CSV_COLUMNS: Array<{ key: keyof AdminLeaveRecord; header: string }> = [
  { key: 'employee_name', header: 'Employee' },
  { key: 'employee_code', header: 'Employee Code' },
  { key: 'department', header: 'Department' },
  { key: 'leave_type', header: 'Leave Type' },
  { key: 'duration', header: 'Duration' },
  { key: 'leave_count', header: 'Days' },
  { key: 'from_date', header: 'From' },
  { key: 'to_date', header: 'To' },
  { key: 'applied_at', header: 'Applied On' },
  { key: 'status', header: 'Status' },
  { key: 'manager_name', header: 'Manager' },
  { key: 'remarks', header: 'Manager Remark' },
]

function fmtStatus(v?: string) {
  if (!v) return 'Unknown'
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')
}

function statusPillClass(v?: string) {
  const n = (v || '').toLowerCase()
  if (n === 'approved') return 'active'
  if (n === 'pending') return 'accent'
  if (n === 'rejected') return 'danger'
  return 'inactive'
}

function fmtLeaveType(record: AdminLeaveRecord): string {
  const rawType = (record.leave_type || '').trim()
  if (!rawType) return 'Leave'
  const display = rawType.charAt(0).toUpperCase() + rawType.slice(1)
  const duration = (record.duration || '').trim().toLowerCase()
  if (duration === 'first_half' || duration === 'second_half') return `${display} (0.5)`
  return display
}

// Compact "07 Aug" rendering, parsed manually from the backend's YYYY-MM-DD
// string to avoid timezone drift.
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtCompactDate(v?: string) {
  const raw = (v || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!match) return raw || '--'
  const day = match[3]
  const monthIndex = Number(match[2]) - 1
  return `${day} ${SHORT_MONTHS[monthIndex] || ''}`.trim()
}

function truncate(v: string | null | undefined, max = 40) {
  if (!v) return '--'
  return v.length > max ? v.slice(0, max) + 'â€¦' : v
}

function waitingDays(appliedAt?: string): number | null {
  const raw = (appliedAt || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!match) return null
  const applied = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((startOfToday.getTime() - applied.getTime()) / 86400000)
}

// Presentation-only bucketing of an already-computed waiting-days value into
// a visual severity tier â€” no attendance/leave business logic is derived
// here, the day count itself always comes from the backend's applied_at.
function ageTier(days: number | null): 'high' | 'medium' | 'low' {
  const value = days ?? 0
  if (value >= 30) return 'high'
  if (value >= 7) return 'medium'
  return 'low'
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadRecordsAsCsv(records: AdminLeaveRecord[]) {
  const header = CSV_COLUMNS.map((col) => csvEscape(col.header)).join(',')
  const lines = records.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col.key])).join(','))
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Adapts a board record to the shape alertLeaveManager (defined in FawnixApp
 * against the legacy LeaveRow type) expects. */
function toLeaveRowShape(record: AdminLeaveRecord): LeaveRow {
  return {
    id: record.id,
    emp_code: record.employee_code,
    emp_full_name: record.employee_name,
    leave_type: record.leave_type,
    duration: record.duration,
    leave_count: record.leave_count,
    manager_code: record.manager_code,
    reviewed_by: record.reviewed_by || undefined,
    notes: record.notes || undefined,
    remarks: record.remarks || undefined,
    from_date: record.from_date,
    to_date: record.to_date,
    applied_at: record.applied_at,
    status: record.status,
  }
}

function PlainTh({ label, visible, children }: { label: string; visible: boolean; children?: ReactNode }) {
  if (!visible) return null
  return <th className="lv-th">{children || label}</th>
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Props = {
  error: string
  filters: AdminLeaveFilterState
  filterOptions: AdminLeaveFilterOptions
  formatDate: (value?: string) => string
  formatDateTime: (value?: string) => string
  kpis: AdminLeaveKpis
  loading: boolean
  lastSyncedAt: Date | null
  onChangePage: (page: number) => void
  onClearFilters: () => void
  onRefresh: () => void
  onPresetFilter: <K extends keyof AdminLeaveFilterState>(
    key: K,
    value: AdminLeaveFilterState[K]
  ) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  pagination: AdminLeavePagination
  records: AdminLeaveRecord[]
  updateFilter: <K extends keyof AdminLeaveFilterState>(
    key: K,
    value: AdminLeaveFilterState[K]
  ) => void
  onAlertManager: (leave: LeaveRow) => Promise<string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
  accessToken: string
}

// â”€â”€â”€ Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminLeavesPage({
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
  onAlertManager,
  apiRequest,
  accessToken,
}: Props) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(loadVisibleKeys)
  const [drawerRecord, setDrawerRecord] = useState<AdminLeaveRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')

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

  const openDrawer = useCallback((row: AdminLeaveRecord) => {
    setDrawerRecord(row)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const vis = (key: string) => visibleKeys.has(key)

  const pageLabel = pagination.total_pages
    ? `Page ${pagination.page} of ${pagination.total_pages}`
    : 'No pages yet'

  const handleAlert = async (row: AdminLeaveRecord, key: string) => {
    setAlertLoadingKey(key)
    setAlertStatus('')
    try {
      const nextStatus = await onAlertManager(toLeaveRowShape(row))
      setAlertStatus(nextStatus)
    } catch (err) {
      setAlertStatus(err instanceof Error ? err.message : 'Failed to alert manager.')
    } finally {
      setAlertLoadingKey('')
    }
  }

  const headline = `${kpis.pending.toLocaleString()} requests awaiting approval Â· oldest has been waiting ${kpis.oldest_pending_days ?? 0} day${kpis.oldest_pending_days === 1 ? '' : 's'}`
  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="admin-aligned-page admin-aligned-page--leaves">
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Leaves</h2>
          <p className="exception-head-copy">{kpis.pending > 0 ? headline : 'Nothing waiting on a manager right now.'}</p>
        </div>
        <div className="lv-header-actions">
          {syncedLabel && <span className="lv-synced-label">synced {syncedLabel}</span>}
          <button
            className="ghost dashboard-button"
            onClick={onRefresh}
            disabled={loading}
            type="button"
            aria-label="Refresh leave requests"
          >
            {loading ? 'Refreshingâ€¦' : 'âŸ³ Refresh'}
          </button>
          <button
            className="cta dashboard-button"
            onClick={() => downloadRecordsAsCsv(records)}
            disabled={loading || records.length === 0}
            type="button"
            aria-label="Export loaded leave requests as CSV"
            title="Exports the currently loaded page of results"
          >
            Export
          </button>
        </div>
      </div>

      {/* â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveKpiCards
        kpis={kpis}
        loading={loading}
        onFilterByStatus={(status) => onPresetFilter('status', status)}
      />

      {/* â”€â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveFilterBar
        filters={filters}
        departmentOptions={filterOptions.departments}
        managerOptions={filterOptions.managers}
        loading={loading}
        onClear={onClearFilters}
        updateFilter={updateFilter}
        onSort={onSort}
      />

      {/* â”€â”€â”€ Table Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="table-card lv-table-card">
        <div className="lv-toolbar">
          <span className="lv-toolbar__count">
            {loading ? 'Loadingâ€¦' : `${pagination.total_records.toLocaleString()} result${pagination.total_records === 1 ? '' : 's'}`}
          </span>
          <div className="lv-toolbar__right">
            <ColumnVisibilitySelector
              columns={ALL_COLUMNS}
              visibleKeys={visibleKeys}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state lv-loading-state">
            <div className="lv-spinner" aria-hidden="true" />
            Loading leave requestsâ€¦
          </div>
        ) : error && records.length === 0 ? (
          <div className="empty-state">
            <strong>Unable to load leave requests</strong>
            <p>{error}</p>
            <button className="ghost dashboard-button" onClick={onRefresh} type="button">
              Retry
            </button>
          </div>
        ) : records.length ? (
          <>
            <div className="table-scroll lv-table-scroll">
              <table className="dashboard-table lv-table" aria-label="Leave requests">
                <thead>
                  <tr>
                    <PlainTh label="Employee" visible={vis('employee')} />
                    <PlainTh label="Leave Type" visible={vis('leave_type')}>
                      <FilterDropdown
                        id="lv-type-filter"
                        label="Leave Type"
                        value={filters.leaveType}
                        options={TYPE_FILTER_OPTIONS}
                        onChange={(value) => updateFilter('leaveType', value)}
                        compact
                      />
                    </PlainTh>
                    <PlainTh label="Department" visible={vis('department')} />
                    <PlainTh label="Dates" visible={vis('dates')} />
                    <PlainTh label="Days" visible={vis('days')} />
                    <PlainTh label="Manager" visible={vis('manager')} />
                    <PlainTh label="Status" visible={vis('status')}>
                      <FilterDropdown
                        id="lv-status-filter"
                        label="Status"
                        value={filters.status}
                        options={STATUS_FILTER_OPTIONS}
                        onChange={(value) => updateFilter('status', value)}
                        compact
                        menuAlign="right"
                      />
                    </PlainTh>
                    <PlainTh label="Applied On" visible={vis('applied_at')} />
                    <PlainTh label="Reviewed By" visible={vis('reviewed_by')} />
                    <PlainTh label="Reviewed At" visible={vis('reviewed_at')} />
                    <PlainTh label="Manager Remark" visible={vis('remarks')} />
                    <PlainTh label="Employee Note" visible={vis('notes')} />
                    <PlainTh label="Prior (90d)" visible={vis('prior_requests')} />
                    <PlainTh label="Details" visible={vis('actions')} />
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => {
                    const rowKey = `${row.id ?? row.employee_code ?? 'r'}-${row.from_date || 'x'}`
                    const isPending = (row.status || '').toLowerCase() === 'pending'
                    const waiting = isPending ? waitingDays(row.applied_at) : null
                    const tier = ageTier(waiting)
                    const hasPriorPattern = (row.prior_requests_90d ?? 0) >= 3
                    return (
                      <tr key={rowKey} className="lv-row">
                        {vis('employee') && (
                          <td className="lv-td lv-td--employee">
                            <span className={`lv-age-bar lv-age-bar--${tier}`} aria-hidden="true" style={{ opacity: isPending ? 1 : 0.35 }} />
                            <span className="lv-td--employee-info">
                              <strong>{row.employee_name || row.employee_code || 'Unknown'}</strong>
                              <span className="lv-sub">
                                {[row.employee_code, row.department].filter(Boolean).join(' Â· ') || '--'}
                              </span>
                            </span>
                          </td>
                        )}
                        {vis('leave_type') && (
                          <td className="lv-td">
                            <strong className="lv-type-label">{fmtLeaveType(row)}</strong>
                            {(isPending || hasPriorPattern) && (
                              <span className="lv-sub lv-sub--delta">
                                {isPending && waiting != null ? `${waiting}d waiting` : ''}
                                {isPending && waiting != null && hasPriorPattern ? ' Â· ' : ''}
                                {hasPriorPattern ? `${row.prior_requests_90d}Ã— prior` : ''}
                              </span>
                            )}
                          </td>
                        )}
                        {vis('department') && (
                          <td className="lv-td lv-td--trunc" title={row.department || ''}>{row.department || '--'}</td>
                        )}
                        {vis('dates') && (
                          <td className="lv-td lv-td--mono">
                            {fmtCompactDate(row.from_date)} â€“ {fmtCompactDate(row.to_date)}
                          </td>
                        )}
                        {vis('days') && (
                          <td className="lv-td lv-td--num">{row.leave_count ?? '--'}</td>
                        )}
                        {vis('manager') && (
                          <td className="lv-td lv-td--trunc" title={row.manager_name || ''}>{row.manager_name || '--'}</td>
                        )}
                        {vis('status') && (
                          <td className="lv-td">
                            <span className={`table-pill ${statusPillClass(row.status)}`}>{fmtStatus(row.status)}</span>
                          </td>
                        )}
                        {vis('applied_at') && (
                          <td className="lv-td">{row.applied_at ? formatDateTime(row.applied_at) : '--'}</td>
                        )}
                        {vis('reviewed_by') && (
                          <td className="lv-td lv-td--trunc">{row.reviewed_by || '--'}</td>
                        )}
                        {vis('reviewed_at') && (
                          <td className="lv-td">{row.reviewed_at ? formatDateTime(row.reviewed_at) : '--'}</td>
                        )}
                        {vis('remarks') && (
                          <td className="lv-td lv-td--trunc" title={row.remarks || ''}>{truncate(row.remarks)}</td>
                        )}
                        {vis('notes') && (
                          <td className="lv-td lv-td--trunc" title={row.notes || ''}>{truncate(row.notes)}</td>
                        )}
                        {vis('prior_requests') && (
                          <td className="lv-td lv-td--num">{row.prior_requests_90d ?? 0}</td>
                        )}
                        {vis('actions') && (
                          <td className="lv-td lv-td--action">
                            <div className="lv-td--action-group">
                              {isPending ? (
                                <button
                                  type="button"
                                  className="lv-action-btn lv-action-btn--alert"
                                  onClick={() => void handleAlert(row, rowKey)}
                                  disabled={alertLoadingKey === rowKey}
                                >
                                  {alertLoadingKey === rowKey ? 'Alertingâ€¦' : 'Alert manager'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="lv-action-btn"
                                onClick={() => openDrawer(row)}
                                aria-label={`View leave request for ${row.employee_name || row.employee_code || ''}`}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {alertStatus && <p className="lv-alert-status">{alertStatus}</p>}

            {/* Pagination */}
            <div className="lv-pagination">
              <div className="lv-pagination__info">
                <strong>{pageLabel}</strong>
                <span>Showing {records.length} of {pagination.total_records.toLocaleString()} records</span>
              </div>
              <div className="lv-pagination__actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => onChangePage(pagination.page - 1)}
                  disabled={!pagination.has_previous || loading}
                >
                  â† Previous
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => onChangePage(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                >
                  Next â†’
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            No leave requests match the current filters.
          </div>
        )}
      </div>

      {/* â”€â”€â”€ Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveDrawer
        record={drawerRecord}
        open={drawerOpen}
        onClose={closeDrawer}
        onAlert={(row) => onAlertManager(toLeaveRowShape(row))}
        apiRequest={apiRequest}
        accessToken={accessToken}
        formatDateTime={formatDateTime}
        formatDate={formatDate}
        formatLeaveTypeLabel={fmtLeaveType}
      />
    </div>
  )
}
