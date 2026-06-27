import { useEffect, useMemo, useState } from 'react'

type Props = any

function toMonthKey(value?: string) {
  return (value || '').slice(0, 7)
}

function getWeekRangeLabel(value: string) {
  const base = new Date(`${value}T00:00:00`)
  if (Number.isNaN(base.getTime())) return 'This week'
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminOverviewPage({
  attendanceDateFilter,
  employees,
  fieldVisitRows,
  firstClockInRows,
  formatLeaveTypeLabel,
  leaveRows,
  loadDashboard,
  onAlertManager,
  selectedDateExceptions,
  selectedDateLeaves,
  weeklyAttendanceTrend,
}: Props) {
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [lastSyncLabel, setLastSyncLabel] = useState('just now')
  const [exceptionFilter, setExceptionFilter] = useState('All')
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [spinning, setSpinning] = useState(false)

  const activeEmployees = employees.filter((e: any) => e.is_active !== false).length
  const totalEmployees = activeEmployees || employees.length
  const presentToday = firstClockInRows.length
  const pendingLeaveRows = leaveRows.filter(
    (r: any) => (r.status || '').trim().toLowerCase() === 'pending'
  )
  const lateExceptionsToday = selectedDateExceptions.filter((r: any) =>
    `${r?.type || ''} ${r?.reason || ''} ${r?.message || ''}`.toLowerCase().includes('late')
  ).length
  const fieldActive = fieldVisitRows.filter((r: any) => {
    const s = `${r?.status || r?.visitStatus || ''}`.toLowerCase()
    return s ? !s.includes('complete') && !s.includes('closed') : true
  }).length

  const weekLabel = getWeekRangeLabel(attendanceDateFilter)
  const monthlyLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
  const selectedDateLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString(
    'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short' }
  )

  const monthKey = toMonthKey(attendanceDateFilter)
  const selectedMonthLeaves = leaveRows.filter(
    (r: any) => toMonthKey(r.from_date || r.to_date || '') === monthKey
  )
  const monthlyLeaveApprovals = selectedMonthLeaves.length
  const weeklyExceptionCount = selectedDateExceptions.length

  const averageWeeklyAttendance = weeklyAttendanceTrend.length
    ? Math.round(
        (weeklyAttendanceTrend.reduce((s: number, i: any) => s + i.count, 0) /
          weeklyAttendanceTrend.length /
          Math.max(totalEmployees, 1)) *
          100
      )
    : 0

  const punctualityRate = totalEmployees
    ? Math.max(
        0,
        Math.round(
          ((presentToday - lateExceptionsToday) / Math.max(presentToday || totalEmployees, 1)) * 100
        )
      )
    : 0

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const greeting = getGreeting()
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

  const deptEntries = useMemo(() => {
    const map: Record<string, { head: number; present: number }> = {}
    employees.forEach((e: any) => {
      const dept = (e.emp_department || 'Unassigned').trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].head += 1
    })
    firstClockInRows.forEach((r: any) => {
      const dept = (r.emp_department || r.emp_designation || 'Unassigned').trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].present += 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1].head - a[1].head)
      .slice(0, 6)
  }, [employees, firstClockInRows])

  const visibleDeptEntries = useMemo(() => {
    if (!normalizedSearch) return deptEntries
    return deptEntries.filter(([dept]) => dept.toLowerCase().includes(normalizedSearch))
  }, [deptEntries, normalizedSearch])

  const visiblePendingLeaveRows = useMemo(() => {
    if (!normalizedSearch) return pendingLeaveRows
    return pendingLeaveRows.filter((r: any) => {
      const hay = [r.emp_full_name, r.emp_code, r.emp_department, r.leave_type, r.reason]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(normalizedSearch)
    })
  }, [normalizedSearch, pendingLeaveRows])

  const filteredExceptions = useMemo(() => {
    const base = selectedDateExceptions
    if (exceptionFilter === 'All') return base
    return base.filter((r: any) =>
      `${r?.type || ''} ${r?.reason || ''} ${r?.message || ''}`
        .toLowerCase()
        .includes(exceptionFilter.toLowerCase())
    )
  }, [selectedDateExceptions, exceptionFilter])

  const maxDeptHead = Math.max(...visibleDeptEntries.map(([, e]: any) => e.head), 1)
  const maxWeekly = Math.max(...weeklyAttendanceTrend.map((i: any) => i.count), 1)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    setLastSyncLabel('just now')
    const t = window.setTimeout(() => setLastSyncLabel('moments ago'), 60000)
    return () => window.clearTimeout(t)
  }, [attendanceDateFilter, presentToday, weeklyExceptionCount, monthlyLeaveApprovals, fieldActive])

  const handleAlertManager = async (row: any) => {
    const key = String(row.id || row.emp_code || row.manager_code || Math.random())
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

  const handleRefresh = async () => {
    setSpinning(true)
    setLastSyncLabel('syncing…')
    try {
      await loadDashboard()
      setLastSyncLabel('just now')
    } catch {
      setLastSyncLabel('retry needed')
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className="ov2-shell">
      {/* ── Sticky Topbar ── */}
      <div className="ov2-topbar">
        <div className="ov2-search">
          <svg className="ov2-search-icon" viewBox="0 0 20 20" fill="none">
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
            {weeklyExceptionCount > 0 && (
              <span className="ov2-bell-badge">{weeklyExceptionCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="ov2-content">
        {/* ── Page header ── */}
        <div className="ov2-page-header">
          <div>
            <h1 className="ov2-page-title">{greeting}, Admin</h1>
            <p className="ov2-page-sub">
              {presentToday} of {totalEmployees} present &middot; {weeklyExceptionCount} exceptions
              &middot; {fieldActive} in the field
            </p>
          </div>
          <div className="ov2-header-chips">
            <span className="ov2-chip">{selectedDateLabel}</span>
            <span className="ov2-chip">{weekLabel}</span>
            <span className="ov2-chip">{monthlyLabel}</span>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="ov2-kpi-row">
          {/* Attendance */}
          <div className="ov2-kpi-card">
            <div className="ov2-kpi-accent green" />
            <div className="ov2-kpi-top">
              <div className="ov2-kpi-icon-wrap green">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div className="ov2-kpi-label">Attendance Rate</div>
                <div className="ov2-kpi-period">Weekly · {weekLabel}</div>
              </div>
            </div>
            <div className="ov2-kpi-num">{averageWeeklyAttendance}%</div>
            <div className="ov2-kpi-sub">
              {presentToday} / {totalEmployees} present today
            </div>
            <div className="ov2-sparkline">
              {weeklyAttendanceTrend.slice(-7).map((item: any, i: number) => (
                <div
                  key={i}
                  className="ov2-spark-bar green"
                  style={{
                    height: `${maxWeekly > 0 ? Math.max(Math.round((item.count / maxWeekly) * 100), 4) : 4}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* On-time */}
          <div className="ov2-kpi-card">
            <div className="ov2-kpi-accent blue" />
            <div className="ov2-kpi-top">
              <div className="ov2-kpi-icon-wrap blue">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 5v3.5l2.5 1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div className="ov2-kpi-label">On-Time Rate</div>
                <div className="ov2-kpi-period">Today · {selectedDateLabel}</div>
              </div>
            </div>
            <div className="ov2-kpi-num blue">{punctualityRate}%</div>
            <div className="ov2-kpi-sub">
              {lateExceptionsToday} late exception{lateExceptionsToday === 1 ? '' : 's'}
            </div>
            <div className="ov2-sparkline">
              {weeklyAttendanceTrend.slice(-7).map((item: any, i: number) => (
                <div
                  key={i}
                  className="ov2-spark-bar blue"
                  style={{
                    height: `${maxWeekly > 0 ? Math.max(Math.round((item.count / maxWeekly) * 100), 4) : 4}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Leave */}
          <div className="ov2-kpi-card">
            <div className="ov2-kpi-accent amber" />
            <div className="ov2-kpi-top">
              <div className="ov2-kpi-icon-wrap amber">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="ov2-kpi-label">Leave Requests</div>
                <div className="ov2-kpi-period">Monthly · {monthlyLabel}</div>
              </div>
            </div>
            <div className="ov2-kpi-num amber">{monthlyLeaveApprovals}</div>
            <div className="ov2-kpi-sub">
              {pendingLeaveRows.length} pending approval{pendingLeaveRows.length === 1 ? '' : 's'}
            </div>
            <div className="ov2-kpi-progress-wrap">
              <div
                className="ov2-kpi-progress amber"
                style={{
                  width: `${Math.min(
                    (pendingLeaveRows.length / Math.max(monthlyLeaveApprovals, 1)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Exceptions */}
          <div className="ov2-kpi-card exceptions">
            <div className="ov2-kpi-accent red" />
            <div className="ov2-kpi-top">
              <div className="ov2-kpi-icon-wrap red">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path
                    d="M8 2L14.5 13.5H1.5L8 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 7v3M8 11.5v.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div className="ov2-kpi-label">Exceptions</div>
                <div className="ov2-kpi-period">Active this period</div>
              </div>
              {weeklyExceptionCount > 0 && <span className="ov2-live-chip">LIVE</span>}
            </div>
            <div className="ov2-kpi-num red">{weeklyExceptionCount}</div>
            <div className="ov2-kpi-sub">
              {selectedDateLeaves.length} on leave · {fieldActive} field agents
            </div>
            {weeklyExceptionCount > 0 && (
              <div className="ov2-exc-mini-list">
                {filteredExceptions.slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="ov2-exc-mini-item">
                    <span className="ov2-exc-mini-dot red" />
                    <span>{r.emp_full_name || r.emp_code || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main row: chart + exceptions ── */}
        <div className="ov2-main-grid">
          {/* Attendance chart */}
          <div className="ov2-card ov2-chart-card">
            <div className="ov2-card-head">
              <div>
                <div className="ov2-card-title">Attendance Trend</div>
                <div className="ov2-card-sub">Daily attendance count · {weekLabel}</div>
              </div>
              <div className="ov2-chart-stats">
                <div className="ov2-chart-stat">
                  <span>AVG</span>
                  <strong>{averageWeeklyAttendance}%</strong>
                </div>
                <div className="ov2-chart-stat">
                  <span>PRESENT</span>
                  <strong>{presentToday}</strong>
                </div>
                <div className="ov2-chart-stat amber">
                  <span>LATE</span>
                  <strong>{lateExceptionsToday}</strong>
                </div>
              </div>
            </div>
            <div className="ov2-bar-chart">
              {weeklyAttendanceTrend.map((item: any, i: number) => {
                const h = maxWeekly > 0 ? Math.round((item.count / maxWeekly) * 100) : 0
                return (
                  <div key={item.label || i} className="ov2-bar-col">
                    <span className="ov2-bar-val">{item.count}</span>
                    <div className="ov2-bar-track">
                      <div className="ov2-bar-fill" style={{ height: `${h}%` }} />
                    </div>
                    <span className="ov2-bar-lbl">{item.label}</span>
                  </div>
                )
              })}
              {weeklyAttendanceTrend.length === 0 && (
                <div className="ov2-empty">No attendance data available</div>
              )}
            </div>
            <div className="ov2-chart-insights">
              <div className="ov2-chart-insight">
                <span>On Leave Today</span>
                <strong>{selectedDateLeaves.length}</strong>
              </div>
              <div className="ov2-chart-insight">
                <span>Field Visits</span>
                <strong>{fieldVisitRows.length}</strong>
              </div>
              <div className="ov2-chart-insight">
                <span>Active Field</span>
                <strong>{fieldActive}</strong>
              </div>
              <div className="ov2-chart-insight">
                <span>Total Employees</span>
                <strong>{totalEmployees}</strong>
              </div>
            </div>
          </div>

          {/* Exceptions panel */}
          <div className="ov2-card ov2-exc-card">
            <div className="ov2-card-head">
              <div>
                <div className="ov2-card-title">
                  Exceptions &amp; Alerts
                  {weeklyExceptionCount > 0 && (
                    <span className="ov2-exc-live-badge">LIVE</span>
                  )}
                </div>
                <div className="ov2-card-sub">
                  {filteredExceptions.length} of {weeklyExceptionCount} shown
                </div>
              </div>
            </div>
            <div className="ov2-exc-filters">
              {['All', 'Punch', 'Geofence', 'Late', 'Absent'].map((f) => (
                <button
                  key={f}
                  className={`ov2-exc-chip${exceptionFilter === f ? ' active' : ''}`}
                  onClick={() => setExceptionFilter(f)}
                  type="button"
                >
                  {f}
                  {f === 'All' && weeklyExceptionCount > 0 && (
                    <span className="ov2-chip-count">{weeklyExceptionCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="ov2-exc-list">
              {filteredExceptions.slice(0, 8).map((row: any, i: number) => {
                const text = `${row?.type || row?.reason || row?.message || 'Exception'}`
                const isLate = text.toLowerCase().includes('late')
                const isGeo = text.toLowerCase().includes('geo') || text.toLowerCase().includes('location')
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
                      onClick={() => void handleAlertManager(row)}
                      disabled={alertLoadingKey === rowKey}
                      type="button"
                    >
                      {alertLoadingKey === rowKey ? '…' : 'Alert'}
                    </button>
                  </div>
                )
              })}
              {filteredExceptions.length === 0 && (
                <div className="ov2-empty">
                  No exceptions
                  {exceptionFilter !== 'All' ? ` matching "${exceptionFilter}"` : ' today'}.
                </div>
              )}
              {alertStatus && <div className="ov2-alert-status">{alertStatus}</div>}
            </div>
          </div>
        </div>

        {/* ── Lower row: departments + approvals ── */}
        <div className="ov2-lower-grid">
          {/* Departments */}
          <div className="ov2-card">
            <div className="ov2-card-head">
              <div>
                <div className="ov2-card-title">Departments</div>
                <div className="ov2-card-sub">Headcount vs. present mix</div>
              </div>
              <span className="ov2-count-badge">{visibleDeptEntries.length} depts</span>
            </div>
            <div className="ov2-dept-list">
              {visibleDeptEntries.map(([dept, entry]: any) => {
                const pct = Math.round((entry.present / Math.max(entry.head, 1)) * 100)
                const barColor = pct >= 80 ? 'green' : pct >= 55 ? 'amber' : 'red'
                return (
                  <div key={dept} className="ov2-dept-row">
                    <span className="ov2-dept-name">{dept}</span>
                    <div className="ov2-dept-track">
                      <div
                        className="ov2-dept-headcount"
                        style={{ width: `${Math.round((entry.head / maxDeptHead) * 100)}%` }}
                      />
                      <div
                        className={`ov2-dept-present ${barColor}`}
                        style={{ width: `${Math.round((entry.present / maxDeptHead) * 100)}%` }}
                      />
                    </div>
                    <div className="ov2-dept-meta">
                      <span className={`ov2-dept-pct ${barColor}`}>{pct}%</span>
                      <span className="ov2-dept-count">
                        {entry.present}/{entry.head}
                      </span>
                    </div>
                  </div>
                )
              })}
              {visibleDeptEntries.length === 0 && (
                <div className="ov2-empty">No department data</div>
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="ov2-card ov2-approvals-card">
            <button
              className="ov2-card-head ov2-approvals-toggle"
              onClick={() => setPendingExpanded((v) => !v)}
              type="button"
            >
              <div>
                <div className="ov2-card-title">Pending Approvals</div>
                <div className="ov2-card-sub">
                  {visiblePendingLeaveRows.length} request
                  {visiblePendingLeaveRows.length === 1 ? '' : 's'} awaiting
                </div>
              </div>
              <span className={`ov2-collapse-btn${pendingExpanded ? ' open' : ''}`}>
                {pendingExpanded ? '↑' : '↓'}
              </span>
            </button>
            {pendingExpanded && (
              <div className="ov2-approvals-list">
                {visiblePendingLeaveRows.slice(0, 6).map((row: any, i: number) => {
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
                        onClick={() => void handleAlertManager(row)}
                        disabled={alertLoadingKey === key}
                        type="button"
                      >
                        {alertLoadingKey === key ? '…' : 'Alert Mgr'}
                      </button>
                    </div>
                  )
                })}
                {visiblePendingLeaveRows.length === 0 && (
                  <div className="ov2-empty">No pending approvals right now.</div>
                )}
                {alertStatus && <div className="ov2-alert-status">{alertStatus}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
