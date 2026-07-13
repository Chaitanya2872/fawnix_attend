import type { AdminApiTelemetryEntry } from '../../../types/admin'

type Props = {
  entries: AdminApiTelemetryEntry[]
  isOpen: boolean
  onClear: () => void
  onToggle: () => void
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

function getStatusTone(status: AdminApiTelemetryEntry['status']) {
  if (status === 'success') {
    return 'success'
  }
  if (status === 'error') {
    return 'error'
  }
  return 'pending'
}

export default function AdminApiTelemetryPanel({
  entries,
  isOpen,
  onClear,
  onToggle
}: Props) {
  return (
    <div className={`telemetry-chat${isOpen ? ' open' : ''}`}>
      <button
        className={`telemetry-chat-trigger${isOpen ? ' open' : ''}`}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="telemetry-chat-panel"
      >
        <span className="telemetry-chat-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M8 10h8M8 14h5m-7 6 2.2-3H18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="telemetry-chat-trigger-copy">
          <strong>API Assistant</strong>
          <small>{entries.length} recent calls</small>
        </span>
      </button>

      {isOpen ? (
        <section id="telemetry-chat-panel" className="telemetry-chat-panel" aria-label="API telemetry assistant">
          <div className="telemetry-chat-head">
            <div>
              <p className="eyebrow">Debug Assistant</p>
              <h3>API Telemetry</h3>
              <span>I’ll explain which API the frontend called and which safe payload went with it.</span>
            </div>
            <div className="telemetry-chat-actions">
              <button className="ghost dashboard-button" type="button" onClick={onClear} disabled={!entries.length}>
                Clear
              </button>
              <button className="ghost dashboard-button" type="button" onClick={onToggle}>
                Close
              </button>
            </div>
          </div>

          <div className="telemetry-chat-list">
            {entries.length ? (
              entries.map((entry) => (
                <article key={entry.id} className="telemetry-chat-thread">
                  <div className="telemetry-chat-bubble user">
                    <span className="telemetry-chat-speaker">You</span>
                    <p>What API just ran for this action?</p>
                  </div>

                  <div className={`telemetry-chat-bubble assistant ${getStatusTone(entry.status)}`}>
                    <div className="telemetry-chat-bubble-head">
                      <span className="telemetry-chat-speaker">Fawnix API Assistant</span>
                      <span className={`table-pill ${entry.status === 'success' ? 'active' : entry.status === 'error' ? 'inactive' : 'accent'}`}>
                        {entry.status}
                      </span>
                    </div>
                    <strong>{entry.summary}</strong>
                    <p>{entry.detail}</p>
                    <div className="telemetry-chat-meta">
                      <span>{formatTime(entry.startedAt)}</span>
                      <span>{entry.httpStatus ? `HTTP ${entry.httpStatus}` : 'Waiting...'}</span>
                      <span>{entry.durationMs !== undefined ? `${entry.durationMs}ms` : 'Pending'}</span>
                    </div>
                    <details className="telemetry-chat-json">
                      <summary>Request payload</summary>
                      <pre>{formatJson(entry.requestPayload) || 'No request payload'}</pre>
                    </details>
                    <details className="telemetry-chat-json">
                      <summary>Response payload</summary>
                      <pre>{formatJson(entry.responsePayload) || 'No response payload yet'}</pre>
                    </details>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                I’ll start narrating API calls here once you trigger something in the admin portal.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
