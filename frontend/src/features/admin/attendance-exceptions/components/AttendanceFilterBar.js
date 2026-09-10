"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceFilterBar;
var react_1 = require("react");
var RANGE_PRESETS = ['All time', 'Last 30 days', 'This week', 'Last 7 days', 'This month', 'Custom range'];
var SORT_OPTIONS = [
    { label: 'Newest first', sortBy: 'attendance_date', sortOrder: 'desc' },
    { label: 'Oldest first', sortBy: 'attendance_date', sortOrder: 'asc' },
    { label: 'Highest severity', sortBy: 'severity', sortOrder: 'desc' },
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
function AttendanceFilterBar(_a) {
    var filters = _a.filters, departmentOptions = _a.departmentOptions, loading = _a.loading, onClear = _a.onClear, updateFilter = _a.updateFilter, onSort = _a.onSort;
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
            filters.exceptionType ||
            filters.status ||
            filters.fromDate ||
            filters.toDate);
    }, [filters]);
    var handleClear = function () {
        setRangePreset('All time');
        onClear();
    };
    return (<div className="exc-filter-bar" role="search" aria-label="Attendance exception filters">
      <input id="exc-search" className="exc-filter-search" type="search" value={filters.search} onChange={function (event) { return updateFilter('search', event.target.value); }} placeholder="Search name, code or reason" aria-label="Search name, code or reason"/>

      <select className="exc-filter-select" value={filters.department} onChange={function (event) { return updateFilter('department', event.target.value); }} disabled={loading} aria-label="Department">
        <option value="">All departments</option>
        {departmentOptions.map(function (dept) { return (<option key={dept} value={dept}>{dept}</option>); })}
      </select>

      <select className="exc-filter-select" value={rangePreset} onChange={function (event) { return handleRangeChange(event.target.value); }} disabled={loading} aria-label="Date range">
        {RANGE_PRESETS.map(function (preset) { return (<option key={preset} value={preset}>{preset}</option>); })}
      </select>

      {isCustomRange && (<div className="exc-daterange">
          <span>From</span>
          <input id="exc-from" type="date" value={filters.fromDate} onChange={function (event) { return updateFilter('fromDate', event.target.value); }} aria-label="From date"/>
          <span className="exc-daterange__sep" aria-hidden="true"/>
          <span>To</span>
          <input id="exc-to" type="date" value={filters.toDate} onChange={function (event) { return updateFilter('toDate', event.target.value); }} aria-label="To date"/>
        </div>)}

      <select className="exc-filter-select" value={activeSortLabel} onChange={function (event) { return handleSortChange(event.target.value); }} disabled={loading} aria-label="Sort">
        {SORT_OPTIONS.map(function (option) { return (<option key={option.label} value={option.label}>{option.label}</option>); })}
      </select>

      {isFiltered && (<button type="button" className="exc-filter-clear-link" onClick={handleClear} disabled={loading}>
          Clear all
        </button>)}
    </div>);
}
