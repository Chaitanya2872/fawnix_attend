import { useMemo, useState } from 'react'

type Props = any

function toMonthKey(value?: string) {
  return (value || '').slice(0, 7)
}

function getWeekRangeLabel(value: string) {
  const base = new Date(`${value}T00:00:00`)
  if (Number.isNaN(base.getTime())) {
    return 'this week'
  }

  const start = new Date(base)
  const day = start.getDay()
  start.setDate(start.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
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
  const [pendingExpanded, setPendingExpanded] = useState(false)
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')

  const activeEmployees = employees.filter((employee: any) => employee.is_active !== false).length
  const presentToday = firstClockInRows.length
  const onLeaveToday = selectedDateLeaves.length
  const pendingLeaveRows = leaveRows.filter((row: any) => (row.status || '').trim().toLowerCase() === 'pending')
  const monthKey = toMonthKey(attendanceDateFilter)
  const selectedMonthLeaves = leaveRows.filter((row: any) => toMonthKey(row.from_date || row.to_date || '') === monthKey)
  const weekLabel = getWeekRangeLabel(attendanceDateFilter)
  const monthlyLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const fieldVisitsThisWeek = fieldVisitRows.filter((row: any) => {
    const dateValue = row.visitDate || row.visitStartTime || ''
    return weeklyAttendanceTrend.some((item: any) => dateValue.startsWith(item.dateKey))
  }).length
  const averageWeeklyAttendance = weeklyAttendanceTrend.length
    ? Math.round((weeklyAttendanceTrend.reduce((sum: number, item: any) => sum + item.count, 0) / weeklyAttendanceTrend.length / Math.max(activeEmployees || employees.length, 1)) * 100)
    : 0
  const exceptionCountThisWeek = selectedDateExceptions.length

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
      const dept = (row.emp_designation || 'Team').trim()
      if (!deptMap[dept]) {
        deptMap[dept] = { head: 0, present: 0 }
      }
      deptMap[dept].present += 1
    })

    return Object.entries(deptMap).sort((left, right) => right[1].head - left[1].head).slice(0, 6)
  }, [employees, firstClockInRows])

  const maxDeptHeadcount = Math.max(...deptEntries.map(([, entry]) => entry.head), 1)
  const maxWeeklyAttendance = Math.max(...weeklyAttendanceTrend.map((item: any) => item.count), 1)

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

  return (
    <>
      <div className="dashboard-section-head overview-section-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Operations Dashboard</h2>
          <span className="overview-head-copy">
            Weekly and monthly workforce signals aligned to the selected date.
          </span>
        </div>
        <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
          Refresh
        </button>
      </div>

      <div className="overview-kpi-grid">
        <div className="overview-kpi-card emphasis-green">
          <span className="overview-kpi-label">Weekly Attendance Rate</span>
          <strong className="overview-kpi-value">{averageWeeklyAttendance}%</strong>
          <span className="overview-kpi-meta">{weekLabel}</span>
        </div>
        <div className="overview-kpi-card">
          <span className="overview-kpi-label">Today Present</span>
          <strong className="overview-kpi-value">{presentToday}</strong>
          <span className="overview-kpi-meta">{activeEmployees} active employees in scope</span>
        </div>
        <div className="overview-kpi-card">
          <span className="overview-kpi-label">Monthly Leave Requests</span>
          <strong className="overview-kpi-value">{selectedMonthLeaves.length}</strong>
          <span className="overview-kpi-meta">{monthlyLabel}</span>
        </div>
        <div className="overview-kpi-card emphasis-red">
          <span className="overview-kpi-label">Weekly Exceptions</span>
          <strong className="overview-kpi-value">{exceptionCountThisWeek}</strong>
          <span className="overview-kpi-meta">{weekLabel}</span>
        </div>
      </div>

      <div className="overview-summary-grid">
        <div className="chart-card overview-chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Weekly Attendance</strong>
              <span className="chart-card-sub">Attendance counts for {weekLabel}</span>
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
            <span className="overview-insight-label">On Leave Today</span>
            <strong>{onLeaveToday}</strong>
            <small>Approved leave records on {attendanceDateFilter}</small>
          </div>
          <div className="overview-insight-card">
            <span className="overview-insight-label">Field Visits This Week</span>
            <strong>{fieldVisitsThisWeek}</strong>
            <small>Visits logged across the current weekly window</small>
          </div>
          <div className="overview-insight-card">
            <span className="overview-insight-label">Pending Leave Approvals</span>
            <strong>{pendingLeaveRows.length}</strong>
            <small>Open approvals awaiting manager action</small>
          </div>
        </div>
      </div>

      <div className="overview-detail-grid">
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Team Distribution</strong>
              <span className="chart-card-sub">Headcount and present mix by department</span>
            </div>
          </div>
          <div className="dept-bars overview-dept-bars">
            {deptEntries.map(([dept, entry]: any) => (
              <div key={dept} className="dept-bar-row">
                <span className="dept-bar-label">{dept}</span>
                <div className="dept-bar-track">
                  <div className="dept-bar-fill" style={{ width: `${Math.round((entry.head / maxDeptHeadcount) * 100)}%` }} />
                </div>
                <span className="dept-bar-count">{entry.head}</span>
              </div>
            ))}
            {deptEntries.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>No department data</div>
            ) : null}
          </div>
        </div>

        <div className="chart-card pending-approvals-card">
          <button
            className={`pending-approvals-toggle${pendingExpanded ? ' open' : ''}`}
            onClick={() => setPendingExpanded((current) => !current)}
            type="button"
          >
            <div>
              <strong>Pending Leave Approvals</strong>
              <span>{pendingLeaveRows.length} request{pendingLeaveRows.length === 1 ? '' : 's'} awaiting attention</span>
            </div>
            <span className="pending-approvals-pill">{pendingExpanded ? 'Collapse' : 'Expand'}</span>
          </button>

          {pendingExpanded ? (
            <div className="pending-approvals-list">
              {pendingLeaveRows.length ? (
                pendingLeaveRows.slice(0, 6).map((row: any, index: number) => {
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
    </>
  )
}
