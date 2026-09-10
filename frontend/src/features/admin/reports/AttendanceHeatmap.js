"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceHeatmap;
var react_1 = require("react");
var attendanceStatus_1 = require("./attendanceStatus");
var formatters_1 = require("../utils/formatters");
require("./AttendanceHeatmap.css");
var WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function toCellKey(empCode, date) {
    return "".concat(empCode, "|").concat(date);
}
function formatCellDate(date) {
    var parsed = new Date("".concat(date, "T00:00:00"));
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function countWorkedDays(employee) {
    return Object.values(employee.days).filter(function (cell) { return attendanceStatus_1.WORKED_ATTENDANCE_STATUSES.includes(cell.status); }).length;
}
function normaliseEfficiencyScore(score) {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
        return null;
    }
    return Math.min(100, Math.max(0, score));
}
function efficiencyTone(score) {
    if (score === null)
        return 'is-idle';
    if (score >= 90)
        return 'is-range-90-100';
    if (score >= 70)
        return 'is-range-70-90';
    if (score >= 50)
        return 'is-range-50-70';
    if (score >= 30)
        return 'is-range-30-50';
    if (score >= 10)
        return 'is-range-10-30';
    return 'is-range-0-10';
}
/**
 * GitHub-contributions-style attendance grid: one row per employee, one column
 * per day of the selected month. Colour encodes the status code, hovering a
 * cell explains it, and clicking one opens an inline status editor that hands
 * the change back through onCellEdit — this component never calls the API.
 */
function AttendanceHeatmap(_a) {
    var _b;
    var data = _a.data, efficiencyScores = _a.efficiencyScores, loading = _a.loading, statusMessage = _a.statusMessage, savingCellKey = _a.savingCellKey, canEdit = _a.canEdit, onCellEdit = _a.onCellEdit, onRefresh = _a.onRefresh;
    var _c = (0, react_1.useState)(null), hovered = _c[0], setHovered = _c[1];
    var _d = (0, react_1.useState)(null), editing = _d[0], setEditing = _d[1];
    var _e = (0, react_1.useState)('score-desc'), efficiencySort = _e[0], setEfficiencySort = _e[1];
    var _f = (0, react_1.useState)('all'), efficiencyFilter = _f[0], setEfficiencyFilter = _f[1];
    var editorRef = (0, react_1.useRef)(null);
    var efficiencyByEmployee = (0, react_1.useMemo)(function () { return new Map(efficiencyScores.map(function (item) { return [item.key, item]; })); }, [efficiencyScores]);
    var visibleEmployees = (0, react_1.useMemo)(function () {
        if (!data) {
            return [];
        }
        var rows = data.employees.map(function (employee) {
            var _a;
            var efficiency = (_a = efficiencyByEmployee.get(employee.empCode)) !== null && _a !== void 0 ? _a : efficiencyByEmployee.get(employee.name);
            return { employee: employee, score: normaliseEfficiencyScore(efficiency === null || efficiency === void 0 ? void 0 : efficiency.score) };
        }).filter(function (_a) {
            var score = _a.score;
            if (efficiencyFilter === 'all')
                return true;
            if (efficiencyFilter === 'no-data')
                return score === null;
            if (score === null)
                return false;
            if (efficiencyFilter === '90-100')
                return score >= 90;
            if (efficiencyFilter === '70-89')
                return score >= 70 && score < 90;
            if (efficiencyFilter === '50-69')
                return score >= 50 && score < 70;
            if (efficiencyFilter === '30-49')
                return score >= 30 && score < 50;
            return score < 30;
        });
        return rows.sort(function (left, right) {
            if (efficiencySort === 'name') {
                return (left.employee.name || left.employee.empCode).localeCompare(right.employee.name || right.employee.empCode);
            }
            if (left.score === null && right.score === null)
                return 0;
            if (left.score === null)
                return 1;
            if (right.score === null)
                return -1;
            var difference = left.score - right.score;
            return efficiencySort === 'score-asc' ? difference : -difference;
        });
    }, [data, efficiencyByEmployee, efficiencyFilter, efficiencySort]);
    var columns = (0, react_1.useMemo)(function () {
        if (!data) {
            return [];
        }
        return data.dates.map(function (date) {
            var _a;
            var parsed = new Date("".concat(date, "T00:00:00"));
            var weekday = parsed.getDay();
            return {
                date: date,
                dayOfMonth: String(parsed.getDate()),
                weekdayInitial: (_a = WEEKDAY_INITIALS[weekday]) !== null && _a !== void 0 ? _a : '',
                isWeekend: weekday === 0 || weekday === 6
            };
        });
    }, [data]);
    (0, react_1.useEffect)(function () {
        if (!editing) {
            return;
        }
        var clickHandler = function (event) {
            if (editorRef.current && !editorRef.current.contains(event.target)) {
                setEditing(null);
            }
        };
        var keyHandler = function (event) {
            if (event.key === 'Escape') {
                setEditing(null);
            }
        };
        document.addEventListener('mousedown', clickHandler);
        document.addEventListener('keydown', keyHandler);
        return function () {
            document.removeEventListener('mousedown', clickHandler);
            document.removeEventListener('keydown', keyHandler);
        };
    }, [editing]);
    // Both popovers are position: fixed, so scrolling the grid would otherwise strand them.
    (0, react_1.useEffect)(function () {
        if (!editing && !hovered) {
            return;
        }
        var dismiss = function () {
            setEditing(null);
            setHovered(null);
        };
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return function () {
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [editing, hovered]);
    var anchorFor = function (element, empCode, date) {
        var rect = element.getBoundingClientRect();
        return {
            empCode: empCode,
            date: date,
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left + rect.width / 2
        };
    };
    var openEditor = function (element, empCode, date) {
        if (!canEdit) {
            return;
        }
        setHovered(null);
        setEditing(function (current) {
            return current && current.empCode === empCode && current.date === date
                ? null
                : anchorFor(element, empCode, date);
        });
    };
    var applyStatus = function (status) {
        if (!editing) {
            return;
        }
        onCellEdit(editing.empCode, editing.date, status);
        setEditing(null);
    };
    var hoveredEmployee = hovered
        ? data === null || data === void 0 ? void 0 : data.employees.find(function (employee) { return employee.empCode === hovered.empCode; })
        : undefined;
    var hoveredCell = hovered ? hoveredEmployee === null || hoveredEmployee === void 0 ? void 0 : hoveredEmployee.days[hovered.date] : undefined;
    var editingCell = editing
        ? (_b = data === null || data === void 0 ? void 0 : data.employees.find(function (employee) { return employee.empCode === editing.empCode; })) === null || _b === void 0 ? void 0 : _b.days[editing.date]
        : undefined;
    return (<div className="attendance-heatmap">
      <div className="attendance-heatmap-legend">
        {attendanceStatus_1.ATTENDANCE_LEGEND_ORDER.map(function (status) { return (<span key={status} className="attendance-heatmap-legend-item">
            <span className={"attendance-heatmap-swatch ".concat(attendanceStatus_1.ATTENDANCE_STATUS_META[status].className)} aria-hidden="true"/>
            {attendanceStatus_1.ATTENDANCE_STATUS_META[status].label}
          </span>); })}
      </div>

      {loading && !data ? (<div className="empty-state">Loading attendance heatmap...</div>) : !data || !data.employees.length ? (<div className="empty-state">
          No attendance summary for this month yet.
          <button className="ghost dashboard-button attendance-heatmap-retry" onClick={onRefresh} type="button">Reload</button>
        </div>) : (<>
          <div className="attendance-heatmap-controls">
            <label htmlFor="attendance-efficiency-sort">
              <span>Sort</span>
              <select id="attendance-efficiency-sort" value={efficiencySort} onChange={function (event) { return setEfficiencySort(event.target.value); }}>
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
                <option value="name">Employee name</option>
              </select>
            </label>
            <label htmlFor="attendance-efficiency-filter">
              <span>Score</span>
              <select id="attendance-efficiency-filter" value={efficiencyFilter} onChange={function (event) { return setEfficiencyFilter(event.target.value); }}>
                <option value="all">All scores</option>
                <option value="90-100">90–100%</option>
                <option value="70-89">70–89%</option>
                <option value="50-69">50–69%</option>
                <option value="30-49">30–49%</option>
                <option value="0-29">0–29%</option>
                <option value="no-data">No data</option>
              </select>
            </label>
            <span className="attendance-heatmap-result-count">
              {visibleEmployees.length} of {data.employees.length} employees
            </span>
          </div>
          <div className={"attendance-heatmap-scroll".concat(loading ? ' is-refreshing' : '')}>
          <table className="attendance-heatmap-table">
            <thead>
              <tr>
                <th scope="col" className="attendance-heatmap-name-head">Employee</th>
                <th scope="col" className="attendance-heatmap-efficiency-head" title="Share of expected working days attended">
                  Efficiency
                </th>
                {columns.map(function (column) { return (<th key={column.date} scope="col" className={"attendance-heatmap-day-head".concat(column.isWeekend ? ' is-weekend' : '')} title={formatCellDate(column.date)}>
                    <span className="attendance-heatmap-weekday">{column.weekdayInitial}</span>
                    <span className="attendance-heatmap-daynum">{column.dayOfMonth}</span>
                  </th>); })}
                <th scope="col" className="attendance-heatmap-total-head">Worked</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map(function (_a) {
                var _b, _c;
                var employee = _a.employee;
                var efficiency = (_b = efficiencyByEmployee.get(employee.empCode)) !== null && _b !== void 0 ? _b : efficiencyByEmployee.get(employee.name);
                var score = normaliseEfficiencyScore(efficiency === null || efficiency === void 0 ? void 0 : efficiency.score);
                return (<tr key={employee.empCode}>
                    <th scope="row" className="attendance-heatmap-name-cell">
                      <strong>{employee.name || employee.empCode}</strong>
                      <span>{employee.designation || employee.empCode}</span>
                    </th>
                    <td className="attendance-heatmap-efficiency-cell">
                      <div className={"attendance-heatmap-efficiency ".concat(efficiencyTone(score))} title={(_c = efficiency === null || efficiency === void 0 ? void 0 : efficiency.detail) !== null && _c !== void 0 ? _c : 'Efficiency score unavailable'}>
                        <strong>{score === null ? '-' : "".concat(Math.round(score), "%")}</strong>
                        <span className="attendance-heatmap-efficiency-track" aria-hidden="true">
                          <span style={{ width: "".concat(score !== null && score !== void 0 ? score : 0, "%") }}/>
                        </span>
                      </div>
                    </td>
                    {columns.map(function (column) {
                        var cell = employee.days[column.date];
                        var meta = cell ? attendanceStatus_1.ATTENDANCE_STATUS_META[cell.status] : null;
                        var isSaving = savingCellKey === toCellKey(employee.empCode, column.date);
                        var isEditing = (editing === null || editing === void 0 ? void 0 : editing.empCode) === employee.empCode && editing.date === column.date;
                        var cellClassName = [
                            'attendance-heatmap-cell',
                            meta ? meta.className : 'is-empty',
                            (cell === null || cell === void 0 ? void 0 : cell.source) === 'manual' ? 'is-manual' : '',
                            column.isWeekend ? 'is-weekend-col' : '',
                            isEditing ? 'is-editing' : '',
                            isSaving ? 'is-saving' : ''
                        ].filter(Boolean).join(' ');
                        return (<td key={column.date} className="attendance-heatmap-cell-wrap">
                          <button type="button" className={cellClassName} disabled={!canEdit || isSaving} aria-label={"".concat(employee.name || employee.empCode, ", ").concat(formatCellDate(column.date), ", ").concat(meta ? meta.label : 'No data')} onMouseEnter={function (event) { return setHovered(anchorFor(event.currentTarget, employee.empCode, column.date)); }} onMouseLeave={function () { return setHovered(function (current) { return ((current === null || current === void 0 ? void 0 : current.empCode) === employee.empCode && current.date === column.date ? null : current); }); }} onFocus={function (event) { return setHovered(anchorFor(event.currentTarget, employee.empCode, column.date)); }} onBlur={function () { return setHovered(null); }} onClick={function (event) { return openEditor(event.currentTarget, employee.empCode, column.date); }}>
                            <span aria-hidden="true">{meta ? meta.glyph : ''}</span>
                          </button>
                        </td>);
                    })}
                    <td className="attendance-heatmap-total-cell">{countWorkedDays(employee)}</td>
                  </tr>);
            })}
            </tbody>
          </table>
          </div>
        </>)}

      {statusMessage ? <span className="report-status attendance-heatmap-status">{statusMessage}</span> : null}

      {hovered && hoveredEmployee ? (<div className="attendance-heatmap-tooltip" style={{ top: hovered.top - 10, left: hovered.left }} role="tooltip">
          <strong>{hoveredEmployee.name || hoveredEmployee.empCode}</strong>
          <span>{formatCellDate(hovered.date)}</span>
          <span>Status: {hoveredCell ? attendanceStatus_1.ATTENDANCE_STATUS_META[hoveredCell.status].label : 'No data'}</span>
          {hoveredCell && hoveredCell.workingHours !== null ? (<span>Hours: {(0, formatters_1.formatWorkingHours)(hoveredCell.workingHours)}</span>) : null}
          {(hoveredCell === null || hoveredCell === void 0 ? void 0 : hoveredCell.remarks) ? <span>Note: {hoveredCell.remarks}</span> : null}
          <span className="attendance-heatmap-tooltip-source">
            {(hoveredCell === null || hoveredCell === void 0 ? void 0 : hoveredCell.source) === 'manual' ? 'Manually corrected' : 'Auto-generated'}
          </span>
        </div>) : null}

      {editing ? (<div className="attendance-heatmap-editor" style={{ top: editing.bottom + 8, left: editing.left }} ref={editorRef}>
          <p className="attendance-heatmap-editor-title">{formatCellDate(editing.date)}</p>
          {attendanceStatus_1.EDITABLE_ATTENDANCE_STATUSES.map(function (status) { return (<button key={status} type="button" className={"attendance-heatmap-editor-option".concat((editingCell === null || editingCell === void 0 ? void 0 : editingCell.status) === status ? ' is-active' : '')} onClick={function () { return applyStatus(status); }}>
              <span className={"attendance-heatmap-swatch ".concat(attendanceStatus_1.ATTENDANCE_STATUS_META[status].className)} aria-hidden="true"/>
              {attendanceStatus_1.ATTENDANCE_STATUS_META[status].label}
            </button>); })}
        </div>) : null}
    </div>);
}
