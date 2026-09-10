"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminAttendancePage;
/* eslint-disable react-hooks/static-components */
var react_1 = require("react");
var AttendanceDatePicker_1 = require("./AttendanceDatePicker");
require("./AdminAttendancePage.css");
function SortIcon(_a) {
    var col = _a.col, sort = _a.sort;
    var active = sort.col === col;
    return (<span className={"sort-icon".concat(active ? ' sort-icon--active' : '')} aria-hidden="true">
      {active && sort.dir === 'asc' ? '↑' : active && sort.dir === 'desc' ? '↓' : '↕'}
    </span>);
}
function useSortedRows(rows, sort, getVal) {
    return (0, react_1.useMemo)(function () {
        if (!sort.col || !sort.dir)
            return rows;
        return __spreadArray([], rows, true).sort(function (a, b) {
            var _a, _b;
            var av = (_a = getVal(a, sort.col)) !== null && _a !== void 0 ? _a : '';
            var bv = (_b = getVal(b, sort.col)) !== null && _b !== void 0 ? _b : '';
            var cmp = typeof av === 'number' && typeof bv === 'number'
                ? av - bv
                : String(av).localeCompare(String(bv));
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [rows, sort, getVal]);
}
function getAttendanceStatusPillClass(status) {
    var normalized = (status || '').toLowerCase();
    if (normalized.includes('absent') || normalized.includes('reject') || normalized.includes('missed')) {
        return 'table-pill danger';
    }
    if (normalized.includes('late') || normalized.includes('early')) {
        return 'table-pill warning';
    }
    if (normalized.includes('present') || normalized.includes('office') || normalized.includes('remote') || normalized.includes('approved') || normalized.includes('on_time') || normalized.includes('on time')) {
        return 'table-pill success';
    }
    return 'table-pill accent';
}
var KPI_VIEWS = [
    {
        view: 'attendance',
        label: 'First Clock-Ins',
        icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>),
    },
    {
        view: 'late-arrivals',
        label: 'Late Arrivals',
        icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>),
    },
    {
        view: 'early-leaves',
        label: 'Early Leaves',
        icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
        <path d="M3 12h12"/>
      </svg>),
    },
    {
        view: 'leaves',
        label: 'On Leave',
        icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>),
    },
];
function AdminAttendancePage(props) {
    var actionableMissedLoginEmployeeCodes = props.actionableMissedLoginEmployeeCodes, alertCandidatesLoading = props.alertCandidatesLoading, alertSentEmpCodes = props.alertSentEmpCodes, alertSendCounts = props.alertSendCounts, alertTriggerLoading = props.alertTriggerLoading, alertTriggerStatus = props.alertTriggerStatus, allMissedLoginsSelected = props.allMissedLoginsSelected, attendanceDateFilter = props.attendanceDateFilter, attendanceSearch = props.attendanceSearch, attendanceView = props.attendanceView, exceptionRows = props.exceptionRows, filteredAttendanceRows = props.filteredAttendanceRows, formatDate = props.formatDate, formatDateOnly = props.formatDateOnly, formatDateTime = props.formatDateTime, formatLeaveTypeLabel = props.formatLeaveTypeLabel, formatWorkingHours = props.formatWorkingHours, loadDashboard = props.loadDashboard, missedLoginEmpCodes = props.missedLoginEmpCodes, missedLoginEmployees = props.missedLoginEmployees, reminderPreviewBody = props.reminderPreviewBody, reminderPreviewTitle = props.reminderPreviewTitle, reminderTargetDate = props.reminderTargetDate, selectedAttendanceDate = props.selectedAttendanceDate, selectedDateEarlyLeaves = props.selectedDateEarlyLeaves, selectedDateLateArrivals = props.selectedDateLateArrivals, selectedDateLeaves = props.selectedDateLeaves, selectedMissedLoginCount = props.selectedMissedLoginCount, selectedMissedLoginEmpCodes = props.selectedMissedLoginEmpCodes, setAlertTriggerStatus = props.setAlertTriggerStatus, setAttendanceDateFilter = props.setAttendanceDateFilter, setAttendanceSearch = props.setAttendanceSearch, setAttendanceView = props.setAttendanceView, setSelectedMissedLoginEmpCodes = props.setSelectedMissedLoginEmpCodes, setShowAlertComposer = props.setShowAlertComposer, showAlertComposer = props.showAlertComposer, triggerAttendanceReminder = props.triggerAttendanceReminder;
    var _a = (0, react_1.useState)(false), quickActionsOpen = _a[0], setQuickActionsOpen = _a[1];
    var _b = (0, react_1.useState)(false), missedLoginsPanelOpen = _b[0], setMissedLoginsPanelOpen = _b[1];
    var _c = (0, react_1.useState)({ col: '', dir: null }), attendanceSort = _c[0], setAttendanceSort = _c[1];
    var _d = (0, react_1.useState)({ col: '', dir: null }), leavesSort = _d[0], setLeavesSort = _d[1];
    var _e = (0, react_1.useState)({ col: '', dir: null }), exceptionSort = _e[0], setExceptionSort = _e[1];
    var _f = (0, react_1.useState)('all'), deptFilter = _f[0], setDeptFilter = _f[1];
    var kpiCounts = {
        attendance: props.attendancePageRows.length,
        'late-arrivals': selectedDateLateArrivals.length,
        'early-leaves': selectedDateEarlyLeaves.length,
        leaves: selectedDateLeaves.length,
    };
    var missedLoginCount = missedLoginEmpCodes.length;
    var activeAttendanceView = attendanceView === 'missed-logins' ? 'attendance' : attendanceView;
    var normalizedSearch = attendanceSearch.trim().toLowerCase();
    var allDepts = (0, react_1.useMemo)(function () {
        var depts = new Set();
        filteredAttendanceRows.forEach(function (r) { if (r.emp_department)
            depts.add(r.emp_department); });
        selectedDateLeaves.forEach(function (r) { if (r.emp_department)
            depts.add(r.emp_department); });
        exceptionRows.forEach(function (r) { if (r.emp_department)
            depts.add(r.emp_department); });
        return Array.from(depts).sort();
    }, [filteredAttendanceRows, selectedDateLeaves, exceptionRows]);
    var hasDepts = allDepts.length > 0;
    var deptMatch = (0, react_1.useCallback)(function (row) { return deptFilter === 'all' || !hasDepts || row.emp_department === deptFilter; }, [deptFilter, hasDepts]);
    var filteredLeaves = (0, react_1.useMemo)(function () {
        var base = normalizedSearch
            ? selectedDateLeaves.filter(function (r) {
                return [r.emp_full_name, r.emp_code, r.emp_designation, r.leave_type, r.status]
                    .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
            })
            : selectedDateLeaves;
        return base.filter(deptMatch);
    }, [selectedDateLeaves, normalizedSearch, deptMatch]);
    var filteredExceptionRows = (0, react_1.useMemo)(function () {
        var base = normalizedSearch
            ? exceptionRows.filter(function (r) {
                return [r.emp_name, r.emp_code, r.reason, r.status, r.exception_time, r.actual_login_time, r.planned_leave_time, r.actual_logout_time]
                    .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
            })
            : exceptionRows;
        return base.filter(deptMatch);
    }, [exceptionRows, normalizedSearch, deptMatch]);
    var filteredMissedLoginEmployees = (0, react_1.useMemo)(function () {
        var base = normalizedSearch
            ? missedLoginEmployees.filter(function (e) {
                return [e.emp_full_name, e.emp_code, e.emp_designation, e.emp_department, e.emp_email]
                    .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
            })
            : missedLoginEmployees;
        return deptFilter === 'all' || !hasDepts ? base : base.filter(function (e) { return e.emp_department === deptFilter; });
    }, [missedLoginEmployees, normalizedSearch, deptFilter, hasDepts]);
    var deptFilteredAttendanceRows = (0, react_1.useMemo)(function () { return filteredAttendanceRows.filter(deptMatch); }, [filteredAttendanceRows, deptMatch]);
    function cycleSort(current, col, set) {
        if (current.col !== col) {
            set({ col: col, dir: 'asc' });
            return;
        }
        if (current.dir === 'asc') {
            set({ col: col, dir: 'desc' });
            return;
        }
        set({ col: '', dir: null });
    }
    var sortedAttendanceRows = useSortedRows(deptFilteredAttendanceRows, attendanceSort, function (row, col) {
        if (col === 'employee')
            return row.employee_name || row.employee_email || '';
        if (col === 'clockin')
            return row.login_time || '';
        if (col === 'clockout')
            return row.logout_time || '';
        if (col === 'hours')
            return parseFloat(row.working_hours) || 0;
        if (col === 'type')
            return row.attendance_type || '';
        if (col === 'status')
            return row.status || '';
        return '';
    });
    var sortedLeaves = useSortedRows(filteredLeaves, leavesSort, function (row, col) {
        if (col === 'employee')
            return row.emp_full_name || row.emp_code || '';
        if (col === 'type')
            return formatLeaveTypeLabel(row) || '';
        if (col === 'from')
            return row.from_date || '';
        if (col === 'applied')
            return row.applied_at || '';
        if (col === 'status')
            return row.status || '';
        return '';
    });
    var sortedExceptionRows = useSortedRows(filteredExceptionRows, exceptionSort, function (row, col) {
        var _a, _b;
        if (col === 'employee')
            return row.emp_name || row.emp_code || '';
        if (col === 'minutes')
            return activeAttendanceView === 'late-arrivals' ? ((_a = row.late_by_minutes) !== null && _a !== void 0 ? _a : 0) : ((_b = row.early_by_minutes) !== null && _b !== void 0 ? _b : 0);
        if (col === 'time')
            return row.exception_time || row.actual_login_time || row.planned_leave_time || row.actual_logout_time || '';
        if (col === 'status')
            return row.status || '';
        if (col === 'reason')
            return row.reason || '';
        if (col === 'requested')
            return row.requested_at || row.exception_date || '';
        return '';
    });
    var openMissedLoginsPanel = function () { setQuickActionsOpen(false); setMissedLoginsPanelOpen(true); };
    var handleTriggerAllMissedLogins = function () {
        setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes);
        setAlertTriggerStatus('');
        setShowAlertComposer(true);
        setQuickActionsOpen(false);
        setMissedLoginsPanelOpen(true);
    };
    var ThS = function (_a) {
        var col = _a.col, sort = _a.sort, onSort = _a.onSort, children = _a.children;
        return (<th className={"th-sortable".concat(sort.col === col ? ' th-sort-active' : '')} onClick={function () { return onSort(col); }} role="button" tabIndex={0} onKeyDown={function (e) { return e.key === 'Enter' && onSort(col); }}>
      {children}<SortIcon col={col} sort={sort}/>
    </th>);
    };
    return (<div className="attendance-dashboard admin-aligned-page admin-aligned-page--attendance">
      <section className="attendance-toolbar">
        <div className="dashboard-section-head attendance-toolbar-head">
          {/* Title */}
          <div className="attendance-title-block">
            <p className="eyebrow">Operations</p>
            <h2>Today's Activity</h2>
          </div>

          {/* Controls row */}
          <div className="attendance-controls-row">
          <AttendanceDatePicker_1.default value={attendanceDateFilter} onChange={setAttendanceDateFilter}/>

          <div className="attendance-search-shell">
            <span className="search-prefix-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input id="attendance-search" type="text" value={attendanceSearch} onChange={function (e) { return setAttendanceSearch(e.target.value); }} placeholder="Search employee, type, status…"/>
          </div>

          <button className="icon-btn" type="button" title="Refresh" onClick={function () { return void loadDashboard(); }} aria-label="Refresh">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>

          <div className={"attendance-quick-actions".concat(quickActionsOpen ? ' open' : '')}>
            <button className="attendance-quick-trigger" type="button" onClick={function () { return setQuickActionsOpen(function (c) { return !c; }); }} aria-label="Quick actions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Quick Actions
              {missedLoginCount > 0 && <span className="quick-badge">{missedLoginCount}</span>}
            </button>
            <div className={"attendance-quick-menu".concat(quickActionsOpen ? ' open' : '')}>
              <button className="attendance-quick-item" type="button" onClick={handleTriggerAllMissedLogins} disabled={!actionableMissedLoginEmployeeCodes.length || alertCandidatesLoading}>
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
          {KPI_VIEWS.map(function (_a) {
            var view = _a.view, label = _a.label, icon = _a.icon;
            return (<button key={view} className={"kpi-card".concat(activeAttendanceView === view ? ' active' : '')} type="button" onClick={function () { return setAttendanceView(view); }}>
              <div className="kpi-icon-wrap">{icon}</div>
              <div className="kpi-body">
                <span className="kpi-count">{kpiCounts[view]}</span>
                <span className="kpi-label">{label}</span>
              </div>
            </button>);
        })}
        </div>

        {/* Dept filter */}
        {hasDepts && (<div className="dept-filter-row" role="group" aria-label="Filter by department">
            <span className="dept-filter-label">Dept</span>
            <button className={"dept-pill".concat(deptFilter === 'all' ? ' active' : '')} type="button" onClick={function () { return setDeptFilter('all'); }}>All</button>
            {allDepts.map(function (dept) { return (<button key={dept} className={"dept-pill".concat(deptFilter === dept ? ' active' : '')} type="button" onClick={function () { return setDeptFilter(dept); }}>
                {dept}
              </button>); })}
          </div>)}
      </section>

      {/* Tables */}
      {activeAttendanceView === 'attendance' ? (<div className="table-card attendance-content-card">
          {sortedAttendanceRows.length ? (<div className="table-scroll">
              <table className="dashboard-table attendance-table">
                <thead>
                  <tr>
                    <ThS col="employee" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Employee</ThS>
                    <ThS col="clockin" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Clock In</ThS>
                    <ThS col="clockout" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Clock Out</ThS>
                    <ThS col="hours" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Working Hours</ThS>
                    <ThS col="type" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Type</ThS>
                    <ThS col="status" sort={attendanceSort} onSort={function (c) { return cycleSort(attendanceSort, c, setAttendanceSort); }}>Status</ThS>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttendanceRows.map(function (row, index) { return (<tr key={"".concat(row.id || row.employee_email || index)}>
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
                          <span className="table-pill-dot" aria-hidden="true"/>
                          {row.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>); })}
                </tbody>
              </table>
            </div>) : (<div className="empty-state">
              {attendanceSearch.trim() ? 'No attendance records match this search.' : 'No first clock-in records found for the selected date.'}
            </div>)}
        </div>) : activeAttendanceView === 'leaves' ? (<div className="table-card attendance-content-card">
          {sortedLeaves.length ? (<div className="table-scroll">
              <table className="dashboard-table leave-table">
                <thead>
                  <tr>
                    <ThS col="employee" sort={leavesSort} onSort={function (c) { return cycleSort(leavesSort, c, setLeavesSort); }}>Employee</ThS>
                    <ThS col="type" sort={leavesSort} onSort={function (c) { return cycleSort(leavesSort, c, setLeavesSort); }}>Leave Type</ThS>
                    <ThS col="from" sort={leavesSort} onSort={function (c) { return cycleSort(leavesSort, c, setLeavesSort); }}>Dates</ThS>
                    <ThS col="applied" sort={leavesSort} onSort={function (c) { return cycleSort(leavesSort, c, setLeavesSort); }}>Applied At</ThS>
                    <ThS col="status" sort={leavesSort} onSort={function (c) { return cycleSort(leavesSort, c, setLeavesSort); }}>Status</ThS>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaves.map(function (row, index) { return (<tr key={"".concat(row.id || row.emp_code || index)}>
                      <td>
                        <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_designation || '—'}</span>
                      </td>
                      <td>{formatLeaveTypeLabel(row)}</td>
                      <td>{"".concat(formatDate(row.from_date), " \u2013 ").concat(formatDate(row.to_date))}</td>
                      <td>{formatDateOnly(row.applied_at)}</td>
                      <td><span className="table-pill">{row.status || 'Unknown'}</span></td>
                    </tr>); })}
                </tbody>
              </table>
            </div>) : (<div className="empty-state">
              {attendanceSearch.trim() ? 'No leave records match this search.' : 'No leaves found for the selected date.'}
            </div>)}
        </div>) : (<div className="table-card attendance-content-card">
          {sortedExceptionRows.length ? (<div className="table-scroll">
              <table className="dashboard-table exception-table">
                <thead>
                  <tr>
                    <ThS col="employee" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>Employee</ThS>
                    <ThS col="minutes" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>
                      {attendanceView === 'late-arrivals' ? 'Late By' : 'Early By'}
                    </ThS>
                    <ThS col="time" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>
                      {attendanceView === 'late-arrivals' ? 'Login Time' : 'Leave Time'}
                    </ThS>
                    <ThS col="status" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>
                      {attendanceView === 'late-arrivals' ? 'Informed' : 'Status'}
                    </ThS>
                    <ThS col="reason" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>Reason</ThS>
                    <ThS col="requested" sort={exceptionSort} onSort={function (c) { return cycleSort(exceptionSort, c, setExceptionSort); }}>Requested</ThS>
                  </tr>
                </thead>
                <tbody>
                  {sortedExceptionRows.map(function (row, index) {
                    var _a, _b;
                    return (<tr key={"".concat(row.id || row.emp_code || index)}>
                      <td><strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong></td>
                      <td className="col-numeric exception-minutes">
                        {activeAttendanceView === 'late-arrivals' ? "".concat((_a = row.late_by_minutes) !== null && _a !== void 0 ? _a : '—', " min") : "".concat((_b = row.early_by_minutes) !== null && _b !== void 0 ? _b : '—', " min")}
                      </td>
                      <td>
                        {activeAttendanceView === 'late-arrivals'
                            ? row.exception_time || row.actual_login_time || '—'
                            : row.planned_leave_time || row.actual_logout_time || '—'}
                      </td>
                      <td>
                        {activeAttendanceView === 'late-arrivals'
                            ? <span className={"table-pill".concat((row.status || '').toLowerCase() !== 'not_informed' ? ' accent' : '')}>
                              {(row.status || '').toLowerCase() === 'not_informed' ? 'Not informed' : 'Informed'}
                            </span>
                            : <span className="table-pill">{row.status || 'Pending'}</span>}
                      </td>
                      <td className="col-reason">{row.reason || 'No reason provided'}</td>
                      <td>{formatDateTime(row.requested_at || row.exception_date)}</td>
                    </tr>);
                })}
                </tbody>
              </table>
            </div>) : (<div className="empty-state">
              {attendanceSearch.trim()
                    ? "No ".concat(activeAttendanceView === 'late-arrivals' ? 'late arrival' : 'early leave', " records match this search.")
                    : "No ".concat(activeAttendanceView === 'late-arrivals' ? 'late arrival' : 'early leave', " requests found for the selected date.")}
            </div>)}
        </div>)}

      {missedLoginsPanelOpen ? (<>
          <button className="side-panel-scrim" type="button" aria-label="Close missed logins panel" onClick={function () { return setMissedLoginsPanelOpen(false); }}/>
          <aside className="field-visit-panel attendance-missed-panel" aria-label="Missed logins panel">
            <div className="field-visit-panel-head">
              <div>
                <p className="eyebrow">Quick Actions</p>
                <h3>Missed Logins</h3>
                <span>Employees who haven't logged in and aren't on leave for {selectedAttendanceDate}.</span>
              </div>
              <button className="field-visit-panel-close" type="button" onClick={function () { return setMissedLoginsPanelOpen(false); }}>Close</button>
            </div>
            <div className="alert-side-count">
              <strong>{filteredMissedLoginEmployees.length}</strong>
              <span>{alertCandidatesLoading ? 'Refreshing…' : 'Need attention'}</span>
            </div>
            <div className="missed-logins-toolbar">
              <button className="ghost dashboard-button" type="button" onClick={function () { setSelectedMissedLoginEmpCodes(actionableMissedLoginEmployeeCodes); setAlertTriggerStatus(''); }} disabled={!actionableMissedLoginEmployeeCodes.length || allMissedLoginsSelected}>Select All</button>
              <button className="ghost dashboard-button" type="button" onClick={function () { setSelectedMissedLoginEmpCodes([]); setAlertTriggerStatus(''); }} disabled={!selectedMissedLoginEmpCodes.length}>Clear</button>
            </div>
            <div className="missed-logins-actions">
              <span className="missed-logins-selected">Selected: {selectedMissedLoginCount}</span>
              <div className={"alert-trigger-wrap".concat(showAlertComposer ? ' open' : '')}>
                <button className="cta dashboard-button alert-trigger-button" type="button" onClick={function () { setShowAlertComposer(function (c) { return !c; }); setAlertTriggerStatus(''); }} disabled={alertCandidatesLoading || !selectedMissedLoginCount}>
                  {alertTriggerLoading ? 'Triggering…' : 'Trigger Alert'}
                </button>
                <div className={"alert-trigger-dropdown".concat(showAlertComposer ? ' open' : '')}>
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
                .map(function (empCode) { return missedLoginEmployees.find(function (e) { return e.emp_code === empCode; }); })
                .filter(Boolean).slice(0, 4)
                .map(function (employee) { return (<span key={employee.emp_code} className="alert-trigger-recipient-pill">
                          {employee.emp_full_name || employee.emp_code}
                        </span>); })}
                    {selectedMissedLoginCount > 4 && <span className="alert-trigger-recipient-pill">+{selectedMissedLoginCount - 4} more</span>}
                  </div>
                  <div className="alert-trigger-dropdown-actions">
                    <button className="ghost dashboard-button" type="button" onClick={function () { return setShowAlertComposer(false); }} disabled={alertTriggerLoading}>Cancel</button>
                    <button className="cta dashboard-button" type="button" onClick={function () { return void triggerAttendanceReminder(); }} disabled={alertTriggerLoading || !selectedMissedLoginCount}>
                      {alertTriggerLoading ? 'Sending…' : 'Send Reminder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="alert-side-list">
              {filteredMissedLoginEmployees.length ? (filteredMissedLoginEmployees.map(function (employee) {
                var isAlertSent = alertSentEmpCodes.includes(employee.emp_code);
                var alertSendCount = Number(alertSendCounts[employee.emp_code] || 0);
                return (<label key={employee.emp_code} className={"alert-side-item missed-login-item".concat(isAlertSent ? ' sent' : '')}>
                      <input className="missed-login-checkbox" type="checkbox" checked={selectedMissedLoginEmpCodes.includes(employee.emp_code)} onChange={function (e) {
                        var checked = e.target.checked;
                        setSelectedMissedLoginEmpCodes(function (prev) {
                            return checked
                                ? prev.includes(employee.emp_code) ? prev : __spreadArray(__spreadArray([], prev, true), [employee.emp_code], false)
                                : prev.filter(function (c) { return c !== employee.emp_code; });
                        });
                    }}/>
                      <div className="missed-login-item-copy">
                        <strong>{employee.emp_full_name || employee.emp_code}</strong>
                        <span>{employee.emp_designation || employee.emp_department || employee.emp_email || '—'}</span>
                        <small className={isAlertSent ? 'missed-login-alert-sent' : 'missed-login-alert-not-sent'}>
                          {isAlertSent ? "Sent ".concat(alertSendCount, " time").concat(alertSendCount === 1 ? '' : 's') : 'Not sent'}
                        </small>
                      </div>
                    </label>);
            })) : (<div className="empty-state">
                  {attendanceSearch.trim() ? 'No missed login employees match this search.' : 'No missed logins for this date.'}
                </div>)}
            </div>
            {alertTriggerStatus ? <span className="report-status">{alertTriggerStatus}</span> : null}
          </aside>
        </>) : null}
    </div>);
}
