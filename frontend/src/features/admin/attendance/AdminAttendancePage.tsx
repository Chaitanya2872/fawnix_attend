/* eslint-disable react-hooks/static-components */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useMemo } from 'react'
import './AdminAttendancePage.css'
/* eslint-disable @typescript-eslint/no-explicit-any */
import AttendanceDatePicker from '../../../components/AttendanceDatePicker'

type Props = any

type SortDir = 'asc' | 'desc' | null
type SortConfig = { col: string; dir: SortDir }

function SortIcon({ col, sort }: { col: string; sort: SortConfig }) {
  const active = sort.col === col
  return (
    <span className={`sort-icon${active ? ' sort-icon--active' : ''}`} aria-hidden="true">
      {active && sort.dir === 'asc' ? '↑' : active && sort.dir === 'desc' ? '↓' : '↕'}
    </span>
  )
}

function useSortedRows<T>(rows: T[], sort: SortConfig, getVal: (row: T, col: string) => any): T[] {
  return useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      const av = getVal(a, sort.col) ?? ''
      const bv = getVal(b, sort.col) ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, getVal])
}

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
  const [attendanceSort, setAttendanceSort] = useState<SortConfig>({ col: '', dir: null })
  const [leavesSort, setLeavesSort] = useState<SortConfig>({ col: '', dir: null })
  const [exceptionSort, setExceptionSort] = useState<SortConfig>({ col: '', dir: null })
  const [deptFilter, setDeptFilter] = useState<string>('all')

  const attendanceTabCount = props.attendancePageRows.length
  const lateArrivalCount = selectedDateLateArrivals.length
  const earlyLeaveCount = selectedDateEarlyLeaves.length
  const leaveCount = selectedDateLeaves.length
  const missedLoginCount = missedLoginEmpCodes.length
  const activeAttendanceView = attendanceView === 'missed-logins' ? 'attendance' : attendanceView
  const normalizedSearch = attendanceSearch.trim().toLowerCase()

  // Derive unique departments from all available data
  const allDepts = useMemo(() => {
    const depts = new Set<string>()
    filteredAttendanceRows.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    selectedDateLeaves.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    exceptionRows.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    return Array.from(depts).sort()
  }, [filteredAttendanceRows, selectedDateLeaves, exceptionRows])

  const hasDepts = allDepts.length > 0

  // Department-filtered base rows
  const deptFilterFn = (row: any) => deptFilter === 'all' || !hasDepts || row.emp_department === deptFilter

  const filteredLeaves = useMemo(() => {
    const base = normalizedSearch
      ? selectedDateLeaves.filter((row: any) =>
          [row.emp_full_name, row.emp_code, row.emp_designation, row.leave_type, row.status]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : selectedDateLeaves
    return base.filter(deptFilterFn)
  }, [selectedDateLeaves, normalizedSearch, deptFilter])

  const filteredExceptionRows = useMemo(() => {
    const base = normalizedSearch
      ? exceptionRows.filter((row: any) =>
          [row.emp_name, row.emp_code, row.reason, row.status, row.exception_time, row.actual_login_time, row.planned_leave_time, row.actual_logout_time]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : exceptionRows
    return base.filter(deptFilterFn)
  }, [exceptionRows, normalizedSearch, deptFilter])

  const filteredMissedLoginEmployees = useMemo(() => {
    const base = normalizedSearch
      ? missedLoginEmployees.filter((e: any) =>
          [e.emp_full_name, e.emp_code, e.emp_designation, e.emp_department, e.emp_email]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : missedLoginEmployees
    return deptFilter === 'all' || !hasDepts
      ? base
      : base.filter((e: any) => e.emp_department === deptFilter)
  }, [missedLoginEmployees, normalizedSearch, deptFilter])

  const deptFilteredAttendanceRows = useMemo(() =>
    filteredAttendanceRows.filter(deptFilterFn),
    [filteredAttendanceRows, deptFilter]
  )

  // Sorting helpers
  function cycleSort(current: SortConfig, col: string, set: (s: SortConfig) => void) {
    if (current.col !== col) { set({ col, dir: 'asc' }); return }
    if (current.dir === 'asc') { set({ col, dir: 'desc' }); return }
    set({ col: '', dir: null })
  }

  const sortedAttendanceRows = useSortedRows(deptFilteredAttendanceRows, attendanceSort, (row: any, col) => {
    if (col === 'employee') return row.employee_name || row.employee_email || ''
    if (col === 'clockin') return row.login_time || ''
    if (col === 'clockout') return row.logout_time || ''
    if (col === 'hours') return parseFloat(row.working_hours) || 0
    if (col === 'type') return row.attendance_type || ''
    if (col === 'status') return row.status || ''
    return ''
  })

  const sortedLeaves = useSortedRows(filteredLeaves, leavesSort, (row: any, col) => {
    if (col === 'employee') return row.emp_full_name || row.emp_code || ''
    if (col === 'type') return formatLeaveTypeLabel(row) || ''
    if (col === 'from') return row.from_date || ''
    if (col === 'applied') return row.applied_at || ''
    if (col === 'status') return row.status || ''
    return ''
  })

  const sortedExceptionRows = useSortedRows(filteredExceptionRows, exceptionSort, (row: any, col) => {
    if (col === 'employee') return row.emp_name || row.emp_code || ''
    if (col === 'minutes') return activeAttendanceView === 'late-arrivals' ? (row.late_by_minutes ?? 0) : (row.early_by_minutes ?? 0)
    if (col === 'time') return row.exception_time || row.actual_login_time || row.planned_leave_time || row.actual_logout_time || ''
    if (col === 'status') return row.status || ''
    if (col === 'reason') return row.reason || ''
    if (col === 'requested') return row.requested_at || row.exception_date || ''
    return ''
  })

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

  const ThSortable = ({ col, sort, onSort, children }: any) => (
    <th
      className={`th-sortable${sort.col === col ? ' th-sort-active' : ''}`}
      onClick={() => onSort(col)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSort(col)}
    >
      {children}
      <SortIcon col={col} sort={sort} />
    </th>
  )

  return (
    <div className="attendance-dashboard">
      <section className="attendance-toolbar">
        <div className="attendance-title-row">
          <div className="attendance-title-block">
            <p className="eyebrow">Operations</p>
            <h2>Today's Activity</h2>
          </div>
          <div className="attendance-head-actions">
            <AttendanceDatePicker value={attendanceDateFilter} onChange={setAttendanceDateFilter} />
            <div className="attendance-filter attendance-filter-search">
              <div className="attendance-input-shell attendance-search-shell">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  id="attendance-search"
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Search employee, type, status…"
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
                onClick={() => setQuickActionsOpen((c) => !c)}
              >
                Quick Actions
                {missedLoginCount > 0 && <span className="badge-count">{missedLoginCount}</span>}
              </button>
              <div className={`attendance-quick-menu${quickActionsOpen ? ' open' : ''}`}>
                <button
                  className="attendance-quick-item"
                  type="button"
                  onClick={handleTriggerAllMissedLogins}
                  disabled={!actionableMissedLoginEmployeeCodes.length || alertCandidatesLoading}
                >
                  Trigger alert to all missed logins
                </button>
                <button className="attendance-quick-item" type="button" onClick={openMissedLoginsPanel}>
                  View missed logins
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="attendance-filter-bar">
          <div className="attendance-tabs">
            {[
              { view: 'attendance', label: 'First Clock-Ins', count: attendanceTabCount },
              { view: 'late-arrivals', label: 'Late Arrivals', count: lateArrivalCount },
              { view: 'early-leaves', label: 'Early Leaves', count: earlyLeaveCount },
              { view: 'leaves', label: 'Leaves', count: leaveCount }
            ].map(({ view, label, count }) => (
              <button
                key={view}
                className={`attendance-tab${activeAttendanceView === view ? ' active' : ''}`}
                type="button"
                onClick={() => setAttendanceView(view)}
              >
                {label}
                <span className="tab-count">{count}</span>
              </button>
            ))}
          </div>

          {hasDepts && (
            <div className="dept-filter" role="group" aria-label="Filter by department">
              <span className="dept-filter-label">Dept</span>
              <button
                className={`dept-pill${deptFilter === 'all' ? ' active' : ''}`}
                type="button"
                onClick={() => setDeptFilter('all')}
              >
                All
              </button>
              {allDepts.map((dept) => (
                <button
                  key={dept}
                  className={`dept-pill${deptFilter === dept ? ' active' : ''}`}
                  type="button"
                  onClick={() => setDeptFilter(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {activeAttendanceView === 'attendance' ? (
        <div className="table-card attendance-content-card">
          {sortedAttendanceRows.length ? (
            <div className="table-scroll">
              <table className="dashboard-table attendance-table">
                <thead>
                  <tr>
                    <ThSortable col="employee" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Employee</ThSortable>
                    <ThSortable col="clockin" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Clock In</ThSortable>
                    <ThSortable col="clockout" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Clock Out</ThSortable>
                    <ThSortable col="hours" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Working Hours</ThSortable>
                    <ThSortable col="type" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Type</ThSortable>
                    <ThSortable col="status" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Status</ThSortable>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttendanceRows.map((row: any, index: number) => (
                    <tr key={`${row.id || row.employee_email || index}`}>
                      <td>
                        <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_designation || row.employee_email || '—'}</span>
                      </td>
                      <td>
                        <strong>{formatDateTime(row.login_time)}</strong>
                        <span className="table-meta">{row.login_address || row.login_location || 'Location unavailable'}</span>
                      </td>
                      <td>
                        <strong>{formatDateTime(row.logout_time)}</strong>
                        <span className="table-meta">{row.logout_address || row.logout_location || 'Location unavailable'}</span>
                      </td>
                      <td className="col-numeric">{formatWorkingHours(row.working_hours)}</td>
                      <td><span className="type-badge">{row.attendance_type || 'office'}</span></td>
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
          {sortedLeaves.length ? (
            <div className="table-scroll">
              <table className="dashboard-table leave-table">
                <thead>
                  <tr>
                    <ThSortable col="employee" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Employee</ThSortable>
                    <ThSortable col="type" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Leave Type</ThSortable>
                    <ThSortable col="from" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Dates</ThSortable>
                    <ThSortable col="applied" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Applied At</ThSortable>
                    <ThSortable col="status" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Status</ThSortable>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaves.map((row: any, index: number) => (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td>
                        <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_designation || '—'}</span>
                      </td>
                      <td>{formatLeaveTypeLabel(row)}</td>
                      <td>{`${formatDate(row.from_date)} – ${formatDate(row.to_date)}`}</td>
                      <td>{formatDateOnly(row.applied_at)}</td>
                      <td><span className="table-pill">{row.status || 'Unknown'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              {attendanceSearch.trim() ? 'No leave records match this search.' : 'No leaves found for the selected date.'}
            </div>
          )}
        </div>

      ) : (
        <div className="table-card attendance-content-card">
          {sortedExceptionRows.length ? (
            <div className="table-scroll">
              <table className="dashboard-table exception-table">
                <thead>
                  <tr>
                    <ThSortable col="employee" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Employee</ThSortable>
                    <ThSortable col="minutes" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Late By' : 'Early By'}
                    </ThSortable>
                    <ThSortable col="time" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Login Time' : 'Leave Time'}
                    </ThSortable>
                    <ThSortable col="status" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Informed' : 'Status'}
                    </ThSortable>
                    <ThSortable col="reason" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Reason</ThSortable>
                    <ThSortable col="requested" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Requested</ThSortable>
                  </tr>
                </thead>
                <tbody>
                  {sortedExceptionRows.map((row: any, index: number) => (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td><strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong></td>
                      <td className="col-numeric exception-minutes">
                        {activeAttendanceView === 'late-arrivals'
                          ? `${row.late_by_minutes ?? '—'} min`
                          : `${row.early_by_minutes ?? '—'} min`}
                      </td>
                      <td>{activeAttendanceView === 'late-arrivals'
                        ? row.exception_time || row.actual_login_time || '—'
                        : row.planned_leave_time || row.actual_logout_time || '—'}
                      </td>
                      <td>
                        {activeAttendanceView === 'late-arrivals'
                          ? <span className={`table-pill${(row.status || '').toLowerCase() !== 'not_informed' ? ' accent' : ''}`}>
                              {(row.status || '').toLowerCase() === 'not_informed' ? 'Not informed' : 'Informed'}
                            </span>
                          : <span className="table-pill">{row.status || 'Pending'}</span>}
                      </td>
                      <td className="col-reason">{row.reason || 'No reason provided'}</td>
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
                  Employees who haven't logged in and aren't on leave for {selectedAttendanceDate}.
                </span>
              </div>
              <button className="field-visit-panel-close" type="button" onClick={() => setMissedLoginsPanelOpen(false)}>
                Close
              </button>
            </div>

            <div className="alert-side-count">
              <strong>{filteredMissedLoginEmployees.length}</strong>
              <span>{alertCandidatesLoading ? 'Refreshing…' : 'Need attention'}</span>
            </div>

            <div className="missed-logins-toolbar">
              <button
                className="ghost dashboard-button"
                type="button"
                onClick={() => { setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes); setAlertTriggerStatus('') }}
                disabled={!actionableMissedLoginEmployeeCodes.length || allMissedLoginsSelected}
              >
                Select All
              </button>
              <button
                className="ghost dashboard-button"
                type="button"
                onClick={() => { setSelectedMissedLoginEmpCodes([]); setAlertTriggerStatus('') }}
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
                  onClick={() => { setShowAlertComposer((c: boolean) => !c); setAlertTriggerStatus('') }}
                  disabled={alertCandidatesLoading || !selectedMissedLoginCount}
                >
                  {alertTriggerLoading ? 'Triggering…' : 'Trigger Alert'}
                </button>
                <div className={`alert-trigger-dropdown${showAlertComposer ? ' open' : ''}`}>
                  <div className="alert-trigger-dropdown-head">
                    <strong>Reminder options</strong>
                    <span>{selectedMissedLoginCount} employee{selectedMissedLoginCount === 1 ? '' : 's'} selected for {reminderTargetDate}</span>
                  </div>
                  <div className="alert-trigger-message">
                    <small>Message sending</small>
                    <strong>{reminderPreviewTitle}</strong>
                    <p>{reminderPreviewBody}</p>
                  </div>
                  <div className="alert-trigger-recipient-list">
                    {selectedMissedLoginEmpCodes
                      .map((empCode: string) => missedLoginEmployees.find((e: any) => e.emp_code === empCode))
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((employee: any) => (
                        <span key={employee.emp_code} className="alert-trigger-recipient-pill">
                          {employee.emp_full_name || employee.emp_code}
                        </span>
                      ))}
                    {selectedMissedLoginCount > 4 && (
                      <span className="alert-trigger-recipient-pill">+{selectedMissedLoginCount - 4} more</span>
                    )}
                  </div>
                  <div className="alert-trigger-dropdown-actions">
                    <button className="ghost dashboard-button" type="button" onClick={() => setShowAlertComposer(false)} disabled={alertTriggerLoading}>
                      Cancel
                    </button>
                    <button className="cta dashboard-button" type="button" onClick={() => void triggerAttendanceReminder()} disabled={alertTriggerLoading || !selectedMissedLoginCount}>
                      {alertTriggerLoading ? 'Sending…' : 'Send Reminder'}
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
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedMissedLoginEmpCodes((prev: string[]) =>
                            checked
                              ? prev.includes(employee.emp_code) ? prev : [...prev, employee.emp_code]
                              : prev.filter((c: string) => c !== employee.emp_code)
                          )
                        }}
                      />
                      <div className="missed-login-item-copy">
                        <strong>{employee.emp_full_name || employee.emp_code}</strong>
                        <span>{employee.emp_designation || employee.emp_department || employee.emp_email || '—'}</span>
                        <small className={isAlertSent ? 'missed-login-alert-sent' : 'missed-login-alert-not-sent'}>
                          {isAlertSent ? `Sent ${alertSendCount} time${alertSendCount === 1 ? '' : 's'}` : 'Not sent'}
                        </small>
                      </div>
                    </label>
                  )
                })
              ) : (
                <div className="empty-state">
                  {attendanceSearch.trim() ? 'No missed login employees match this search.' : 'No missed logins for this date.'}
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