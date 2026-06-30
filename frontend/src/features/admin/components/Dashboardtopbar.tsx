import { useEffect, useState } from 'react'

type DashboardTopbarProps = {
  exceptionCount: number
  onRefresh: () => Promise<void>
  // syncs whenever key dashboard data changes so the label resets
  syncDeps: unknown[]
}

export function DashboardTopbar({ exceptionCount, onRefresh, syncDeps }: DashboardTopbarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [lastSyncLabel, setLastSyncLabel] = useState('just now')
  const [spinning, setSpinning] = useState(false)

  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    setLastSyncLabel('just now')
    const t = window.setTimeout(() => setLastSyncLabel('moments ago'), 60000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, syncDeps)

  const handleRefresh = async () => {
    setSpinning(true)
    setLastSyncLabel('syncing…')
    try {
      await onRefresh()
      setLastSyncLabel('just now')
    } catch {
      setLastSyncLabel('retry needed')
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className="ov2-topbar">
      <div className="ov2-search">
        <svg className="ov2-search-icon" viewBox="0 0 20 20" fill="none" width="16" height="16">
          <circle cx="9" cy="9" r="5.5" stroke="#9aa39d" strokeWidth="1.5" />
          <path d="M13.5 13.5L17 17" stroke="#9aa39d" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search employees, departments, events…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search"
        />
      </div>

      <div className="ov2-topbar-right">
        <div className="ov2-clock">
          <span className="ov2-live-dot" />
          <span className="ov2-time">{timeLabel}</span>
          <span className="ov2-date-str">{dateLabel}</span>
        </div>

        <span className="ov2-sync-label">Synced {lastSyncLabel}</span>

        <button
          className="ov2-refresh-btn"
          onClick={() => void handleRefresh()}
          type="button"
          title="Refresh dashboard"
        >
          <svg
            className={spinning ? 'ov2-spin' : ''}
            viewBox="0 0 20 20"
            fill="none"
            width="15"
            height="15"
          >
            <path
              d="M17 10a7 7 0 1 1-1.5-4.33"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M15.5 3.5l1 2.5 2.5-1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Refresh
        </button>

        <button className="ov2-bell-btn" type="button" title="Alerts">
          <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
            <path
              d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5v2.5l1.5 2.5h-14L4.5 10.5V8A5.5 5.5 0 0 1 10 2.5z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path d="M8 16.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          {exceptionCount > 0 && <span className="ov2-bell-badge">{exceptionCount}</span>}
        </button>
      </div>
    </div>
  )
}