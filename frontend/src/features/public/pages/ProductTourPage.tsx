import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { appRoutes } from "../../../app/config/routes";
import { SiteFooter } from "../../../components/layout/SiteFooter";
import fawnixBg from "../../../assets/fawnix_bg.png";

type DemoKind =
  | "overview"
  | "people"
  | "attendance"
  | "approvals"
  | "field"
  | "reports";
type TourStep = {
  number: string;
  short: string;
  eyebrow: string;
  title: string;
  body: string;
  tags: string[];
  demo: DemoKind;
};

const steps: TourStep[] = [
  {
    number: "01",
    short: "Overview",
    eyebrow: "The signal, first",
    title: "A living view of the workday.",
    body: "Fawnix brings attendance, field movement, approvals, and risk signals into one surface so the next decision is always close at hand.",
    tags: ["Live attendance", "Exceptions", "Field activity"],
    demo: "overview",
  },
  {
    number: "02",
    short: "People",
    eyebrow: "People, organised",
    title: "Every person in the right context.",
    body: "Search the employee directory, understand reporting lines, and move from a record to an action without losing the thread.",
    tags: ["Employee directory", "Profiles", "Departments"],
    demo: "people",
  },
  {
    number: "03",
    short: "Attendance",
    eyebrow: "Evidence, not guesswork",
    title: "The daily picture, made reliable.",
    body: "Clock-ins, late arrivals, working hours, missed logins, and location evidence come together in a workflow designed for speed.",
    tags: ["Clock-ins", "Working hours", "Reminders"],
    demo: "attendance",
  },
  {
    number: "04",
    short: "Approvals",
    eyebrow: "Less chasing",
    title: "Resolve what needs attention.",
    body: "Prioritise pending leave and exceptions, inspect the story behind each request, and keep every decision connected to an audit trail.",
    tags: ["Leave queue", "Exception review", "Audit trail"],
    demo: "approvals",
  },
  {
    number: "05",
    short: "Field work",
    eyebrow: "For teams that move",
    title: "See the journey, not just the timestamp.",
    body: "Visit progress, destinations, routes, distance, and duration form a visual record of work happening beyond the office.",
    tags: ["Live visits", "Routes", "Location signals"],
    demo: "field",
  },
  {
    number: "06",
    short: "Insights",
    eyebrow: "Patterns into action",
    title: "Data you can actually explain.",
    body: "Compare trends, scan heatmaps, measure workforce efficiency, and export a view that makes the next conversation easier.",
    tags: ["Heatmaps", "Trends", "Exports"],
    demo: "reports",
  },
];

function TourNav({ onEnter }: { onEnter: () => void }) {
  return (
    <nav className="tour-nav">
      <a className="tour-brand" href={appRoutes.home}>
        <img src={fawnixBg} alt="Fawnix" />
        <span>
          <strong>Fawnix</strong>
          <small>Product tour</small>
        </span>
      </a>
      <div className="tour-nav-center">
        <span>01</span>
        <i />
        <span>06</span>
        <small>Connected workspace</small>
      </div>
      <div className="tour-nav-actions">
        <a href={appRoutes.home}>Overview</a>
        <button className="tour-nav-enter" onClick={onEnter} type="button">
          Enter workspace <b>↗</b>
        </button>
      </div>
    </nav>
  );
}

function WindowChrome({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="tour-window">
      <div className="tour-window-bar">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <small>{label}</small>
        <b>•••</b>
      </div>
      {children}
    </div>
  );
}

function DemoScreen({ type }: { type: DemoKind }) {
  if (type === "overview")
    return (
      <WindowChrome label="overview / today">
        <div className="demo-overview">
          <aside className="demo-rail">
            <img src={fawnixBg} alt="" />
            <span className="rail-active" />
            <span />
            <span />
            <span />
            <em />
          </aside>
          <div className="demo-work">
            <div className="demo-heading">
              <div>
                <small>Wednesday, 20 August</small>
                <strong>Good morning, Admin</strong>
              </div>
              <button>Refresh ↻</button>
            </div>
            <div className="demo-stat-row">
              <div>
                <small>Attendance rate</small>
                <strong>94.2%</strong>
                <em>↗ 6.4%</em>
              </div>
              <div>
                <small>Present today</small>
                <strong>
                  128 <sup>/ 136</sup>
                </strong>
                <em className="soft">Live now</em>
              </div>
              <div>
                <small>Needs attention</small>
                <strong>09</strong>
                <em className="warm">4 pending</em>
              </div>
            </div>
            <div className="demo-overview-lower">
              <div className="demo-panel demo-bars">
                <header>
                  <strong>Attendance rhythm</strong>
                  <small>
                    Last 7 days · <b>Today</b>
                  </small>
                </header>
                <div className="bars">
                  {[52, 68, 58, 82, 71, 89, 96].map((height, index) => (
                    <span key={height} style={{ height: `${height}%` }}>
                      <i>{[108, 119, 112, 126, 121, 131, 128][index]}</i>
                    </span>
                  ))}
                </div>
                <footer>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"].map(
                    (day) => (
                      <small key={day}>{day}</small>
                    ),
                  )}
                </footer>
              </div>
              <div className="demo-panel demo-alerts">
                <header>
                  <strong>Live signals</strong>
                  <small>View all</small>
                </header>
                <p>
                  <i className="signal-red" />
                  <b>Rohan Mehta</b>
                  <span>late arrival · 12m</span>
                </p>
                <p>
                  <i className="signal-blue" />
                  <b>3 field visits</b>
                  <span>in progress now</span>
                </p>
                <p>
                  <i className="signal-amber" />
                  <b>4 approvals</b>
                  <span>waiting for review</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </WindowChrome>
    );
  if (type === "people")
    return (
      <WindowChrome label="people / directory">
        <div className="demo-window-content">
          <div className="demo-heading demo-heading-line">
            <div>
              <small>Workforce</small>
              <strong>Employee directory</strong>
            </div>
            <button className="demo-primary">+ Add employee</button>
          </div>
          <div className="demo-filter-row">
            <span>⌕ Search people, teams, roles...</span>
            <b>All departments⌄</b>
            <b>Active⌄</b>
          </div>
          <div className="demo-people-grid">
            {[
              ["AK", "Anika Kapoor", "Operations"],
              ["RM", "Rohan Mehta", "Sales"],
              ["NS", "Nisha Shah", "Human Resources"],
              ["VP", "Vikram Paul", "Field Team"],
              ["SK", "Sara Khan", "Finance"],
              ["DT", "Dev Thomas", "Technology"],
            ].map(([initials, name, department], index) => (
              <div className="demo-person-card" key={name}>
                <b className={`demo-avatar demo-avatar-${index % 3}`}>
                  {initials}
                </b>
                <div>
                  <strong>{name}</strong>
                  <small>{department}</small>
                </div>
                <i>•••</i>
                <span className="person-active">Active</span>
              </div>
            ))}
          </div>
        </div>
      </WindowChrome>
    );
  if (type === "attendance")
    return (
      <WindowChrome label="attendance / daily records">
        <div className="demo-window-content">
          <div className="demo-heading demo-heading-line">
            <div>
              <small>Operations · Wednesday, 20 August</small>
              <strong>Attendance records</strong>
            </div>
            <button>Export ↓</button>
          </div>
          <div className="demo-attendance-kpis">
            <span>
              <b>128</b>Present
            </span>
            <span>
              <b>04</b>Late arrivals
            </span>
            <span>
              <b>03</b>Missed logins
            </span>
            <span>
              <b>08h 24m</b>Avg. hours
            </span>
          </div>
          <div className="demo-table">
            <div className="demo-table-head">
              <i>Employee</i>
              <i>Clock in</i>
              <i>Status</i>
              <i>Hours</i>
            </div>
            {[
              "Anika Kapoor",
              "Rohan Mehta",
              "Nisha Shah",
              "Vikram Paul",
              "Sara Khan",
            ].map((name, index) => (
              <div className="demo-table-row" key={name}>
                <strong>
                  <b className="mini-avatar">
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </b>
                  {name}
                </strong>
                <span>{index < 3 ? `09:0${index}` : "--:--"}</span>
                <span className={index === 3 ? "demo-warning" : "demo-good"}>
                  {index === 3 ? "Late" : index === 4 ? "Not in" : "Present"}
                </span>
                <small>{index < 4 ? "8h 42m" : "—"}</small>
              </div>
            ))}
          </div>
        </div>
      </WindowChrome>
    );
  if (type === "approvals")
    return (
      <WindowChrome label="inbox / approvals">
        <div className="demo-window-content">
          <div className="demo-heading demo-heading-line">
            <div>
              <small>Workflows</small>
              <strong>
                Review centre <em>09</em>
              </strong>
            </div>
            <button>Filter ≡</button>
          </div>
          <div className="demo-approval-layout">
            <div className="approval-list">
              {[
                ["RM", "Rohan Mehta", "Casual leave · 12-13 Aug"],
                ["NS", "Nisha Shah", "Late arrival · 10:24 AM"],
                ["VP", "Vikram Paul", "Early leave · 4:30 PM"],
              ].map(([initials, name, detail], index) => (
                <button
                  className={`approval-item ${index === 0 ? "selected" : ""}`}
                  key={name}
                >
                  <b>{initials}</b>
                  <span>
                    <strong>{name}</strong>
                    <small>{detail}</small>
                  </span>
                  <i>›</i>
                </button>
              ))}
            </div>
            <div className="approval-detail">
              <small>LEAVE REQUEST · 01 OF 09</small>
              <h3>Casual leave</h3>
              <p>
                Rohan Mehta <span>· Sales · RM-104</span>
              </p>
              <div className="approval-facts">
                <b>
                  <small>Requested dates</small>12 — 13 Aug 2026
                </b>
                <b>
                  <small>Reporting manager</small>Priya Menon
                </b>
              </div>
              <div className="approval-note">
                “Family commitment. Work has been handed over to the regional
                team.”
              </div>
              <div className="approval-actions">
                <button>Decline</button>
                <button className="demo-primary">Approve request</button>
              </div>
            </div>
          </div>
        </div>
      </WindowChrome>
    );
  if (type === "field")
    return (
      <WindowChrome label="field work / live route">
        <div className="demo-map">
          <div className="map-streets" />
          <div className="map-route" />
          <b className="map-pin map-pin-a" />
          <b className="map-pin map-pin-b" />
          <div className="map-label map-label-a">Start · 09:20</div>
          <div className="map-label map-label-b">Destination</div>
          <div className="map-visit-card">
            <span className="live-pill">
              <i />
              Live visit
            </span>
            <strong>Branch visit</strong>
            <small>Vikram Paul · Retail team</small>
            <div>
              <b>12.4 km</b>
              <b>2h 18m</b>
              <b>4 stops</b>
            </div>
          </div>
        </div>
      </WindowChrome>
    );
  return (
    <WindowChrome label="insights / reports">
      <div className="demo-window-content">
        <div className="demo-heading demo-heading-line">
          <div>
            <small>Insights · Attendance</small>
            <strong>Performance, in perspective</strong>
          </div>
          <button>August 2026⌄</button>
        </div>
        <div className="report-tabs">
          <b>Attendance</b>
          <span>Efficiency</span>
          <span>Exceptions</span>
          <span>Leaves</span>
        </div>
        <div className="demo-report-chart">
          <div className="chart-y">
            <small>100%</small>
            <small>75%</small>
            <small>50%</small>
            <small>25%</small>
          </div>
          <svg viewBox="0 0 600 180" aria-hidden="true">
            <path d="M0 142 C60 120, 75 130, 125 108 S185 115, 230 74 S300 96, 352 62 S430 70, 480 42 S555 60, 600 20" />
            <path
              className="chart-fill"
              d="M0 142 C60 120, 75 130, 125 108 S185 115, 230 74 S300 96, 352 62 S430 70, 480 42 S555 60, 600 20 V180 H0Z"
            />
          </svg>
        </div>
        <div className="demo-report-foot">
          <b>
            <strong>94.2%</strong>
            <small>Average attendance</small>
          </b>
          <b>
            <strong>+6.4%</strong>
            <small>Compared to last week</small>
          </b>
          <b>
            <strong>06</strong>
            <small>Reports ready</small>
          </b>
        </div>
      </div>
    </WindowChrome>
  );
}
export default function ProductTourPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const step = steps[active];
  return (
    <div className="page tour-page">
      <header className="tour-hero">
        <TourNav onEnter={() => navigate(appRoutes.admin)} />
        <div className="tour-hero-copy">
          <p className="eyebrow">A guided look inside Fawnix</p>
          <h1>Workforce operations, with a point of view.</h1>
          <p className="lead">
            Six connected moments. One calmer way to run the workday.
          </p>
          <div className="hero-actions">
            <button
              className="cta"
              onClick={() => navigate(appRoutes.admin)}
              type="button"
            >
              Enter Fawnix <span>↗</span>
            </button>
            <a className="ghost tour-back-link" href={appRoutes.home}>
              Read the overview
            </a>
          </div>
        </div>
        <div className="tour-hero-orbit">
          <span />
          <span />
          <span />
        </div>
      </header>
      <main className="tour-story">
        <div className="tour-intro">
          <div>
            <span>Explore the workspace</span>
            <strong>From signal to decision.</strong>
          </div>
          <p>
            Select a chapter or scroll through the full story. The screens below
            are editable React demo components, ready to be replaced with real
            product screenshots later.
          </p>
        </div>
        <div className="tour-chapters">
          {steps.map((item, index) => (
            <button
              className={active === index ? "active" : ""}
              onClick={() => setActive(index)}
              key={item.number}
              type="button"
            >
              <span>{item.number}</span>
              {item.short}
              <i />
            </button>
          ))}
        </div>
        <section className="tour-feature">
          <div className="tour-feature-copy">
            <span className="tour-number">{step.number}</span>
            <p className="eyebrow">{step.eyebrow}</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            <div className="tour-tags">
              {step.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="tour-feature-controls">
              <button
                className="tour-arrow"
                disabled={active === 0}
                onClick={() => setActive((value) => value - 1)}
                type="button"
              >
                ←
              </button>
              <button
                className="tour-arrow"
                disabled={active === steps.length - 1}
                onClick={() => setActive((value) => value + 1)}
                type="button"
              >
                →
              </button>
              <small>{String(active + 1).padStart(2, "0")} / 06</small>
            </div>
          </div>
          <div className="tour-feature-visual">
            <DemoScreen type={step.demo} />
            <span className="tour-frame-glow" />
          </div>
        </section>
        <section className="tour-strip">
          <div>
            <small>Built for motion</small>
            <strong>One source of truth for teams that move.</strong>
          </div>
          <div>
            <b>01</b>
            <span>Attendance with evidence</span>
          </div>
          <div>
            <b>02</b>
            <span>Approvals without the chase</span>
          </div>
          <div>
            <b>03</b>
            <span>Insights into action</span>
          </div>
        </section>
        <section className="tour-cta">
          <p className="eyebrow">Ready when you are</p>
          <h2>Make the workday easier to see.</h2>
          <p>
            Bring attendance, approvals, field activity, and reporting into one
            confident rhythm.
          </p>
          <button
            className="cta"
            onClick={() => navigate(appRoutes.admin)}
            type="button"
          >
            Get started with Fawnix <span>↗</span>
          </button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
