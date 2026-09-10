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
exports.default = LeaveKpiCards;
var AGE_BUCKETS = [
    { key: 'under_7', label: '< 7 days' },
    { key: 'd7_30', label: '7–30' },
    { key: 'd30_90', label: '30–90' },
    { key: 'over_90', label: '90+' },
];
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
function formatDays(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function LeaveKpiCards(_a) {
    var kpis = _a.kpis, loading = _a.loading, onFilterByStatus = _a.onFilterByStatus;
    var trend = kpis.previous_month_total
        ? ((kpis.current_month_total - kpis.previous_month_total) / kpis.previous_month_total) * 100
        : kpis.current_month_total > 0
            ? 100
            : 0;
    var trendUp = trend >= 0;
    var dailyTrend = kpis.daily_trend || [];
    var maxTrendCount = Math.max.apply(Math, __spreadArray([1], dailyTrend.map(function (point) { return point.count; }), false));
    var buckets = kpis.age_buckets || { under_7: 0, d7_30: 0, d30_90: 0, over_90: 0 };
    var maxBucket = Math.max(1, buckets.under_7, buckets.d7_30, buckets.d30_90, buckets.over_90);
    var leaderboard = (kpis.top_leave_days || []).slice(0, 2);
    var totalDaysBooked = (kpis.top_leave_days || []).reduce(function (sum, entry) { return sum + entry.total_days; }, 0);
    return (<div className="lv-kpi-wrap">
      <div className="lv-kpi-grid">
        {/* ─── Leave requests ───────────────────────────────────── */}
        <div className="lv-kpi-card">
          <div className="lv-kpi-card__label">Leave Requests</div>
          <div className="lv-kpi-card__row">
            {loading ? (<span className="lv-kpi__skeleton"/>) : (<span className="lv-kpi-card__value">{kpis.total.toLocaleString()}</span>)}
            {!loading && (<span className={"lv-trend-pill ".concat(trendUp ? 'lv-trend-pill--up' : 'lv-trend-pill--down')}>
                {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last month
              </span>)}
          </div>
          <div className="lv-kpi-card__sub">
            This month {kpis.current_month_total.toLocaleString()} · last month {kpis.previous_month_total.toLocaleString()}
          </div>
          <div className="lv-sparkline">
            {dailyTrend.length ? (dailyTrend.map(function (point, index) { return (<span key={point.date} className={"lv-sparkline__bar".concat(index === dailyTrend.length - 1 ? ' lv-sparkline__bar--current' : '')} style={{ height: "".concat(Math.max(6, Math.round((point.count / maxTrendCount) * 100)), "%") }} title={"".concat(point.date, ": ").concat(point.count)}/>); })) : (<span className="lv-sparkline__empty">No recent activity</span>)}
          </div>
        </div>

        {/* ─── Awaiting approval ────────────────────────────────── */}
        <div className={"lv-kpi-card".concat(onFilterByStatus ? ' lv-kpi-card--clickable' : '')} role={onFilterByStatus ? 'button' : undefined} tabIndex={onFilterByStatus ? 0 : undefined} onClick={onFilterByStatus ? function () { return onFilterByStatus('pending'); } : undefined} onKeyDown={onFilterByStatus
            ? function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onFilterByStatus('pending');
                }
            }
            : undefined}>
          <div className="lv-kpi-card__label">Awaiting Approval</div>
          <div className="lv-kpi-card__row">
            {loading ? (<span className="lv-kpi__skeleton"/>) : (<span className="lv-kpi-card__value">{kpis.pending.toLocaleString()}</span>)}
            {!loading && (<span className="lv-kpi-card__row-sub">
                across {kpis.pending_employee_count} employee{kpis.pending_employee_count === 1 ? '' : 's'}
              </span>)}
          </div>
          <div className="lv-kpi-card__sub">
            {kpis.pending === 0
            ? 'Nothing waiting on a manager'
            : kpis.oldest_pending_days != null
                ? "Oldest has been waiting ".concat(kpis.oldest_pending_days, " day").concat(kpis.oldest_pending_days === 1 ? '' : 's')
                : 'Waiting on manager review'}
          </div>
          <div className="lv-age-histogram">
            {AGE_BUCKETS.map(function (bucket) { return (<div className="lv-age-histogram__col" key={bucket.key}>
                <span className="lv-age-histogram__bar" style={{ height: "".concat(Math.max(8, Math.round((buckets[bucket.key] / maxBucket) * 100)), "%") }} title={"".concat(buckets[bucket.key], " requests")}/>
                <span className="lv-age-histogram__label">{bucket.label}</span>
              </div>); })}
          </div>
        </div>

        {/* ─── Most leave days ──────────────────────────────────── */}
        <div className="lv-kpi-card">
          <div className="lv-kpi-card__label-row">
            <div className="lv-kpi-card__label">Most Leave Days</div>
            <div className="lv-kpi-card__label-hint">
              {loading ? '' : "".concat(formatDays(totalDaysBooked), " days booked")}
            </div>
          </div>
          {loading ? (<div className="lv-leaderboard lv-leaderboard--loading">
              <span className="lv-kpi__skeleton"/>
              <span className="lv-kpi__skeleton"/>
            </div>) : leaderboard.length ? (<div className="lv-leaderboard">
              {leaderboard.map(function (person, index) { return (<div className="lv-leaderboard__row" key={"".concat(person.employee_code || person.employee_name, "-").concat(index)}>
                  <span className="lv-leaderboard__avatar">{initialsOf(person.employee_name)}</span>
                  <div className="lv-leaderboard__info">
                    <div className="lv-leaderboard__name">{person.employee_name || 'Unknown'}</div>
                    <div className="lv-leaderboard__dept">{person.department || '--'}</div>
                  </div>
                  <div className="lv-leaderboard__stats">
                    <div>
                      <strong>{formatDays(person.casual_days)}</strong>
                      <span>CASUAL</span>
                    </div>
                    <div>
                      <strong>{formatDays(person.sick_days)}</strong>
                      <span>SICK</span>
                    </div>
                  </div>
                </div>); })}
            </div>) : (<div className="lv-leaderboard__empty">No approved or pending leave in this filter.</div>)}
        </div>
      </div>
    </div>);
}
