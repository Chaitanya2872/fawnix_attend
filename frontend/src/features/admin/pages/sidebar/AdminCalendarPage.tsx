/* eslint-disable @typescript-eslint/no-explicit-any */
import './AdminCalendarPage.css'

type Props = any

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  const totalExceptions = Object.values(exceptionCountByDate).reduce(
    (sum: number, count: any) => sum + count,
    0
  )

  // Local peaks so the signal bars scale honestly against what's actually on screen,
  // not just against the attendance metric passed in from the parent.
  const maxLeave = Math.max(
    1,
    ...calendarDays.map((day: Date) => leaveCountByDate[toDateInputValue(day)] || 0)
  )
  const maxException = Math.max(
    1,
    ...calendarDays.map((day: Date) => exceptionCountByDate[toDateInputValue(day)] || 0)
  )

  return (
    <div className="ops-cal">
      <div className="ops-cal-head">
        <div>
          <p className="ops-cal-eyebrow">Operations Calendar</p>
          <h2 className="ops-cal-title">Attendance Calendar</h2>
          <p className="ops-cal-copy">
            Monthly operational view with daily attendance volume, leave overlap, and exception signals.
          </p>
        </div>
        <div className="ops-cal-nav">
          <button
            className="ops-cal-nav-btn"
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCalendarMonthView(
                (current: Date) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
              )
            }
          >
            ‹
          </button>
          <button className="ops-cal-nav-today" type="button" onClick={() => setCalendarMonthView(new Date())}>
            Today
          </button>
          <button
            className="ops-cal-nav-btn"
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCalendarMonthView(
                (current: Date) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
              )
            }
          >
            ›
          </button>
        </div>
      </div>

      <div className="ops-cal-metrics">
        <div className="ops-metric ops-metric-ink">
          <span className="ops-metric-label">Month</span>
          <strong className="ops-metric-value">{calendarMonthLabel}</strong>
          <small className="ops-metric-caption">Current operations window</small>
        </div>
        <div className="ops-metric ops-metric-teal">
          <span className="ops-metric-label">Peak attendance</span>
          <strong className="ops-metric-value">{maxCalendarAttendance}</strong>
          <small className="ops-metric-caption">Highest single-day count</small>
        </div>
        <div className="ops-metric ops-metric-rust">
          <span className="ops-metric-label">Tracked exceptions</span>
          <strong className="ops-metric-value">{totalExceptions}</strong>
          <small className="ops-metric-caption">Late arrivals + early leaves</small>
        </div>
      </div>

      <div className="ops-cal-panel">
        <div className="ops-cal-panel-head">
          <div>
            <span className="ops-metric-label">Monthly view</span>
            <strong className="ops-cal-panel-title">{calendarMonthLabel}</strong>
          </div>
          <div className="ops-cal-legend">
            <span><i className="ops-dot ops-dot-teal" />Attendance</span>
            <span><i className="ops-dot ops-dot-gold" />Leave</span>
            <span><i className="ops-dot ops-dot-rust" />Exceptions</span>
          </div>
        </div>

        <div className="ops-cal-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="ops-cal-grid">
          {calendarDays.map((day: Date) => {
            const dayValue = toDateInputValue(day)
            const attendanceCount = attendanceCountByDate[dayValue] || 0
            const leaveCount = leaveCountByDate[dayValue] || 0
            const exceptionCount = exceptionCountByDate[dayValue] || 0
            const isCurrentMonth = day.getMonth() === calendarMonthView.getMonth()
            const isToday = dayValue === toDateInputValue(new Date())
            const hasSignal = attendanceCount + leaveCount + exceptionCount > 0

            const attendancePct = Math.min(1, attendanceCount / maxCalendarAttendance)
            const leavePct = Math.min(1, leaveCount / maxLeave)
            const exceptionPct = Math.min(1, exceptionCount / maxException)

            return (
              <button
                key={dayValue}
                className={`ops-day ${isCurrentMonth ? '' : 'ops-day-outside'} ${isToday ? 'ops-day-today' : ''}`}
                type="button"
                onClick={() => setAttendanceDateFilter(dayValue)}
              >
                <div className="ops-day-top">
                  <span className="ops-day-number">{day.getDate()}</span>
                  {isToday ? <span className="ops-day-badge">Today</span> : null}
                </div>

                <div className="ops-day-signal" aria-hidden={!hasSignal}>
                  <span className="ops-signal-bar ops-signal-teal" style={{ height: `${Math.max(hasSignal ? 12 : 0, attendancePct * 100)}%` }} />
                  <span className="ops-signal-bar ops-signal-gold" style={{ height: `${Math.max(hasSignal && leaveCount ? 12 : 0, leavePct * 100)}%` }} />
                  <span className="ops-signal-bar ops-signal-rust" style={{ height: `${Math.max(hasSignal && exceptionCount ? 12 : 0, exceptionPct * 100)}%` }} />
                </div>

                <div className="ops-day-stats">
                  <span>{attendanceCount}</span>
                  <span>{leaveCount}</span>
                  <span>{exceptionCount}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}