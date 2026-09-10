"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminCalendarPage;
/* eslint-disable @typescript-eslint/no-explicit-any */
require("./AdminCalendarPage.css");
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function AdminCalendarPage(_a) {
    var attendanceCountByDate = _a.attendanceCountByDate, calendarDays = _a.calendarDays, calendarMonthLabel = _a.calendarMonthLabel, calendarMonthView = _a.calendarMonthView, exceptionCountByDate = _a.exceptionCountByDate, leaveCountByDate = _a.leaveCountByDate, maxCalendarAttendance = _a.maxCalendarAttendance, setAttendanceDateFilter = _a.setAttendanceDateFilter, setCalendarMonthView = _a.setCalendarMonthView, toDateInputValue = _a.toDateInputValue;
    var totalExceptions = Object.values(exceptionCountByDate).reduce(function (sum, count) { return sum + count; }, 0);
    // Local peaks so the signal bars scale honestly against what's actually on screen,
    // not just against the attendance metric passed in from the parent.
    var maxLeave = Math.max.apply(Math, __spreadArray([1], calendarDays.map(function (day) { return leaveCountByDate[toDateInputValue(day)] || 0; }), false));
    var maxException = Math.max.apply(Math, __spreadArray([1], calendarDays.map(function (day) { return exceptionCountByDate[toDateInputValue(day)] || 0; }), false));
    return (<div className="ops-cal admin-aligned-page admin-aligned-page--calendar">
      <div className="ops-cal-head dashboard-section-head">
        <div>
          <p className="ops-cal-eyebrow eyebrow">Operations Calendar</p>
          <h2 className="ops-cal-title">Attendance Calendar</h2>
          <p className="ops-cal-copy">
            Monthly operational view with daily attendance volume, leave overlap, and exception signals.
          </p>
        </div>
        <div className="ops-cal-nav">
          <button className="ops-cal-nav-btn" type="button" aria-label="Previous month" onClick={function () {
            return setCalendarMonthView(function (current) { return new Date(current.getFullYear(), current.getMonth() - 1, 1); });
        }}>
            ‹
          </button>
          <button className="ops-cal-nav-today" type="button" onClick={function () { return setCalendarMonthView(new Date()); }}>
            Today
          </button>
          <button className="ops-cal-nav-btn" type="button" aria-label="Next month" onClick={function () {
            return setCalendarMonthView(function (current) { return new Date(current.getFullYear(), current.getMonth() + 1, 1); });
        }}>
            ›
          </button>
        </div>
      </div>

      <div className="ops-cal-metrics kpi-cards admin-kpi-cards">
        <div className="ops-metric ops-metric-ink kpi-card admin-kpi-card-static">
          <span className="ops-metric-label">Month</span>
          <strong className="ops-metric-value">{calendarMonthLabel}</strong>
          <small className="ops-metric-caption">Current operations window</small>
        </div>
        <div className="ops-metric ops-metric-teal kpi-card admin-kpi-card-static">
          <span className="ops-metric-label">Peak attendance</span>
          <strong className="ops-metric-value">{maxCalendarAttendance}</strong>
          <small className="ops-metric-caption">Highest single-day count</small>
        </div>
        <div className="ops-metric ops-metric-rust kpi-card admin-kpi-card-static">
          <span className="ops-metric-label">Tracked exceptions</span>
          <strong className="ops-metric-value">{totalExceptions}</strong>
          <small className="ops-metric-caption">Late arrivals + early leaves</small>
        </div>
      </div>

      <div className="ops-cal-panel table-card">
        <div className="ops-cal-panel-head">
          <div>
            <span className="ops-metric-label">Monthly view</span>
            <strong className="ops-cal-panel-title">{calendarMonthLabel}</strong>
          </div>
          <div className="ops-cal-legend">
            <span><i className="ops-dot ops-dot-teal"/>Attendance</span>
            <span><i className="ops-dot ops-dot-gold"/>Leave</span>
            <span><i className="ops-dot ops-dot-rust"/>Exceptions</span>
          </div>
        </div>

        <div className="ops-cal-weekdays">
          {WEEKDAYS.map(function (day) { return (<span key={day}>{day}</span>); })}
        </div>

        <div className="ops-cal-grid">
          {calendarDays.map(function (day) {
            var dayValue = toDateInputValue(day);
            var attendanceCount = attendanceCountByDate[dayValue] || 0;
            var leaveCount = leaveCountByDate[dayValue] || 0;
            var exceptionCount = exceptionCountByDate[dayValue] || 0;
            var isCurrentMonth = day.getMonth() === calendarMonthView.getMonth();
            var isToday = dayValue === toDateInputValue(new Date());
            var hasSignal = attendanceCount + leaveCount + exceptionCount > 0;
            var attendancePct = Math.min(1, attendanceCount / maxCalendarAttendance);
            var leavePct = Math.min(1, leaveCount / maxLeave);
            var exceptionPct = Math.min(1, exceptionCount / maxException);
            return (<button key={dayValue} className={"ops-day ".concat(isCurrentMonth ? '' : 'ops-day-outside', " ").concat(isToday ? 'ops-day-today' : '')} type="button" onClick={function () { return setAttendanceDateFilter(dayValue); }}>
                <div className="ops-day-top">
                  <span className="ops-day-number">{day.getDate()}</span>
                  {isToday ? <span className="ops-day-badge">Today</span> : null}
                </div>

                <div className="ops-day-signal" aria-hidden={!hasSignal}>
                  <span className="ops-signal-bar ops-signal-teal" style={{ height: "".concat(Math.max(hasSignal ? 12 : 0, attendancePct * 100), "%") }}/>
                  <span className="ops-signal-bar ops-signal-gold" style={{ height: "".concat(Math.max(hasSignal && leaveCount ? 12 : 0, leavePct * 100), "%") }}/>
                  <span className="ops-signal-bar ops-signal-rust" style={{ height: "".concat(Math.max(hasSignal && exceptionCount ? 12 : 0, exceptionPct * 100), "%") }}/>
                </div>

                <div className="ops-day-stats">
                  <span>{attendanceCount}</span>
                  <span>{leaveCount}</span>
                  <span>{exceptionCount}</span>
                </div>
              </button>);
        })}
        </div>
      </div>
    </div>);
}
