"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingApprovalsPanel = PendingApprovalsPanel;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var PANEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short'
});
var PANEL_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
function parsePanelDate(value) {
    var rawValue = (value || '').trim();
    if (!rawValue) {
        return null;
    }
    var dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        var year = dateMatch[1], month = dateMatch[2], day = dateMatch[3];
        var parsed_1 = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed_1.getTime()) ? null : parsed_1;
    }
    var parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function getPanelDateKey(value) {
    var parsed = parsePanelDate(value);
    if (!parsed) {
        return '';
    }
    return [
        parsed.getFullYear(),
        String(parsed.getMonth() + 1).padStart(2, '0'),
        String(parsed.getDate()).padStart(2, '0')
    ].join('-');
}
function formatPanelDate(value) {
    var parsed = parsePanelDate(value);
    return parsed ? PANEL_DATE_FORMATTER.format(parsed) : value || '--';
}
function formatPanelDateRange(row) {
    var fromKey = getPanelDateKey(row.from_date);
    var toKey = getPanelDateKey(row.to_date);
    if (!row.from_date && !row.to_date) {
        return '--';
    }
    if (!row.to_date || (fromKey && fromKey === toKey)) {
        return formatPanelDate(row.from_date);
    }
    if (!row.from_date) {
        return formatPanelDate(row.to_date);
    }
    return "".concat(formatPanelDate(row.from_date), " - ").concat(formatPanelDate(row.to_date));
}
function formatPanelWeekdayRange(row) {
    var fromDate = parsePanelDate(row.from_date);
    var toDate = parsePanelDate(row.to_date);
    var fromKey = getPanelDateKey(row.from_date);
    var toKey = getPanelDateKey(row.to_date);
    if (!fromDate && !toDate) {
        return '';
    }
    var fromWeekday = fromDate ? PANEL_WEEKDAY_FORMATTER.format(fromDate) : '';
    var toWeekday = toDate ? PANEL_WEEKDAY_FORMATTER.format(toDate) : '';
    if (!toWeekday || (fromKey && fromKey === toKey)) {
        return fromWeekday;
    }
    if (!fromWeekday) {
        return toWeekday;
    }
    return "".concat(fromWeekday, " - ").concat(toWeekday);
}
function PendingApprovalsPanel(_a) {
    var pendingLeaveRows = _a.pendingLeaveRows, formatLeaveTypeLabel = _a.formatLeaveTypeLabel;
    var _b = (0, react_1.useState)(true), pendingExpanded = _b[0], setPendingExpanded = _b[1];
    return (<div className="ov2-card ov2-approvals-card">
      <button className="ov2-card-head ov2-approvals-toggle" onClick={function () { return setPendingExpanded(function (v) { return !v; }); }} type="button">
        <div>
          <div className="ov2-card-title">Pending Approvals</div>
          <div className="ov2-card-sub">
            {pendingLeaveRows.length} request{pendingLeaveRows.length === 1 ? '' : 's'} awaiting
          </div>
        </div>
        <span className={"ov2-collapse-btn".concat(pendingExpanded ? ' open' : '')}>
          {pendingExpanded ? '↑' : '↓'}
        </span>
      </button>

      {pendingExpanded && (<div className="ov2-approvals-list">
          {pendingLeaveRows.slice(0, 6).map(function (row, i) {
                var key = String(row.id || row.emp_code || i);
                var initial = (row.emp_full_name || row.emp_code || 'U')[0].toUpperCase();
                var dateRangeLabel = formatPanelDateRange(row);
                var weekdayLabel = formatPanelWeekdayRange(row);
                return (<div key={key} className="ov2-approval-row">
                <div className="ov2-approval-avatar">{initial}</div>
                <div className="ov2-approval-copy">
                  <strong>{row.emp_full_name || row.emp_code || 'Unknown'}</strong>
                  <span>{formatLeaveTypeLabel(row)}</span>
                  <small className="ov2-approval-date">
                    <span>{dateRangeLabel}</span>
                    {weekdayLabel ? <span>{weekdayLabel}</span> : null}
                  </small>
                  <small className="ov2-approval-raw-date" aria-hidden="true">
                    {row.from_date || '--'} → {row.to_date || '--'}
                  </small>
                </div>
              </div>);
            })}

          {pendingLeaveRows.length === 0 && (<div className="ov2-empty">No pending approvals right now.</div>)}

        </div>)}
    </div>);
}
