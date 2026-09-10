"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpcomingBirthdaysPanel = UpcomingBirthdaysPanel;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var ClientPagination_1 = require("./ClientPagination");
var DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
var CONFETTI_PIECES = Array.from({ length: 7 }, function (_, index) { return index; });
function timingLabel(daysUntil) {
    if (daysUntil === 0)
        return 'Today';
    if (daysUntil === 1)
        return 'Tomorrow';
    return "In ".concat(daysUntil, " days");
}
function UpcomingBirthdaysPanel(_a) {
    var birthdays = _a.birthdays;
    var _b = (0, react_1.useState)(1), page = _b[0], setPage = _b[1];
    var pageSize = 4;
    var totalPages = Math.max(1, Math.ceil(birthdays.length / pageSize));
    var visiblePage = Math.min(page, totalPages);
    var visibleBirthdays = birthdays.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
    return (<div className="ov2-card ov2-birthday-card">
      <div className="ov2-birthday-confetti" aria-hidden="true">
        {CONFETTI_PIECES.map(function (piece) { return <i key={piece}/>; })}
      </div>
      <div className="ov2-card-head">
        <div className="ov2-birthday-heading">
          <span className="ov2-birthday-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 11h14v9H5zM7 11V8h10v3M9 8V5m6 3V5M9 3v2m6-2v2M5 15h14"/>
            </svg>
          </span>
          <div>
            <div className="ov2-card-title">Upcoming Birthdays</div>
            <div className="ov2-card-sub">Next employee celebrations</div>
          </div>
        </div>
      </div>
      <div className="ov2-exc-list ov2-birthday-list">
        {visibleBirthdays.map(function (_a) {
            var employee = _a.employee, date = _a.date, daysUntil = _a.daysUntil;
            var name = employee.emp_full_name || employee.emp_code || 'Employee';
            return (<div key={employee.emp_code || name} className="ov2-exc-item ov2-birthday-item">
              <div className="ov2-approval-avatar ov2-birthday-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">{name}</span>
                <span className="ov2-exc-desc">{employee.emp_department || employee.emp_designation || 'Employee'}</span>
              </div>
              <div className="ov2-approval-copy ov2-birthday-date">
                <strong>{DATE_FORMATTER.format(date)}</strong>
                <span>{timingLabel(daysUntil)}</span>
              </div>
            </div>);
        })}
        {birthdays.length === 0 && <div className="ov2-empty">No upcoming birthdays found.</div>}
      </div>
      <ClientPagination_1.ClientPagination page={visiblePage} pageSize={pageSize} total={birthdays.length} onPageChange={setPage}/>
    </div>);
}
