type Props = any

export default function AdminOverviewPage({
  attendanceDateFilter,
  employees,
  fieldVisitRows,
  firstClockInRows,
  loadDashboard,
  selectedDateLeaves,
  weeklyAttendanceTrend
}: Props) {
  const activeEmployees = employees.filter((employee: any) => employee.is_active !== false).length
  const presentToday = firstClockInRows.length
  const onLeaveToday = selectedDateLeaves.length
  const fieldVisitsToday = fieldVisitRows.filter((row: any) => {
    const dateValue = row.visitDate || row.visitStartTime || ''
    return dateValue.startsWith(attendanceDateFilter)
  }).length
  const deptMap: Record<string, number> = {}
  employees.forEach((employee: any) => {
    const dept = (employee.emp_department || 'Unassigned').trim()
    deptMap[dept] = (deptMap[dept] || 0) + 1
  })
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxDept = Math.max(...deptEntries.map((dept) => dept[1]), 1)
  const maxWeeklyAttendance = Math.max(...weeklyAttendanceTrend.map((item: any) => item.count), 1)

  return (
    <>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
        <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
          Refresh
        </button>
      </div>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-icon kpi-blue">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Employees</span>
            <strong className="kpi-value">{employees.length}</strong>
            <span className="kpi-sub">{activeEmployees} active</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-green">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Present Today</span>
            <strong className="kpi-value">{presentToday}</strong>
            <span className="kpi-sub">{employees.length ? Math.round((presentToday / employees.length) * 100) : 0}% attendance</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-orange">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8"/></svg>
          </div>
          <div className="kpi-body">
            <span className="kpi-label">On Leave</span>
            <strong className="kpi-value">{onLeaveToday}</strong>
            <span className="kpi-sub">Approved leaves</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-purple">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Field Visits</span>
            <strong className="kpi-value">{fieldVisitsToday}</strong>
            <span className="kpi-sub">Today</span>
          </div>
        </div>
      </div>
      <div className="dashboard-charts-row">
        <div className="chart-card">
          <div className="chart-card-head">
            <strong>Weekly Attendance</strong>
            <span className="chart-card-sub">Last 7 days</span>
          </div>
          <div className="weekly-bar-chart">
            {weeklyAttendanceTrend.map((item: any) => (
              <div key={item.label} className="weekly-bar-col">
                <div className="weekly-bar-wrap">
                  <div
                    className="weekly-bar-fill"
                    style={{ height: `${maxWeeklyAttendance > 0 ? Math.round((item.count / maxWeeklyAttendance) * 100) : 0}%` }}
                    title={`${item.count} present`}
                  />
                </div>
                <span className="weekly-bar-label">{item.label}</span>
                <span className="weekly-bar-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <strong>Departments</strong>
            <span className="chart-card-sub">Employee distribution</span>
          </div>
          <div className="dept-bars">
            {deptEntries.map(([dept, count]) => (
              <div key={dept} className="dept-bar-row">
                <span className="dept-bar-label">{dept}</span>
                <div className="dept-bar-track">
                  <div className="dept-bar-fill" style={{ width: `${Math.round((count / maxDept) * 100)}%` }} />
                </div>
                <span className="dept-bar-count">{count}</span>
              </div>
            ))}
            {deptEntries.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>No department data</div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
