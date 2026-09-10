"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainGrid = MainGrid;
var Attendancetrendchart_1 = require("./Attendancetrendchart");
var UpcomingBirthdaysPanel_1 = require("./UpcomingBirthdaysPanel");
var WorkAnniversariesPanel_1 = require("./WorkAnniversariesPanel");
function MainGrid(_a) {
    var trend = _a.trend, weekLabel = _a.weekLabel, averageWeeklyAttendance = _a.averageWeeklyAttendance, presentToday = _a.presentToday, selectedDateLeavesCount = _a.selectedDateLeavesCount, fieldVisitsCount = _a.fieldVisitsCount, fieldActive = _a.fieldActive, totalEmployees = _a.totalEmployees, birthdays = _a.birthdays, workAnniversaries = _a.workAnniversaries;
    return (<div className="ov2-main-grid">
      <Attendancetrendchart_1.AttendanceTrendChart trend={trend} weekLabel={weekLabel} averageWeeklyAttendance={averageWeeklyAttendance} presentToday={presentToday} selectedDateLeavesCount={selectedDateLeavesCount} fieldVisitsCount={fieldVisitsCount} fieldActive={fieldActive} totalEmployees={totalEmployees}/>
      <UpcomingBirthdaysPanel_1.UpcomingBirthdaysPanel birthdays={birthdays}/>
      <WorkAnniversariesPanel_1.WorkAnniversariesPanel anniversaries={workAnniversaries}/>
    </div>);
}
