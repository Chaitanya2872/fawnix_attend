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
exports.HeroSection = HeroSection;
var usePublicStats_1 = require("../hooks/usePublicStats");
/**
 * Overview hero. The "Today at a glance" panel is wired to
 * GET /api/public/stats, so the numbers a visitor sees are the same numbers the
 * workspace is reporting right now. When the API is unreachable the hook hands
 * back a neutral fallback so the layout never collapses.
 */
function HeroSection(_a) {
    var onGetStarted = _a.onGetStarted, onViewTour = _a.onViewTour;
    var stats = (0, usePublicStats_1.usePublicStats)();
    var peak = Math.max.apply(Math, __spreadArray(__spreadArray([], stats.rates, false), [1], false));
    return (<div className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Modern attendance and field operations</p>
        <h1>Make every workday traceable, compliant, and effortless.</h1>
        <p className="lead">
          Fawnix unifies attendance, activities, approvals, and on-field
          tracking into a single mobile-first experience for teams that move.
        </p>
        <div className="hero-actions">
          <button className="cta" onClick={onGetStarted} type="button">
            Get Started
          </button>
          <button className="ghost" onClick={onViewTour} type="button">
            View Product Tour
          </button>
        </div>
        <div className="hero-stats">
          <div>
            <span>{stats.rateLabel}</span>
            <small>attendance today</small>
          </div>
          <div>
            <span>{stats.headcountLabel}</span>
            <small>people on the roll</small>
          </div>
          <div>
            <span>{stats.attendanceRecords.toLocaleString()}</span>
            <small>records captured</small>
          </div>
        </div>
      </div>
      <div className="hero-panel">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Today at a glance</h3>
            <span className="status" data-live={stats.isLive || undefined}>
              {stats.isLive ? "Live" : "Preview"}
            </span>
          </div>
          <div className="panel-body">
            <div className="panel-row">
              <div>
                <strong>{stats.presentLabel}</strong>
                <span>checked in</span>
              </div>
              <div>
                <strong>{stats.lateLabel}</strong>
                <span>late arrivals</span>
              </div>
              <div>
                <strong>{stats.approvalsLabel}</strong>
                <span>pending approvals</span>
              </div>
            </div>

            <div className="panel-spark">
              <div className="panel-spark-head">
                <p>Attendance, last 7 days</p>
                <em data-dir={stats.weekDelta >= 0 ? "up" : "down"}>
                  {stats.weekDelta >= 0 ? "▲" : "▼"} {stats.deltaLabel}
                </em>
              </div>
              <div className="panel-spark-bars">
                {stats.rates.map(function (rate, index) { return (<i key={index} className={index === stats.rates.length - 1 ? "is-today" : undefined} style={{
                "--h": "".concat(Math.max(8, (rate / peak) * 100), "%"),
            }} title={"".concat(stats.days[index], " \u00B7 ").concat(rate, "%")}/>); })}
              </div>
              <div className="panel-spark-days">
                {stats.days.map(function (day, index) { return (<small key={"".concat(day, "-").concat(index)}>{day}</small>); })}
              </div>
            </div>

            <div className="panel-activity">
              <p>Happening right now</p>
              <div className="chip-row">
                <span className="chip">
                  {stats.inFieldLabel} field visits live
                </span>
                <span className="chip">{stats.avgHoursLabel} avg. hours</span>
                <span className="chip">{stats.departments} departments</span>
              </div>
            </div>
          </div>
        </div>
        <div className="panel-card subtle">
          <h4>Built for mobile teams</h4>
          <p>
            Works for sales, logistics, service crews, and retail operations.
          </p>
        </div>
      </div>
    </div>);
}
