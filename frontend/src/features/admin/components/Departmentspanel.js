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
exports.DepartmentsPanel = DepartmentsPanel;
function shortenDeptLabel(value) {
    return value.length > 10 ? "".concat(value.slice(0, 10), "...") : value;
}
function DepartmentsPanel(_a) {
    var deptEntries = _a.deptEntries, selectedDateLabel = _a.selectedDateLabel;
    var maxValue = Math.max.apply(Math, __spreadArray(__spreadArray([], deptEntries.map(function (_a) {
        var entry = _a[1];
        return entry.head;
    }), false), [1], false));
    return (<div className="ov2-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Departments</div>
          <div className="ov2-card-sub">
            Head count vs present count for {selectedDateLabel}
          </div>
        </div>
        <span className="ov2-count-badge">{deptEntries.length} depts</span>
      </div>

      <div className="ov2-dept-chart-legend" aria-label="Department chart legend">
        <span className="ov2-dept-legend-pill">
          <span className="ov2-dept-legend-swatch head"/>
          Head Count
        </span>
        <span className="ov2-dept-legend-pill">
          <span className="ov2-dept-legend-swatch present"/>
          Present Today
        </span>
      </div>

      <div className="ov2-dept-chart">
        {deptEntries.map(function (_a) {
            var dept = _a[0], entry = _a[1];
            var headHeight = Math.max(Math.round((entry.head / maxValue) * 100), 8);
            var presentHeight = Math.max(Math.round((entry.present / maxValue) * 100), 8);
            return (<div key={dept} className="ov2-dept-chart-col">
              <div className="ov2-dept-chart-values">
                <span>{entry.head}</span>
                <span>{entry.present}</span>
              </div>
              <div className="ov2-dept-chart-bars">
                <div className="ov2-dept-chart-bar-wrap">
                  <div className="ov2-dept-chart-bar head" style={{ height: "".concat(headHeight, "%") }} aria-label={"".concat(dept, " head count ").concat(entry.head)}/>
                </div>
                <div className="ov2-dept-chart-bar-wrap">
                  <div className="ov2-dept-chart-bar present" style={{ height: "".concat(presentHeight, "%") }} aria-label={"".concat(dept, " present count ").concat(entry.present)}/>
                </div>
              </div>
              <div className="ov2-dept-chart-meta">
                <span className="ov2-dept-name" title={dept}>
                  {shortenDeptLabel(dept)}
                </span>
                <span className="ov2-dept-count">
                  {entry.present}/{entry.head}
                </span>
              </div>
            </div>);
        })}

        {deptEntries.length === 0 && <div className="ov2-empty">No department data</div>}
      </div>
    </div>);
}
