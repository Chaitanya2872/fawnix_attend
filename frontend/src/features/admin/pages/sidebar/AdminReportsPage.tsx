type Props = any

export default function AdminReportsPage(props: Props) {
  const {
    attendanceDateFilter,
    attendanceEfficiencyScores,
    attendanceReportFormat,
    attendanceReportMonth,
    attendanceReportStatus,
    attendanceReportYear,
    downloadDailyAttendanceReport,
    downloadMonthlyAttendanceReport,
    loadDashboard,
    maxWeeklyAttendance,
    setAttendanceDateFilter,
    setAttendanceReportFormat,
    setAttendanceReportMonth,
    setAttendanceReportYear,
    weeklyAttendanceTrend,
    weeklyTrendPoints
  } = props

  return (
    <>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Reports & Analytics</h2>
        </div>
        <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">Refresh</button>
      </div>
      <div className="reports-main">
        <div className="report-toolbar">
          <div className="attendance-filter attendance-filter-date">
            <label htmlFor="reports-date">Reference Date</label>
            <input className="modern-date-input" id="reports-date" type="date" value={attendanceDateFilter} onChange={(event) => setAttendanceDateFilter(event.target.value)} />
          </div>
          <div className="attendance-filter attendance-filter-compact">
            <label htmlFor="attendance-month">Month</label>
            <select id="attendance-month" value={attendanceReportMonth} onChange={(event) => setAttendanceReportMonth(event.target.value)}>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </div>
          <div className="attendance-filter attendance-filter-compact">
            <label htmlFor="attendance-year">Year</label>
            <select id="attendance-year" value={attendanceReportYear} onChange={(event) => setAttendanceReportYear(event.target.value)}>
              {Array.from({ length: 6 }, (_, index) => {
                const year = new Date().getFullYear() - index
                return <option key={year} value={year}>{year}</option>
              })}
            </select>
          </div>
          <div className="attendance-filter attendance-filter-compact">
            <label htmlFor="attendance-format">Format</label>
            <select id="attendance-format" value={attendanceReportFormat} onChange={(event) => setAttendanceReportFormat(event.target.value)}>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
            </select>
          </div>
        </div>
        <div className="report-actions-card">
          <div>
            <strong>Download Reports</strong>
            <span>Export daily attendance by date and monthly attendance summaries.</span>
          </div>
          <div className="report-actions">
            <button className="cta dashboard-button" onClick={downloadDailyAttendanceReport} type="button">Daily Attendance</button>
            <button className="ghost dashboard-button" onClick={downloadMonthlyAttendanceReport} type="button">Monthly Summary</button>
          </div>
          {attendanceReportStatus ? <span className="report-status attendance-report-status">{attendanceReportStatus}</span> : null}
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Weekly Attendance Trend</strong>
              <span>Unique employee clock-ins across the last 7 days.</span>
            </div>
          </div>
          <div className="line-chart-shell">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart">
              <polyline fill="none" stroke="#1fa7a4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={weeklyTrendPoints} />
              {weeklyAttendanceTrend.map((item: any, index: number) => {
                const x = weeklyAttendanceTrend.length > 1 ? (index / (weeklyAttendanceTrend.length - 1)) * 100 : 50
                const y = 100 - (item.count / maxWeeklyAttendance) * 100
                return <circle key={item.dateKey} cx={x} cy={y} r="2.5" fill="#112c32" />
              })}
            </svg>
            <div className="line-chart-labels">
              {weeklyAttendanceTrend.map((item: any) => (
                <div key={item.dateKey} className="chart-label-block">
                  <strong>{item.count}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Attendance Efficiency Score</strong>
              <span>Employee presence score across the same 7-day window.</span>
            </div>
          </div>
          <div className="efficiency-list">
            {attendanceEfficiencyScores.length ? (
              attendanceEfficiencyScores.map((item: any) => (
                <div key={item.empCode || item.name} className="efficiency-row">
                  <div className="efficiency-meta">
                    <strong>{item.name}</strong>
                    <span>{item.presentDays} / 7 days present</span>
                  </div>
                  <div className="efficiency-bar-track">
                    <div className="efficiency-bar-fill" style={{ width: `${item.score}%` }} />
                  </div>
                  <strong className="efficiency-score">{item.score}%</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">No attendance data available for analytics yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
