"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminApiTelemetryPage;
var react_1 = require("react");
var AttendanceDatePicker_1 = require("../../../components/AttendanceDatePicker");
var methodOptions = [
    { value: '', label: 'All methods' },
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
];
var statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'success', label: 'Success (2xx-3xx)' },
    { value: 'error', label: 'Error (4xx-5xx)' },
];
function formatJson(value) {
    if (value === undefined || value === null) {
        return '';
    }
    try {
        return JSON.stringify(value, null, 2);
    }
    catch (_a) {
        return String(value);
    }
}
function formatDateTimeValue(value) {
    if (!value) {
        return '--';
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function formatTime(value) {
    if (!value) {
        return '--';
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function getStatusCodeBadgeClass(statusCode) {
    if (statusCode === undefined) {
        return 'accent';
    }
    if (statusCode >= 200 && statusCode < 400) {
        return 'active';
    }
    return 'inactive';
}
function getStatusBadgeClass(status) {
    if (status === 'success') {
        return 'active';
    }
    if (status === 'error') {
        return 'inactive';
    }
    return 'accent';
}
function AdminApiTelemetryPage(_a) {
    var clientEntries = _a.clientEntries, onClearClientEntries = _a.onClearClientEntries, serverError = _a.serverError, serverFilters = _a.serverFilters, serverLoading = _a.serverLoading, serverPagination = _a.serverPagination, serverRecords = _a.serverRecords, onApplyServerFilters = _a.onApplyServerFilters, onChangeServerPage = _a.onChangeServerPage, onClearServerFilters = _a.onClearServerFilters, onRefreshServerLogs = _a.onRefreshServerLogs, updateServerFilter = _a.updateServerFilter;
    var _b = (0, react_1.useState)('server'), activeTab = _b[0], setActiveTab = _b[1];
    var _c = (0, react_1.useState)(''), clientMethodFilter = _c[0], setClientMethodFilter = _c[1];
    var filteredClientEntries = clientMethodFilter
        ? clientEntries.filter(function (entry) { return entry.method.toUpperCase() === clientMethodFilter; })
        : clientEntries;
    var pageLabel = serverPagination.total_pages
        ? "Page ".concat(serverPagination.page, " of ").concat(serverPagination.total_pages)
        : 'No pages yet';
    return (<div className="admin-aligned-page admin-aligned-page--api-telemetry">
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Debug</p>
          <h2>API Telemetry</h2>
          <p className="exception-head-copy">
            Every admin API call, with sanitized request and response payloads. Server logs cover all traffic
            hitting the backend; client logs are limited to this browser session.
          </p>
        </div>
      </div>

      <div className="leave-filter-card attendance-exception-filter-card">
        <div className="leave-filter-head">
          <div className="api-telemetry-tabs">
            <button className={"ghost dashboard-button".concat(activeTab === 'server' ? ' active' : '')} type="button" onClick={function () { return setActiveTab('server'); }}>
              Server Logs
            </button>
            <button className={"ghost dashboard-button".concat(activeTab === 'client' ? ' active' : '')} type="button" onClick={function () { return setActiveTab('client'); }}>
              This Browser
            </button>
          </div>
          {activeTab === 'server' ? (<span className="leave-filter-count">
              {serverPagination.total_records} result{serverPagination.total_records === 1 ? '' : 's'}
            </span>) : (<span className="leave-filter-count">
              {filteredClientEntries.length} result{filteredClientEntries.length === 1 ? '' : 's'}
            </span>)}
        </div>

        {activeTab === 'server' ? (<form onSubmit={function (event) {
                event.preventDefault();
                onApplyServerFilters();
            }}>
            <div className="attendance-exception-filter-grid">
              <div className="attendance-filter attendance-filter-search">
                <label htmlFor="api-log-search">Path / Employee Code</label>
                <div className="attendance-input-shell attendance-search-shell">
                  <input id="api-log-search" type="search" value={serverFilters.search} onChange={function (event) { return updateServerFilter('search', event.target.value); }} placeholder="Search by endpoint path or emp_code"/>
                </div>
              </div>

              <label className="attendance-filter attendance-filter-compact">
                <span>Method</span>
                <select value={serverFilters.method} onChange={function (event) { return updateServerFilter('method', event.target.value); }}>
                  {methodOptions.map(function (option) { return (<option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>); })}
                </select>
              </label>

              <label className="attendance-filter attendance-filter-compact">
                <span>Status</span>
                <select value={serverFilters.status} onChange={function (event) { return updateServerFilter('status', event.target.value); }}>
                  {statusOptions.map(function (option) { return (<option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>); })}
                </select>
              </label>

              <AttendanceDatePicker_1.default id="api-log-from-date" label="From Date" value={serverFilters.fromDate} onChange={function (value) { return updateServerFilter('fromDate', value); }}/>

              <AttendanceDatePicker_1.default id="api-log-to-date" label="To Date" value={serverFilters.toDate} onChange={function (value) { return updateServerFilter('toDate', value); }}/>
            </div>

            <div className="leave-filter-actions">
              {serverError ? <span className="leave-filter-status">{serverError}</span> : <span />}
              <button className="ghost dashboard-button" type="button" onClick={onRefreshServerLogs} disabled={serverLoading}>
                {serverLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="ghost" type="button" onClick={onClearServerFilters} disabled={serverLoading}>
                Clear Filters
              </button>
              <button className="cta" type="submit" disabled={serverLoading}>
                {serverLoading ? 'Applying...' : 'Apply Filters'}
              </button>
            </div>
          </form>) : (<div className="leave-filter-actions">
            <label className="attendance-filter attendance-filter-compact">
              <span>Method</span>
              <select value={clientMethodFilter} onChange={function (event) { return setClientMethodFilter(event.target.value); }}>
                {methodOptions.map(function (option) { return (<option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>); })}
              </select>
            </label>
            <span />
            <button className="ghost dashboard-button" type="button" onClick={onClearClientEntries} disabled={!clientEntries.length}>
              Clear
            </button>
          </div>)}
      </div>

      <div className="table-card">
        {activeTab === 'server' ? (serverLoading ? (<div className="empty-state">Loading API logs...</div>) : serverError ? (<div className="empty-state">
              <strong>Unable to load API logs</strong>
              <p>{serverError}</p>
              <button className="ghost dashboard-button" onClick={onRefreshServerLogs} type="button">
                Retry
              </button>
            </div>) : serverRecords.length ? (<>
              <div className="table-scroll">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Emp Code</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverRecords.map(function (record) {
                var _a;
                return (<tr key={record.id}>
                        <td>{formatDateTimeValue(record.created_at)}</td>
                        <td>
                          <span className="table-pill accent">{record.method}</span>
                        </td>
                        <td>{record.path}</td>
                        <td>{record.emp_code || '--'}</td>
                        <td>
                          <span className={"table-pill ".concat(getStatusCodeBadgeClass(record.status_code))}>
                            {(_a = record.status_code) !== null && _a !== void 0 ? _a : '--'}
                          </span>
                        </td>
                        <td>{record.duration_ms !== undefined && record.duration_ms !== null ? "".concat(record.duration_ms, "ms") : '--'}</td>
                        <td>
                          <details className="telemetry-chat-json">
                            <summary>Request payload</summary>
                            <pre>{formatJson(record.request_payload) || 'No request payload'}</pre>
                          </details>
                          <details className="telemetry-chat-json">
                            <summary>Response payload</summary>
                            <pre>{formatJson(record.response_payload) || 'No response payload'}</pre>
                          </details>
                        </td>
                      </tr>);
            })}
                  </tbody>
                </table>
              </div>

              <div className="attendance-exception-pagination">
                <div className="attendance-exception-pagination-copy">
                  <strong>{pageLabel}</strong>
                  <span>
                    Showing {serverRecords.length} of {serverPagination.total_records} records
                  </span>
                </div>
                <div className="attendance-exception-pagination-actions">
                  <button className="ghost dashboard-button" type="button" onClick={function () { return onChangeServerPage(serverPagination.page - 1); }} disabled={!serverPagination.has_previous}>
                    Previous
                  </button>
                  <button className="ghost dashboard-button" type="button" onClick={function () { return onChangeServerPage(serverPagination.page + 1); }} disabled={!serverPagination.has_next}>
                    Next
                  </button>
                </div>
              </div>
            </>) : (<div className="empty-state">
              No API calls match the current filters.
            </div>)) : filteredClientEntries.length ? (<div className="table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>HTTP</th>
                  <th>Duration</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientEntries.map(function (entry) {
                var _a;
                return (<tr key={entry.id}>
                    <td>{formatTime(entry.startedAt)}</td>
                    <td>
                      <strong>
                        {entry.method} {entry.path}
                      </strong>
                      <span className="table-meta">{entry.summary}</span>
                    </td>
                    <td>
                      <span className={"table-pill ".concat(getStatusBadgeClass(entry.status))}>{entry.status}</span>
                    </td>
                    <td>{(_a = entry.httpStatus) !== null && _a !== void 0 ? _a : '--'}</td>
                    <td>{entry.durationMs !== undefined ? "".concat(entry.durationMs, "ms") : 'Pending'}</td>
                    <td>
                      <details className="telemetry-chat-json">
                        <summary>Request payload</summary>
                        <pre>{formatJson(entry.requestPayload) || 'No request payload'}</pre>
                      </details>
                      <details className="telemetry-chat-json">
                        <summary>Response payload</summary>
                        <pre>{formatJson(entry.responsePayload) || 'No response payload yet'}</pre>
                      </details>
                    </td>
                  </tr>);
            })}
              </tbody>
            </table>
          </div>) : (<div className="empty-state">
            No API calls recorded yet in this browser session. Telemetry will appear here once you trigger
            something in the admin portal.
          </div>)}
      </div>
    </div>);
}
