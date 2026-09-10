"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WeeklyTrendChart;
var VIEW_WIDTH = 640;
var VIEW_HEIGHT = 232;
var PADDING = { top: 24, right: 18, bottom: 34, left: 44 };
var TICKS = [1, 0.75, 0.5, 0.25, 0];
var PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
var PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
function xFor(index, count) {
    if (count <= 1) {
        return PADDING.left + PLOT_WIDTH / 2;
    }
    return PADDING.left + (index / (count - 1)) * PLOT_WIDTH;
}
function yFor(ratio) {
    var clamped = Math.min(Math.max(ratio, 0), 1);
    return PADDING.top + (1 - clamped) * PLOT_HEIGHT;
}
function smoothPath(points) {
    if (!points.length) {
        return '';
    }
    return points.slice(1).reduce(function (path, point, index) {
        var previous = points[index];
        var controlX = (previous.x + point.x) / 2;
        return "".concat(path, " C ").concat(controlX, ",").concat(previous.y, " ").concat(controlX, ",").concat(point.y, " ").concat(point.x, ",").concat(point.y);
    }, "M ".concat(points[0].x, ",").concat(points[0].y));
}
/**
 * Attendance rate across the trailing window. Drawn on a fixed viewBox with a
 * real axis so the line keeps its stroke weight at any width — the older
 * `preserveAspectRatio="none"` chart stretched it.
 */
function WeeklyTrendChart(_a) {
    var _b, _c, _d;
    var series = _a.series, isPercentage = _a.isPercentage, maxValue = _a.maxValue, loading = _a.loading;
    if (!series.length) {
        return <div className="empty-state">{loading ? 'Loading attendance trend…' : 'No attendance data for this window yet.'}</div>;
    }
    var points = series.map(function (point, index) { return ({
        x: xFor(index, series.length),
        y: yFor(point.ratio)
    }); });
    var linePath = smoothPath(points);
    var baseline = yFor(0);
    var areaPath = "".concat(linePath, " L ").concat((_c = (_b = points.at(-1)) === null || _b === void 0 ? void 0 : _b.x) !== null && _c !== void 0 ? _c : PADDING.left, ",").concat(baseline, " L ").concat(points[0].x, ",").concat(baseline, " Z");
    var scoredSeries = series.filter(function (point) { return !point.isMuted; });
    var summarySeries = scoredSeries.length ? scoredSeries : series;
    var averageRatio = summarySeries.reduce(function (total, point) { return total + point.ratio; }, 0) / summarySeries.length;
    var bestPoint = summarySeries.reduce(function (best, point) { return point.ratio > best.ratio ? point : best; });
    var latestPoint = (_d = summarySeries.at(-1)) !== null && _d !== void 0 ? _d : series.at(-1);
    var averageLabel = isPercentage
        ? "".concat(Math.round(averageRatio * 100), "%")
        : String(Math.round(averageRatio * maxValue));
    var averageY = yFor(averageRatio);
    return (<div className={"rp-trend".concat(loading ? ' is-refreshing' : '')}>
      <svg viewBox={"0 0 ".concat(VIEW_WIDTH, " ").concat(VIEW_HEIGHT)} className="rp-trend-svg" role="img" aria-label="Attendance trend">
        <defs>
          <linearGradient id="attendanceTrendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1fa7a4" stopOpacity="0.24"/>
            <stop offset="100%" stopColor="#1fa7a4" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <rect className="rp-trend-plot" x={PADDING.left} y={PADDING.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} rx="8"/>
        {TICKS.map(function (tick) { return (<g key={tick}>
            <line className="rp-trend-grid" x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={yFor(tick)} y2={yFor(tick)}/>
            <text className="rp-trend-axis" x={PADDING.left - 10} y={yFor(tick) + 4} textAnchor="end">
              {isPercentage ? "".concat(Math.round(tick * 100), "%") : Math.round(tick * maxValue)}
            </text>
          </g>); })}

        <path className="rp-trend-area" d={areaPath}/>
        <line className="rp-trend-average" x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={averageY} y2={averageY}/>
        <text className="rp-trend-average-label" x={VIEW_WIDTH - PADDING.right - 4} y={Math.max(PADDING.top + 11, averageY - 7)} textAnchor="end">
          AVG {averageLabel}
        </text>
        <path className="rp-trend-line" d={linePath}/>

        {series.map(function (point, index) { return (<g key={point.key}>
            {point.key === (latestPoint === null || latestPoint === void 0 ? void 0 : latestPoint.key) ? (<circle className="rp-trend-dot-halo" cx={xFor(index, series.length)} cy={yFor(point.ratio)} r="9"/>) : null}
            <circle className={"rp-trend-dot".concat(point.isMuted ? ' is-muted' : '')} cx={xFor(index, series.length)} cy={yFor(point.ratio)} r="4.5">
              <title>{"".concat(point.label, ": ").concat(point.valueLabel, " (").concat(point.caption, ")")}</title>
            </circle>
            <text className={"rp-trend-label".concat(point.isMuted ? ' is-muted' : '')} x={xFor(index, series.length)} y={VIEW_HEIGHT - 14} textAnchor="middle">
              {point.label}
            </text>
          </g>); })}
      </svg>

      <div className="rp-trend-summary">
        <div className="rp-trend-summary-item">
          <span>Average</span>
          <strong>{averageLabel}</strong>
        </div>
        <div className="rp-trend-summary-item">
          <span>Best day</span>
          <strong>{bestPoint.label} · {bestPoint.valueLabel}</strong>
        </div>
        <div className="rp-trend-summary-item">
          <span>Latest</span>
          <strong>{latestPoint ? "".concat(latestPoint.label, " \u00B7 ").concat(latestPoint.valueLabel) : '—'}</strong>
        </div>
      </div>
    </div>);
}
