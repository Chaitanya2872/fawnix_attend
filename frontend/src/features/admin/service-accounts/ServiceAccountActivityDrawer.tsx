import { useRef } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import '../employees/EmployeeFormDrawer.css'
import type { ServiceAccount, ServiceAccountAuditEvent } from './types'
import { formatServiceAccountDate } from './format'

type ServiceAccountActivityDrawerProps = {
  account: ServiceAccount
  events: ServiceAccountAuditEvent[]
  loading: boolean
  error: string
  onClose: () => void
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Details updated',
  permissions_changed: 'Access changed',
  key_regenerated: 'Key regenerated',
  revoked: 'Revoked',
  auth_failed: 'Authentication failed',
  access_denied: 'Request denied',
}

const WARNING_EVENTS = new Set(['auth_failed', 'access_denied', 'revoked'])

function describeEvent(event: ServiceAccountAuditEvent) {
  const details = event.details || {}
  switch (event.event) {
    case 'permissions_changed': {
      const after = (details.after || {}) as Record<string, boolean>
      const granted = ['read', 'write', 'update'].filter((flag) => after[flag])
      return `Now: ${granted.join(', ') || 'none'}`
    }
    case 'access_denied':
      return `${details.method || ''} ${details.path || ''} — ${details.reason || ''}`.trim()
    case 'auth_failed':
      return `Reason: ${String(details.reason || 'unknown').replace(/_/g, ' ')}`
    case 'revoked':
      return details.reason ? `Reason: ${details.reason}` : ''
    case 'key_regenerated':
      return details.new_key_id ? `New key fxsa_${details.new_key_id}_…` : ''
    case 'updated': {
      const changes = Object.keys((details.changes || {}) as Record<string, unknown>)
      return changes.length ? `Changed: ${changes.join(', ')}` : ''
    }
    default:
      return ''
  }
}

export default function ServiceAccountActivityDrawer({
  account,
  events,
  loading,
  error,
  onClose,
}: ServiceAccountActivityDrawerProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  useDialogFocus({ containerRef, open: true, onClose })

  return (
    <>
      <button className="side-panel-scrim" type="button" aria-label="Close activity panel" onClick={onClose} />
      <aside className="emp-form-panel" aria-label={`Activity for ${account.name}`} ref={containerRef}>
        <button className="emp-form-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>
        <div className="emp-form-header">
          <h3>Activity</h3>
          <p>
            Management and security events for <strong>{account.name}</strong>. API requests made with this key
            appear in the API logs as <code>SA:{account.key_id || '…'}</code>.
          </p>
        </div>
        <div className="emp-form-body">
          {loading ? <p className="form-note">Loading activity…</p> : null}
          {error ? <p className="form-note" role="alert">{error}</p> : null}
          {!loading && !error && events.length === 0 ? <p className="form-note">No activity yet.</p> : null}
          <ol className="sa-activity-list">
            {events.map((event) => (
              <li
                key={event.id}
                className={`sa-activity-item${WARNING_EVENTS.has(event.event) ? ' sa-activity-item--warning' : ''}`}
              >
                <div className="sa-activity-head">
                  <strong>{EVENT_LABELS[event.event] || event.event}</strong>
                  <time dateTime={event.created_at}>{formatServiceAccountDate(event.created_at)}</time>
                </div>
                {describeEvent(event) ? <p>{describeEvent(event)}</p> : null}
                <span className="sa-activity-meta">
                  {event.actor ? `by ${event.actor}` : ''}
                  {event.ip_address ? ` · ${event.ip_address}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </>
  )
}
