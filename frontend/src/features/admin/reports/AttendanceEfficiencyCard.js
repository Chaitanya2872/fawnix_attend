"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceEfficiencyCard;
var RADIUS = 52;
var CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Rating bands come from the backend; score-based mapping keeps old labels tolerant. */
function toneFor(score, rating) {
    if (score !== null) {
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
    var normalised = rating.toLowerCase();
    if (normalised === '90-100')
        return 'is-range-90-100';
    if (normalised === '70-90')
        return 'is-range-70-90';
    if (normalised === '50-70')
        return 'is-range-50-70';
    if (normalised === '30-50')
        return 'is-range-30-50';
    if (normalised === '10-30')
        return 'is-range-10-30';
    if (normalised === '0-10')
        return 'is-range-0-10';
    if (normalised === 'excellent')
        return 'is-excellent';
    if (normalised === 'good')
        return 'is-good';
    if (normalised === 'fair')
        return 'is-fair';
    if (normalised === 'no data')
        return 'is-idle';
    return 'is-poor';
}
function formatRange(start, end) {
    var parse = function (value) {
        var parsed = new Date("".concat(value, "T00:00:00"));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    var startDate = parse(start);
    var endDate = parse(end);
    if (!startDate || !endDate) {
        return '';
    }
    var options = { day: '2-digit', month: 'short' };
    return "".concat(startDate.toLocaleDateString(undefined, options), " \u2013 ").concat(endDate.toLocaleDateString(undefined, options));
}
/**
 * Organisation-wide attendance efficiency for the current window, drawn as a
 * ring so the number reads at a glance. The score is the share of *expected*
 * attendance that was met — holidays and week offs are excluded server-side, so
 * a quiet Sunday never dents it.
 */
function AttendanceEfficiencyCard(_a) {
    var _b, _c, _d, _e;
    var insights = _a.insights, loading = _a.loading, statusMessage = _a.statusMessage;
    var efficiency = insights === null || insights === void 0 ? void 0 : insights.efficiency;
    var score = (_b = efficiency === null || efficiency === void 0 ? void 0 : efficiency.score) !== null && _b !== void 0 ? _b : null;
    var rating = (_c = efficiency === null || efficiency === void 0 ? void 0 : efficiency.rating) !== null && _c !== void 0 ? _c : 'No data';
    var delta = (_d = efficiency === null || efficiency === void 0 ? void 0 : efficiency.delta) !== null && _d !== void 0 ? _d : null;
    var progress = Math.min(Math.max(score !== null && score !== void 0 ? score : 0, 0), 100) / 100;
    var tone = toneFor(score, rating);
    var markerAngle = progress * Math.PI * 2 - Math.PI / 2;
    var markerX = 70 + RADIUS * Math.cos(markerAngle);
    var markerY = 70 + RADIUS * Math.sin(markerAngle);
    var deltaLabel = delta === null
        ? 'No comparison'
        : delta === 0
            ? 'No change'
            : "".concat(delta > 0 ? '+' : '').concat(delta, " pts");
    return (<div className={"chart-card rp-efficiency-card ".concat(tone)}>
      <div className="chart-card-head">
        <div>
          <strong>Attendance Efficiency</strong>
          <span>
            {insights ? "Last ".concat(insights.windowDays, " days \u00B7 ").concat(formatRange(insights.startDate, insights.endDate)) : 'Share of expected attendance met'}
          </span>
        </div>
      </div>

      <div className="rp-efficiency-body">
        <div className="rp-gauge">
          <svg viewBox="0 0 140 140" role="img" aria-label={"Attendance efficiency ".concat(score === null ? 'unavailable' : "".concat(score, " percent"))}>
            <circle className="rp-gauge-inner" cx="70" cy="70" r="42"/>
            <circle className="rp-gauge-track" cx="70" cy="70" r={RADIUS}/>
            <circle className="rp-gauge-value" cx="70" cy="70" r={RADIUS} strokeDasharray={"".concat(CIRCUMFERENCE * progress, " ").concat(CIRCUMFERENCE)} transform="rotate(-90 70 70)"/>
            {score !== null ? <circle className="rp-gauge-marker" cx={markerX} cy={markerY} r="4"/> : null}
          </svg>
          <div className="rp-gauge-centre">
            <strong>{score === null ? (loading ? '…' : '—') : "".concat(Math.round(score), "%")}</strong>
            <span>Efficiency</span>
          </div>
        </div>

        <div className="rp-efficiency-metrics">
          <div className="rp-efficiency-metric">
            <span>Coverage</span>
            <strong>{efficiency ? "".concat(efficiency.presentDays, " / ").concat(efficiency.expectedDays) : '—'}</strong>
            <small>Expected days</small>
          </div>
          <div className="rp-efficiency-metric">
            <span>Change</span>
            <strong className={delta === null ? 'is-flat' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat'}>
              {deltaLabel}
            </strong>
            <small>Previous {(_e = insights === null || insights === void 0 ? void 0 : insights.windowDays) !== null && _e !== void 0 ? _e : 7} days</small>
          </div>
        </div>
      </div>

      {statusMessage ? <span className="report-status">{statusMessage}</span> : null}
    </div>);
}
