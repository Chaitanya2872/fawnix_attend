import { useState } from 'react'
import AttendanceDatePicker from '../../../../components/AttendanceDatePicker'
import type {
  AdminApiLogFilterState,
  AdminApiLogPagination,
  AdminApiLogRecord,
  AdminApiTelemetryEntry
} from '../../../../types/admin'

type Props = {
  clientEntries: AdminApiTelemetryEntry[]
  onClearClientEntries: () => void
  serverError: string
  serverFilters: AdminApiLogFilterState
  serverLoading: boolean
  serverPagination: AdminApiLogPagination
  serverRecords: AdminApiLogRecord[]
  onApplyServerFilters: () => void
  onChangeServerPage: (page: number) => void
  onClearServerFilters: () => void
  onRefreshServerLogs: () => void
  updateServerFilter: <K extends keyof AdminApiLogFilterState>(key: K, value: AdminApiLogFilterState[K]) => void
}

const methodOptions = [
  { value: '', label: 'All methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'success', label: 'Success (2xx-3xx)' },
  { value: 'error', label: 'Error (4xx-5xx)' },
]

function formatJson(value: unknown) {
  if (value === undefined || value === null) {
    return ''
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatDateTimeValue(value?: string) {
  if (!value) {
    return '--'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatTime(value?: string) {
  if (!value) {
    return '--'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getStatusCodeBadgeClass(statusCode?: number) {
  if (statusCode === undefined) {
    return 'accent'
  }
  if (statusCode >= 200 && statusCode < 400) {
    return 'active'
  }
  return 'inactive'
}

function getStatusBadgeClass(status: AdminApiTelemetryEntry['status']) {
  if (status === 'success') {
    return 'active'
  }
  if (status === 'error') {
    return 'inactive'
  }
  return 'accent'
}

export default function AdminApiTelemetryPage({
  clientEntries,
  onClearClientEntries,
  serverError,
  serverFilters,
  serverLoading,
  serverPagination,
  serverRecords,
  onApplyServerFilters,
  onChangeServerPage,
  onClearServerFilters,
  onRefreshServerLogs,
  updateServerFilter
}: Props) {
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server')
  const [clientMethodFilter, setClientMethodFilter] = useState('')

  const filteredClientEntries = clientMethodFilter
    ? clientEntries.filter((entry) => entry.method.toUpperCase() === clientMethodFilter)
    : clientEntries

  const pageLabel = serverPagination.total_pages
    ? `Page ${serverPagination.page} of ${serverPagination.total_pages}`
    : 'No pages yet'

  return (
    <>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`ghost dashboard-button${activeTab === 'server' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveTab('server')}
            >
              Server Logs
            </button>
            <button
              className={`ghost dashboard-button${activeTab === 'client' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveTab('client')}
            >
              This Browser
            </button>
          </div>
          {activeTab === 'server' ? (
            <span className="leave-filter-count">
              {serverPagination.total_records} result{serverPagination.total_records === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="leave-filter-count">
              {filteredClientEntries.length} result{filteredClientEntries.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {activeTab === 'server' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onApplyServerFilters()
            }}
          >
            <div className="attendance-exception-filter-grid">
              <div className="attendance-filter attendance-filter-search">
                <label htmlFor="api-log-search">Path / Employee Code</label>
                <div className="attendance-input-shell attendance-search-shell">
                  <input
                    id="api-log-search"
                    type="search"
                    value={serverFilters.search}
                    onChange={(event) => updateServerFilter('search', event.target.value)}
                    placeholder="Search by endpoint path or emp_code"
                  />
                </div>
              </div>

              <label className="attendance-filter attendance-filter-compact">
                <span>Method</span>
                <select
                  value={serverFilters.method}
                  onChange={(event) => updateServerFilter('method', event.target.value)}
                >
                  {methodOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="attendance-filter attendance-filter-compact">
                <span>Status</span>
                <select
                  value={serverFilters.status}
                  onChange={(event) => updateServerFilter('status', event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <AttendanceDatePicker
                id="api-log-from-date"
                label="From Date"
                value={serverFilters.fromDate}
                onChange={(value) => updateServerFilter('fromDate', value)}
              />

              <AttendanceDatePicker
                id="api-log-to-date"
                label="To Date"
                value={serverFilters.toDate}
                onChange={(value) => updateServerFilter('toDate', value)}
              />
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
          </form>
        ) : (
          <div className="leave-filter-actions">
            <label className="attendance-filter attendance-filter-compact">
              <span>Method</span>
              <select value={clientMethodFilter} onChange={(event) => setClientMethodFilter(event.target.value)}>
                {methodOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <span />
            <button
              className="ghost dashboard-button"
              type="button"
              onClick={onClearClientEntries}
              disabled={!clientEntries.length}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="table-card">
        {activeTab === 'server' ? (
          serverLoading ? (
            <div className="empty-state">Loading API logs...</div>
          ) : serverError ? (
            <div className="empty-state">
              <strong>Unable to load API logs</strong>
              <p>{serverError}</p>
              <button className="ghost dashboard-button" onClick={onRefreshServerLogs} type="button">
                Retry
              </button>
            </div>
          ) : serverRecords.length ? (
            <>
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
                    {serverRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDateTimeValue(record.created_at)}</td>
                        <td>
                          <span className="table-pill accent">{record.method}</span>
                        </td>
                        <td>{record.path}</td>
                        <td>{record.emp_code || '--'}</td>
                        <td>
                          <span className={`table-pill ${getStatusCodeBadgeClass(record.status_code)}`}>
                            {record.status_code ?? '--'}
                          </span>
                        </td>
                        <td>{record.duration_ms !== undefined && record.duration_ms !== null ? `${record.duration_ms}ms` : '--'}</td>
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
                      </tr>
                    ))}
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
                  <button
                    className="ghost dashboard-button"
                    type="button"
                    onClick={() => onChangeServerPage(serverPagination.page - 1)}
                    disabled={!serverPagination.has_previous}
                  >
                    Previous
                  </button>
                  <button
                    className="ghost dashboard-button"
                    type="button"
                    onClick={() => onChangeServerPage(serverPagination.page + 1)}
                    disabled={!serverPagination.has_next}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              No API calls match the current filters.
            </div>
          )
        ) : filteredClientEntries.length ? (
          <div className="table-scroll">
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
                {filteredClientEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatTime(entry.startedAt)}</td>
                    <td>
                      <strong>
                        {entry.method} {entry.path}
                      </strong>
                      <span className="table-meta">{entry.summary}</span>
                    </td>
                    <td>
                      <span className={`table-pill ${getStatusBadgeClass(entry.status)}`}>{entry.status}</span>
                    </td>
                    <td>{entry.httpStatus ?? '--'}</td>
                    <td>{entry.durationMs !== undefined ? `${entry.durationMs}ms` : 'Pending'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No API calls recorded yet in this browser session. Telemetry will appear here once you trigger
            something in the admin portal.
          </div>
        )}
      </div>
    </>
  )
}
