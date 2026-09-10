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
exports.default = AttendanceKpiCards;
function initialsOf(name) {
    if (!name)
        return '--';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(function (word) { var _a; return (_a = word[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase(); })
        .join('');
}
function AttendanceKpiCards(_a) {
    var kpis = _a.kpis, loading = _a.loading, onFilterByStatus = _a.onFilterByStatus;
    var trend = kpis.previous_month_total
        ? ((kpis.current_month_total - kpis.previous_month_total) / kpis.previous_month_total) * 100
        : kpis.current_month_total > 0
            ? 100
            : 0;
    var trendUp = trend >= 0;
    var dailyTrend = kpis.daily_trend || [];
    var maxTrendCount = Math.max.apply(Math, __spreadArray([1], dailyTrend.map(function (point) { return point.count; }), false));
    var repeat = kpis.repeat_offenders || { employee_count: 0, exception_count: 0 };
    var repeatShare = kpis.total > 0 ? Math.round((repeat.exception_count / kpis.total) * 100) : 0;
    var leaderboard = (kpis.top_short_hours || []).slice(0, 2);
    return (<div className="exc-kpi-wrap">
      <div className="exc-kpi-grid">
        {/* ─── Total exceptions ─────────────────────────────────── */}
        <div className="exc-kpi-card">
          <div className="exc-kpi-card__label">Total Exceptions</div>
          <div className="exc-kpi-card__row">
            {loading ? (<span className="exc-kpi__skeleton"/>) : (<span className="exc-kpi-card__value">{kpis.total.toLocaleString()}</span>)}
            {!loading && (<span className={"exc-trend-pill ".concat(trendUp ? 'exc-trend-pill--up' : 'exc-trend-pill--down')}>
                {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last month
              </span>)}
          </div>
          <div className="exc-kpi-card__sub">
            This month {kpis.current_month_total.toLocaleString()} · last month {kpis.previous_month_total.toLocaleString()}
          </div>
          <div className="exc-sparkline">
            {dailyTrend.length ? (dailyTrend.map(function (point, index) { return (<span key={point.date} className={"exc-sparkline__bar".concat(index === dailyTrend.length - 1 ? ' exc-sparkline__bar--current' : '')} style={{ height: "".concat(Math.max(6, Math.round((point.count / maxTrendCount) * 100)), "%") }} title={"".concat(point.date, ": ").concat(point.count)}/>); })) : (<span className="exc-sparkline__empty">No recent activity</span>)}
          </div>
        </div>

        {/* ─── Repeated exceptions ──────────────────────────────── */}
        <div className={"exc-kpi-card".concat(onFilterByStatus ? ' exc-kpi-card--clickable' : '')} role={onFilterByStatus ? 'button' : undefined} tabIndex={onFilterByStatus ? 0 : undefined} onClick={onFilterByStatus ? function () { return onFilterByStatus('pending'); } : undefined} onKeyDown={onFilterByStatus
            ? function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onFilterByStatus('pending');
                }
            }
            : undefined}>
          <div className="exc-kpi-card__label">Repeated Exceptions</div>
          <div className="exc-kpi-card__row">
            {loading ? (<span className="exc-kpi__skeleton"/>) : (<span className="exc-kpi-card__value">{repeat.exception_count.toLocaleString()}</span>)}
            {!loading && (<span className="exc-kpi-card__row-sub">
                across {repeat.employee_count} employee{repeat.employee_count === 1 ? '' : 's'}
              </span>)}
          </div>
          <div className="exc-kpi-card__sub">3 or more exceptions in 90 days</div>
          <div className="exc-progress-track">
            <div className="exc-progress-fill" style={{ width: "".concat(repeatShare, "%") }}/>
          </div>
        </div>

        {/* ─── Highest short hours ──────────────────────────────── */}
        <div className="exc-kpi-card">
          <div className="exc-kpi-card__label-row">
            <div className="exc-kpi-card__label">Highest Short Hours</div>
            <div className="exc-kpi-card__label-hint">This month</div>
          </div>
          {loading ? (<div className="exc-leaderboard exc-leaderboard--loading">
              <span className="exc-kpi__skeleton"/>
              <span className="exc-kpi__skeleton"/>
            </div>) : leaderboard.length ? (<div className="exc-leaderboard">
              {leaderboard.map(function (person, index) { return (<div className="exc-leaderboard__row" key={"".concat(person.employee_code || person.employee_name, "-").concat(index)}>
                  <span className="exc-leaderboard__avatar">{initialsOf(person.employee_name)}</span>
                  <div className="exc-leaderboard__info">
                    <div className="exc-leaderboard__name">{person.employee_name || 'Unknown'}</div>
                    <div className="exc-leaderboard__dept">{person.department || '--'}</div>
                  </div>
                  <div className="exc-leaderboard__stats">
                    <div>
                      <strong>{person.late_count}</strong>
                      <span>LATE</span>
                    </div>
                    <div>
                      <strong>{person.early_count}</strong>
                      <span>EARLY</span>
                    </div>
                  </div>
                </div>); })}
            </div>) : (<div className="exc-leaderboard__empty">No late or early minutes recorded for this filter.</div>)}
        </div>
      </div>
    </div>);
}
