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
exports.AttendanceTrendChart = AttendanceTrendChart;
function AttendanceTrendChart(_a) {
    var trend = _a.trend, weekLabel = _a.weekLabel, averageWeeklyAttendance = _a.averageWeeklyAttendance, presentToday = _a.presentToday, selectedDateLeavesCount = _a.selectedDateLeavesCount, fieldVisitsCount = _a.fieldVisitsCount, fieldActive = _a.fieldActive, totalEmployees = _a.totalEmployees;
    var maxWeekly = Math.max.apply(Math, __spreadArray(__spreadArray([], trend.map(function (i) { return i.count; }), false), [1], false));
    return (<div className="ov2-card ov2-chart-card">
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
        </div>
      </div>

      <div className="ov2-bar-chart">
        {trend.map(function (item, i) {
            var h = maxWeekly > 0 ? Math.round((item.count / maxWeekly) * 100) : 0;
            return (<div key={item.label || i} className="ov2-bar-col">
              <span className="ov2-bar-val">{item.count}</span>
              <div className="ov2-bar-track">
                <div className="ov2-bar-fill" style={{ height: "".concat(h, "%") }}/>
              </div>
              <span className="ov2-bar-lbl">{item.label}</span>
            </div>);
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
    </div>);
}
