type Props = any

export default function AdminLeavesPage({
  clearLeaveFilters,
  employees,
  formatDate,
  formatLeaveTypeLabel,
  getLeaveApproverLabel,
  getLeaveReasonLabel,
  leaveEmployeeIdOptions,
  leaveEmployeeNameOptions,
  leaveFilterLoading,
  leaveFilters,
  leaveFilterStatus,
  leaveRows,
  leaveStatusOptions,
  leaveTypeOptions,
  refreshLeaves,
  updateLeaveFilter
}: Props) {
  return (
    <>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Leaves</h2>
        </div>
        <button
          className="ghost dashboard-button"
          onClick={() => void refreshLeaves(leaveFilters, true)}
          disabled={leaveFilterLoading}
          type="button"
        >
          {leaveFilterLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <form
        className="leave-filter-card"
        onSubmit={(event) => {
          event.preventDefault()
          void refreshLeaves(leaveFilters, true)
        }}
      >
        <div className="leave-filter-head">
          <div>
            <strong>Search Leave Records</strong>
            <span>Filter by employee, leave details, date range, or status.</span>
          </div>
          <span className="leave-filter-count">{leaveRows.length} result{leaveRows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="leave-filter-grid">
          <label className="leave-filter-field">
            <span>Employee Name</span>
            <input
              type="search"
              list="leave-employee-name-options"
              value={leaveFilters.employeeName}
              onChange={(event) => updateLeaveFilter('employeeName', event.target.value)}
              placeholder="Search employee name"
            />
            <datalist id="leave-employee-name-options">
              {leaveEmployeeNameOptions.map((name: any) => <option key={name} value={name} />)}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>Employee ID</span>
            <input
              type="search"
              list="leave-employee-id-options"
              value={leaveFilters.employeeId}
              onChange={(event) => updateLeaveFilter('employeeId', event.target.value)}
              placeholder="Search employee ID"
            />
            <datalist id="leave-employee-id-options">
              {leaveEmployeeIdOptions.map((employeeId: any) => <option key={employeeId} value={employeeId} />)}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>Leave Type</span>
            <input
              type="search"
              list="leave-type-options"
              value={leaveFilters.leaveType}
              onChange={(event) => updateLeaveFilter('leaveType', event.target.value)}
              placeholder="Search leave type"
            />
            <datalist id="leave-type-options">
              {leaveTypeOptions.map((option: any) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>From Date</span>
            <input
              type="date"
              value={leaveFilters.fromDate}
              onChange={(event) => updateLeaveFilter('fromDate', event.target.value)}
            />
          </label>
          <label className="leave-filter-field">
            <span>To Date</span>
            <input
              type="date"
              value={leaveFilters.toDate}
              onChange={(event) => updateLeaveFilter('toDate', event.target.value)}
            />
          </label>
          <label className="leave-filter-field">
            <span>Leave Status</span>
            <input
              type="search"
              list="leave-status-options"
              value={leaveFilters.status}
              onChange={(event) => updateLeaveFilter('status', event.target.value)}
              placeholder="Search leave status"
            />
            <datalist id="leave-status-options">
              {leaveStatusOptions.map((option: any) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </label>
        </div>
        <div className="leave-filter-actions">
          {leaveFilterStatus ? <span className="leave-filter-status">{leaveFilterStatus}</span> : <span />}
          <button className="ghost" type="button" onClick={() => void clearLeaveFilters()} disabled={leaveFilterLoading}>
            Clear Filters
          </button>
          <button className="cta" type="submit" disabled={leaveFilterLoading}>
            {leaveFilterLoading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </form>
      <div className="table-card">
        {leaveRows.length ? (
          <div className="table-scroll">
            <table className="dashboard-table leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Approver</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRows.map((row: any, index: number) => (
                  <tr key={`${row.id || row.emp_code || index}`}>
                    <td>
                      <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                      <span className="table-meta">{row.emp_code || 'Employee ID unavailable'}</span>
                    </td>
                    <td>{formatLeaveTypeLabel(row)}</td>
                    <td>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</td>
                    <td>{getLeaveApproverLabel(row, employees)}</td>
                    <td>{getLeaveReasonLabel(row)}</td>
                    <td>
                      <span className="table-pill">{row.status || 'Unknown'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No leave requests match the current filters.</div>
        )}
      </div>
    </>
  )
}
