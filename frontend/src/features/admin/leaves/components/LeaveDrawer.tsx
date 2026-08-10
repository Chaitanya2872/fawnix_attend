import { useEffect, useState } from 'react'
import type { AdminLeaveBalance, AdminLeaveRecord } from '../../../../types/admin'

type Props = {
  record: AdminLeaveRecord | null
  open: boolean
  onClose: () => void
  onAlert: (record: AdminLeaveRecord) => Promise<string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
  accessToken: string
  formatDateTime: (value?: string) => string
  formatDate: (value?: string) => string
  formatLeaveTypeLabel: (record: AdminLeaveRecord) => string
}

function formatStatusLabel(v?: string) {
  if (!v) return 'Unknown'
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')
}

function getStatusClass(v?: string) {
  const n = (v || '').toLowerCase()
  if (n === 'pending') return 'accent'
  if (n === 'approved') return 'active'
  if (n === 'rejected') return 'danger'
  return 'inactive'
}

function fact(k: string, v: string | number | null | undefined) {
  const display = v == null || v === '' ? '--' : String(v)
  return (
    <div className="lv-drawer-fact" key={k}>
      <div className="lv-drawer-fact__k">{k}</div>
      <div className="lv-drawer-fact__v">{display}</div>
    </div>
  )
}

const BALANCE_ROWS: Array<{ key: keyof AdminLeaveBalance; label: string }> = [
  { key: 'casual', label: 'Casual leave' },
  { key: 'sick', label: 'Sick leave' },
  { key: 'annual', label: 'Annual leave' },
  { key: 'monthly', label: 'Monthly leave' },
]

export default function LeaveDrawer({
  record,
  open,
  onClose,
  onAlert,
  apiRequest,
  accessToken,
  formatDateTime,
  formatDate,
  formatLeaveTypeLabel,
}: Props) {
  const [alerting, setAlerting] = useState(false)
  const [alertStatus, setAlertStatus] = useState('')
  const [balance, setBalance] = useState<AdminLeaveBalance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setAlertStatus('')
      setBalance(null)
    }
  }, [open, record?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !record?.employee_code) return
    let cancelled = false
    setBalanceLoading(true)
    apiRequest(`/api/admin/leaves/balance?emp_code=${encodeURIComponent(record.employee_code)}`, {}, accessToken)
      .then((response) => {
        if (cancelled) return
        if (response?.success) setBalance(response.data)
      })
      .catch(() => { /* balance is a supplementary detail; leave the section empty on failure */ })
      .finally(() => { if (!cancelled) setBalanceLoading(false) })
    return () => { cancelled = true }
  }, [open, record?.employee_code, record?.id, apiRequest, accessToken])

  if (!record) return null

  const isPending = (record.status || '').toLowerCase() === 'pending'
  const employeeName = record.employee_name || record.employee_code || '--'
  const meta = [record.employee_code, record.department].filter(Boolean).join(' · ')
  const days = record.leave_count != null ? `${record.leave_count} day${record.leave_count === 1 ? '' : 's'}` : '--'

  const handleAlert = async () => {
    setAlerting(true)
    setAlertStatus('')
    try {
      const nextStatus = await onAlert(record)
      setAlertStatus(nextStatus)
    } catch (err) {
      setAlertStatus(err instanceof Error ? err.message : 'Failed to alert manager.')
    } finally {
      setAlerting(false)
    }
  }

  return (
    <>
      <div
        className={`lv-drawer-overlay${open ? ' lv-drawer-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`lv-drawer${open ? ' lv-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${formatLeaveTypeLabel(record)} — ${employeeName}`}
      >
        <div className="lv-drawer-header">
          <div style={{ minWidth: 0 }}>
            <h3 className="lv-drawer-header__title">{employeeName}</h3>
            <p className="lv-drawer-header__meta">{meta || '--'}</p>
          </div>
          <button type="button" className="lv-drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="lv-drawer-body">
          <div className="lv-drawer-pillrow">
            <span className="lv-drawer-typepill">{formatLeaveTypeLabel(record)}</span>
            <span className={`table-pill ${getStatusClass(record.status)}`}>{formatStatusLabel(record.status)}</span>
            <span className="lv-drawer-days">{days}</span>
          </div>

          <div className="lv-drawer-facts">
            {fact('From', formatDate(record.from_date))}
            {fact('To', formatDate(record.to_date))}
            {fact('Applied on', formatDate(record.applied_at))}
            {record.status && !isPending
              ? fact(`${formatStatusLabel(record.status)} on`, record.reviewed_at ? formatDate(record.reviewed_at) : '--')
              : fact('Reporting manager', record.manager_name)}
            {fact('Reporting manager', record.manager_name)}
          </div>

          {(record.notes || record.remarks) && (
            <div>
              <h4 className="lv-drawer-section__title">Employee note</h4>
              {record.notes && <p className="lv-drawer-text">{record.notes}</p>}
            </div>
          )}

          <div>
            <h4 className="lv-drawer-section__title">Pattern</h4>
            <p className="lv-drawer-text">
              {(record.prior_requests_90d ?? 0) >= 3
                ? `${record.prior_requests_90d} other requests in the last 90 days — flagged as a repeat pattern.`
                : 'Isolated request. No pattern in the last 90 days.'}
            </p>
          </div>

          <div>
            <h4 className="lv-drawer-section__title">Leave balance</h4>
            {balanceLoading ? (
              <p className="lv-drawer-text">Loading balance…</p>
            ) : balance ? (
              <div className="lv-drawer-balance">
                {BALANCE_ROWS.filter((row) => balance[row.key]).map((row) => {
                  const entry = balance[row.key]!
                  const pct = entry.max > 0 ? Math.min(100, Math.round((entry.used / entry.max) * 100)) : 0
                  return (
                    <div key={row.key}>
                      <div className="lv-drawer-balance__row">
                        <span>{row.label}</span>
                        <span>{entry.used} of {entry.max} used</span>
                      </div>
                      <div className="lv-drawer-balance__track">
                        <div className="lv-drawer-balance__fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="lv-drawer-text">Balance unavailable.</p>
            )}
          </div>

          <div>
            <h4 className="lv-drawer-section__title">Manager remark</h4>
            <p className="lv-drawer-note">
              {record.remarks || 'No remark recorded by the reporting manager.'}
            </p>
            {(record.reviewed_by || record.reviewed_at) && (
              <p className="lv-drawer-pattern-note">
                {[record.reviewed_by, record.reviewed_at ? formatDateTime(record.reviewed_at) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          {alertStatus && <p className="lv-drawer-review-status">{alertStatus}</p>}
        </div>

        <div className="lv-drawer-footer">
          {isPending ? (
            <>
              <div className="lv-drawer-footer__note">Read-only · awaiting reporting manager</div>
              <button type="button" className="lv-drawer-alert" onClick={() => void handleAlert()} disabled={alerting}>
                {alerting ? 'Alerting…' : 'Alert manager'}
              </button>
            </>
          ) : (
            <div className="lv-drawer-footer__note">
              Read-only · {formatStatusLabel(record.status).toLowerCase()} by {record.manager_name || 'the reporting manager'}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
