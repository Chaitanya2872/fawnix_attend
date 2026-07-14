import type { AdminApiTelemetryEntry } from '../../../../types/admin'

type Props = {
  entries: AdminApiTelemetryEntry[]
  onClear: () => void
}

function formatJson(value: unknown) {
  if (value === undefined) {
    return ''
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
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

function getStatusBadgeClass(status: AdminApiTelemetryEntry['status']) {
  if (status === 'success') {
    return 'active'
  }
  if (status === 'error') {
    return 'inactive'
  }
  return 'accent'
}

export default function AdminApiTelemetryPage({ entries, onClear }: Props) {
  return (
    <>
      <div className="dashboard-section-head attendance-section-head">
        <div>
          <p className="eyebrow">Debug</p>
          <h2>API Telemetry</h2>
          <p className="exception-head-copy">
            Live log of admin API calls made from this browser session, with sanitized request and response payloads.
          </p>
        </div>
        <button className="ghost dashboard-button" onClick={onClear} disabled={!entries.length} type="button">
          Clear
        </button>
      </div>

      <div className="table-card">
        {entries.length ? (
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
                {entries.map((entry) => (
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
            No API calls recorded yet. Telemetry will appear here once you trigger something in the admin portal.
          </div>
        )}
      </div>
    </>
  )
}
