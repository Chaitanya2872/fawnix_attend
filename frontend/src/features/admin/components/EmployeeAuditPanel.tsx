/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'
import { ClientPagination } from './ClientPagination'

type Props = { logs: Record<string, any>[] }

const EXCLUDED_TABLES = new Set(['api_logs'])

const OPERATION_LABELS: Record<string, string> = {
  insert: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

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

/** What was done, phrased to read on from the actor's name. */
function getAction(log: Record<string, any>) {
  if (log.action) {
    return String(log.action)
  }

  return `${getOperationLabel(log.operation)} ${formatTableName(log.table_name)}`
}

function getModule(log: Record<string, any>) {
  return String(log.module || formatTableName(log.table_name))
}

function getRecordLabel(log: Record<string, any>) {
  return String(log.record_label || formatValue(log.record_id))
}

/**
 * Who made the change. The backend resolves the stamped emp_code to a name;
 * changes made by a scheduler rather than a person come back as "System".
 */
function getActor(log: Record<string, any>) {
  const name = String(log.performed_by_name || '').trim()
  if (name) {
    return name
  }
  return String(log.performed_by || log.changed_by || 'System').trim() || 'System'
}

/** The emp_code behind the actor, shown only when it adds something. */
function getActorCode(log: Record<string, any>) {
  const code = String(log.performed_by || '').trim()
  return code && code !== getActor(log) ? code : ''
}

function getInitials(actor: string) {
  if (actor === 'System') {
    return 'SYS'
  }
  const parts = actor.split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2)
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`
}

function parseTimestamp(log: Record<string, any>) {
  const value = log.occurred_at || log.changed_at
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** "just now" / "12m ago" / "3h ago" / "2d ago", then the plain date. */
function getRelativeTime(log: Record<string, any>) {
  const parsed = parseTimestamp(log)
  if (!parsed) {
    return ''
  }

  const elapsed = Date.now() - parsed.getTime()
  if (elapsed < MINUTE) {
    return 'just now'
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m ago`
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h ago`
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)}d ago`
  }
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function getExactTime(log: Record<string, any>) {
  const parsed = parseTimestamp(log)
  return parsed ? parsed.toLocaleString('en-IN') : ''
}

/**
 * Who updated what, newest first. Each row leads with the person who made the
 * change, then the record they touched and the fields that moved, so the feed
 * answers "who did this?" without having to expand anything.
 */
export function EmployeeAuditPanel({ logs }: Props) {
  const [page, setPage] = useState(1)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')
  const pageSize = 8

  const activityLogs = useMemo(
    () => logs.filter((log) => !EXCLUDED_TABLES.has(String(log.table_name || '').trim().toLowerCase())),
    [logs],
  )

  const moduleOptions = useMemo(
    () => Array.from(new Set(activityLogs.map(getModule))).sort((left, right) => left.localeCompare(right)),
    [activityLogs],
  )

  const actorOptions = useMemo(
    () => Array.from(new Set(activityLogs.map(getActor))).sort((left, right) => left.localeCompare(right)),
    [activityLogs],
  )

  const filteredLogs = useMemo(
    () => activityLogs.filter((log) => (
      (moduleFilter === 'all' || getModule(log) === moduleFilter)
      && (actorFilter === 'all' || getActor(log) === actorFilter)
    )),
    [activityLogs, moduleFilter, actorFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  // Clamped during render rather than in an effect, so a shrinking feed never
  // leaves the list stranded on a page that no longer exists.
  const currentPage = Math.min(page, totalPages)
  const visibleLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const isFiltered = moduleFilter !== 'all' || actorFilter !== 'all'

  return (
    <div className="ov2-card ov2-approvals-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Recent Audit Activity</div>
          <div className="ov2-card-sub">Who updated what across admin data</div>
        </div>
        <div className="ov2-audit-filters">
          <label className="ov2-audit-filter">
            <span className="ov2-visually-hidden">Filter by person</span>
            <select
              value={actorFilter}
              onChange={(event) => {
                setActorFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">Everyone</option>
              {actorOptions.map((actor) => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </label>
          <label className="ov2-audit-filter">
            <span className="ov2-visually-hidden">Filter by module</span>
            <select
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All modules</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="ov2-approvals-list">
        {visibleLogs.map((log, index) => {
          const actor = getActor(log)
          const actorCode = getActorCode(log)

          return (
            <div key={log.id || `${log.table_name || 'audit'}-${index}`} className="ov2-approval-row ov2-audit-row">
              <div className={`ov2-approval-avatar${actor === 'System' ? ' is-system' : ''}`}>{getInitials(actor)}</div>
              <div className="ov2-approval-copy">
                <strong className="ov2-audit-headline">
                  {actor}
                  <span className="ov2-audit-action">{` ${getAction(log).toLowerCase()}`}</span>
                </strong>
                <span className="ov2-audit-record">
                  <span className="ov2-audit-module">{getModule(log)}</span>
                  {getRecordLabel(log)}
                </span>
                <span className="ov2-audit-detail">{describe(log)}</span>
              </div>
              <div className="ov2-approval-date ov2-audit-when" title={getExactTime(log)}>
                <span>{getRelativeTime(log)}</span>
                {actorCode ? <span className="ov2-audit-actor-code">{actorCode}</span> : null}
              </div>
            </div>
          )
        })}
        {filteredLogs.length === 0 && (
          <div className="ov2-empty">
            {isFiltered ? 'No activity matches these filters.' : 'No audit activity recorded yet.'}
          </div>
        )}
      </div>
      <ClientPagination page={currentPage} pageSize={pageSize} total={filteredLogs.length} onPageChange={setPage} />
    </div>
  )
}
