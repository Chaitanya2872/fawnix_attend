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
exports.TourScene = TourScene;
var useMotion_1 = require("../hooks/useMotion");
var usePublicStats_1 = require("../hooks/usePublicStats");
var fawnix_bg_png_1 = require("../../../assets/fawnix_bg.png");
/* ─────────────────────────────────────────────────────────────────────────────
   Animated product scenes. These are real DOM/SVG compositions rather than
   screenshots, so they stay crisp at any size and animate on the compositor.

   Every number shown here is fed by `usePublicStats()` → GET /api/public/stats,
   so the mock screens reflect the actual workspace. Only the people/row *names*
   stay illustrative, since the public endpoint is deliberately PII-free.
   ───────────────────────────────────────────────────────────────────────────── */
/** "20 August" style label for the scene header. */
function todayLabel() {
    return new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}
/** "August 2026" style label for the report filter chip. */
function monthLabel() {
    return new Date().toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });
}
/**
 * Turn the live 7-day rate series into a smooth SVG line + area inside the
 * 600×170 viewBox the insights chart uses. Keeping the geometry in JS means the
 * curve is genuinely the workspace trend rather than a decorative squiggle.
 */
function sparkPath(rates) {
    var width = 600;
    var height = 170;
    var top = 16;
    var floor = 148;
    var series = rates.length ? rates : [0];
    var points = series.map(function (rate, index) {
        var x = (index / Math.max(series.length - 1, 1)) * width;
        var clamped = Math.min(Math.max(rate, 0), 100);
        return [x, floor - (clamped / 100) * (floor - top)];
    });
    var line = "M".concat(points[0][0].toFixed(1), " ").concat(points[0][1].toFixed(1));
    for (var index = 1; index < points.length; index += 1) {
        var _a = points[index - 1], px = _a[0], py = _a[1];
        var _b = points[index], x = _b[0], y = _b[1];
        var mid = ((px + x) / 2).toFixed(1);
        line += " C".concat(mid, " ").concat(py.toFixed(1), ", ").concat(mid, " ").concat(y.toFixed(1), ", ").concat(x.toFixed(1), " ").concat(y.toFixed(1));
    }
    var _c = points[points.length - 1], lastX = _c[0], lastY = _c[1];
    return {
        line: line,
        area: "".concat(line, " V").concat(height, " H0Z"),
        dot: { x: lastX, y: lastY },
    };
}
function SceneShell(_a) {
    var label = _a.label, children = _a.children;
    return (<div className="scene">
      <div className="scene-bar">
        <span className="scene-dots">
          <i />
          <i />
          <i />
        </span>
        <small>{label}</small>
        <span className="scene-bar-live">
          <i />
          live
        </span>
      </div>
      <div className="scene-body">{children}</div>
    </div>);
}
function SceneRail(_a) {
    var active = _a.active;
    return (<aside className="scene-rail">
      <img src={fawnix_bg_png_1.default} alt=""/>
      {Array.from({ length: 6 }).map(function (_, index) { return (<span key={index} className={index === active ? "is-active" : ""}/>); })}
      <em />
    </aside>);
}
/* ── 01 · Command centre ──────────────────────────────────────────────────── */
function CommandScene() {
    var beat = (0, useMotion_1.useLivePulse)(3200);
    var stats = (0, usePublicStats_1.usePublicStats)();
    /* Bars are scaled so the tallest day fills the card, which keeps short
       ranges (a new deployment, a quiet week) readable instead of flat. */
    var peak = Math.max.apply(Math, __spreadArray(__spreadArray([], stats.rates, false), [1], false));
    var signals = [
        {
            tone: "warn",
            who: "".concat(stats.lateLabel, " late arrivals"),
            what: "flagged today",
        },
        {
            tone: "info",
            who: "".concat(stats.inFieldLabel, " field visits"),
            what: "in progress now",
        },
        {
            tone: "amber",
            who: "".concat(stats.approvalsLabel, " approvals"),
            what: "waiting for review",
        },
    ];
    return (<SceneShell label="overview / today">
      <div className="scene-app">
        <SceneRail active={0}/>
        <div className="scene-work">
          <header className="scene-head">
            <div>
              <small>{todayLabel()}</small>
              <strong>Good morning, Admin</strong>
            </div>
            <button type="button" className="scene-chip">
              Refresh
            </button>
          </header>

          <div className="scene-stats">
            <div className="scene-stat">
              <small>Attendance rate</small>
              <strong>{stats.rateLabel}</strong>
              <em className={stats.weekDelta >= 0 ? "up" : "warm"}>
                {stats.weekDelta >= 0 ? "▲" : "▼"} {stats.deltaLabel}
              </em>
            </div>
            <div className="scene-stat">
              <small>Present today</small>
              <strong>
                {stats.presentLabel}
                <sup>/{stats.headcountLabel}</sup>
              </strong>
              <em className="calm">
                <i className="ping"/>
                live
              </em>
            </div>
            <div className="scene-stat">
              <small>Needs attention</small>
              <strong>{stats.approvalsLabel}</strong>
              <em className="warm">{stats.lateLabel} late today</em>
            </div>
          </div>

          <div className="scene-split">
            <div className="scene-card">
              <header>
                <strong>Attendance rhythm</strong>
                <small>Last 7 days</small>
              </header>
              <div className="scene-bars">
                {stats.rates.map(function (rate, index) { return (<span key={index} style={{
                "--h": "".concat(Math.max(6, (rate / peak) * 96), "%"),
                "--d": "".concat(index * 90, "ms"),
            }} className={index === stats.rates.length - 1 ? "is-today" : ""}>
                    <b>{stats.counts[index]}</b>
                  </span>); })}
              </div>
              <footer>
                {stats.days.map(function (day, index) { return (<small key={"".concat(day, "-").concat(index)}>{day}</small>); })}
              </footer>
            </div>

            <div className="scene-card scene-feed">
              <header>
                <strong>Live signals</strong>
                <small>View all</small>
              </header>
              {signals.map(function (signal, index) { return (<p key={signal.who} data-tone={signal.tone} className={beat % 3 === index ? "is-fresh" : ""}>
                  <i />
                  <b>{signal.who}</b>
                  <span>{signal.what}</span>
                </p>); })}
            </div>
          </div>
        </div>
      </div>
    </SceneShell>);
}
/* ── 02 · People ──────────────────────────────────────────────────────────── */
var PEOPLE = [
    ["AK", "Anika Kapoor", "Operations", "FX-1042"],
    ["RM", "Rohan Mehta", "Sales", "FX-1108"],
    ["NS", "Nisha Shah", "Human Resources", "FX-1156"],
    ["VP", "Vikram Paul", "Field Team", "FX-1203"],
    ["SK", "Sara Khan", "Finance", "FX-1247"],
    ["DT", "Dev Thomas", "Technology", "FX-1290"],
];
function PeopleScene() {
    var stats = (0, usePublicStats_1.usePublicStats)();
    return (<SceneShell label="people / directory">
      <div className="scene-app">
        <SceneRail active={1}/>
        <div className="scene-work">
          <header className="scene-head">
            <div>
              <small>
                Workforce · {stats.headcount} active · {stats.departments}{" "}
                departments
              </small>
              <strong>Employee directory</strong>
            </div>
            <button type="button" className="scene-chip is-primary">
              + Add employee
            </button>
          </header>

          <div className="scene-filters">
            <span className="scene-search">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="4.4"/>
                <path d="M10.4 10.4 14 14"/>
              </svg>
              Search people, teams, roles…
              <i className="caret"/>
            </span>
            <b>All departments</b>
            <b>Active</b>
          </div>

          <div className="scene-people">
            {PEOPLE.map(function (_a, index) {
            var initials = _a[0], name = _a[1], dept = _a[2], code = _a[3];
            return (<div className="scene-person" key={name} style={{ "--d": "".concat(index * 70, "ms") }}>
                <b className={"scene-avatar tone-".concat(index % 4)}>{initials}</b>
                <div>
                  <strong>{name}</strong>
                  <small>
                    {dept} · {code}
                  </small>
                </div>
                <span className="scene-tag">Active</span>
              </div>);
        })}
          </div>
        </div>
      </div>
    </SceneShell>);
}
/* ── 03 · Attendance ──────────────────────────────────────────────────────── */
var ROWS = [
    ["Anika Kapoor", "09:01", "Present", "8h 42m"],
    ["Rohan Mehta", "10:24", "Late", "7h 18m"],
    ["Nisha Shah", "08:56", "Present", "8h 51m"],
    ["Vikram Paul", "09:04", "In field", "6h 12m"],
    ["Sara Khan", "--:--", "Not in", "—"],
];
function statusTone(status) {
    if (status === "Late")
        return "warn";
    if (status === "Not in")
        return "idle";
    if (status === "In field")
        return "info";
    return "good";
}
function AttendanceScene() {
    var stats = (0, usePublicStats_1.usePublicStats)();
    var kpis = [
        [stats.presentLabel, "Present"],
        [stats.lateLabel, "Late arrivals"],
        [stats.notInLabel, "Missed logins"],
        [stats.avgHoursLabel, "Avg. hours"],
    ];
    return (<SceneShell label="attendance / daily records">
      <div className="scene-app">
        <SceneRail active={2}/>
        <div className="scene-work">
          <header className="scene-head">
            <div>
              <small>Operations · {todayLabel()}</small>
              <strong>Attendance records</strong>
            </div>
            <button type="button" className="scene-chip">
              Export
            </button>
          </header>

          <div className="scene-kpis">
            {kpis.map(function (_a, index) {
            var value = _a[0], label = _a[1];
            return (<span key={label} style={{ "--d": "".concat(index * 80, "ms") }}>
                <b>{value}</b>
                {label}
              </span>);
        })}
          </div>

          <div className="scene-table">
            <div className="scene-tr is-head">
              <i>Employee</i>
              <i>Clock in</i>
              <i>Status</i>
              <i>Hours</i>
            </div>
            {ROWS.map(function (_a, index) {
            var name = _a[0], time = _a[1], status = _a[2], hours = _a[3];
            return (<div className="scene-tr" key={name} style={{ "--d": "".concat(index * 80, "ms") }}>
                <strong>
                  <b className={"scene-avatar sm tone-".concat(index % 4)}>
                    {name
                    .split(" ")
                    .map(function (part) { return part[0]; })
                    .join("")}
                  </b>
                  {name}
                </strong>
                <span className="mono">{time}</span>
                <span className="scene-pill" data-tone={statusTone(status)}>
                  {status}
                </span>
                <small className="mono">{hours}</small>
              </div>);
        })}
          </div>
        </div>
      </div>
    </SceneShell>);
}
/* ── 04 · Approvals ───────────────────────────────────────────────────────── */
var QUEUE = [
    ["RM", "Rohan Mehta", "Casual leave · 12–13 Aug"],
    ["NS", "Nisha Shah", "Late arrival · 10:24 AM"],
    ["VP", "Vikram Paul", "Early leave · 4:30 PM"],
    ["SK", "Sara Khan", "Comp-off · 2 days"],
];
function ApprovalsScene() {
    var stats = (0, usePublicStats_1.usePublicStats)();
    return (<SceneShell label="inbox / review centre">
      <div className="scene-app">
        <SceneRail active={3}/>
        <div className="scene-work">
          <header className="scene-head">
            <div>
              <small>
                Workflows · {stats.pendingLeaves} leave ·{" "}
                {stats.pendingExceptions} exceptions
              </small>
              <strong>
                Review centre{" "}
                <em className="scene-count">{stats.approvalsLabel}</em>
              </strong>
            </div>
            <button type="button" className="scene-chip">
              Filter
            </button>
          </header>

          <div className="scene-approvals">
            <div className="scene-queue">
              {QUEUE.map(function (_a, index) {
            var initials = _a[0], name = _a[1], detail = _a[2];
            return (<div className={"scene-queue-item".concat(index === 0 ? " is-selected" : "")} key={name} style={{ "--d": "".concat(index * 80, "ms") }}>
                  <b className={"scene-avatar sm tone-".concat(index % 4)}>
                    {initials}
                  </b>
                  <span>
                    <strong>{name}</strong>
                    <small>{detail}</small>
                  </span>
                </div>);
        })}
            </div>

            <div className="scene-detail">
              <small className="scene-detail-eyebrow">
                Leave request · 01 of {stats.approvalsLabel}
              </small>
              <h4>Casual leave</h4>
              <p>
                Rohan Mehta <span>· Sales · FX-1108</span>
              </p>
              <div className="scene-facts">
                <b>
                  <small>Requested dates</small>12 — 13 Aug
                </b>
                <b>
                  <small>Reporting manager</small>Priya Menon
                </b>
                <b>
                  <small>Balance after</small>6.5 days
                </b>
                <b>
                  <small>Submitted</small>2 days ago
                </b>
              </div>
              <blockquote>
                Family commitment. Work has been handed over to the regional
                team.
              </blockquote>
              <div className="scene-actions">
                <button type="button">Decline</button>
                <button type="button" className="is-primary">
                  Approve request
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneShell>);
}
/* ── 05 · Field work ──────────────────────────────────────────────────────── */
function FieldScene() {
    var stats = (0, usePublicStats_1.usePublicStats)();
    /* The route drawing is illustrative, but the counters below it are real:
       how many people are out on a visit today and how far the programme has
       travelled in total. */
    var activeVisits = Math.max(stats.inField, 1);
    var participants = Math.max(stats.fieldParticipants, activeVisits);
    return (<SceneShell label="field work / live route">
      <div className="scene-map">
        <svg className="scene-map-canvas" viewBox="0 0 640 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="fx-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c8f45f"/>
              <stop offset="100%" stopColor="#7fe0c8"/>
            </linearGradient>
            <radialGradient id="fx-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(200,244,95,0.34)"/>
              <stop offset="100%" stopColor="rgba(200,244,95,0)"/>
            </radialGradient>
          </defs>

          {/* street grid */}
          <g className="scene-map-grid">
            {Array.from({ length: 9 }).map(function (_, i) { return (<line key={"h".concat(i)} x1="0" y1={i * 48} x2="640" y2={i * 48}/>); })}
            {Array.from({ length: 14 }).map(function (_, i) { return (<line key={"v".concat(i)} x1={i * 48} y1="0" x2={i * 48} y2="380"/>); })}
          </g>

          <g className="scene-map-blocks">
            <rect x="72" y="66" width="118" height="74" rx="8"/>
            <rect x="252" y="130" width="150" height="96" rx="8"/>
            <rect x="452" y="72" width="120" height="82" rx="8"/>
            <rect x="130" y="238" width="140" height="86" rx="8"/>
            <rect x="430" y="248" width="132" height="70" rx="8"/>
          </g>

          <circle cx="132" cy="286" r="86" fill="url(#fx-glow)"/>

          {/* geofence */}
          <circle className="scene-geofence" cx="132" cy="286" r="52"/>

          {/* the route */}
          <path className="scene-route-shadow" d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96"/>
          <path className="scene-route" d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96" stroke="url(#fx-route)"/>
          <path className="scene-route-runner" d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96"/>

          {/* stops */}
          {[
            [268, 196],
            [396, 152],
        ].map(function (_a) {
            var x = _a[0], y = _a[1];
            return (<circle key={"".concat(x)} className="scene-stop" cx={x} cy={y} r="5.5"/>);
        })}

          <g className="scene-pin-start">
            <circle className="scene-pin-ring" cx="132" cy="286" r="14"/>
            <circle cx="132" cy="286" r="7"/>
          </g>
          <g className="scene-pin-end">
            <circle cx="520" cy="96" r="8"/>
          </g>
        </svg>

        <div className="scene-map-tag is-start">Start · check-in</div>
        <div className="scene-map-tag is-end">Destination</div>

        <div className="scene-visit">
          <span className="scene-live">
            <i />
            {activeVisits === 1
            ? "1 live visit"
            : "".concat(activeVisits, " live visits")}
          </span>
          <strong>Branch visit · Andheri East</strong>
          <small>Route verified against the client geofence</small>
          <div className="scene-visit-stats">
            <b>
              {stats.inFieldLabel}
              <span>on field</span>
            </b>
            <b>
              {participants}
              <span>tracked</span>
            </b>
            <b>
              {stats.presentLabel}
              <span>clocked in</span>
            </b>
          </div>
        </div>

        <div className="scene-map-alert">
          <i />
          <span>
            <strong>Within geofence</strong>
            <small>Distance check passed</small>
          </span>
        </div>
      </div>
    </SceneShell>);
}
/* ── 06 · Intelligence ────────────────────────────────────────────────────── */
function IntelligenceScene() {
    var stats = (0, usePublicStats_1.usePublicStats)();
    var spark = sparkPath(stats.rates);
    var heat = stats.heatmap;
    return (<SceneShell label="insights / reports">
      <div className="scene-app">
        <SceneRail active={5}/>
        <div className="scene-work">
          <header className="scene-head">
            <div>
              <small>Insights · Attendance</small>
              <strong>Performance, in perspective</strong>
            </div>
            <button type="button" className="scene-chip">
              {monthLabel()}
            </button>
          </header>

          <div className="scene-tabs">
            <b>Attendance</b>
            <span>Efficiency</span>
            <span>Exceptions</span>
            <span>Leaves</span>
          </div>

          <div className="scene-chart">
            <div className="scene-chart-y">
              <small>100%</small>
              <small>75%</small>
              <small>50%</small>
              <small>25%</small>
            </div>
            <svg viewBox="0 0 600 170" aria-hidden="true">
              <defs>
                <linearGradient id="fx-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(200,244,95,0.42)"/>
                  <stop offset="100%" stopColor="rgba(200,244,95,0)"/>
                </linearGradient>
              </defs>
              <g className="scene-chart-grid">
                {[34, 76, 118].map(function (y) { return (<line key={y} x1="0" y1={y} x2="600" y2={y}/>); })}
              </g>
              <path className="scene-chart-area" fill="url(#fx-area)" d={spark.area}/>
              <path className="scene-chart-line" d={spark.line}/>
              <circle className="scene-chart-dot" cx={spark.dot.x} cy={spark.dot.y} r="5"/>
            </svg>
          </div>

          <div className="scene-heat">
            <div className="scene-heat-grid">
              {heat.flatMap(function (week, w) {
            return week.map(function (level, d) { return (<i key={"".concat(w, "-").concat(d)} data-level={level} style={{ "--d": "".concat((w * 7 + d) * 16, "ms") }}/>); });
        })}
            </div>
            <div className="scene-heat-legend">
              <small>Heatmap · {heat.length} weeks</small>
              <span>
                low
                <i data-level="1"/>
                <i data-level="2"/>
                <i data-level="3"/>
                <i data-level="4"/>
                high
              </span>
            </div>
          </div>

          <div className="scene-foot">
            <b>
              <strong>{stats.weekAverage.toFixed(1)}%</strong>
              <small>Average attendance</small>
            </b>
            <b>
              <strong>{stats.deltaLabel}</strong>
              <small>vs. last week</small>
            </b>
            <b>
              <strong>{stats.attendanceRecords.toLocaleString()}</strong>
              <small>Records analysed</small>
            </b>
          </div>
        </div>
      </div>
    </SceneShell>);
}
/* ── dispatcher ───────────────────────────────────────────────────────────── */
var SCENES = {
    command: CommandScene,
    people: PeopleScene,
    attendance: AttendanceScene,
    approvals: ApprovalsScene,
    field: FieldScene,
    intelligence: IntelligenceScene,
};
function TourScene(_a) {
    var scene = _a.scene;
    var Component = SCENES[scene];
    return <Component />;
}
