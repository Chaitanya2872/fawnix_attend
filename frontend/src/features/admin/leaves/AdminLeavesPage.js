"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.default = AdminLeavesPage;
var react_1 = require("react");
var Leavekpicards_1 = require("./components/Leavekpicards");
var LeaveFilterBar_1 = require("./components/LeaveFilterBar");
var LeaveDrawer_1 = require("./components/LeaveDrawer");
var ColumnVisibilitySelector_1 = require("../attendance-exceptions/components/ColumnVisibilitySelector");
var FilterDropdown_1 = require("../../../components/FilterDropdown");
require("./AdminLeavesPage.css");
// â”€â”€â”€ Column definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var ALL_COLUMNS = [
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
];
var DEFAULT_VISIBLE = new Set([
    'employee', 'leave_type', 'dates', 'days', 'manager', 'status', 'actions',
]);
var STORAGE_KEY = 'fawnix_leaves_columns_v1';
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
    { value: 'casual', label: 'Casual' },
    { value: 'sick', label: 'Sick' },
    { value: 'annual', label: 'Annual' },
    { value: 'monthly', label: 'Monthly' },
];
var STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
];
var CSV_COLUMNS = [
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
];
function fmtStatus(v) {
    if (!v)
        return 'Unknown';
    return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}
function statusPillClass(v) {
    var n = (v || '').toLowerCase();
    if (n === 'approved')
        return 'active';
    if (n === 'pending')
        return 'accent';
    if (n === 'rejected')
        return 'danger';
    return 'inactive';
}
function fmtLeaveType(record) {
    var rawType = (record.leave_type || '').trim();
    if (!rawType)
        return 'Leave';
    var display = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    var duration = (record.duration || '').trim().toLowerCase();
    if (duration === 'first_half' || duration === 'second_half')
        return "".concat(display, " (0.5)");
    return display;
}
function fmtEmployeeMeta(employeeCode, department) {
    var code = (employeeCode || '').trim();
    var dept = (department || '').trim();
    return [code, dept].filter(Boolean).join('.') || '--';
}
// Compact "07 Aug" rendering, parsed manually from the backend's YYYY-MM-DD
// string to avoid timezone drift.
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
function fmtWeekday(v) {
    var raw = (v || '').trim();
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!match)
        return '--';
    var parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(parsed.getTime()))
        return '--';
    return parsed.toLocaleDateString('en-IN', { weekday: 'long' });
}
function fmtDateRangeDay(fromDate, toDate) {
    var fromDay = fmtWeekday(fromDate);
    var toDay = fmtWeekday(toDate);
    if (fromDay === '--')
        return toDay;
    if (toDay === '--' || fromDay === toDay)
        return fromDay;
    return "".concat(fromDay, " - ").concat(toDay);
}
function truncate(v, max) {
    if (max === void 0) { max = 40; }
    if (!v)
        return '--';
    return v.length > max ? "".concat(v.slice(0, max), "...") : v;
}
function waitingDays(appliedAt) {
    var raw = (appliedAt || '').trim();
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!match)
        return null;
    var applied = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    var today = new Date();
    var startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((startOfToday.getTime() - applied.getTime()) / 86400000);
}
// Presentation-only bucketing of an already-computed waiting-days value into
// a visual severity tier â€” no attendance/leave business logic is derived
// here, the day count itself always comes from the backend's applied_at.
function ageTier(days) {
    var value = days !== null && days !== void 0 ? days : 0;
    if (value >= 30)
        return 'high';
    if (value >= 7)
        return 'medium';
    return 'low';
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
    link.download = "leave-requests-".concat(new Date().toISOString().slice(0, 10), ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
/** Adapts a board record to the shape alertLeaveManager (defined in FawnixApp
 * against the legacy LeaveRow type) expects. */
function toLeaveRowShape(record) {
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
    };
}
function PlainTh(_a) {
    var label = _a.label, visible = _a.visible, children = _a.children;
    if (!visible)
        return null;
    return <th className="lv-th">{children || label}</th>;
}
// â”€â”€â”€ Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminLeavesPage(_a) {
    var _this = this;
    var _b;
    var error = _a.error, filters = _a.filters, filterOptions = _a.filterOptions, formatDate = _a.formatDate, formatDateTime = _a.formatDateTime, kpis = _a.kpis, loading = _a.loading, lastSyncedAt = _a.lastSyncedAt, onChangePage = _a.onChangePage, onClearFilters = _a.onClearFilters, onRefresh = _a.onRefresh, onPresetFilter = _a.onPresetFilter, onSort = _a.onSort, pagination = _a.pagination, records = _a.records, updateFilter = _a.updateFilter, onAlertManager = _a.onAlertManager, apiRequest = _a.apiRequest, accessToken = _a.accessToken;
    var _c = (0, react_1.useState)(loadVisibleKeys), visibleKeys = _c[0], setVisibleKeys = _c[1];
    var _d = (0, react_1.useState)(null), drawerRecord = _d[0], setDrawerRecord = _d[1];
    var _e = (0, react_1.useState)(false), drawerOpen = _e[0], setDrawerOpen = _e[1];
    var _f = (0, react_1.useState)(''), alertLoadingKey = _f[0], setAlertLoadingKey = _f[1];
    var _g = (0, react_1.useState)(''), alertStatus = _g[0], setAlertStatus = _g[1];
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
    var pageLabel = pagination.total_pages
        ? "Page ".concat(pagination.page, " of ").concat(pagination.total_pages)
        : 'No pages yet';
    var handleAlert = function (row, key) { return __awaiter(_this, void 0, void 0, function () {
        var nextStatus, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setAlertLoadingKey(key);
                    setAlertStatus('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, onAlertManager(toLeaveRowShape(row))];
                case 2:
                    nextStatus = _a.sent();
                    setAlertStatus(nextStatus);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setAlertStatus(err_1 instanceof Error ? err_1.message : 'Failed to alert manager.');
                    return [3 /*break*/, 5];
                case 4:
                    setAlertLoadingKey('');
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var headline = "".concat(kpis.pending.toLocaleString(), " requests awaiting approval - oldest has been waiting ").concat((_b = kpis.oldest_pending_days) !== null && _b !== void 0 ? _b : 0, " day").concat(kpis.oldest_pending_days === 1 ? '' : 's');
    var syncedLabel = lastSyncedAt
        ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    return (<div className="admin-aligned-page admin-aligned-page--leaves">
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Leaves</h2>
          <p className="exception-head-copy">{kpis.pending > 0 ? headline : 'Nothing waiting on a manager right now.'}</p>
        </div>
        <div className="lv-header-actions">
          {syncedLabel && <span className="lv-synced-label">synced {syncedLabel}</span>}
          <button className="ghost dashboard-button lv-icon-label-btn" onClick={onRefresh} disabled={loading} type="button" aria-label="Refresh leave requests">
            <svg className={"lv-control-icon".concat(loading ? ' is-spinning' : '')} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"/>
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button className="cta dashboard-button" onClick={function () { return downloadRecordsAsCsv(records); }} disabled={loading || records.length === 0} type="button" aria-label="Export loaded leave requests as CSV" title="Exports the currently loaded page of results">
            Export
          </button>
        </div>
      </div>

      {/* â”€â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Leavekpicards_1.default kpis={kpis} loading={loading} onFilterByStatus={function (status) { return onPresetFilter('status', status); }}/>

      {/* â”€â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveFilterBar_1.default filters={filters} departmentOptions={filterOptions.departments} managerOptions={filterOptions.managers} loading={loading} onClear={onClearFilters} updateFilter={updateFilter} onSort={onSort}/>

      {/* â”€â”€â”€ Table Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="table-card lv-table-card">
        <div className="lv-toolbar">
          <span className="lv-toolbar__count">
            {loading ? 'Loading...' : "".concat(pagination.total_records.toLocaleString(), " result").concat(pagination.total_records === 1 ? '' : 's')}
          </span>
          <div className="lv-toolbar__right">
            <ColumnVisibilitySelector_1.default columns={ALL_COLUMNS} visibleKeys={visibleKeys} onToggle={toggleColumn} onReset={resetColumns}/>
          </div>
        </div>

        {loading ? (<div className="empty-state lv-loading-state">
            <div className="lv-spinner" aria-hidden="true"/>
            Loading leave requests...
          </div>) : error && records.length === 0 ? (<div className="empty-state">
            <strong>Unable to load leave requests</strong>
            <p>{error}</p>
            <button className="ghost dashboard-button" onClick={onRefresh} type="button">
              Retry
            </button>
          </div>) : records.length ? (<>
            <div className="table-scroll lv-table-scroll">
              <table className="dashboard-table lv-table" aria-label="Leave requests">
                <thead>
                  <tr>
                    <PlainTh label="Employee" visible={vis('employee')}/>
                    <PlainTh label="Leave Type" visible={vis('leave_type')}>
                      <FilterDropdown_1.default id="lv-type-filter" label="Leave Type" value={filters.leaveType} options={TYPE_FILTER_OPTIONS} onChange={function (value) { return updateFilter('leaveType', value); }} compact/>
                    </PlainTh>
                    <PlainTh label="Department" visible={vis('department')}/>
                    <PlainTh label="Dates" visible={vis('dates')}/>
                    <PlainTh label="Days" visible={vis('days')}/>
                    <PlainTh label="Manager" visible={vis('manager')}/>
                    <PlainTh label="Status" visible={vis('status')}>
                      <FilterDropdown_1.default id="lv-status-filter" label="Status" value={filters.status} options={STATUS_FILTER_OPTIONS} onChange={function (value) { return updateFilter('status', value); }} compact menuAlign="right"/>
                    </PlainTh>
                    <PlainTh label="Applied On" visible={vis('applied_at')}/>
                    <PlainTh label="Reviewed By" visible={vis('reviewed_by')}/>
                    <PlainTh label="Reviewed At" visible={vis('reviewed_at')}/>
                    <PlainTh label="Manager Remark" visible={vis('remarks')}/>
                    <PlainTh label="Employee Note" visible={vis('notes')}/>
                    <PlainTh label="Prior (90d)" visible={vis('prior_requests')}/>
                    <PlainTh label="Details" visible={vis('actions')}/>
                  </tr>
                </thead>
                <tbody>
                  {records.map(function (row) {
                var _a, _b, _c, _d, _e;
                var rowKey = "".concat((_b = (_a = row.id) !== null && _a !== void 0 ? _a : row.employee_code) !== null && _b !== void 0 ? _b : 'r', "-").concat(row.from_date || 'x');
                var isPending = (row.status || '').toLowerCase() === 'pending';
                var waiting = isPending ? waitingDays(row.applied_at) : null;
                var tier = ageTier(waiting);
                var hasPriorPattern = ((_c = row.prior_requests_90d) !== null && _c !== void 0 ? _c : 0) >= 3;
                return (<tr key={rowKey} className="lv-row">
                        {vis('employee') && (<td className="lv-td lv-td--employee">
                            <span className={"lv-age-bar lv-age-bar--".concat(tier)} aria-hidden="true" style={{ opacity: isPending ? 1 : 0.35 }}/>
                            <span className="lv-td--employee-info">
                              <strong>{row.employee_name || row.employee_code || 'Unknown'}</strong>
                              <span className="lv-sub">
                                {fmtEmployeeMeta(row.employee_code, row.department)}
                              </span>
                            </span>
                          </td>)}
                        {vis('leave_type') && (<td className="lv-td">
                            <strong className="lv-type-label">{fmtLeaveType(row)}</strong>
                            {(isPending || hasPriorPattern) && (<span className="lv-sub lv-sub--delta">
                                {isPending && waiting != null ? "".concat(waiting, "d waiting") : ''}
                                {isPending && waiting != null && hasPriorPattern ? ' / ' : ''}
                                {hasPriorPattern ? "".concat(row.prior_requests_90d, "x prior") : ''}
                              </span>)}
                          </td>)}
                        {vis('department') && (<td className="lv-td lv-td--trunc" title={row.department || ''}>{row.department || '--'}</td>)}
                        {vis('dates') && (<td className="lv-td lv-td--date">
                            <span className="lv-date-range">
                              {fmtCompactDate(row.from_date)} - {fmtCompactDate(row.to_date)}
                            </span>
                            <span className="lv-date-day">
                              {fmtDateRangeDay(row.from_date, row.to_date)}
                            </span>
                          </td>)}
                        {vis('days') && (<td className="lv-td lv-td--num">{(_d = row.leave_count) !== null && _d !== void 0 ? _d : '--'}</td>)}
                        {vis('manager') && (<td className="lv-td lv-td--trunc" title={row.manager_name || ''}>{row.manager_name || '--'}</td>)}
                        {vis('status') && (<td className="lv-td">
                            <span className={"table-pill ".concat(statusPillClass(row.status))}>{fmtStatus(row.status)}</span>
                          </td>)}
                        {vis('applied_at') && (<td className="lv-td">{row.applied_at ? formatDateTime(row.applied_at) : '--'}</td>)}
                        {vis('reviewed_by') && (<td className="lv-td lv-td--trunc">{row.reviewed_by || '--'}</td>)}
                        {vis('reviewed_at') && (<td className="lv-td">{row.reviewed_at ? formatDateTime(row.reviewed_at) : '--'}</td>)}
                        {vis('remarks') && (<td className="lv-td lv-td--trunc" title={row.remarks || ''}>{truncate(row.remarks)}</td>)}
                        {vis('notes') && (<td className="lv-td lv-td--trunc" title={row.notes || ''}>{truncate(row.notes)}</td>)}
                        {vis('prior_requests') && (<td className="lv-td lv-td--num">{(_e = row.prior_requests_90d) !== null && _e !== void 0 ? _e : 0}</td>)}
                        {vis('actions') && (<td className="lv-td lv-td--action">
                            <div className="lv-td--action-group">
                              {isPending ? (<button type="button" className="lv-action-btn lv-action-btn--alert" onClick={function () { return void handleAlert(row, rowKey); }} disabled={alertLoadingKey === rowKey}>
                                  {alertLoadingKey === rowKey ? 'Alerting...' : 'Alert manager'}
                                </button>) : null}
                              <button type="button" className="lv-action-btn" onClick={function () { return openDrawer(row); }} aria-label={"View leave request for ".concat(row.employee_name || row.employee_code || '')}>
                                View
                              </button>
                            </div>
                          </td>)}
                      </tr>);
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
                <button className="ghost lv-pagination-btn" type="button" onClick={function () { return onChangePage(pagination.page - 1); }} disabled={!pagination.has_previous || loading}>
                  <svg className="lv-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  <span>Previous</span>
                </button>
                <button className="ghost lv-pagination-btn" type="button" onClick={function () { return onChangePage(pagination.page + 1); }} disabled={!pagination.has_next || loading}>
                  <span>Next</span>
                  <svg className="lv-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
          </>) : (<div className="empty-state">
            No leave requests match the current filters.
          </div>)}
      </div>

      {/* â”€â”€â”€ Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveDrawer_1.default record={drawerRecord} open={drawerOpen} onClose={closeDrawer} onAlert={function (row) { return onAlertManager(toLeaveRowShape(row)); }} apiRequest={apiRequest} accessToken={accessToken} formatDateTime={formatDateTime} formatDate={formatDate} formatLeaveTypeLabel={fmtLeaveType}/>
    </div>);
}
