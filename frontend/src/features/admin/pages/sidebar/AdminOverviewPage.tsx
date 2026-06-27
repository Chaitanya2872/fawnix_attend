import { useEffect, useMemo, useState } from 'react'

type Props = any

function toMonthKey(value?: string) {
  return (value || '').slice(0, 7)
}

function getWeekRangeLabel(value: string) {
  const base = new Date(`${value}T00:00:00`)
  if (Number.isNaN(base.getTime())) {
    return 'This week'
  }

  const start = new Date(base)
  const day = start.getDay()
  start.setDate(start.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 17) {
    return 'Good afternoon'
  }
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
  weeklyAttendanceTrend
}: Props) {
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [lastSyncLabel, setLastSyncLabel] = useState('just now')

  const activeEmployees = employees.filter((employee: any) => employee.is_active !== false).length
  const totalEmployees = activeEmployees || employees.length
  const presentToday = firstClockInRows.length
  const pendingLeaveRows = leaveRows.filter((row: any) => (row.status || '').trim().toLowerCase() === 'pending')
  const lateExceptionsToday = selectedDateExceptions.filter((row: any) => {
    const combined = `${row?.type || ''} ${row?.reason || ''} ${row?.message || ''}`.toLowerCase()
    return combined.includes('late')
  }).length
  const fieldActive = fieldVisitRows.filter((row: any) => {
    const status = `${row?.status || row?.visitStatus || ''}`.toLowerCase()
    return status ? !status.includes('complete') && !status.includes('closed') : true
  }).length

  const weekLabel = getWeekRangeLabel(attendanceDateFilter)
  const monthlyLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const selectedDateLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  const monthKey = toMonthKey(attendanceDateFilter)
  const selectedMonthLeaves = leaveRows.filter((row: any) => toMonthKey(row.from_date || row.to_date || '') === monthKey)

  const averageWeeklyAttendance = weeklyAttendanceTrend.length
    ? Math.round(
        (weeklyAttendanceTrend.reduce((sum: number, item: any) => sum + item.count, 0) /
          weeklyAttendanceTrend.length /
          Math.max(totalEmployees, 1)) *
          100
      )
    : 0

  const punctualityRate = totalEmployees
    ? Math.max(0, Math.round(((presentToday - lateExceptionsToday) / Math.max(presentToday || totalEmployees, 1)) * 100))
    : 0

  const monthlyLeaveApprovals = selectedMonthLeaves.length
  const weeklyExceptionCount = selectedDateExceptions.length
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const deptEntries = useMemo(() => {
    const deptMap: Record<string, { head: number; present: number }> = {}

    employees.forEach((employee: any) => {
      const dept = (employee.emp_department || 'Unassigned').trim()
      if (!deptMap[dept]) {
        deptMap[dept] = { head: 0, present: 0 }
      }
      deptMap[dept].head += 1
    })

    firstClockInRows.forEach((row: any) => {
      const dept = (row.emp_department || row.emp_designation || 'Unassigned').trim()
      if (!deptMap[dept]) {
        deptMap[dept] = { head: 0, present: 0 }
      }
      deptMap[dept].present += 1
    })

    return Object.entries(deptMap)
      .sort((left, right) => right[1].head - left[1].head)
      .slice(0, 6)
  }, [employees, firstClockInRows])

  const visibleDeptEntries = useMemo(() => {
    if (!normalizedSearchTerm) {
      return deptEntries
    }

    return deptEntries.filter(([dept]) => dept.toLowerCase().includes(normalizedSearchTerm))
  }, [deptEntries, normalizedSearchTerm])

  const visiblePendingLeaveRows = useMemo(() => {
    if (!normalizedSearchTerm) {
      return pendingLeaveRows
    }

    return pendingLeaveRows.filter((row: any) => {
      const haystack = [
        row.emp_full_name,
        row.emp_code,
        row.emp_department,
        row.leave_type,
        row.reason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearchTerm)
    })
  }, [normalizedSearchTerm, pendingLeaveRows])

  const maxDeptHeadcount = Math.max(...visibleDeptEntries.map(([, entry]) => entry.head), 1)
  const maxWeeklyAttendance = Math.max(...weeklyAttendanceTrend.map((item: any) => item.count), 1)
  const greeting = getGreeting()
  const headline = `${presentToday} of ${totalEmployees} present today - ${weeklyExceptionCount} exceptions need attention - ${fieldActive} agents in the field`
  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setLastSyncLabel('just now')
    const timer = window.setTimeout(() => {
      setLastSyncLabel('moments ago')
    }, 60000)

    return () => window.clearTimeout(timer)
  }, [attendanceDateFilter, presentToday, weeklyExceptionCount, monthlyLeaveApprovals, fieldActive])

  const handleAlertManager = async (row: any) => {
    const rowKey = String(row.id || row.emp_code || row.manager_code || Math.random())
    setAlertLoadingKey(rowKey)
    setAlertStatus('')

    try {
      const nextStatus = await onAlertManager(row)
      setAlertStatus(nextStatus)
    } catch (error) {
      setAlertStatus(error instanceof Error ? error.message : 'Failed to alert manager.')
    } finally {
      setAlertLoadingKey('')
    }
  }

  const handleRefresh = async () => {
    setLastSyncLabel('syncing...')
    try {
      await loadDashboard()
      setLastSyncLabel('just now')
    } catch {
      setLastSyncLabel('retry needed')
    }
  }

  return (
    <div className="overview-shell">
      <div className="overview-toolbar">
        <div className="overview-search">
          <span className="overview-search-icon" aria-hidden="true">⌕</span>
          <input
            aria-label="Search activity, employees, events"
            placeholder="Search activity, employees, events"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="overview-toolbar-status">
          <div className="overview-toolbar-chip">
            <span className="overview-toolbar-dot" aria-hidden="true" />
            <strong>{timeLabel}</strong>
            <span>{dateLabel}</span>
          </div>
          <div className="overview-toolbar-chip muted">
            <span className="overview-toolbar-sync" aria-hidden="true">↻</span>
            <span>Synced {lastSyncLabel}</span>
          </div>
        </div>
      </div>

      <div className="overview-topbar">
        <div className="overview-topbar-copy">
          <span className="overview-greeting">{greeting}</span>
          <h2 className="overview-headline">{`${greeting}, Admin`}</h2>
          <p className="overview-headline-sub">{headline}</p>
          <p className="overview-topbar-meta">Live admin overview for {selectedDateLabel}. Weekly and monthly KPI labels match the selected reporting window.</p>
          <div className="overview-meta-row">
            <span className="overview-meta-chip">Today at a glance</span>
            <span className="overview-meta-chip">{weekLabel}</span>
            <span className="overview-meta-chip">{monthlyLabel}</span>
          </div>
        </div>
        <button className="ghost dashboard-button overview-refresh-button" onClick={() => void handleRefresh()} type="button">
          Refresh
        </button>
      </div>

      <div className="overview-grid-label">Today at a glance</div>

      <div className="overview-kpi-grid">
        <div className="overview-kpi-card emphasis-green">
          <div className="overview-kpi-accent" />
          <div className="overview-kpi-head">
            <div className="overview-kpi-title">
              <span className="overview-kpi-icon green">A</span>
              <span className="overview-kpi-label">Attendance Rate</span>
            </div>
            <span className="overview-kpi-tag">Weekly</span>
          </div>
          <strong className="overview-kpi-value">{averageWeeklyAttendance}%</strong>
          <span className="overview-kpi-meta">{presentToday} / {totalEmployees} present</span>
        </div>

        <div className="overview-kpi-card">
          <div className="overview-kpi-accent blue" />
          <div className="overview-kpi-head">
            <div className="overview-kpi-title">
              <span className="overview-kpi-icon blue">P</span>
              <span className="overview-kpi-label">Punctuality</span>
            </div>
            <span className="overview-kpi-tag">Today</span>
          </div>
          <strong className="overview-kpi-value">{punctualityRate}%</strong>
          <span className="overview-kpi-meta">{lateExceptionsToday} late exception{lateExceptionsToday === 1 ? '' : 's'}</span>
        </div>

        <div className="overview-kpi-card">
          <div className="overview-kpi-accent amber" />
          <div className="overview-kpi-head">
            <div className="overview-kpi-title">
              <span className="overview-kpi-icon amber">L</span>
              <span className="overview-kpi-label">Leave Requests</span>
            </div>
            <span className="overview-kpi-tag">Monthly</span>
          </div>
          <strong className="overview-kpi-value">{monthlyLeaveApprovals}</strong>
          <span className="overview-kpi-meta">{monthlyLabel}</span>
        </div>

        <div className="overview-kpi-card emphasis-red">
          <div className="overview-kpi-accent red" />
          <div className="overview-kpi-head">
            <div className="overview-kpi-title">
              <span className="overview-kpi-icon red">!</span>
              <span className="overview-kpi-label">Exceptions</span>
            </div>
            <span className="overview-kpi-tag">Weekly</span>
          </div>
          <strong className="overview-kpi-value">{weeklyExceptionCount}</strong>
          <span className="overview-kpi-meta">{weekLabel}</span>
        </div>
      </div>

      <div className="overview-summary-grid">
        <div className="chart-card overview-chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Attendance Trend</strong>
              <span className="chart-card-sub">Weekly attendance counts for {weekLabel}</span>
            </div>
          </div>
          <div className="weekly-bar-chart weekly-bar-chart-overview">
            {weeklyAttendanceTrend.map((item: any) => (
              <div key={item.label} className="weekly-bar-col">
                <span className="weekly-bar-count">{item.count}</span>
                <div className="weekly-bar-wrap">
                  <div
                    className="weekly-bar-fill overview-weekly-bar-fill"
                    style={{ height: `${maxWeeklyAttendance > 0 ? Math.round((item.count / maxWeeklyAttendance) * 100) : 0}%` }}
                    title={`${item.count} present`}
                  />
                </div>
                <span className="weekly-bar-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-insight-stack">
          <div className="overview-insight-card">
            <span className="overview-insight-label">Today Present</span>
            <strong>{presentToday}</strong>
            <small>{totalEmployees} employees in current scope</small>
          </div>

          <div className="overview-insight-card">
            <span className="overview-insight-label">On Leave Today</span>
            <strong>{selectedDateLeaves.length}</strong>
            <small>Approved leave records on {selectedDateLabel}</small>
          </div>

          <div className="overview-insight-card">
            <span className="overview-insight-label">Field Movement</span>
            <strong>{fieldVisitRows.length}</strong>
            <small>{fieldActive} active field visit{fieldActive === 1 ? '' : 's'} in progress</small>
          </div>
        </div>
      </div>

      <div className="overview-grid-label">Team and approvals</div>

      <div className="overview-detail-grid">
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Departments</strong>
              <span className="chart-card-sub">Headcount and present mix by department</span>
            </div>
            <span className="overview-card-meta">{visibleDeptEntries.length} visible</span>
          </div>
          <div className="dept-bars overview-dept-bars">
            {visibleDeptEntries.map(([dept, entry]: any) => {
              const presentPercent = Math.round((entry.present / Math.max(entry.head, 1)) * 100)
              return (
                <div key={dept} className="dept-bar-row">
                  <span className="dept-bar-label">{dept}</span>
                  <div className="dept-bar-track">
                    <div className="dept-bar-fill" style={{ width: `${Math.round((entry.head / maxDeptHeadcount) * 100)}%` }} />
                  </div>
                  <span className="dept-bar-count">{`${entry.present}/${entry.head} - ${presentPercent}%`}</span>
                </div>
              )
            })}
            {visibleDeptEntries.length === 0 ? <div className="empty-state" style={{ padding: '24px 0' }}>No department data</div> : null}
          </div>
        </div>

        <div className="chart-card pending-approvals-card">
          <button
            className={`pending-approvals-toggle${pendingExpanded ? ' open' : ''}`}
            onClick={() => setPendingExpanded((current) => !current)}
            type="button"
          >
            <div>
              <strong>Pending Approvals</strong>
              <span>{visiblePendingLeaveRows.length} request{visiblePendingLeaveRows.length === 1 ? '' : 's'} awaiting attention</span>
            </div>
            <span className="pending-approvals-pill">{pendingExpanded ? 'Collapse' : 'Expand'}</span>
          </button>

          {pendingExpanded ? (
            <div className="pending-approvals-list">
              {visiblePendingLeaveRows.length ? (
                visiblePendingLeaveRows.slice(0, 6).map((row: any, index: number) => {
                  const rowKey = String(row.id || row.emp_code || index)
                  return (
                    <div key={rowKey} className="pending-approval-row">
                      <div className="pending-approval-copy">
                        <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        <span>{formatLeaveTypeLabel(row)}</span>
                        <small>{`${row.from_date || '--'} to ${row.to_date || '--'}`}</small>
                      </div>
                      <button
                        className="ghost dashboard-button"
                        onClick={() => void handleAlertManager(row)}
                        disabled={alertLoadingKey === rowKey}
                        type="button"
                      >
                        {alertLoadingKey === rowKey ? 'Alerting...' : 'Alert Manager'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="empty-state">No pending approvals right now.</div>
              )}
              {alertStatus ? <span className="report-status">{alertStatus}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
