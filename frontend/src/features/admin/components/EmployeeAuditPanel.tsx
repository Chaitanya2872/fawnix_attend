/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { ClientPagination } from './ClientPagination'

type Props = { logs: Record<string, any>[] }

const EXCLUDED_TABLES = new Set(['api_logs'])

const OPERATION_LABELS: Record<string, string> = {
  insert: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatTableName(value: unknown) {
  const label = String(value || 'Database').replaceAll('_', ' ').trim()
  return toTitleCase(label)
}

function formatValue(value: unknown) {
  if (value == null || value === '') {
    return '-'
  }

  return String(value)
}

function getOperationLabel(value: unknown) {
  const operation = String(value || 'update').trim().toLowerCase()
  return OPERATION_LABELS[operation] || toTitleCase(operation)
}

function describe(log: Record<string, any>) {
  if (log.summary) {
    return String(log.summary)
  }

  const operation = String(log.operation || 'update').trim().toLowerCase()
  const fields = Array.isArray(log.changed_fields) ? log.changed_fields : []
  const recordLabel = `record ${formatValue(log.record_id)}`

  if (operation !== 'update') {
    return `${getOperationLabel(operation)} ${recordLabel}`
  }

  const details = fields.slice(0, 2).map((field: string) => {
    const label = field.replace(/^emp_/, '').replaceAll('_', ' ')
    return `${label}: ${formatValue(log.old_data?.[field])} -> ${formatValue(log.new_data?.[field])}`
  })

  return details.join(' | ') || `Updated ${recordLabel}`
}

function getActivityTitle(log: Record<string, any>) {
  if (log.action) {
    return String(log.action)
  }

  const name = formatTableName(log.table_name)
  const operation = getOperationLabel(log.operation)
  return `${operation} ${name}`
}

function getAffectedRecord(log: Record<string, any>) {
  const module = String(log.module || formatTableName(log.table_name))
  const record = String(log.record_label || formatValue(log.record_id))
  return `${module} - ${record}`
}

function getActor(log: Record<string, any>) {
  return String(log.performed_by || log.changed_by || 'System')
}

function getOccurredAt(log: Record<string, any>) {
  const value = log.occurred_at || log.changed_at
  return value ? new Date(value).toLocaleString('en-IN') : ''
}

export function EmployeeAuditPanel({ logs }: Props) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const activityLogs = logs.filter((log) => !EXCLUDED_TABLES.has(String(log.table_name || '').trim().toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(activityLogs.length / pageSize))

  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages])

  const visibleLogs = activityLogs.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="ov2-card ov2-approvals-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Recent Audit Activity</div>
          <div className="ov2-card-sub">Latest create, update, and delete actions across admin data</div>
        </div>
      </div>
      <div className="ov2-approvals-list">
        {visibleLogs.map((log, index) => {
          const module = String(log.module || formatTableName(log.table_name))

          return (
            <div key={log.id || `${log.table_name || 'audit'}-${index}`} className="ov2-approval-row">
              <div className="ov2-approval-avatar">{module[0]?.toUpperCase() || 'A'}</div>
              <div className="ov2-approval-copy">
                <strong>{getActivityTitle(log)}</strong>
                <span>{getAffectedRecord(log)}</span>
                <span>{describe(log)}</span>
                <small className="ov2-approval-date">
                  <span>By {getActor(log)}</span>
                  <span>{getOccurredAt(log)}</span>
                </small>
              </div>
            </div>
          )
        })}
        {activityLogs.length === 0 && <div className="ov2-empty">No audit activity recorded yet.</div>}
      </div>
      <ClientPagination page={page} pageSize={pageSize} total={activityLogs.length} onPageChange={setPage} />
    </div>
  )
}
