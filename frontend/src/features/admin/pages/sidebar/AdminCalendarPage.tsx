/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = any

export default function AdminCalendarPage({
  attendanceCountByDate,
  calendarDays,
  calendarMonthLabel,
  calendarMonthView,
  exceptionCountByDate,
  leaveCountByDate,
  maxCalendarAttendance,
  setAttendanceDateFilter,
  setCalendarMonthView,
  toDateInputValue
}: Props) {
  return (
    <>
      <div className="dashboard-section-head calendar-section-head">
        <div>
          <p className="eyebrow">Operations Calendar</p>
          <h2>Attendance Calendar</h2>
          <p className="calendar-head-copy">
            Monthly operational view with daily attendance volume, leave overlap, and exception signals.
          </p>
        </div>
        <div className="calendar-head-actions">
          <button className="ghost dashboard-button" type="button" onClick={() => setCalendarMonthView((current: Date) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>Previous</button>
          <button className="ghost dashboard-button" type="button" onClick={() => setCalendarMonthView(new Date())}>Today</button>
          <button className="ghost dashboard-button" type="button" onClick={() => setCalendarMonthView((current: Date) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>Next</button>
        </div>
      </div>
      <div className="metric-row">
        <div className="metric-card">
          <span>Month</span>
          <strong>{calendarMonthLabel}</strong>
          <small>Professional daily operations view</small>
        </div>
        <div className="metric-card">
          <span>Peak Attendance</span>
          <strong>{maxCalendarAttendance}</strong>
          <small>Highest attendance records in a single day</small>
        </div>
        <div className="metric-card">
          <span>Tracked Exceptions</span>
          <strong>{Object.values(exceptionCountByDate).reduce((sum: number, count: any) => sum + count, 0)}</strong>
          <small>Late arrivals and early leaves across loaded data</small>
        </div>
      </div>
      <div className="calendar-shell">
        <div className="calendar-card">
          <div className="calendar-card-head">
            <div>
              <span>Monthly View</span>
              <strong>{calendarMonthLabel}</strong>
            </div>
            <div className="calendar-legend">
              <span><i className="calendar-dot attendance" /> Attendance</span>
              <span><i className="calendar-dot leave" /> Leave</span>
              <span><i className="calendar-dot exception" /> Exceptions</span>
            </div>
          </div>
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid-page">
            {calendarDays.map((day: Date) => {
              const dayValue = toDateInputValue(day)
              const attendanceCount = attendanceCountByDate[dayValue] || 0
              const leaveCount = leaveCountByDate[dayValue] || 0
              const exceptionCount = exceptionCountByDate[dayValue] || 0
              const isCurrentMonth = day.getMonth() === calendarMonthView.getMonth()
              const isToday = dayValue === toDateInputValue(new Date())
              const heatLevel = attendanceCount > 0 ? Math.min(1, attendanceCount / maxCalendarAttendance) : 0
              return (
                <button key={dayValue} className={`calendar-day-card ${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''}`} type="button" onClick={() => setAttendanceDateFilter(dayValue)}>
                  <div className="calendar-day-top">
                    <span className="calendar-day-number">{day.getDate()}</span>
                    {isToday ? <span className="calendar-day-badge">Today</span> : null}
                  </div>
                  <div className="calendar-day-heat" style={{ opacity: Math.max(0.12, heatLevel), background: `linear-gradient(135deg, rgba(17, 44, 50, ${0.08 + heatLevel * 0.22}), rgba(17, 44, 50, ${0.18 + heatLevel * 0.3}))` }} />
                  <div className="calendar-day-stats">
                    <span>{attendanceCount} attendance</span>
                    <span>{leaveCount} leave</span>
                    <span>{exceptionCount} exceptions</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
