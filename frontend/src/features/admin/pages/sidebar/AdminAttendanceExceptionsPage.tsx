import AttendanceDatePicker from '../../../../components/AttendanceDatePicker'
import type {
  AdminAttendanceExceptionFilterState,
  AdminAttendanceExceptionPagination,
  AdminAttendanceExceptionRecord,
} from '../../../../types/admin'

type Props = {
  error: string
  filters: AdminAttendanceExceptionFilterState
  formatDate: (value?: string) => string
  formatDateTime: (value?: string) => string
  loading: boolean
  onApplyFilters: () => void
  onChangePage: (page: number) => void
  onClearFilters: () => void
  onRefresh: () => void
  pagination: AdminAttendanceExceptionPagination
  records: AdminAttendanceExceptionRecord[]
  updateFilter: <K extends keyof AdminAttendanceExceptionFilterState>(
    key: K,
    value: AdminAttendanceExceptionFilterState[K]
  ) => void
}

const exceptionTypeOptions = [
  { value: '', label: 'All types' },
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'early_leave', label: 'Early Leave' },
]

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'resolved', label: 'Resolved' },
]

function formatExceptionTypeLabel(value?: string) {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'late_arrival') {
    return 'Late Arrival'
  }
  if (normalized === 'early_leave') {
    return 'Early Leave'
  }
  return value || '--'
}

function formatStatusLabel(value?: string) {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'pending') {
    return 'Pending'
  }
  if (normalized === 'approved') {
    return 'Approved'
  }
  if (normalized === 'rejected') {
    return 'Rejected'
  }
  if (normalized === 'cancelled') {
    return 'Cancelled'
  }
  if (normalized === 'resolved') {
    return 'Resolved'
  }
  return value || 'Unknown'
}

function getStatusBadgeClass(value?: string) {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'approved' || normalized === 'resolved') {
    return 'active'
  }
  if (normalized === 'pending') {
    return 'accent'
  }
  return 'inactive'
}

function formatActionLabel(value: string) {
  if (value === 'review') {
    return 'Review'
  }
  if (value === 'view') {
    return 'View'
  }
  return value.replace(/_/g, ' ')
}

function formatTimeOrDateTime(value: string | undefined, formatDateTime: (value?: string) => string) {
  const rawValue = (value || '').trim()
  if (!rawValue) {
    return '--'
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return rawValue.slice(0, 5)
  }

  return formatDateTime(rawValue)
}

export default function AdminAttendanceExceptionsPage({
  error,
  filters,
  formatDate,
  formatDateTime,
  loading,
  onApplyFilters,
  onChangePage,
  onClearFilters,
  onRefresh,
  pagination,
  records,
  updateFilter,
}: Props) {
  const pageLabel = pagination.total_pages
    ? `Page ${pagination.page} of ${pagination.total_pages}`
    : 'No pages yet'

  return (
    <>
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Attendance Exceptions</h2>
          <p className="exception-head-copy">
            Exception records returned by the backend, with no frontend-derived attendance rules.
          </p>
        </div>
        <button className="ghost dashboard-button" onClick={onRefresh} disabled={loading} type="button">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <form
        className="leave-filter-card attendance-exception-filter-card"
        onSubmit={(event) => {
          event.preventDefault()
          onApplyFilters()
        }}
      >
        <div className="leave-filter-head">
          <div>
            <strong>Find Exception Records</strong>
            <span>Search by employee, narrow by type or status, and filter by attendance date range.</span>
          </div>
          <span className="leave-filter-count">
            {pagination.total_records} result{pagination.total_records === 1 ? '' : 's'}
          </span>
        </div>

        <div className="attendance-exception-filter-grid">
          <div className="attendance-filter attendance-filter-search">
            <label htmlFor="attendance-exception-search">Employee Search</label>
            <div className="attendance-input-shell attendance-search-shell">
              <input
                id="attendance-exception-search"
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Search by employee name or employee code"
              />
            </div>
          </div>

          <label className="attendance-filter attendance-filter-compact">
            <span>Exception Type</span>
            <select
              value={filters.exceptionType}
              onChange={(event) => updateFilter('exceptionType', event.target.value)}
            >
              {exceptionTypeOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="attendance-filter attendance-filter-compact">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <AttendanceDatePicker
            id="attendance-exception-from-date"
            label="From Date"
            value={filters.fromDate}
            onChange={(value) => updateFilter('fromDate', value)}
          />

          <AttendanceDatePicker
            id="attendance-exception-to-date"
            label="To Date"
            value={filters.toDate}
            onChange={(value) => updateFilter('toDate', value)}
          />
        </div>

        <div className="leave-filter-actions">
          {error ? <span className="leave-filter-status">{error}</span> : <span />}
          <button className="ghost" type="button" onClick={onClearFilters} disabled={loading}>
            Clear Filters
          </button>
          <button className="cta" type="submit" disabled={loading}>
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </form>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">Loading attendance exception records...</div>
        ) : error ? (
          <div className="empty-state">
            <strong>Unable to load attendance exceptions</strong>
            <p>{error}</p>
            <button className="ghost dashboard-button" onClick={onRefresh} type="button">
              Retry
            </button>
          </div>
        ) : records.length ? (
          <>
            <div className="table-scroll">
              <table className="dashboard-table attendance-exception-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Exception Type</th>
                    <th>Attendance Date</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Available Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={`${row.id || row.employee_code}-${row.created_date || row.attendance_date || 'record'}`}>
                      <td>
                        <strong>{row.employee_name || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.employee_code || 'Employee code unavailable'}</span>
                      </td>
                      <td>{row.department || '--'}</td>
                      <td>{formatExceptionTypeLabel(row.exception_type)}</td>
                      <td>{formatDate(row.attendance_date)}</td>
                      <td>{formatTimeOrDateTime(row.login_time, formatDateTime)}</td>
                      <td>{formatTimeOrDateTime(row.logout_time, formatDateTime)}</td>
                      <td>{row.reason || '--'}</td>
                      <td>
                        <span className={`table-pill ${getStatusBadgeClass(row.status)}`}>
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.created_date)}</td>
                      <td>
                        {row.available_actions?.length ? (
                          <div className="attendance-exception-actions">
                            {row.available_actions.map((action) => (
                              <span key={`${row.id || row.employee_code}-${action}`} className="table-pill">
                                {formatActionLabel(action)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="table-meta">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="attendance-exception-pagination">
              <div className="attendance-exception-pagination-copy">
                <strong>{pageLabel}</strong>
                <span>
                  Showing {records.length} of {pagination.total_records} records
                </span>
              </div>
              <div className="attendance-exception-pagination-actions">
                <button
                  className="ghost dashboard-button"
                  type="button"
                  onClick={() => onChangePage(pagination.page - 1)}
                  disabled={!pagination.has_previous}
                >
                  Previous
                </button>
                <button
                  className="ghost dashboard-button"
                  type="button"
                  onClick={() => onChangePage(pagination.page + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            No attendance exception records match the current filters.
          </div>
        )}
      </div>
    </>
  )
}
