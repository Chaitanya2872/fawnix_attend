type TrendItem = { label: string; count: number }

type AttendanceTrendChartProps = {
  trend: TrendItem[]
  weekLabel: string
  averageWeeklyAttendance: number
  presentToday: number
  lateExceptionsToday: number
  selectedDateLeavesCount: number
  fieldVisitsCount: number
  fieldActive: number
  totalEmployees: number
}

export function AttendanceTrendChart({
  trend,
  weekLabel,
  averageWeeklyAttendance,
  presentToday,
  lateExceptionsToday,
  selectedDateLeavesCount,
  fieldVisitsCount,
  fieldActive,
  totalEmployees,
}: AttendanceTrendChartProps) {
  const maxWeekly = Math.max(...trend.map((i) => i.count), 1)

  return (
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
        {trend.map((item, i) => {
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
        {trend.length === 0 && <div className="ov2-empty">No attendance data available</div>}
      </div>

      <div className="ov2-chart-insights">
        <div className="ov2-chart-insight">
          <span>On Leave Today</span>
          <strong>{selectedDateLeavesCount}</strong>
        </div>
        <div className="ov2-chart-insight">
          <span>Field Visits</span>
          <strong>{fieldVisitsCount}</strong>
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
  )
}