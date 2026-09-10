"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LeaveFilterBar;
var react_1 = require("react");
var AttendanceDatePicker_1 = require("../../../../components/AttendanceDatePicker");
var RANGE_PRESETS = ['All time', 'This week', 'Last 7 days', 'Last 30 days', 'This month', 'Custom range'];
var SORT_OPTIONS = [
    { label: 'Newest first', sortBy: 'applied_at', sortOrder: 'desc' },
    { label: 'Oldest first', sortBy: 'applied_at', sortOrder: 'asc' },
    { label: 'Most days', sortBy: 'leave_count', sortOrder: 'desc' },
    { label: 'Employee A–Z', sortBy: 'employee_name', sortOrder: 'asc' },
];
function toDateInputValue(d) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
}
function presetRange(preset) {
    var today = new Date();
    var to = toDateInputValue(today);
    if (preset === 'All time')
        return { from: '', to: '' };
    if (preset === 'Last 7 days') {
        var from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { from: toDateInputValue(from), to: to };
    }
    if (preset === 'Last 30 days') {
        var from = new Date(today);
        from.setDate(from.getDate() - 29);
        return { from: toDateInputValue(from), to: to };
    }
    if (preset === 'This week') {
        var from = new Date(today);
        var dayOfWeek = (from.getDay() + 6) % 7; // Monday-start week
        from.setDate(from.getDate() - dayOfWeek);
        return { from: toDateInputValue(from), to: to };
    }
    if (preset === 'This month') {
        var from = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: toDateInputValue(from), to: to };
    }
    return null;
}
function LeaveFilterBar(_a) {
    var filters = _a.filters, departmentOptions = _a.departmentOptions, managerOptions = _a.managerOptions, loading = _a.loading, onClear = _a.onClear, updateFilter = _a.updateFilter, onSort = _a.onSort;
    var _b = (0, react_1.useState)(filters.fromDate || filters.toDate ? 'Custom range' : 'All time'), rangePreset = _b[0], setRangePreset = _b[1];
    var isCustomRange = rangePreset === 'Custom range';
    var handleRangeChange = function (value) {
        var preset = value;
        setRangePreset(preset);
        var range = presetRange(preset);
        if (range) {
            updateFilter('fromDate', range.from);
            updateFilter('toDate', range.to);
        }
    };
    var activeSortLabel = (0, react_1.useMemo)(function () {
        var match = SORT_OPTIONS.find(function (o) { return o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder; });
        return match ? match.label : SORT_OPTIONS[0].label;
    }, [filters.sortBy, filters.sortOrder]);
    var handleSortChange = function (label) {
        var match = SORT_OPTIONS.find(function (o) { return o.label === label; }) || SORT_OPTIONS[0];
        onSort(match.sortBy, match.sortOrder);
    };
    var isFiltered = (0, react_1.useMemo)(function () {
        return Boolean(filters.search.trim() ||
            filters.department.trim() ||
            filters.manager.trim() ||
            filters.leaveType ||
            filters.status ||
            filters.fromDate ||
            filters.toDate);
    }, [filters]);
    var handleClear = function () {
        setRangePreset('All time');
        onClear();
    };
    return (<div className="lv-filter-bar" aria-label="Leave request filters">
      <div className="lv-filter-grid">
        <div className="attendance-filter attendance-filter-search lv-filter-search">
          <label htmlFor="lv-search">Search</label>
          <div className="attendance-input-shell attendance-search-shell">
            <input id="lv-search" type="search" value={filters.search} onChange={function (event) { return updateFilter('search', event.target.value); }} placeholder="Search employee, code or manager"/>
          </div>
        </div>

        <label className="attendance-filter attendance-filter-compact">
          <span>Department</span>
          <select value={filters.department} onChange={function (event) { return updateFilter('department', event.target.value); }} disabled={loading}>
            <option value="">All departments</option>
            {departmentOptions.map(function (dept) { return (<option key={dept} value={dept}>{dept}</option>); })}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Manager</span>
          <select value={filters.manager} onChange={function (event) { return updateFilter('manager', event.target.value); }} disabled={loading}>
            <option value="">All managers</option>
            {managerOptions.map(function (manager) { return (<option key={manager.code} value={manager.code}>{manager.name}</option>); })}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Date Range</span>
          <select value={rangePreset} onChange={function (event) { return handleRangeChange(event.target.value); }} disabled={loading}>
            {RANGE_PRESETS.map(function (preset) { return (<option key={preset} value={preset}>{preset}</option>); })}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Sort</span>
          <select value={activeSortLabel} onChange={function (event) { return handleSortChange(event.target.value); }} disabled={loading}>
            {SORT_OPTIONS.map(function (option) { return (<option key={option.label} value={option.label}>{option.label}</option>); })}
          </select>
        </label>

        {isCustomRange && (<>
            <AttendanceDatePicker_1.default id="lv-from" label="From Date" value={filters.fromDate} onChange={function (value) { return updateFilter('fromDate', value); }}/>
            <AttendanceDatePicker_1.default id="lv-to" label="To Date" value={filters.toDate} onChange={function (value) { return updateFilter('toDate', value); }}/>
          </>)}

        {isFiltered && (<button type="button" className="lv-filter-clear-link" onClick={handleClear} disabled={loading}>
            Clear all
          </button>)}
      </div>
    </div>);
}
