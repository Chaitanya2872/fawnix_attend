/* eslint-disable react-hooks/static-components */
import { useCallback, useMemo, useState } from 'react'
import AttendanceDatePicker from './AttendanceDatePicker'
import './AdminAttendancePage.css'
/* eslint-disable @typescript-eslint/no-explicit-any */

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

function getAttendanceStatusPillClass(status?: string): string {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('absent') || normalized.includes('reject') || normalized.includes('missed')) {
    return 'table-pill danger'
  }
  if (normalized.includes('late') || normalized.includes('early')) {
    return 'table-pill warning'
  }
  if (normalized.includes('present') || normalized.includes('office') || normalized.includes('remote') || normalized.includes('approved') || normalized.includes('on_time') || normalized.includes('on time')) {
    return 'table-pill success'
  }
  return 'table-pill accent'
}

const KPI_VIEWS = [
  {
    view: 'attendance',
    label: 'First Clock-Ins',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    view: 'late-arrivals',
    label: 'Late Arrivals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>
    ),
  },
  {
    view: 'early-leaves',
    label: 'Early Leaves',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
        <path d="M3 12h12"/>
      </svg>
    ),
  },
  {
    view: 'leaves',
    label: 'On Leave',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
]

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

  const kpiCounts: Record<string, number> = {
    attendance: props.attendancePageRows.length,
    'late-arrivals': selectedDateLateArrivals.length,
    'early-leaves': selectedDateEarlyLeaves.length,
    leaves: selectedDateLeaves.length,
  }

  const missedLoginCount = missedLoginEmpCodes.length
  const activeAttendanceView = attendanceView === 'missed-logins' ? 'attendance' : attendanceView
  const normalizedSearch = attendanceSearch.trim().toLowerCase()

  const allDepts = useMemo(() => {
    const depts = new Set<string>()
    filteredAttendanceRows.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    selectedDateLeaves.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    exceptionRows.forEach((r: any) => { if (r.emp_department) depts.add(r.emp_department) })
    return Array.from(depts).sort()
  }, [filteredAttendanceRows, selectedDateLeaves, exceptionRows])

  const hasDepts = allDepts.length > 0
  const deptMatch = useCallback(
    (row: any) => deptFilter === 'all' || !hasDepts || row.emp_department === deptFilter,
    [deptFilter, hasDepts]
  )

  const filteredLeaves = useMemo(() => {
    const base = normalizedSearch
      ? selectedDateLeaves.filter((r: any) =>
          [r.emp_full_name, r.emp_code, r.emp_designation, r.leave_type, r.status]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : selectedDateLeaves
    return base.filter(deptMatch)
  }, [selectedDateLeaves, normalizedSearch, deptMatch])

  const filteredExceptionRows = useMemo(() => {
    const base = normalizedSearch
      ? exceptionRows.filter((r: any) =>
          [r.emp_name, r.emp_code, r.reason, r.status, r.exception_time, r.actual_login_time, r.planned_leave_time, r.actual_logout_time]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : exceptionRows
    return base.filter(deptMatch)
  }, [exceptionRows, normalizedSearch, deptMatch])

  const filteredMissedLoginEmployees = useMemo(() => {
    const base = normalizedSearch
      ? missedLoginEmployees.filter((e: any) =>
          [e.emp_full_name, e.emp_code, e.emp_designation, e.emp_department, e.emp_email]
            .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
      : missedLoginEmployees
    return deptFilter === 'all' || !hasDepts ? base : base.filter((e: any) => e.emp_department === deptFilter)
  }, [missedLoginEmployees, normalizedSearch, deptFilter, hasDepts])

  const deptFilteredAttendanceRows = useMemo(
    () => filteredAttendanceRows.filter(deptMatch),
    [filteredAttendanceRows, deptMatch]
  )

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

  const openMissedLoginsPanel = () => { setQuickActionsOpen(false); setMissedLoginsPanelOpen(true) }
  const handleTriggerAllMissedLogins = () => {
    setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes)
    setAlertTriggerStatus('')
    setShowAlertComposer(true)
    setQuickActionsOpen(false)
    setMissedLoginsPanelOpen(true)
  }

  const ThS = ({ col, sort, onSort, children }: any) => (
    <th
      className={`th-sortable${sort.col === col ? ' th-sort-active' : ''}`}
      onClick={() => onSort(col)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSort(col)}
    >
      {children}<SortIcon col={col} sort={sort} />
    </th>
  )

  return (
    <div className="attendance-dashboard admin-aligned-page admin-aligned-page--attendance">
      <section className="attendance-toolbar">
        <div className="dashboard-section-head attendance-toolbar-head">
          {/* Title */}
          <div className="attendance-title-block">
            <p className="eyebrow">Operations</p>
            <h2>Today's Activity</h2>
          </div>

          {/* Controls row */}
          <div className="attendance-controls-row">
          <AttendanceDatePicker value={attendanceDateFilter} onChange={setAttendanceDateFilter} />

          <div className="attendance-search-shell">
            <span className="search-prefix-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              id="attendance-search"
              type="text"
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              placeholder="Search employee, type, status…"
            />
          </div>

          <button
            className="icon-btn"
            type="button"
            title="Refresh"
            onClick={() => void loadDashboard()}
            aria-label="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>

          <div className={`attendance-quick-actions${quickActionsOpen ? ' open' : ''}`}>
            <button
              className="attendance-quick-trigger"
              type="button"
              onClick={() => setQuickActionsOpen((c) => !c)}
              aria-label="Quick actions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Quick Actions
              {missedLoginCount > 0 && <span className="quick-badge">{missedLoginCount}</span>}
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

        {/* KPI cards */}
        <div className="kpi-cards">
          {KPI_VIEWS.map(({ view, label, icon }) => (
            <button
              key={view}
              className={`kpi-card${activeAttendanceView === view ? ' active' : ''}`}
              type="button"
              onClick={() => setAttendanceView(view)}
            >
              <div className="kpi-icon-wrap">{icon}</div>
              <div className="kpi-body">
                <span className="kpi-count">{kpiCounts[view]}</span>
                <span className="kpi-label">{label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Dept filter */}
        {hasDepts && (
          <div className="dept-filter-row" role="group" aria-label="Filter by department">
            <span className="dept-filter-label">Dept</span>
            <button className={`dept-pill${deptFilter === 'all' ? ' active' : ''}`} type="button" onClick={() => setDeptFilter('all')}>All</button>
            {allDepts.map((dept) => (
              <button key={dept} className={`dept-pill${deptFilter === dept ? ' active' : ''}`} type="button" onClick={() => setDeptFilter(dept)}>
                {dept}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Tables */}
      {activeAttendanceView === 'attendance' ? (
        <div className="table-card attendance-content-card">
          {sortedAttendanceRows.length ? (
            <div className="table-scroll">
              <table className="dashboard-table attendance-table">
                <thead>
                  <tr>
                    <ThS col="employee" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Employee</ThS>
                    <ThS col="clockin" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Clock In</ThS>
                    <ThS col="clockout" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Clock Out</ThS>
                    <ThS col="hours" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Working Hours</ThS>
                    <ThS col="type" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Type</ThS>
                    <ThS col="status" sort={attendanceSort} onSort={(c: string) => cycleSort(attendanceSort, c, setAttendanceSort)}>Status</ThS>
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
                      <td>
                        <span className={getAttendanceStatusPillClass(row.status)}>
                          <span className="table-pill-dot" aria-hidden="true" />
                          {row.status || 'Unknown'}
                        </span>
                      </td>
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
                    <ThS col="employee" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Employee</ThS>
                    <ThS col="type" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Leave Type</ThS>
                    <ThS col="from" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Dates</ThS>
                    <ThS col="applied" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Applied At</ThS>
                    <ThS col="status" sort={leavesSort} onSort={(c: string) => cycleSort(leavesSort, c, setLeavesSort)}>Status</ThS>
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
                    <ThS col="employee" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Employee</ThS>
                    <ThS col="minutes" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Late By' : 'Early By'}
                    </ThS>
                    <ThS col="time" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Login Time' : 'Leave Time'}
                    </ThS>
                    <ThS col="status" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>
                      {attendanceView === 'late-arrivals' ? 'Informed' : 'Status'}
                    </ThS>
                    <ThS col="reason" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Reason</ThS>
                    <ThS col="requested" sort={exceptionSort} onSort={(c: string) => cycleSort(exceptionSort, c, setExceptionSort)}>Requested</ThS>
                  </tr>
                </thead>
                <tbody>
                  {sortedExceptionRows.map((row: any, index: number) => (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td><strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong></td>
                      <td className="col-numeric exception-minutes">
                        {activeAttendanceView === 'late-arrivals' ? `${row.late_by_minutes ?? '—'} min` : `${row.early_by_minutes ?? '—'} min`}
                      </td>
                      <td>
                        {activeAttendanceView === 'late-arrivals'
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
          <button className="side-panel-scrim" type="button" aria-label="Close missed logins panel" onClick={() => setMissedLoginsPanelOpen(false)} />
          <aside className="field-visit-panel attendance-missed-panel" aria-label="Missed logins panel">
            <div className="field-visit-panel-head">
              <div>
                <p className="eyebrow">Quick Actions</p>
                <h3>Missed Logins</h3>
                <span>Employees who haven't logged in and aren't on leave for {selectedAttendanceDate}.</span>
              </div>
              <button className="field-visit-panel-close" type="button" onClick={() => setMissedLoginsPanelOpen(false)}>Close</button>
            </div>
            <div className="alert-side-count">
              <strong>{filteredMissedLoginEmployees.length}</strong>
              <span>{alertCandidatesLoading ? 'Refreshing…' : 'Need attention'}</span>
            </div>
            <div className="missed-logins-toolbar">
              <button className="ghost dashboard-button" type="button"
                onClick={() => { setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes); setAlertTriggerStatus('') }}
                disabled={!actionableMissedLoginEmployeeCodes.length || allMissedLoginsSelected}>Select All</button>
              <button className="ghost dashboard-button" type="button"
                onClick={() => { setSelectedMissedLoginEmpCodes([]); setAlertTriggerStatus('') }}
                disabled={!selectedMissedLoginEmpCodes.length}>Clear</button>
            </div>
            <div className="missed-logins-actions">
              <span className="missed-logins-selected">Selected: {selectedMissedLoginCount}</span>
              <div className={`alert-trigger-wrap${showAlertComposer ? ' open' : ''}`}>
                <button className="cta dashboard-button alert-trigger-button" type="button"
                  onClick={() => { setShowAlertComposer((c: boolean) => !c); setAlertTriggerStatus('') }}
                  disabled={alertCandidatesLoading || !selectedMissedLoginCount}>
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
                      .filter(Boolean).slice(0, 4)
                      .map((employee: any) => (
                        <span key={employee.emp_code} className="alert-trigger-recipient-pill">
                          {employee.emp_full_name || employee.emp_code}
                        </span>
                      ))}
                    {selectedMissedLoginCount > 4 && <span className="alert-trigger-recipient-pill">+{selectedMissedLoginCount - 4} more</span>}
                  </div>
                  <div className="alert-trigger-dropdown-actions">
                    <button className="ghost dashboard-button" type="button" onClick={() => setShowAlertComposer(false)} disabled={alertTriggerLoading}>Cancel</button>
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
                      <input className="missed-login-checkbox" type="checkbox"
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
