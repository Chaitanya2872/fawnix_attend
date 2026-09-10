"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KpiCard = KpiCard;
exports.KpiStrip = KpiStrip;
var Deltabadge_1 = require("./Deltabadge");
function KpiCard(_a) {
    var label = _a.label, period = _a.period, color = _a.color, icon = _a.icon, value = _a.value, sub = _a.sub, delta = _a.delta, deltaLabel = _a.deltaLabel, deltaGood = _a.deltaGood, liveChip = _a.liveChip, sparkData = _a.sparkData, progressPct = _a.progressPct, miniList = _a.miniList, _b = _a.celebration, celebration = _b === void 0 ? false : _b;
    return (<div className={"ov2-kpi-card".concat(celebration ? ' birthday-celebration' : color === 'red' ? ' exceptions' : '')}>
      <div className="ov2-kpi-top">
        <div className={"ov2-kpi-icon-wrap ".concat(color)}>{icon}</div>
        <div>
          <div className="ov2-kpi-label">{label}</div>
          <div className="ov2-kpi-period">{period}</div>
        </div>
        {liveChip && <span className="ov2-live-chip">LIVE</span>}
      </div>

      <div className={"ov2-kpi-num ".concat(color)}>{value}</div>
      <div className="ov2-kpi-sub">{sub}</div>

      <Deltabadge_1.DeltaBadge delta={delta} label={deltaLabel} good={deltaGood}/>

      {sparkData && (<div className="ov2-sparkline">
          {sparkData.map(function (h, i) { return (<div key={i} className={"ov2-spark-bar ".concat(color)} style={{ height: "".concat(h, "%") }}/>); })}
        </div>)}

      {progressPct !== undefined && (<div className="ov2-kpi-progress-wrap">
          <div className={"ov2-kpi-progress ".concat(color)} style={{ width: "".concat(Math.min(progressPct, 100), "%") }}/>
        </div>)}

      {miniList && miniList.length > 0 && (<div className="ov2-exc-mini-list">
          {miniList.map(function (name, i) { return (<div key={i} className="ov2-exc-mini-item">
              <span className="ov2-exc-mini-dot red"/>
              <span>{name}</span>
            </div>); })}
        </div>)}
    </div>);
}
function KpiStrip(_a) {
    var averageWeeklyAttendance = _a.averageWeeklyAttendance, presentToday = _a.presentToday, totalEmployees = _a.totalEmployees, weekLabel = _a.weekLabel, attendanceDelta = _a.attendanceDelta, sparkData = _a.sparkData, missedLoginEmployeeName = _a.missedLoginEmployeeName, missedLoginCount = _a.missedLoginCount, monthlyLeaveRequests = _a.monthlyLeaveRequests, previousMonthLeaveRequests = _a.previousMonthLeaveRequests, monthlyLabel = _a.monthlyLabel, leavesDelta = _a.leavesDelta, leaveSparkData = _a.leaveSparkData, leavePrevMonthLabel = _a.leavePrevMonthLabel, upcomingBirthdayCount = _a.upcomingBirthdayCount, nextBirthdayName = _a.nextBirthdayName, prevMonthLabel = _a.prevMonthLabel;
    return (<div className="ov2-kpi-row">
      <KpiCard label="Attendance Rate" period={"Weekly \u00B7 ".concat(weekLabel)} color="green" icon={<svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>} value={"".concat(averageWeeklyAttendance, "%")} sub={"".concat(presentToday, " / ").concat(totalEmployees, " present today")} delta={attendanceDelta} deltaLabel={"vs ".concat(prevMonthLabel)} deltaGood="up" sparkData={sparkData}/>

      <KpiCard label="Most Missed Logins" period="Last 30 days · Non-flexible" color="blue" icon={<svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>} value={missedLoginCount} sub={missedLoginEmployeeName || 'No missed logins'} delta={null} deltaLabel="Approved leaves excluded" deltaGood="down"/>

      <KpiCard label="Leave Requests" period={"Monthly \u00B7 ".concat(monthlyLabel)} color="amber" icon={<svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>} value={monthlyLeaveRequests} sub={"This month ".concat(monthlyLeaveRequests, " \u00B7 last month ").concat(previousMonthLeaveRequests)} delta={leavesDelta} deltaLabel={"vs ".concat(leavePrevMonthLabel)} deltaGood="down" sparkData={leaveSparkData}/>

      <KpiCard label="Upcoming Birthdays" period="Next 30 days" color="red" celebration icon={<svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M2 6.5h12v7.75H2V6.5zM1.5 4h13v2.5h-13V4zM8 4v10.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 4H5.65a1.55 1.55 0 1 1 0-3.1C7.35.9 8 4 8 4zm0 0h2.35a1.55 1.55 0 1 0 0-3.1C8.65.9 8 4 8 4z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>} value={upcomingBirthdayCount} sub={nextBirthdayName ? "Next: ".concat(nextBirthdayName) : 'No birthdays scheduled'} delta={null} deltaLabel="" deltaGood="up"/>
    </div>);
}
