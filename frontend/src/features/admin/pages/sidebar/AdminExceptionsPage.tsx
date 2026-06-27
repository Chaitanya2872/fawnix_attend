import AttendanceDatePicker from '../../../../components/AttendanceDatePicker'

type Props = any

export default function AdminExceptionsPage({
  attendanceDateFilter,
  exceptionSearch,
  filteredExceptionRows,
  formatDate,
  formatDateTime,
  loadDashboard,
  selectedDateEarlyLeaves,
  selectedDateExceptions,
  selectedDateLateArrivals,
  setAttendanceDateFilter,
  setExceptionSearch
}: Props) {
  return (
    <>
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Escalations</p>
          <h2>Exceptions</h2>
          <p className="exception-head-copy">
            Late arrivals and early leaves for the selected date, shown as full-width review cards.
          </p>
        </div>
        <div className="attendance-head-actions">
          <div className="attendance-controls attendance-controls-inline">
            <AttendanceDatePicker value={attendanceDateFilter} onChange={setAttendanceDateFilter} />
            <div className="attendance-filter attendance-filter-search">
              <label htmlFor="exception-search">Search</label>
              <div className="attendance-input-shell attendance-search-shell">
                <input
                  id="exception-search"
                  type="text"
                  value={exceptionSearch}
                  onChange={(event) => setExceptionSearch(event.target.value)}
                  placeholder="Search employee, code, type, reason, or status"
                />
              </div>
            </div>
            <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric-card">
          <span>Late Arrivals</span>
          <strong>{selectedDateLateArrivals.length}</strong>
        </div>
        <div className="metric-card">
          <span>Early Leaves</span>
          <strong>{selectedDateEarlyLeaves.length}</strong>
        </div>
        <div className="metric-card">
          <span>Total Exceptions</span>
          <strong>{selectedDateExceptions.length}</strong>
          <small>{formatDate(attendanceDateFilter)}</small>
        </div>
      </div>

      <div className="exception-card-list">
        {filteredExceptionRows.length ? (
          filteredExceptionRows.map((row: any, index: number) => {
            const isLateArrival = row.exceptionKind === 'late_arrival'
            const primaryTime = isLateArrival
              ? row.exception_time || row.actual_login_time || '--'
              : row.planned_leave_time || row.actual_logout_time || '--'
            const minuteValue = isLateArrival ? row.late_by_minutes : row.early_by_minutes
            const statusLabel = isLateArrival
              ? (row.status || '').toLowerCase() === 'not_informed'
                ? 'Not informed'
                : 'Informed'
              : row.status || 'Pending'

            return (
              <article
                key={`${row.exceptionKind}-${row.id || row.emp_code || index}`}
                className={`exception-card ${isLateArrival ? 'late' : 'early'}`}
              >
                <div className="exception-card-top">
                  <div>
                    <p className="exception-card-kicker">{isLateArrival ? 'Late Arrival' : 'Early Leave'}</p>
                    <h3>{row.emp_name || row.emp_code || 'Unknown employee'}</h3>
                    <span className="table-meta">{row.emp_code || 'Employee code unavailable'}</span>
                  </div>
                  <div className="exception-card-pills">
                    <span className={`table-pill ${isLateArrival ? 'inactive' : 'accent'}`}>
                      {isLateArrival ? 'Late arrival' : 'Early leave'}
                    </span>
                    <span className={`table-pill ${isLateArrival ? ((row.status || '').toLowerCase() === 'not_informed' ? 'inactive' : 'accent') : 'active'}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="exception-card-grid">
                  <div className="exception-card-stat">
                    <span>{isLateArrival ? 'Late By' : 'Early By'}</span>
                    <strong>{minuteValue !== undefined && minuteValue !== null ? `${minuteValue} min` : '--'}</strong>
                  </div>
                  <div className="exception-card-stat">
                    <span>{isLateArrival ? 'Login Time' : 'Leave Time'}</span>
                    <strong>{primaryTime}</strong>
                  </div>
                  <div className="exception-card-stat">
                    <span>Requested</span>
                    <strong>{formatDateTime(row.requested_at || row.exception_date)}</strong>
                  </div>
                </div>

                <div className="exception-card-reason">
                  <span>Reason</span>
                  <p>{row.reason || 'No reason provided.'}</p>
                </div>
              </article>
            )
          })
        ) : (
          <div className="empty-state">
            {exceptionSearch.trim()
              ? 'No exceptions match this search.'
              : 'No late arrival or early leave exceptions found for the selected date.'}
          </div>
        )}
      </div>
    </>
  )
}
