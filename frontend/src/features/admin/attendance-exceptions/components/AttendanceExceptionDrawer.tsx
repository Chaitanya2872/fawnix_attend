import { useEffect, useRef, useState } from 'react'
import type { AdminAttendanceExceptionRecord } from '../../../../types/admin'

type Props = {
  record: AdminAttendanceExceptionRecord | null
  open: boolean
  onClose: () => void
  onReviewed: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
  accessToken: string
  formatDateTime: (value?: string) => string
  formatDate: (value?: string) => string
}

function formatExType(v?: string) {
  if (!v) return '--'
  return v === 'late_arrival' ? 'Late Arrival' : v === 'early_leave' ? 'Early Leave' : v
}

function formatStatusLabel(v?: string) {
  if (!v) return 'Unknown'
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')
}

function getStatusClass(v?: string) {
  const n = (v || '').toLowerCase()
  if (n === 'pending') return 'accent'
  if (n === 'approved' || n === 'resolved') return 'active'
  if (n === 'rejected') return 'danger'
  return 'inactive'
}

function severityTier(minutes: number | null | undefined): 'high' | 'medium' | 'low' {
  const value = minutes ?? 0
  if (value >= 60) return 'high'
  if (value >= 25) return 'medium'
  return 'low'
}

function formatTimeShort(value: string | undefined, formatDateTime: (v?: string) => string) {
  const raw = (value || '').trim()
  if (!raw) return '--'
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) return raw.slice(0, 5)
  return formatDateTime(raw)
}

function fact(k: string, v: string | number | null | undefined) {
  const display = v == null || v === '' ? '--' : String(v)
  return (
    <div className="exc-drawer-fact" key={k}>
      <div className="exc-drawer-fact__k">{k}</div>
      <div className="exc-drawer-fact__v">{display}</div>
    </div>
  )
}

export default function AttendanceExceptionDrawer({
  record,
  open,
  onClose,
  onReviewed,
  apiRequest,
  accessToken,
  formatDateTime,
  formatDate,
}: Props) {
  const [remarks, setRemarks] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setRemarks('')
      setReviewStatus('')
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

  const handleReview = async (action: 'approved' | 'rejected') => {
    if (!record?.id) return
    setReviewing(true)
    setReviewStatus('')
    try {
      const response = await apiRequest(
        '/api/attendance-exceptions/approve',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exception_id: record.id, action, remarks: remarks.trim() }),
        },
        accessToken
      )
      if (!response?.success) {
        throw new Error(response?.message || 'Review failed')
      }
      setReviewStatus(action === 'approved' ? 'Approved' : 'Rejected')
      setTimeout(() => {
        onReviewed()
        onClose()
      }, 900)
    } catch (err) {
      setReviewStatus(err instanceof Error ? err.message : 'Review failed — try again')
    } finally {
      setReviewing(false)
    }
  }

  if (!record) return null

  const isPending = (record.status || '').toLowerCase() === 'pending'
  const employeeName = record.employee_name || record.emp_name || record.emp_code || '--'
  const exType = formatExType(record.exception_type)
  const tier = severityTier(record.late_by_minutes ?? record.early_by_minutes)

  const meta = [record.employee_code || record.emp_code, record.department]
    .filter(Boolean)
    .join(' · ')

  const variance =
    record.late_by_minutes != null
      ? `+${record.late_by_minutes} min late`
      : record.early_by_minutes != null
        ? `−${record.early_by_minutes} min early`
        : null

  const plannedShift = `${formatTimeShort(record.planned_arrival_time, formatDateTime)} – ${formatTimeShort(record.planned_leave_time, formatDateTime)}`
  const actualPunch = `${formatTimeShort(record.login_time, formatDateTime)} – ${formatTimeShort(record.logout_time, formatDateTime)}`

  return (
    <>
      <div
        className={`exc-drawer-overlay${open ? ' exc-drawer-overlay--open' : ''}`}
        ref={overlayRef}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`exc-drawer${open ? ' exc-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${exType} exception — ${employeeName}`}
      >
        <div className="exc-drawer-header">
          <div style={{ minWidth: 0 }}>
            <h3 className="exc-drawer-header__title">{employeeName}</h3>
            <p className="exc-drawer-header__meta">{meta || '--'}</p>
          </div>
          <button type="button" className="exc-drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="exc-drawer-body">
          <div className="exc-drawer-pillrow">
            <span className={`exc-drawer-typepill exc-drawer-typepill--${tier}`}>{exType}</span>
            <span className={`table-pill ${getStatusClass(record.status)}`}>{formatStatusLabel(record.status)}</span>
            <span className="exc-drawer-date">{formatDate(record.attendance_date || record.exception_date)}</span>
          </div>

          <div className="exc-drawer-facts">
            {fact('Planned shift', plannedShift)}
            {fact('Actual punch', actualPunch)}
            {fact('Variance', variance)}
            {fact('Hours logged', record.working_hours != null ? `${record.working_hours.toFixed(1)} h` : null)}
            {fact('Prior exceptions (90d)', record.prior_exceptions_90d != null ? `${record.prior_exceptions_90d}×` : null)}
          </div>

          {(record.reason || record.notes) && (
            <div>
              <h4 className="exc-drawer-section__title">Employee reason</h4>
              {record.reason && <p className="exc-drawer-text">{record.reason}</p>}
              {record.notes && <p className="exc-drawer-text" style={{ marginTop: 8 }}>{record.notes}</p>}
            </div>
          )}

          <div>
            <h4 className="exc-drawer-section__title">Pattern</h4>
            <p className="exc-drawer-text">
              {(record.prior_exceptions_90d ?? 0) >= 3
                ? `${record.prior_exceptions_90d} exceptions in the last 90 days — flagged as a repeat pattern.`
                : 'Isolated incident. No pattern in the last 90 days.'}
            </p>
          </div>

          <div>
            <h4 className="exc-drawer-section__title">Manager remark</h4>
            <p className="exc-drawer-note">
              {record.manager_remarks || 'No remark recorded by the reporting manager.'}
            </p>
            {(record.reviewed_by || record.reviewed_at) && (
              <p className="exc-drawer-pattern-note">
                {[record.reviewed_by, record.reviewed_at ? formatDateTime(record.reviewed_at) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          {isPending && (
            <div>
              <label className="exc-drawer-remarks-label" htmlFor="exc-drawer-remarks">
                Add a remark <span>(optional)</span>
              </label>
              <textarea
                id="exc-drawer-remarks"
                className="exc-drawer-remarks"
                placeholder="Add a comment for the employee"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                disabled={reviewing}
              />
              {reviewStatus && <p className="exc-drawer-review-status">{reviewStatus}</p>}
            </div>
          )}
        </div>

        <div className="exc-drawer-footer">
          {isPending ? (
            <>
              <div className="exc-drawer-footer__note">Record ID {record.id ?? '--'}</div>
              <div className="exc-drawer-footer__actions">
                <button
                  type="button"
                  className="exc-drawer-reject"
                  onClick={() => void handleReview('rejected')}
                  disabled={reviewing}
                >
                  {reviewing ? 'Saving…' : 'Reject'}
                </button>
                <button
                  type="button"
                  className="exc-drawer-approve"
                  onClick={() => void handleReview('approved')}
                  disabled={reviewing}
                >
                  {reviewing ? 'Saving…' : 'Approve'}
                </button>
              </div>
            </>
          ) : (
            <div className="exc-drawer-footer__note">
              Read-only · decided by {record.reviewed_by || 'the reporting manager'}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}