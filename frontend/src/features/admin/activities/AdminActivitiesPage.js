"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminActivitiesPage;
var react_1 = require("react");
require("./AdminActivitiesPage.css");
var ALL_FILTER_VALUE = 'all';
function normalizeFilterValue(value) {
    return (value || '').trim();
}
function getFilterKey(value) {
    return normalizeFilterValue(value).toLowerCase();
}
function formatActivityText(value) {
    var rawValue = normalizeFilterValue(value);
    if (!rawValue) {
        return 'Unknown';
    }
    return rawValue
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function buildActivityOptions(rows, getValue) {
    var optionsByKey = new Map();
    rows.forEach(function (row) {
        var value = normalizeFilterValue(getValue(row));
        if (!value) {
            return;
        }
        var key = getFilterKey(value);
        if (!optionsByKey.has(key)) {
            optionsByKey.set(key, {
                label: formatActivityText(value),
                value: value
            });
        }
    });
    return Array.from(optionsByKey.values()).sort(function (left, right) {
        return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
    });
}
function getActivitySearchText(row, formatDateTime) {
    return [
        row.employee_name,
        row.employee_email,
        row.activity_type,
        row.status,
        row.start_time,
        formatDateTime(row.start_time)
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}
function getActivityStatusPillClass(status) {
    var normalizedStatus = getFilterKey(status);
    if (normalizedStatus.includes('complete') || normalizedStatus.includes('approved') || normalizedStatus === 'done') {
        return 'table-pill success';
    }
    if (normalizedStatus.includes('pending') || normalizedStatus.includes('progress') || normalizedStatus.includes('open')) {
        return 'table-pill warning';
    }
    if (normalizedStatus.includes('reject') || normalizedStatus.includes('cancel') || normalizedStatus.includes('fail')) {
        return 'table-pill danger';
    }
    return 'table-pill accent';
}
function AdminActivitiesPage(_a) {
    var filteredActivities = _a.filteredActivities, formatDateTime = _a.formatDateTime, loadDashboard = _a.loadDashboard, setShowTodayActivities = _a.setShowTodayActivities, showTodayActivities = _a.showTodayActivities;
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(ALL_FILTER_VALUE), activityTypeFilter = _c[0], setActivityTypeFilter = _c[1];
    var _d = (0, react_1.useState)(ALL_FILTER_VALUE), activityStatusFilter = _d[0], setActivityStatusFilter = _d[1];
    var normalizedSearch = searchQuery.trim().toLowerCase();
    var activityTypeOptions = (0, react_1.useMemo)(function () { return buildActivityOptions(filteredActivities, function (row) { return row.activity_type; }); }, [filteredActivities]);
    var activityStatusOptions = (0, react_1.useMemo)(function () { return buildActivityOptions(filteredActivities, function (row) { return row.status; }); }, [filteredActivities]);
    var visibleActivities = (0, react_1.useMemo)(function () {
        return filteredActivities.filter(function (row) {
            var matchesSearch = !normalizedSearch || getActivitySearchText(row, formatDateTime).includes(normalizedSearch);
            var matchesType = activityTypeFilter === ALL_FILTER_VALUE || getFilterKey(row.activity_type) === getFilterKey(activityTypeFilter);
            var matchesStatus = activityStatusFilter === ALL_FILTER_VALUE || getFilterKey(row.status) === getFilterKey(activityStatusFilter);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [activityStatusFilter, activityTypeFilter, filteredActivities, formatDateTime, normalizedSearch]);
    var filtersActive = Boolean(normalizedSearch) ||
        activityTypeFilter !== ALL_FILTER_VALUE ||
        activityStatusFilter !== ALL_FILTER_VALUE;
    var clearActivityFilters = function () {
        setSearchQuery('');
        setActivityTypeFilter(ALL_FILTER_VALUE);
        setActivityStatusFilter(ALL_FILTER_VALUE);
    };
    var toggleActivityDateScope = function () {
        clearActivityFilters();
        setShowTodayActivities(function (current) { return !current; });
    };
    return (<div className="admin-aligned-page admin-aligned-page--activities">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Live Work</p>
          <h2>Activities</h2>
        </div>
        <div className="employee-actions">
          <button className="ghost dashboard-button" onClick={toggleActivityDateScope} type="button">
            {showTodayActivities ? 'Show All' : 'Show Today'}
          </button>
          <button className="ghost dashboard-button" onClick={function () { return void loadDashboard(); }} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="leave-filter-card activity-filter-card">
        <div className="leave-filter-head">
          <div>
            <strong>Filter Activity Records</strong>
            <span>Search the current activity view by employee, email, activity, status, or start time.</span>
          </div>
          <div className="activity-filter-meta">
            <span className="leave-filter-count">
              {visibleActivities.length} of {filteredActivities.length} shown
            </span>
            {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
          </div>
        </div>

        <div className="activity-filter-grid">
          <label className="leave-filter-field activity-filter-search">
            <span>Search</span>
            <input aria-label="Search activities" type="search" value={searchQuery} onChange={function (event) { return setSearchQuery(event.target.value); }} placeholder="Employee, email, status, start time..."/>
          </label>

          <label className="leave-filter-field">
            <span>Activity Type</span>
            <select aria-label="Filter activity type" value={activityTypeFilter} onChange={function (event) { return setActivityTypeFilter(event.target.value); }}>
              <option value={ALL_FILTER_VALUE}>All types</option>
              {activityTypeOptions.map(function (option) { return (<option key={option.value} value={option.value}>
                  {option.label}
                </option>); })}
            </select>
          </label>

          <label className="leave-filter-field">
            <span>Status</span>
            <select aria-label="Filter activity status" value={activityStatusFilter} onChange={function (event) { return setActivityStatusFilter(event.target.value); }}>
              <option value={ALL_FILTER_VALUE}>All statuses</option>
              {activityStatusOptions.map(function (option) { return (<option key={option.value} value={option.value}>
                  {option.label}
                </option>); })}
            </select>
          </label>
        </div>

        <div className="leave-filter-actions activity-filter-actions">
          <span className="leave-filter-status">
            {filtersActive ? 'Client-side filters are active for this view.' : 'Showing the current activity view.'}
          </span>
          <button className="ghost dashboard-button" type="button" onClick={clearActivityFilters} disabled={!filtersActive}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="activity-table-head">
          <div>
            <strong>Activity Log</strong>
            <span>
              {visibleActivities.length} record{visibleActivities.length === 1 ? '' : 's'} in{' '}
              {showTodayActivities ? "today's view" : 'all activity records'}
            </span>
          </div>
          {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
        </div>

        {visibleActivities.length ? (<div className="table-scroll">
            <table className="dashboard-table activity-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Activity</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleActivities.map(function (row, index) { return (<tr key={"".concat(row.id || row.employee_email || index)}>
                    <td>
                      <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                      <span className="table-meta">{row.employee_email || 'Email unavailable'}</span>
                    </td>
                    <td>{formatActivityText(row.activity_type || 'Activity')}</td>
                    <td>{formatDateTime(row.start_time)}</td>
                    <td>
                      <span className={getActivityStatusPillClass(row.status)}>{formatActivityText(row.status)}</span>
                    </td>
                  </tr>); })}
              </tbody>
            </table>
          </div>) : (<div className="empty-state">
            {filtersActive
                ? 'No activities match the current filters.'
                : showTodayActivities
                    ? 'No activities found for today.'
                    : 'No activities found.'}
          </div>)}
      </div>
    </div>);
}
