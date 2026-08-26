/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { ClientPagination } from './ClientPagination'

type Props = { logs: Record<string, any>[] }

function describe(log: Record<string, any>) {
  const operation = String(log.operation || 'UPDATE').toLowerCase()
  const fields = Array.isArray(log.changed_fields) ? log.changed_fields : []
  if (operation !== 'update') return `${operation} on record ${log.record_id || '—'}`
  const details = fields.slice(0, 2).map((field: string) => {
    const label = field.replace(/^emp_/, '').replaceAll('_', ' ')
    return `${label}: ${log.old_data?.[field] ?? '—'} → ${log.new_data?.[field] ?? '—'}`
  })
  return details.join(' · ') || `Updated record ${log.record_id || '—'}`
}

export function EmployeeAuditPanel({ logs }: Props) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const visibleLogs = logs.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  return (
    <div className="ov2-card ov2-approvals-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Recent Database Updates</div>
          <div className="ov2-card-sub">Inserts, updates and deletes across all tables</div>
        </div>
      </div>
      <div className="ov2-approvals-list">
        {visibleLogs.map((log) => {
          const name = String(log.table_name || 'Database').replaceAll('_', ' ')
          return (
            <div key={log.id} className="ov2-approval-row">
              <div className="ov2-approval-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-approval-copy">
                <strong>{name}</strong>
                <span>{describe(log)}</span>
                <small className="ov2-approval-date">
                <span>{log.changed_by || 'System'}</span>
                  <span>{log.changed_at ? new Date(log.changed_at).toLocaleString('en-IN') : ''}</span>
                </small>
              </div>
            </div>
          )
        })}
        {logs.length === 0 && <div className="ov2-empty">No database updates recorded yet.</div>}
      </div>
      <ClientPagination page={visiblePage} pageSize={pageSize} total={logs.length} onPageChange={setPage} />
    </div>
  )
}
