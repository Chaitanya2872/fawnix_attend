/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'

type LeaveRow = Record<string, any>

type PendingApprovalsPanelProps = {
  pendingLeaveRows: LeaveRow[]
  onAlertManager: (row: LeaveRow) => Promise<string>
  formatLeaveTypeLabel: (row: LeaveRow) => string
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
            return (
              <div key={key} className="ov2-approval-row">
                <div className="ov2-approval-avatar">{initial}</div>
                <div className="ov2-approval-copy">
                  <strong>{row.emp_full_name || row.emp_code || 'Unknown'}</strong>
                  <span>{formatLeaveTypeLabel(row)}</span>
                  <small>
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