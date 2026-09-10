"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminReportsPage;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var AttendanceHeatmap_1 = require("./AttendanceHeatmap");
var AttendanceEfficiencyCard_1 = require("./AttendanceEfficiencyCard");
var ReportDownloadMenu_1 = require("./ReportDownloadMenu");
var WeeklyTrendChart_1 = require("./WeeklyTrendChart");
require("./AdminReportsPage.css");
var MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
var TREND_WINDOW_DAYS = 7;
/**
 * The window the summary cards describe. For the current month that is simply
 * "the last seven days"; for a past month it ends on the last day of the month
 * the user selected, so changing the period actually moves the numbers.
 */
function resolveInsightsEndDate(month, year) {
    var today = new Date();
    if (!Number.isFinite(month) || !Number.isFinite(year)) {
        return undefined;
    }
    if (month === today.getMonth() + 1 && year === today.getFullYear()) {
        return undefined;
    }
    var lastDay = new Date(year, month, 0).getDate();
    return "".concat(year, "-").concat(String(month).padStart(2, '0'), "-").concat(String(lastDay).padStart(2, '0'));
}
function toHeatmapMonthValue(month, year) {
    if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
        return '';
    }
    return "".concat(year, "-").concat(String(month).padStart(2, '0'));
}
function AdminReportsPage(props) {
    var attendanceEfficiencyScores = props.attendanceEfficiencyScores, attendanceReportFormat = props.attendanceReportFormat, attendanceReportMonth = props.attendanceReportMonth, attendanceReportStatus = props.attendanceReportStatus, attendanceReportYear = props.attendanceReportYear, reportDateMode = props.reportDateMode, setReportDateMode = props.setReportDateMode, reportStartDate = props.reportStartDate, setReportStartDate = props.setReportStartDate, reportEndDate = props.reportEndDate, setReportEndDate = props.setReportEndDate, downloadRangeReport = props.downloadRangeReport, loadDashboard = props.loadDashboard, maxWeeklyAttendance = props.maxWeeklyAttendance, setAttendanceReportFormat = props.setAttendanceReportFormat, setAttendanceReportMonth = props.setAttendanceReportMonth, setAttendanceReportYear = props.setAttendanceReportYear;
    var attendanceHeatmapData = props.attendanceHeatmapData, attendanceHeatmapLoading = props.attendanceHeatmapLoading, attendanceHeatmapStatus = props.attendanceHeatmapStatus, attendanceHeatmapSavingCell = props.attendanceHeatmapSavingCell, fetchAttendanceHeatmapData = props.fetchAttendanceHeatmapData, updateAttendanceCell = props.updateAttendanceCell, attendanceInsights = props.attendanceInsights, attendanceInsightsLoading = props.attendanceInsightsLoading, attendanceInsightsStatus = props.attendanceInsightsStatus, fetchAttendanceInsights = props.fetchAttendanceInsights, attendanceTrendSeries = props.attendanceTrendSeries, isAttendanceTrendPercentage = props.isAttendanceTrendPercentage, canWriteAdminData = props.canWriteAdminData;
    var heatmapMonth = Number(attendanceReportMonth);
    var heatmapYear = Number(attendanceReportYear);
    var insightsEndDate = resolveInsightsEndDate(heatmapMonth, heatmapYear);
    var heatmapMonthValue = toHeatmapMonthValue(heatmapMonth, heatmapYear);
    (0, react_1.useEffect)(function () {
        void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear);
    }, [fetchAttendanceHeatmapData, heatmapMonth, heatmapYear]);
    (0, react_1.useEffect)(function () {
        void fetchAttendanceInsights(insightsEndDate, TREND_WINDOW_DAYS);
    }, [fetchAttendanceInsights, insightsEndDate]);
    var heatmapMonthLabel = "".concat(MONTH_LABELS[heatmapMonth - 1] || '', " ").concat(heatmapYear).trim();
    var handleHeatmapMonthChange = function (value) {
        var _a = value.split('-').map(Number), yearValue = _a[0], monthValue = _a[1];
        if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) {
            return;
        }
        setAttendanceReportYear(String(yearValue));
        setAttendanceReportMonth(String(monthValue));
    };
    // Prefer the server scores — they exclude holidays, week offs and days before
    // an employee joined, which the locally derived ones count against everyone.
    var employeeScores = (attendanceInsights === null || attendanceInsights === void 0 ? void 0 : attendanceInsights.employees.length)
        ? attendanceInsights.employees.map(function (item) { return ({
            key: item.empCode,
            name: item.name,
            detail: "".concat(item.presentDays, " / ").concat(item.expectedDays, " expected days present"),
            score: item.score
        }); })
        : attendanceEfficiencyScores.map(function (item) { return ({
            key: item.empCode || item.name,
            name: item.name,
            detail: "".concat(item.presentDays, " / ").concat(TREND_WINDOW_DAYS, " days present"),
            score: item.score
        }); });
    var refreshAll = function () {
        void loadDashboard();
        void fetchAttendanceInsights(insightsEndDate, TREND_WINDOW_DAYS);
        void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear);
    };
    return (<div className="admin-aligned-page admin-aligned-page--reports">
      <div className="dashboard-section-head rp-head">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Reports &amp; Analytics</h2>
          <p className="rp-head-sub">Attendance insights, trends, efficiency and employee reports</p>
        </div>
        <div className="rp-head-actions">
          <button className="ghost dashboard-button" onClick={refreshAll} type="button">Refresh</button>
          <ReportDownloadMenu_1.default reportDateMode={reportDateMode} setReportDateMode={setReportDateMode} attendanceReportMonth={attendanceReportMonth} setAttendanceReportMonth={setAttendanceReportMonth} attendanceReportYear={attendanceReportYear} setAttendanceReportYear={setAttendanceReportYear} reportStartDate={reportStartDate} setReportStartDate={setReportStartDate} reportEndDate={reportEndDate} setReportEndDate={setReportEndDate} attendanceReportFormat={attendanceReportFormat} setAttendanceReportFormat={setAttendanceReportFormat} onDownload={function (reportType) { return void downloadRangeReport(reportType); }} statusMessage={attendanceReportStatus}/>
        </div>
      </div>

      <div className="reports-main">
        <div className="rp-summary-grid">
          <AttendanceEfficiencyCard_1.default insights={attendanceInsights} loading={attendanceInsightsLoading} statusMessage={attendanceInsightsStatus}/>

          <div className="chart-card rp-trend-card">
            <div className="chart-card-head">
              <div>
                <strong>Weekly Attendance Trend</strong>
                <span>
                  {isAttendanceTrendPercentage
            ? 'Share of expected attendance met each day.'
            : 'Unique employee clock-ins across the last 7 days.'}
                </span>
              </div>
            </div>
            <WeeklyTrendChart_1.default series={attendanceTrendSeries} isPercentage={isAttendanceTrendPercentage} maxValue={maxWeeklyAttendance} loading={attendanceInsightsLoading}/>
          </div>
        </div>

        <div className="chart-card rp-heatmap-card">
          <div className="chart-card-head">
            <div>
              <strong>Attendance Heatmap</strong>
              <span>
                {"Daily status per employee for ".concat(heatmapMonthLabel, ".").concat(canWriteAdminData ? ' Click a cell to correct it.' : '')}
              </span>
            </div>
            <label className="rp-heatmap-filter" htmlFor="attendance-heatmap-month">
              <span>Date</span>
              <input className="modern-date-input" id="attendance-heatmap-month" type="month" min="2000-01" max="2100-12" value={heatmapMonthValue} onChange={function (event) { return handleHeatmapMonthChange(event.target.value); }}/>
            </label>
          </div>
          <AttendanceHeatmap_1.default data={attendanceHeatmapData} efficiencyScores={employeeScores} loading={attendanceHeatmapLoading} statusMessage={attendanceHeatmapStatus} savingCellKey={attendanceHeatmapSavingCell} canEdit={canWriteAdminData} onCellEdit={function (employeeId, date, newStatus) { return void updateAttendanceCell(employeeId, date, newStatus); }} onRefresh={function () { return void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear); }}/>
        </div>

      </div>
    </div>);
}
