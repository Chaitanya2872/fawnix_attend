import { type ReactNode } from "react";
import type { ChapterScene } from "../constants/tourContent";
import { useLivePulse } from "../hooks/useMotion";
import { usePublicStats } from "../hooks/usePublicStats";
import fawnixBg from "../../../assets/fawnix_bg.png";

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
function sparkPath(rates: number[]) {
  const width = 600;
  const height = 170;
  const top = 16;
  const floor = 148;
  const series = rates.length ? rates : [0];

  const points = series.map((rate, index) => {
    const x = (index / Math.max(series.length - 1, 1)) * width;
    const clamped = Math.min(Math.max(rate, 0), 100);
    return [x, floor - (clamped / 100) * (floor - top)] as const;
  });

  let line = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let index = 1; index < points.length; index += 1) {
    const [px, py] = points[index - 1];
    const [x, y] = points[index];
    const mid = ((px + x) / 2).toFixed(1);
    line += ` C${mid} ${py.toFixed(1)}, ${mid} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  const [lastX, lastY] = points[points.length - 1];
  return {
    line,
    area: `${line} V${height} H0Z`,
    dot: { x: lastX, y: lastY },
  };
}

function SceneShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="scene">
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
    </div>
  );
}

function SceneRail({ active }: { active: number }) {
  return (
    <aside className="scene-rail">
      <img src={fawnixBg} alt="" />
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className={index === active ? "is-active" : ""} />
      ))}
      <em />
    </aside>
  );
}

/* ── 01 · Command centre ──────────────────────────────────────────────────── */

function CommandScene() {
  const beat = useLivePulse(3200);
  const stats = usePublicStats();

  /* Bars are scaled so the tallest day fills the card, which keeps short
     ranges (a new deployment, a quiet week) readable instead of flat. */
  const peak = Math.max(...stats.rates, 1);

  const signals = [
    {
      tone: "warn",
      who: `${stats.lateLabel} late arrivals`,
      what: "flagged today",
    },
    {
      tone: "info",
      who: `${stats.inFieldLabel} field visits`,
      what: "in progress now",
    },
    {
      tone: "amber",
      who: `${stats.approvalsLabel} approvals`,
      what: "waiting for review",
    },
  ];

  return (
    <SceneShell label="overview / today">
      <div className="scene-app">
        <SceneRail active={0} />
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
                <i className="ping" />
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
                {stats.rates.map((rate, index) => (
                  <span
                    key={index}
                    style={
                      {
                        "--h": `${Math.max(6, (rate / peak) * 96)}%`,
                        "--d": `${index * 90}ms`,
                      } as React.CSSProperties
                    }
                    className={
                      index === stats.rates.length - 1 ? "is-today" : ""
                    }
                  >
                    <b>{stats.counts[index]}</b>
                  </span>
                ))}
              </div>
              <footer>
                {stats.days.map((day, index) => (
                  <small key={`${day}-${index}`}>{day}</small>
                ))}
              </footer>
            </div>

            <div className="scene-card scene-feed">
              <header>
                <strong>Live signals</strong>
                <small>View all</small>
              </header>
              {signals.map((signal, index) => (
                <p
                  key={signal.who}
                  data-tone={signal.tone}
                  className={beat % 3 === index ? "is-fresh" : ""}
                >
                  <i />
                  <b>{signal.who}</b>
                  <span>{signal.what}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

/* ── 02 · People ──────────────────────────────────────────────────────────── */

const PEOPLE = [
  ["AK", "Anika Kapoor", "Operations", "FX-1042"],
  ["RM", "Rohan Mehta", "Sales", "FX-1108"],
  ["NS", "Nisha Shah", "Human Resources", "FX-1156"],
  ["VP", "Vikram Paul", "Field Team", "FX-1203"],
  ["SK", "Sara Khan", "Finance", "FX-1247"],
  ["DT", "Dev Thomas", "Technology", "FX-1290"],
];

function PeopleScene() {
  const stats = usePublicStats();

  return (
    <SceneShell label="people / directory">
      <div className="scene-app">
        <SceneRail active={1} />
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
                <circle cx="7" cy="7" r="4.4" />
                <path d="M10.4 10.4 14 14" />
              </svg>
              Search people, teams, roles…
              <i className="caret" />
            </span>
            <b>All departments</b>
            <b>Active</b>
          </div>

          <div className="scene-people">
            {PEOPLE.map(([initials, name, dept, code], index) => (
              <div
                className="scene-person"
                key={name}
                style={{ "--d": `${index * 70}ms` } as React.CSSProperties}
              >
                <b className={`scene-avatar tone-${index % 4}`}>{initials}</b>
                <div>
                  <strong>{name}</strong>
                  <small>
                    {dept} · {code}
                  </small>
                </div>
                <span className="scene-tag">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

/* ── 03 · Attendance ──────────────────────────────────────────────────────── */

const ROWS: [string, string, string, string][] = [
  ["Anika Kapoor", "09:01", "Present", "8h 42m"],
  ["Rohan Mehta", "10:24", "Late", "7h 18m"],
  ["Nisha Shah", "08:56", "Present", "8h 51m"],
  ["Vikram Paul", "09:04", "In field", "6h 12m"],
  ["Sara Khan", "--:--", "Not in", "—"],
];

function statusTone(status: string) {
  if (status === "Late") return "warn";
  if (status === "Not in") return "idle";
  if (status === "In field") return "info";
  return "good";
}

function AttendanceScene() {
  const stats = usePublicStats();

  const kpis: [string, string][] = [
    [stats.presentLabel, "Present"],
    [stats.lateLabel, "Late arrivals"],
    [stats.notInLabel, "Missed logins"],
    [stats.avgHoursLabel, "Avg. hours"],
  ];

  return (
    <SceneShell label="attendance / daily records">
      <div className="scene-app">
        <SceneRail active={2} />
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
            {kpis.map(([value, label], index) => (
              <span
                key={label}
                style={{ "--d": `${index * 80}ms` } as React.CSSProperties}
              >
                <b>{value}</b>
                {label}
              </span>
            ))}
          </div>

          <div className="scene-table">
            <div className="scene-tr is-head">
              <i>Employee</i>
              <i>Clock in</i>
              <i>Status</i>
              <i>Hours</i>
            </div>
            {ROWS.map(([name, time, status, hours], index) => (
              <div
                className="scene-tr"
                key={name}
                style={{ "--d": `${index * 80}ms` } as React.CSSProperties}
              >
                <strong>
                  <b className={`scene-avatar sm tone-${index % 4}`}>
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </b>
                  {name}
                </strong>
                <span className="mono">{time}</span>
                <span className="scene-pill" data-tone={statusTone(status)}>
                  {status}
                </span>
                <small className="mono">{hours}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

/* ── 04 · Approvals ───────────────────────────────────────────────────────── */

const QUEUE = [
  ["RM", "Rohan Mehta", "Casual leave · 12–13 Aug"],
  ["NS", "Nisha Shah", "Late arrival · 10:24 AM"],
  ["VP", "Vikram Paul", "Early leave · 4:30 PM"],
  ["SK", "Sara Khan", "Comp-off · 2 days"],
];

function ApprovalsScene() {
  const stats = usePublicStats();

  return (
    <SceneShell label="inbox / review centre">
      <div className="scene-app">
        <SceneRail active={3} />
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
              {QUEUE.map(([initials, name, detail], index) => (
                <div
                  className={`scene-queue-item${index === 0 ? " is-selected" : ""}`}
                  key={name}
                  style={{ "--d": `${index * 80}ms` } as React.CSSProperties}
                >
                  <b className={`scene-avatar sm tone-${index % 4}`}>
                    {initials}
                  </b>
                  <span>
                    <strong>{name}</strong>
                    <small>{detail}</small>
                  </span>
                </div>
              ))}
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
    </SceneShell>
  );
}

/* ── 05 · Field work ──────────────────────────────────────────────────────── */

function FieldScene() {
  const stats = usePublicStats();

  /* The route drawing is illustrative, but the counters below it are real:
     how many people are out on a visit today and how far the programme has
     travelled in total. */
  const activeVisits = Math.max(stats.inField, 1);
  const participants = Math.max(stats.fieldParticipants, activeVisits);

  return (
    <SceneShell label="field work / live route">
      <div className="scene-map">
        <svg
          className="scene-map-canvas"
          viewBox="0 0 640 380"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fx-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c8f45f" />
              <stop offset="100%" stopColor="#7fe0c8" />
            </linearGradient>
            <radialGradient id="fx-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(200,244,95,0.34)" />
              <stop offset="100%" stopColor="rgba(200,244,95,0)" />
            </radialGradient>
          </defs>

          {/* street grid */}
          <g className="scene-map-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 48} x2="640" y2={i * 48} />
            ))}
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48} y2="380" />
            ))}
          </g>

          <g className="scene-map-blocks">
            <rect x="72" y="66" width="118" height="74" rx="8" />
            <rect x="252" y="130" width="150" height="96" rx="8" />
            <rect x="452" y="72" width="120" height="82" rx="8" />
            <rect x="130" y="238" width="140" height="86" rx="8" />
            <rect x="430" y="248" width="132" height="70" rx="8" />
          </g>

          <circle cx="132" cy="286" r="86" fill="url(#fx-glow)" />

          {/* geofence */}
          <circle className="scene-geofence" cx="132" cy="286" r="52" />

          {/* the route */}
          <path
            className="scene-route-shadow"
            d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96"
          />
          <path
            className="scene-route"
            d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96"
            stroke="url(#fx-route)"
          />
          <path
            className="scene-route-runner"
            d="M132 286 C196 268, 214 214, 268 196 S352 208, 396 152 S470 132, 520 96"
          />

          {/* stops */}
          {[
            [268, 196],
            [396, 152],
          ].map(([x, y]) => (
            <circle key={`${x}`} className="scene-stop" cx={x} cy={y} r="5.5" />
          ))}

          <g className="scene-pin-start">
            <circle className="scene-pin-ring" cx="132" cy="286" r="14" />
            <circle cx="132" cy="286" r="7" />
          </g>
          <g className="scene-pin-end">
            <circle cx="520" cy="96" r="8" />
          </g>
        </svg>

        <div className="scene-map-tag is-start">Start · check-in</div>
        <div className="scene-map-tag is-end">Destination</div>

        <div className="scene-visit">
          <span className="scene-live">
            <i />
            {activeVisits === 1
              ? "1 live visit"
              : `${activeVisits} live visits`}
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
    </SceneShell>
  );
}

/* ── 06 · Intelligence ────────────────────────────────────────────────────── */

function IntelligenceScene() {
  const stats = usePublicStats();
  const spark = sparkPath(stats.rates);
  const heat = stats.heatmap;

  return (
    <SceneShell label="insights / reports">
      <div className="scene-app">
        <SceneRail active={5} />
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
                  <stop offset="0%" stopColor="rgba(200,244,95,0.42)" />
                  <stop offset="100%" stopColor="rgba(200,244,95,0)" />
                </linearGradient>
              </defs>
              <g className="scene-chart-grid">
                {[34, 76, 118].map((y) => (
                  <line key={y} x1="0" y1={y} x2="600" y2={y} />
                ))}
              </g>
              <path
                className="scene-chart-area"
                fill="url(#fx-area)"
                d={spark.area}
              />
              <path className="scene-chart-line" d={spark.line} />
              <circle
                className="scene-chart-dot"
                cx={spark.dot.x}
                cy={spark.dot.y}
                r="5"
              />
            </svg>
          </div>

          <div className="scene-heat">
            <div className="scene-heat-grid">
              {heat.flatMap((week, w) =>
                week.map((level, d) => (
                  <i
                    key={`${w}-${d}`}
                    data-level={level}
                    style={
                      { "--d": `${(w * 7 + d) * 16}ms` } as React.CSSProperties
                    }
                  />
                )),
              )}
            </div>
            <div className="scene-heat-legend">
              <small>Heatmap · {heat.length} weeks</small>
              <span>
                low
                <i data-level="1" />
                <i data-level="2" />
                <i data-level="3" />
                <i data-level="4" />
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
    </SceneShell>
  );
}

/* ── dispatcher ───────────────────────────────────────────────────────────── */

const SCENES: Record<ChapterScene, () => ReactNode> = {
  command: CommandScene,
  people: PeopleScene,
  attendance: AttendanceScene,
  approvals: ApprovalsScene,
  field: FieldScene,
  intelligence: IntelligenceScene,
};

export function TourScene({ scene }: { scene: ChapterScene }) {
  const Component = SCENES[scene];
  return <Component />;
}
