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
exports.default = AdminAttendanceExceptionsPage;
var react_1 = require("react");
var AttendanceKpiCards_1 = require("./components/AttendanceKpiCards");
var AttendanceFilterBar_1 = require("./components/AttendanceFilterBar");
var ColumnVisibilitySelector_1 = require("./components/ColumnVisibilitySelector");
var AttendanceExceptionDrawer_1 = require("./components/AttendanceExceptionDrawer");
var FilterDropdown_1 = require("../../../components/FilterDropdown");
require("./AdminAttendanceExceptionsPage.css");
// ─── Column definitions ────────────────────────────────────────────────────────
var ALL_COLUMNS = [
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
];
var DEFAULT_VISIBLE = new Set([
    'employee', 'attendance_date', 'exception_type', 'reason', 'status', 'actions',
]);
var STORAGE_KEY = 'fawnix_exc_columns_v2';
function loadVisibleKeys() {
    try {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            var arr = JSON.parse(stored);
            if (Array.isArray(arr) && arr.length > 0)
                return new Set(arr);
        }
    }
    catch ( /* ignore */_a) { /* ignore */ }
    return new Set(DEFAULT_VISIBLE);
}
function saveVisibleKeys(keys) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(__spreadArray([], keys, true)));
    }
    catch ( /* ignore */_a) { /* ignore */ }
}
var TYPE_FILTER_OPTIONS = [
    { value: '', label: 'All types' },
    { value: 'late_arrival', label: 'Late Arrival' },
    { value: 'early_leave', label: 'Early Leave' },
];
var STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'resolved', label: 'Resolved' },
];
var CSV_COLUMNS = [
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
];
// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtExType(v) {
    if (v === 'late_arrival')
        return 'Late Arrival';
    if (v === 'early_leave')
        return 'Early Leave';
    return v || '--';
}
function fmtStatus(v) {
    if (!v)
        return 'Unknown';
    return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}
function statusPillClass(v) {
    var n = (v || '').toLowerCase();
    if (n === 'approved' || n === 'resolved')
        return 'active';
    if (n === 'pending')
        return 'accent';
    if (n === 'rejected')
        return 'danger';
    return 'inactive';
}
function fmtTime(v, formatDateTime) {
    var raw = (v || '').trim();
    if (!raw)
        return '--';
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw))
        return raw.slice(0, 5);
    return formatDateTime(raw);
}
// Compact "07 Aug" rendering for the exceptions table's Date column, parsed
// manually from the backend's YYYY-MM-DD string to avoid timezone drift.
var SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtCompactDate(v) {
    var raw = (v || '').trim();
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!match)
        return raw || '--';
    var day = match[3];
    var monthIndex = Number(match[2]) - 1;
    return "".concat(day, " ").concat(SHORT_MONTHS[monthIndex] || '').trim();
}
function truncate(v, max) {
    if (max === void 0) { max = 48; }
    if (!v)
        return '--';
    return v.length > max ? v.slice(0, max) + '…' : v;
}
// Presentation-only bucketing of an already-computed minute value into a
// visual severity tier. No attendance business logic is derived here — the
// minute values themselves always come from the backend.
function severityTier(minutes) {
    var value = minutes !== null && minutes !== void 0 ? minutes : 0;
    if (value >= 60)
        return 'high';
    if (value >= 25)
        return 'medium';
    return 'low';
}
function deltaLabel(row) {
    var type = (row.exception_type || '').toLowerCase();
    if (type === 'late_arrival' && row.late_by_minutes != null)
        return "+".concat(row.late_by_minutes, " min late");
    if (type === 'early_leave' && row.early_by_minutes != null)
        return "\u2212".concat(row.early_by_minutes, " min early");
    return null;
}
function fmtHours(v) {
    if (v == null)
        return '--';
    return "".concat(v.toFixed(1), " h");
}
function csvEscape(value) {
    var text = value == null ? '' : String(value);
    if (/[",\n]/.test(text))
        return "\"".concat(text.replace(/"/g, '""'), "\"");
    return text;
}
function downloadRecordsAsCsv(records) {
    var header = CSV_COLUMNS.map(function (col) { return csvEscape(col.header); }).join(',');
    var lines = records.map(function (row) { return CSV_COLUMNS.map(function (col) { return csvEscape(row[col.key]); }).join(','); });
    var csv = __spreadArray([header], lines, true).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = "attendance-exceptions-".concat(new Date().toISOString().slice(0, 10), ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
function PlainTh(_a) {
    var label = _a.label, visible = _a.visible, children = _a.children;
    if (!visible)
        return null;
    return <th className="exc-th">{children || label}</th>;
}
// ─── Page Component ────────────────────────────────────────────────────────────
function AdminAttendanceExceptionsPage(_a) {
    var error = _a.error, filters = _a.filters, filterOptions = _a.filterOptions, formatDate = _a.formatDate, formatDateTime = _a.formatDateTime, kpis = _a.kpis, loading = _a.loading, lastSyncedAt = _a.lastSyncedAt, onChangePage = _a.onChangePage, onClearFilters = _a.onClearFilters, onRefresh = _a.onRefresh, onPresetFilter = _a.onPresetFilter, onSort = _a.onSort, pagination = _a.pagination, records = _a.records, updateFilter = _a.updateFilter, apiRequest = _a.apiRequest, accessToken = _a.accessToken;
    var _b = (0, react_1.useState)(loadVisibleKeys), visibleKeys = _b[0], setVisibleKeys = _b[1];
    var _c = (0, react_1.useState)(null), drawerRecord = _c[0], setDrawerRecord = _c[1];
    var _d = (0, react_1.useState)(false), drawerOpen = _d[0], setDrawerOpen = _d[1];
    var toggleColumn = (0, react_1.useCallback)(function (key) {
        setVisibleKeys(function (prev) {
            var next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            }
            else {
                next.add(key);
            }
            saveVisibleKeys(next);
            return next;
        });
    }, []);
    var resetColumns = (0, react_1.useCallback)(function () {
        setVisibleKeys(new Set(DEFAULT_VISIBLE));
        saveVisibleKeys(new Set(DEFAULT_VISIBLE));
    }, []);
    var openDrawer = (0, react_1.useCallback)(function (row) {
        setDrawerRecord(row);
        setDrawerOpen(true);
    }, []);
    var closeDrawer = (0, react_1.useCallback)(function () { return setDrawerOpen(false); }, []);
    var vis = function (key) { return visibleKeys.has(key); };
    // Quick filter helpers (from KPI card click)
    var handleKpiStatusFilter = function (status) { return onPresetFilter('status', status); };
    var handleKpiTypeFilter = function (type) { return onPresetFilter('exceptionType', type); };
    var headline = "".concat(kpis.pending.toLocaleString(), " pending review \u00B7 ").concat(kpis.repeat_offenders.exception_count.toLocaleString(), " flagged as repeat patterns");
    var syncedLabel = lastSyncedAt
        ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    var oldestPendingLabel = kpis.pending > 0 && kpis.oldest_pending_days != null
        ? "oldest pending is ".concat(kpis.oldest_pending_days, " day").concat(kpis.oldest_pending_days === 1 ? '' : 's', " old")
        : null;
    var rangeStart = records.length ? (pagination.page - 1) * pagination.page_size + 1 : 0;
    var rangeEnd = rangeStart ? rangeStart + records.length - 1 : 0;
    var pageLabel = records.length
        ? "Showing ".concat(rangeStart.toLocaleString(), "\u2013").concat(rangeEnd.toLocaleString(), " of ").concat(pagination.total_records.toLocaleString())
        : 'Nothing to show';
    return (<div className="admin-aligned-page admin-aligned-page--attendance-exceptions">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="exc-page-head">
        <div>
          <h1 className="exc-page-title">Attendance Exceptions</h1>
          <p className="exc-page-sub">{headline}</p>
        </div>
        <div className="exc-header-actions">
          {syncedLabel && <span className="exc-synced-label">synced {syncedLabel}</span>}
          <button className="exc-btn" onClick={onRefresh} disabled={loading} type="button" aria-label="Refresh exception records">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="exc-btn exc-btn--primary" onClick={function () { return downloadRecordsAsCsv(records); }} disabled={loading || records.length === 0} type="button" title="Exports the currently loaded page of results">
            Export
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ─────────────────────────────────────── */}
      <AttendanceKpiCards_1.default kpis={kpis} loading={loading} onFilterByStatus={handleKpiStatusFilter} onFilterByType={handleKpiTypeFilter}/>

      {/* ─── Filter Row ─────────────────────────────────────── */}
      <AttendanceFilterBar_1.default filters={filters} departmentOptions={filterOptions.departments} loading={loading} onClear={onClearFilters} updateFilter={updateFilter} onSort={onSort}/>

      {/* ─── Table Card ─────────────────────────────────────── */}
      <div className="table-card exc-table-card">
        <div className="exc-toolbar">
          <span className="exc-toolbar__count">
            {loading
            ? 'Loading…'
            : "".concat(pagination.total_records.toLocaleString(), " result").concat(pagination.total_records === 1 ? '' : 's')}
          </span>
          {oldestPendingLabel && <span className="exc-toolbar__sub">{oldestPendingLabel}</span>}
          <div className="exc-toolbar__right">
            <ColumnVisibilitySelector_1.default columns={ALL_COLUMNS} visibleKeys={visibleKeys} onToggle={toggleColumn} onReset={resetColumns}/>
          </div>
        </div>

        {loading ? (<div className="empty-state exc-loading-state">
            <span className="exc-spinner" aria-hidden="true"/>
            Loading attendance exceptions…
          </div>) : error && records.length === 0 ? (<div className="empty-state">
            <strong>Attendance exceptions didn’t load.</strong>
            <p>{error}</p>
            <button className="exc-btn" onClick={onRefresh} type="button">Try again</button>
          </div>) : records.length ? (<>
            <div className="table-scroll exc-table-scroll">
              <table className="dashboard-table exc-table" aria-label="Attendance exceptions">
                <thead>
                  <tr>
                    <PlainTh label="Employee" visible={vis('employee')}/>
                    <PlainTh label="Date" visible={vis('attendance_date')}/>
                    <PlainTh label="Exception" visible={vis('exception_type')}>
                      <FilterDropdown_1.default id="exc-type-filter" label="Exception" value={filters.exceptionType} options={TYPE_FILTER_OPTIONS} onChange={function (value) { return updateFilter('exceptionType', value); }} compact/>
                    </PlainTh>
                    <PlainTh label="Department" visible={vis('department')}/>
                    <PlainTh label="Planned Arrival" visible={vis('planned_arrival')}/>
                    <PlainTh label="Planned Leave" visible={vis('planned_leave')}/>
                    <PlainTh label="Late (min)" visible={vis('late_by')}/>
                    <PlainTh label="Early (min)" visible={vis('early_by')}/>
                    <PlainTh label="Reason" visible={vis('reason')}/>
                    <PlainTh label="Status" visible={vis('status')}>
                      <FilterDropdown_1.default id="exc-status-filter" label="Status" value={filters.status} options={STATUS_FILTER_OPTIONS} onChange={function (value) { return updateFilter('status', value); }} compact menuAlign="right"/>
                    </PlainTh>
                    <PlainTh label="Manager Remarks" visible={vis('manager_remarks')}/>
                    <PlainTh label="Reviewed By" visible={vis('reviewed_by')}/>
                    <PlainTh label="Attendance ID" visible={vis('attendance_id')}/>
                    <PlainTh label="Login Time" visible={vis('login_time')}/>
                    <PlainTh label="Logout Time" visible={vis('logout_time')}/>
                    <PlainTh label="Notes" visible={vis('notes')}/>
                    <PlainTh label="Reviewed At" visible={vis('reviewed_at')}/>
                    <PlainTh label="Created At" visible={vis('created_at')}/>
                    <PlainTh label="Updated At" visible={vis('updated_at')}/>
                    <PlainTh label="Hours Logged" visible={vis('working_hours')}/>
                    <PlainTh label="Prior (90d)" visible={vis('prior_exceptions')}/>
                    <PlainTh label="Details" visible={vis('actions')}/>
                  </tr>
                </thead>
                <tbody>
                  {records.map(function (row) {
                var _a, _b, _c, _d, _e, _f;
                var rowKey = "".concat((_b = (_a = row.id) !== null && _a !== void 0 ? _a : row.employee_code) !== null && _b !== void 0 ? _b : 'r', "-").concat(row.attendance_date || row.exception_date || 'x');
                var isPending = (row.status || '').toLowerCase() === 'pending';
                var tier = severityTier((_c = row.late_by_minutes) !== null && _c !== void 0 ? _c : row.early_by_minutes);
                var hasPriorPattern = ((_d = row.prior_exceptions_90d) !== null && _d !== void 0 ? _d : 0) >= 3;
                var employeeMeta = [row.employee_code, row.department].filter(Boolean).join(' · ');
                var delta = deltaLabel(row);
                return (<tr key={rowKey} className="exc-row" onClick={function () { return openDrawer(row); }} tabIndex={0} onKeyDown={function (event) {
                        if (event.key === 'Enter')
                            openDrawer(row);
                    }}>
                        {vis('employee') && (<td className="exc-td exc-td--employee">
                            <div className="exc-td--employee-wrap">
                              <span className={"exc-severity-bar exc-severity-bar--".concat(tier)} aria-hidden="true" style={{ opacity: isPending ? 1 : 0.35 }}/>
                              <span className="exc-td--employee-info">
                                <strong>{row.employee_name || row.emp_name || 'Unknown'}</strong>
                                {employeeMeta && <span className="exc-sub">{employeeMeta}</span>}
                              </span>
                            </div>
                          </td>)}
                        {vis('attendance_date') && (<td className="exc-td exc-td--mono exc-td--date">
                            {fmtCompactDate(row.attendance_date)}
                          </td>)}
                        {vis('exception_type') && (<td className="exc-td">
                            <strong className="exc-type-label">{fmtExType(row.exception_type)}</strong>
                            {(delta || hasPriorPattern) && (<span className="exc-sub exc-sub--delta">
                                {delta}
                                {delta && hasPriorPattern ? '  ·  ' : ''}
                                {hasPriorPattern ? "".concat(row.prior_exceptions_90d, "\u00D7 prior") : ''}
                              </span>)}
                          </td>)}
                        {vis('department') && (<td className="exc-td exc-td--trunc" title={row.department || ''}>
                            {row.department || '--'}
                          </td>)}
                        {vis('planned_arrival') && (<td className="exc-td exc-td--mono">{fmtTime(row.planned_arrival_time, formatDateTime)}</td>)}
                        {vis('planned_leave') && (<td className="exc-td exc-td--mono">{fmtTime(row.planned_leave_time, formatDateTime)}</td>)}
                        {vis('late_by') && (<td className="exc-td exc-td--num">
                            {row.late_by_minutes != null ? (<span className="exc-min-badge exc-min-badge--late">{row.late_by_minutes}</span>) : '--'}
                          </td>)}
                        {vis('early_by') && (<td className="exc-td exc-td--num">
                            {row.early_by_minutes != null ? (<span className="exc-min-badge exc-min-badge--early">{row.early_by_minutes}</span>) : '--'}
                          </td>)}
                        {vis('reason') && (<td className="exc-td exc-td--trunc exc-td--reason" title={row.reason || ''}>
                            {truncate(row.reason)}
                          </td>)}
                        {vis('status') && (<td className="exc-td exc-td--status">
                            <span className={"table-pill ".concat(statusPillClass(row.status))}>
                              {fmtStatus(row.status)}
                            </span>
                          </td>)}
                        {vis('manager_remarks') && (<td className="exc-td exc-td--trunc" title={row.manager_remarks || ''}>
                            {truncate(row.manager_remarks)}
                          </td>)}
                        {vis('reviewed_by') && (<td className="exc-td exc-td--trunc">{row.reviewed_by || '--'}</td>)}
                        {vis('attendance_id') && (<td className="exc-td exc-td--num">{(_e = row.attendance_id) !== null && _e !== void 0 ? _e : '--'}</td>)}
                        {vis('login_time') && (<td className="exc-td exc-td--mono">{fmtTime(row.login_time, formatDateTime)}</td>)}
                        {vis('logout_time') && (<td className="exc-td exc-td--mono">{fmtTime(row.logout_time, formatDateTime)}</td>)}
                        {vis('notes') && (<td className="exc-td exc-td--trunc" title={row.notes || ''}>{truncate(row.notes)}</td>)}
                        {vis('reviewed_at') && (<td className="exc-td">{row.reviewed_at ? formatDateTime(row.reviewed_at) : '--'}</td>)}
                        {vis('created_at') && (<td className="exc-td">{row.created_at ? formatDateTime(row.created_at) : '--'}</td>)}
                        {vis('updated_at') && (<td className="exc-td">{row.updated_at ? formatDateTime(row.updated_at) : '--'}</td>)}
                        {vis('working_hours') && (<td className="exc-td exc-td--mono">{fmtHours(row.working_hours)}</td>)}
                        {vis('prior_exceptions') && (<td className="exc-td exc-td--num">{(_f = row.prior_exceptions_90d) !== null && _f !== void 0 ? _f : 0}</td>)}
                        {vis('actions') && (<td className="exc-td exc-td--action">
                            <button type="button" className="exc-action-btn" onClick={function (event) { event.stopPropagation(); openDrawer(row); }} aria-label={"View exception for ".concat(row.employee_name || row.emp_name || '')}>
                              View
                            </button>
                          </td>)}
                      </tr>);
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
                <button className="exc-page-btn" type="button" onClick={function () { return onChangePage(pagination.page - 1); }} disabled={!pagination.has_previous || loading}>
                  Previous
                </button>
                <button className="exc-page-btn" type="button" onClick={function () { return onChangePage(pagination.page + 1); }} disabled={!pagination.has_next || loading}>
                  Next
                </button>
              </div>
            </div>
          </>) : (<div className="empty-state">No exceptions match these filters.</div>)}
      </div>

      {/* ─── Drawer ─────────────────────────────────────────── */}
      <AttendanceExceptionDrawer_1.default record={drawerRecord} open={drawerOpen} onClose={closeDrawer} onReviewed={onRefresh} apiRequest={apiRequest} accessToken={accessToken} formatDateTime={formatDateTime} formatDate={formatDate}/>
    </div>);
}
