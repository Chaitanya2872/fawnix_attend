"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkAnniversariesPanel = WorkAnniversariesPanel;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var ClientPagination_1 = require("./ClientPagination");
var DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
function timingLabel(daysUntil) {
    if (daysUntil === 0)
        return 'Today';
    if (daysUntil === 1)
        return 'Tomorrow';
    return "In ".concat(daysUntil, " days");
}
function yearsLabel(years) {
    return "".concat(years, " year").concat(years === 1 ? '' : 's');
}
function WorkAnniversariesPanel(_a) {
    var anniversaries = _a.anniversaries;
    var _b = (0, react_1.useState)(1), page = _b[0], setPage = _b[1];
    var pageSize = 4;
    var totalPages = Math.max(1, Math.ceil(anniversaries.length / pageSize));
    var visiblePage = Math.min(page, totalPages);
    var visibleAnniversaries = anniversaries.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
    return (<div className="ov2-card ov2-anniversary-card">
      <div className="ov2-card-head">
        <div className="ov2-birthday-heading">
          <span className="ov2-anniversary-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z"/>
              <path d="m9 15 2 2 4-5"/>
            </svg>
          </span>
          <div>
            <div className="ov2-card-title">Work Anniversaries</div>
            <div className="ov2-card-sub">Next employee milestones</div>
          </div>
        </div>
      </div>
      <div className="ov2-exc-list ov2-anniversary-list">
        {visibleAnniversaries.map(function (_a) {
            var employee = _a.employee, date = _a.date, daysUntil = _a.daysUntil, years = _a.years;
            var name = employee.emp_full_name || employee.emp_code || 'Employee';
            return (<div key={"".concat(employee.emp_code || name, "-").concat(date.toISOString())} className="ov2-exc-item ov2-anniversary-item">
              <div className="ov2-approval-avatar ov2-anniversary-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">{name}</span>
                <span className="ov2-exc-desc">{employee.emp_department || employee.emp_designation || 'Employee'}</span>
              </div>
              <div className="ov2-approval-copy ov2-birthday-date">
                <strong>{DATE_FORMATTER.format(date)}</strong>
                <span>{yearsLabel(years)} - {timingLabel(daysUntil)}</span>
              </div>
            </div>);
        })}
        {anniversaries.length === 0 && <div className="ov2-empty">No upcoming work anniversaries found.</div>}
      </div>
      <ClientPagination_1.ClientPagination page={visiblePage} pageSize={pageSize} total={anniversaries.length} onPageChange={setPage}/>
    </div>);
}
