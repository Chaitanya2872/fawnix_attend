import { useState } from 'react'
/* eslint-disable @typescript-eslint/no-explicit-any */
import AttendanceDatePicker from '../../../../components/AttendanceDatePicker'

type Props = any

export default function AdminAttendancePage(props: Props) {
  const {
    actionableMissedLoginEmployeeCodes,
    alertCandidatesLoading,
    alertSentEmpCodes,
    alertSendCounts,
    alertTriggerLoading,
    alertTriggerStatus,
    allMissedLoginsSelected,
    attendanceDateFilter,
    attendanceSearch,
    attendanceView,
    exceptionRows,
    filteredAttendanceRows,
    formatDate,
    formatDateOnly,
    formatDateTime,
    formatLeaveTypeLabel,
    formatWorkingHours,
    loadDashboard,
    missedLoginEmpCodes,
    missedLoginEmployees,
    reminderPreviewBody,
    reminderPreviewTitle,
    reminderTargetDate,
    selectedAttendanceDate,
    selectedDateEarlyLeaves,
    selectedDateLateArrivals,
    selectedDateLeaves,
    selectedMissedLoginCount,
    selectedMissedLoginEmpCodes,
    setAlertTriggerStatus,
    setAttendanceDateFilter,
    setAttendanceSearch,
    setAttendanceView,
    setSelectedMissedLoginEmpCodes,
    setShowAlertComposer,
    showAlertComposer,
    triggerAttendanceReminder
  } = props
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [missedLoginsPanelOpen, setMissedLoginsPanelOpen] = useState(false)

  const attendanceTabCount = props.attendancePageRows.length
  const lateArrivalCount = selectedDateLateArrivals.length
  const earlyLeaveCount = selectedDateEarlyLeaves.length
  const leaveCount = selectedDateLeaves.length
  const missedLoginCount = missedLoginEmpCodes.length
  const activeAttendanceView =
    attendanceView === 'missed-logins' ? 'attendance' : attendanceView
  const normalizedSearch = attendanceSearch.trim().toLowerCase()
  const filteredLeaves = normalizedSearch
    ? selectedDateLeaves.filter((row: any) =>
        [
          row.emp_full_name,
          row.emp_code,
          row.emp_designation,
          row.leave_type,
          row.status
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : selectedDateLeaves
  const filteredExceptionRows = normalizedSearch
    ? exceptionRows.filter((row: any) =>
        [
          row.emp_name,
          row.emp_code,
          row.reason,
          row.status,
          row.exception_time,
          row.actual_login_time,
          row.planned_leave_time,
          row.actual_logout_time
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : exceptionRows
  const filteredMissedLoginEmployees = normalizedSearch
    ? missedLoginEmployees.filter((employee: any) =>
        [
          employee.emp_full_name,
          employee.emp_code,
          employee.emp_designation,
          employee.emp_department,
          employee.emp_email
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : missedLoginEmployees
  const openMissedLoginsPanel = () => {
    setQuickActionsOpen(false)
    setMissedLoginsPanelOpen(true)
  }
  const handleTriggerAllMissedLogins = () => {
    setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes)
    setAlertTriggerStatus('')
    setShowAlertComposer(true)
    setQuickActionsOpen(false)
    setMissedLoginsPanelOpen(true)
  }

  return (
    <div className="attendance-dashboard">
      <section className="attendance-toolbar">
        <div className="attendance-title-block">
          <p className="eyebrow">Operations</p>
          <h2>Todays Activity</h2>
        </div>

        <div className="attendance-toolbar-row">
          <div>
            <div className="attendance-tabs">
              <button className={`attendance-tab ${activeAttendanceView === 'attendance' ? 'active' : ''}`} type="button" onClick={() => setAttendanceView('attendance')}>
                First Clock-Ins
                <span>{attendanceTabCount}</span>
              </button>
              <button className={`attendance-tab ${activeAttendanceView === 'late-arrivals' ? 'active' : ''}`} type="button" onClick={() => setAttendanceView('late-arrivals')}>
                Late Arrivals
                <span>{lateArrivalCount}</span>
              </button>
              <button className={`attendance-tab ${activeAttendanceView === 'early-leaves' ? 'active' : ''}`} type="button" onClick={() => setAttendanceView('early-leaves')}>
                Early Leaves
                <span>{earlyLeaveCount}</span>
              </button>
              <button className={`attendance-tab ${activeAttendanceView === 'leaves' ? 'active' : ''}`} type="button" onClick={() => setAttendanceView('leaves')}>
                Leaves
                <span>{leaveCount}</span>
              </button>
            </div>
          </div>
          <div className="attendance-head-actions">
            <div className="attendance-controls attendance-controls-inline">
              <AttendanceDatePicker value={attendanceDateFilter} onChange={setAttendanceDateFilter} />
              <div className="attendance-filter attendance-filter-search">
                <label htmlFor="attendance-search">Search</label>
                <div className="attendance-input-shell attendance-search-shell">
                  <input
                    id="attendance-search"
                    type="text"
                    value={attendanceSearch}
                    onChange={(event) => setAttendanceSearch(event.target.value)}
                    placeholder="Search employee, type, status, or location"
                  />
                </div>
              </div>
              <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
                Refresh
              </button>
              <div className={`attendance-quick-actions${quickActionsOpen ? ' open' : ''}`}>
                <button
                  className="ghost dashboard-button attendance-quick-trigger"
                  type="button"
                  onClick={() => setQuickActionsOpen((current) => !current)}
                >
                  Quick Actions
                  <span>{missedLoginCount}</span>
                </button>
                <div className={`attendance-quick-menu${quickActionsOpen ? ' open' : ''}`}>
                  <button
                    className="attendance-quick-item"
                    type="button"
                    onClick={handleTriggerAllMissedLogins}
                    disabled={!actionableMissedLoginEmployeeCodes.length || alertCandidatesLoading}
                  >
                    Trigger Alert To All Missed Logins
                  </button>
                  <button
                    className="attendance-quick-item"
                    type="button"
                    onClick={openMissedLoginsPanel}
                  >
                    View Missed Logins
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeAttendanceView === 'attendance' ? (
        <div className="table-card attendance-content-card">
          {filteredAttendanceRows.length ? (
            <div className="table-scroll">
              <table className="dashboard-table attendance-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Working Hours</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendanceRows.map((row: any, index: number) => (
                    <tr key={`${row.id || row.employee_email || index}`}>
                      <td>
                        <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_designation || row.employee_email || '--'}</span>
                      </td>
                      <td>
                        <strong>{formatDateTime(row.login_time)}</strong>
                        <span className="table-meta">{row.login_location || 'Login location unavailable'}</span>
                        <span className="table-meta">{row.login_address || 'Login address unavailable'}</span>
                      </td>
                      <td>
                        <strong>{formatDateTime(row.logout_time)}</strong>
                        <span className="table-meta">{row.logout_location || 'Logout location unavailable'}</span>
                        <span className="table-meta">{row.logout_address || 'Logout address unavailable'}</span>
                      </td>
                      <td>{formatWorkingHours(row.working_hours)}</td>
                      <td>{row.attendance_type || 'office'}</td>
                      <td><span className="table-pill accent">{row.status || 'Unknown'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              {attendanceSearch.trim() ? 'No attendance records match this search.' : 'No first clock-in records found for the selected date.'}
            </div>
          )}
        </div>
      ) : activeAttendanceView === 'leaves' ? (
        <div className="table-card attendance-content-card">
          {filteredLeaves.length ? (
            <div className="table-scroll">
              <table className="dashboard-table leave-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Applied At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((row: any, index: number) => (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td>
                        <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_designation || formatLeaveTypeLabel(row) || 'Leave Request'}</span>
                      </td>
                      <td>{formatLeaveTypeLabel(row)}</td>
                      <td>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</td>
                      <td>{formatDateOnly(row.applied_at)}</td>
                      <td><span className="table-pill">{row.status || 'Unknown'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              {attendanceSearch.trim()
                ? 'No leave records match this search.'
                : 'No leaves found for the selected date.'}
            </div>
          )}
        </div>
      ) : (
        <div className="table-card attendance-content-card">
          {filteredExceptionRows.length ? (
            <div className="table-scroll">
              <table className="dashboard-table exception-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>{attendanceView === 'late-arrivals' ? 'Late By' : 'Early By'}</th>
                    <th>{attendanceView === 'late-arrivals' ? 'Login Time' : 'Leave Time'}</th>
                    <th>{attendanceView === 'late-arrivals' ? 'Informed' : 'Status'}</th>
                    <th>Reason</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptionRows.map((row: any, index: number) => (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td><strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong></td>
                      <td>{activeAttendanceView === 'late-arrivals' ? `${row.late_by_minutes ?? '--'} min` : `${row.early_by_minutes ?? '--'} min`}</td>
                      <td>{activeAttendanceView === 'late-arrivals' ? row.exception_time || row.actual_login_time || '--' : row.planned_leave_time || row.actual_logout_time || '--'}</td>
                      <td>{activeAttendanceView === 'late-arrivals' ? <span className={`table-pill ${(row.status || '').toLowerCase() === 'not_informed' ? '' : 'accent'}`}>{(row.status || '').toLowerCase() === 'not_informed' ? 'Not informed' : 'Informed'}</span> : <span className="table-pill">{row.status || 'Pending'}</span>}</td>
                      <td>{row.reason || 'No reason provided'}</td>
                      <td>{formatDateTime(row.requested_at || row.exception_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              {attendanceSearch.trim()
                ? `No ${activeAttendanceView === 'late-arrivals' ? 'late arrival' : 'early leave'} records match this search.`
                : `No ${activeAttendanceView === 'late-arrivals' ? 'late arrival' : 'early leave'} requests found for the selected date.`}
            </div>
          )}
        </div>
      )}

      {missedLoginsPanelOpen ? (
        <>
          <button
            className="side-panel-scrim"
            type="button"
            aria-label="Close missed logins panel"
            onClick={() => setMissedLoginsPanelOpen(false)}
          />
          <aside className="field-visit-panel attendance-missed-panel" aria-label="Missed logins panel">
            <div className="field-visit-panel-head">
              <div>
                <p className="eyebrow">Quick Actions</p>
                <h3>Missed Logins</h3>
                <span>
                  Employees who have not logged in and are not on leave for {selectedAttendanceDate}.
                </span>
              </div>
              <button
                className="field-visit-panel-close"
                type="button"
                onClick={() => setMissedLoginsPanelOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="alert-side-count">
              <strong>{filteredMissedLoginEmployees.length}</strong>
              <span>{alertCandidatesLoading ? 'Refreshing alerts...' : 'Need attention'}</span>
            </div>

            <div className="missed-logins-toolbar">
              <button
                className="ghost dashboard-button"
                type="button"
                onClick={() => {
                  setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes)
                  setAlertTriggerStatus('')
                }}
                disabled={!actionableMissedLoginEmployeeCodes.length || allMissedLoginsSelected}
              >
                Select All
              </button>
              <button
                className="ghost dashboard-button"
                type="button"
                onClick={() => {
                  setSelectedMissedLoginEmpCodes([])
                  setAlertTriggerStatus('')
                }}
                disabled={!selectedMissedLoginEmpCodes.length}
              >
                Clear
              </button>
            </div>

            <div className="missed-logins-actions">
              <span className="missed-logins-selected">Selected: {selectedMissedLoginCount}</span>
              <div className={`alert-trigger-wrap${showAlertComposer ? ' open' : ''}`}>
                <button
                  className="cta dashboard-button alert-trigger-button"
                  type="button"
                  onClick={() => {
                    setShowAlertComposer((current: boolean) => !current)
                    setAlertTriggerStatus('')
                  }}
                  disabled={alertCandidatesLoading || !selectedMissedLoginCount}
                >
                  {alertTriggerLoading ? 'Triggering...' : 'Trigger Alert'}
                </button>
                <div className={`alert-trigger-dropdown${showAlertComposer ? ' open' : ''}`}>
                  <div className="alert-trigger-dropdown-head">
                    <strong>Reminder options</strong>
                    <span>
                      {selectedMissedLoginCount} employee{selectedMissedLoginCount === 1 ? '' : 's'} selected for {reminderTargetDate}
                    </span>
                  </div>
                  <div className="alert-trigger-message">
                    <small>Message sending</small>
                    <strong>{reminderPreviewTitle}</strong>
                    <p>{reminderPreviewBody}</p>
                  </div>
                  <div className="alert-trigger-recipient-list">
                    {selectedMissedLoginEmpCodes
                      .map((empCode: string) => missedLoginEmployees.find((employee: any) => employee.emp_code === empCode))
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((employee: any) => (
                        <span key={employee.emp_code} className="alert-trigger-recipient-pill">
                          {employee.emp_full_name || employee.emp_code}
                        </span>
                      ))}
                    {selectedMissedLoginCount > 4 ? (
                      <span className="alert-trigger-recipient-pill">+{selectedMissedLoginCount - 4} more</span>
                    ) : null}
                  </div>
                  <div className="alert-trigger-dropdown-actions">
                    <button
                      className="ghost dashboard-button"
                      type="button"
                      onClick={() => setShowAlertComposer(false)}
                      disabled={alertTriggerLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="cta dashboard-button"
                      type="button"
                      onClick={() => void triggerAttendanceReminder()}
                      disabled={alertTriggerLoading || !selectedMissedLoginCount}
                    >
                      {alertTriggerLoading ? 'Sending...' : 'Send Reminder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert-side-list">
              {filteredMissedLoginEmployees.length ? (
                filteredMissedLoginEmployees.map((employee: any) => {
                  const isAlertSent = alertSentEmpCodes.includes(employee.emp_code)
                  const alertSendCount = Number(alertSendCounts[employee.emp_code] || 0)
                  return (
                    <label key={employee.emp_code} className={`alert-side-item missed-login-item${isAlertSent ? ' sent' : ''}`}>
                      <input
                        className="missed-login-checkbox"
                        type="checkbox"
                        checked={selectedMissedLoginEmpCodes.includes(employee.emp_code)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelectedMissedLoginEmpCodes((previousCodes: string[]) => checked
                            ? previousCodes.includes(employee.emp_code) ? previousCodes : [...previousCodes, employee.emp_code]
                            : previousCodes.filter((empCode) => empCode !== employee.emp_code))
                        }}
                      />
                      <div className="missed-login-item-copy">
                        <strong>{employee.emp_full_name || employee.emp_code}</strong>
                        <span>{employee.emp_designation || employee.emp_department || employee.emp_email || '--'}</span>
                        <small className={isAlertSent ? 'missed-login-alert-sent' : 'missed-login-alert-not-sent'}>
                          {isAlertSent ? `Sent ${alertSendCount} time${alertSendCount === 1 ? '' : 's'}` : 'Not Sent'}
                        </small>
                      </div>
                    </label>
                  )
                })
              ) : (
                <div className="empty-state">
                  {attendanceSearch.trim()
                    ? 'No missed login employees match this search.'
                    : 'No missed logins for this date.'}
                </div>
              )}
            </div>

            {alertTriggerStatus ? <span className="report-status">{alertTriggerStatus}</span> : null}
          </aside>
        </>
      ) : null}
    </div>
  )
}
