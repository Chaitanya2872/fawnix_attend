/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'

type LeaveRow = Record<string, any>

type PendingApprovalsPanelProps = {
  pendingLeaveRows: LeaveRow[]
  onAlertManager: (row: LeaveRow) => Promise<string>
  formatLeaveTypeLabel: (row: LeaveRow) => string
}

const PANEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short'
})
const PANEL_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })

function parsePanelDate(value?: string) {
  const rawValue = (value || '').trim()
  if (!rawValue) {
    return null
  }

  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(rawValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getPanelDateKey(value?: string) {
  const parsed = parsePanelDate(value)
  if (!parsed) {
    return ''
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-')
}

function formatPanelDate(value?: string) {
  const parsed = parsePanelDate(value)
  return parsed ? PANEL_DATE_FORMATTER.format(parsed) : value || '--'
}

function formatPanelDateRange(row: LeaveRow) {
  const fromKey = getPanelDateKey(row.from_date)
  const toKey = getPanelDateKey(row.to_date)

  if (!row.from_date && !row.to_date) {
    return '--'
  }

  if (!row.to_date || (fromKey && fromKey === toKey)) {
    return formatPanelDate(row.from_date)
  }

  if (!row.from_date) {
    return formatPanelDate(row.to_date)
  }

  return `${formatPanelDate(row.from_date)} - ${formatPanelDate(row.to_date)}`
}

function formatPanelWeekdayRange(row: LeaveRow) {
  const fromDate = parsePanelDate(row.from_date)
  const toDate = parsePanelDate(row.to_date)
  const fromKey = getPanelDateKey(row.from_date)
  const toKey = getPanelDateKey(row.to_date)

  if (!fromDate && !toDate) {
    return ''
  }

  const fromWeekday = fromDate ? PANEL_WEEKDAY_FORMATTER.format(fromDate) : ''
  const toWeekday = toDate ? PANEL_WEEKDAY_FORMATTER.format(toDate) : ''

  if (!toWeekday || (fromKey && fromKey === toKey)) {
    return fromWeekday
  }

  if (!fromWeekday) {
    return toWeekday
  }

  return `${fromWeekday} - ${toWeekday}`
}

export function PendingApprovalsPanel({
  pendingLeaveRows,
  onAlertManager,
  formatLeaveTypeLabel,
}: PendingApprovalsPanelProps) {
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')

  const handleAlert = async (row: LeaveRow) => {
    const key = String(row.id || row.emp_code || Math.random())
    setAlertLoadingKey(key)
    setAlertStatus('')
    try {
      const next = await onAlertManager(row)
      setAlertStatus(next)
    } catch (err) {
      setAlertStatus(err instanceof Error ? err.message : 'Failed.')
    } finally {
      setAlertLoadingKey('')
    }
  }

  return (
    <div className="ov2-card ov2-approvals-card">
      <button
        className="ov2-card-head ov2-approvals-toggle"
        onClick={() => setPendingExpanded((v) => !v)}
        type="button"
      >
        <div>
          <div className="ov2-card-title">Pending Approvals</div>
          <div className="ov2-card-sub">
            {pendingLeaveRows.length} request{pendingLeaveRows.length === 1 ? '' : 's'} awaiting
          </div>
        </div>
        <span className={`ov2-collapse-btn${pendingExpanded ? ' open' : ''}`}>
          {pendingExpanded ? '↑' : '↓'}
        </span>
      </button>

      {pendingExpanded && (
        <div className="ov2-approvals-list">
          {pendingLeaveRows.slice(0, 6).map((row, i) => {
            const key = String(row.id || row.emp_code || i)
            const initial = (row.emp_full_name || row.emp_code || 'U')[0].toUpperCase()
            const dateRangeLabel = formatPanelDateRange(row)
            const weekdayLabel = formatPanelWeekdayRange(row)
            return (
              <div key={key} className="ov2-approval-row">
                <div className="ov2-approval-avatar">{initial}</div>
                <div className="ov2-approval-copy">
                  <strong>{row.emp_full_name || row.emp_code || 'Unknown'}</strong>
                  <span>{formatLeaveTypeLabel(row)}</span>
                  <small className="ov2-approval-date">
                    <span>{dateRangeLabel}</span>
                    {weekdayLabel ? <span>{weekdayLabel}</span> : null}
                  </small>
                  <small className="ov2-approval-raw-date" aria-hidden="true">
                    {row.from_date || '--'} → {row.to_date || '--'}
                  </small>
                </div>
                <button
                  className="ov2-alert-btn"
                  onClick={() => void handleAlert(row)}
                  disabled={alertLoadingKey === key}
                  type="button"
                >
                  {alertLoadingKey === key ? '…' : 'Alert Mgr'}
                </button>
              </div>
            )
          })}

          {pendingLeaveRows.length === 0 && (
            <div className="ov2-empty">No pending approvals right now.</div>
          )}

          {alertStatus && <div className="ov2-alert-status">{alertStatus}</div>}
        </div>
      )}
    </div>
  )
}
