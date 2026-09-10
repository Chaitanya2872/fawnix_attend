"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportDownloadMenu;
var react_1 = require("react");
var MONTH_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
var REPORT_TYPES = [
    { value: 'attendance', label: 'Attendance Report', hint: 'Daily clock-in / clock-out per employee' },
    { value: 'exceptions', label: 'Exceptions Report', hint: 'Late arrivals, early leaves and missed logins' },
    { value: 'leaves', label: 'Leaves Report', hint: 'Applied, approved and rejected leave' }
];
/**
 * Single entry point for every export on the Reports page. The period and
 * format pickers live inside the popover rather than on the page, so the
 * dashboard itself stays about the charts — you only meet the export controls
 * when you actually want a file.
 */
function ReportDownloadMenu(_a) {
    var reportDateMode = _a.reportDateMode, setReportDateMode = _a.setReportDateMode, attendanceReportMonth = _a.attendanceReportMonth, setAttendanceReportMonth = _a.setAttendanceReportMonth, attendanceReportYear = _a.attendanceReportYear, setAttendanceReportYear = _a.setAttendanceReportYear, reportStartDate = _a.reportStartDate, setReportStartDate = _a.setReportStartDate, reportEndDate = _a.reportEndDate, setReportEndDate = _a.setReportEndDate, attendanceReportFormat = _a.attendanceReportFormat, setAttendanceReportFormat = _a.setAttendanceReportFormat, onDownload = _a.onDownload, statusMessage = _a.statusMessage;
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    var containerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!open) {
            return;
        }
        var clickHandler = function (event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        var keyHandler = function (event) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', clickHandler);
        document.addEventListener('keydown', keyHandler);
        return function () {
            document.removeEventListener('mousedown', clickHandler);
            document.removeEventListener('keydown', keyHandler);
        };
    }, [open]);
    return (<div className="rp-download" ref={containerRef}>
      <button className="cta dashboard-button rp-download-trigger" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={function () { return setOpen(function (current) { return !current; }); }}>
        Download Report
        <span className={"rp-download-caret".concat(open ? ' is-open' : '')} aria-hidden="true">▾</span>
      </button>

      {open ? (<div className="rp-download-menu" role="dialog" aria-label="Download report">
          <div className="rp-download-section">
            <span className="rp-download-legend">Period</span>
            <div className="rp-download-segmented" role="group">
              <button type="button" className={reportDateMode === 'month' ? 'is-active' : ''} onClick={function () { return setReportDateMode('month'); }}>
                Monthly
              </button>
              <button type="button" className={reportDateMode === 'custom' ? 'is-active' : ''} onClick={function () { return setReportDateMode('custom'); }}>
                Custom dates
              </button>
            </div>

            {reportDateMode === 'month' ? (<div className="rp-download-fields">
                <label htmlFor="attendance-month">
                  Month
                  <select id="attendance-month" value={attendanceReportMonth} onChange={function (event) { return setAttendanceReportMonth(event.target.value); }}>
                    {MONTH_OPTIONS.map(function (month, index) { return (<option key={month} value={index + 1}>{month}</option>); })}
                  </select>
                </label>
                <label htmlFor="attendance-year">
                  Year
                  <select id="attendance-year" value={attendanceReportYear} onChange={function (event) { return setAttendanceReportYear(event.target.value); }}>
                    {Array.from({ length: 8 }, function (_, index) {
                    var year = new Date().getFullYear() - index;
                    return <option key={year} value={year}>{year}</option>;
                })}
                  </select>
                </label>
              </div>) : (<div className="rp-download-fields">
                <label htmlFor="report-start-date">
                  Start date
                  <input className="modern-date-input" id="report-start-date" type="date" value={reportStartDate} onChange={function (event) { return setReportStartDate(event.target.value); }}/>
                </label>
                <label htmlFor="report-end-date">
                  End date
                  <input className="modern-date-input" id="report-end-date" type="date" value={reportEndDate} min={reportStartDate} onChange={function (event) { return setReportEndDate(event.target.value); }}/>
                </label>
              </div>)}
          </div>

          <div className="rp-download-section">
            <span className="rp-download-legend">Format</span>
            <div className="rp-download-segmented" role="group">
              {['csv', 'pdf', 'xlsx'].map(function (format) { return (<button key={format} type="button" className={attendanceReportFormat === format ? 'is-active' : ''} onClick={function () { return setAttendanceReportFormat(format); }}>
                  {format.toUpperCase()}
                </button>); })}
            </div>
          </div>

          <div className="rp-download-section">
            <span className="rp-download-legend">Report</span>
            <div className="rp-download-list">
              {REPORT_TYPES.map(function (report) { return (<button key={report.value} type="button" className="rp-download-item" onClick={function () { return onDownload(report.value); }}>
                  <strong>{report.label}</strong>
                  <span>{report.hint}</span>
                </button>); })}
            </div>
          </div>

          {statusMessage ? <p className="rp-download-status">{statusMessage}</p> : null}
        </div>) : null}
    </div>);
}
