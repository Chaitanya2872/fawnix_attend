/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'

type ExceptionRow = Record<string, any>

type ExceptionsPanelProps = {
  exceptions: ExceptionRow[]
  onAlertManager: (row: ExceptionRow) => Promise<string>
}

const FILTERS = ['All', 'Punch', 'Geofence', 'Late', 'Absent'] as const

export function ExceptionsPanel({ exceptions, onAlertManager }: ExceptionsPanelProps) {
  const [exceptionFilter, setExceptionFilter] = useState<string>('All')
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')

  const filtered =
    exceptionFilter === 'All'
      ? exceptions
      : exceptions.filter((r) =>
          `${r?.type || ''} ${r?.reason || ''} ${r?.message || ''}`
            .toLowerCase()
            .includes(exceptionFilter.toLowerCase())
        )

  const handleAlert = async (row: ExceptionRow) => {
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
    <div className="ov2-card ov2-exc-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">
            Exceptions &amp; Alerts
            {exceptions.length > 0 && <span className="ov2-exc-live-badge">LIVE</span>}
          </div>
          <div className="ov2-card-sub">
            {filtered.length} of {exceptions.length} shown
          </div>
        </div>
      </div>

      <div className="ov2-exc-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`ov2-exc-chip${exceptionFilter === f ? ' active' : ''}`}
            onClick={() => setExceptionFilter(f)}
            type="button"
          >
            {f}
            {f === 'All' && exceptions.length > 0 && (
              <span className="ov2-chip-count">{exceptions.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="ov2-exc-list">
        {filtered.slice(0, 8).map((row, i) => {
          const text = `${row?.type || row?.reason || row?.message || 'Exception'}`
          const isLate = text.toLowerCase().includes('late')
          const isGeo =
            text.toLowerCase().includes('geo') || text.toLowerCase().includes('location')
          const dotClass = isLate ? 'amber' : isGeo ? 'blue' : 'red'
          const rowKey = String(row.id || row.emp_code || i)

          return (
            <div key={rowKey} className="ov2-exc-item">
              <span className={`ov2-exc-dot ${dotClass}`} />
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">
                  {row.emp_full_name || row.emp_code || 'Unknown'}
                </span>
                <span className="ov2-exc-desc">{text.slice(0, 52)}</span>
              </div>
              <button
                className="ov2-resolve-btn"
                onClick={() => void handleAlert(row)}
                disabled={alertLoadingKey === rowKey}
                type="button"
              >
                {alertLoadingKey === rowKey ? '…' : 'Alert'}
              </button>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="ov2-empty">
            No exceptions{exceptionFilter !== 'All' ? ` matching "${exceptionFilter}"` : ' today'}.
          </div>
        )}

        {alertStatus && <div className="ov2-alert-status">{alertStatus}</div>}
      </div>
    </div>
  )
}