/* ─────────────────────────────────────────────────────────────────────────────
   Product tour content. Every chapter maps to a real Fawnix module so the
   marketing story and the shipped workspace stay in sync.
   ───────────────────────────────────────────────────────────────────────────── */

export type ChapterScene =
  | "command"
  | "people"
  | "attendance"
  | "approvals"
  | "field"
  | "intelligence";

export type TourChapter = {
  id: ChapterScene;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Drives the per-chapter accent so each scene has its own light. */
  accent: string;
  accentSoft: string;
  highlights: { term: string; detail: string }[];
  tags: string[];
};

export const tourChapters: TourChapter[] = [
  {
    id: "command",
    number: "01",
    label: "Command centre",
    eyebrow: "The signal, first",
    title: "The whole workday, on one screen.",
    body: "Attendance rhythm, live headcount, open exceptions and field movement land together the moment you sign in — so the next decision is never more than a glance away.",
    accent: "#c8f45f",
    accentSoft: "rgba(200, 244, 95, 0.16)",
    highlights: [
      {
        term: "Live headcount",
        detail: "Present, late, on leave and in-field, updating as it happens.",
      },
      {
        term: "Attendance rhythm",
        detail: "Seven-day trend with today highlighted against the baseline.",
      },
      {
        term: "Signal feed",
        detail: "Every exception surfaces with the context to act on it.",
      },
    ],
    tags: ["Live dashboard", "Exception feed", "Department rollups"],
  },
  {
    id: "people",
    number: "02",
    label: "People",
    eyebrow: "People, organised",
    title: "Every person in the right context.",
    body: "Search the directory, follow reporting lines, open the employee master, or bulk-import a new branch — then move straight from a record into the action it needs.",
    accent: "#7fe0c8",
    accentSoft: "rgba(127, 224, 200, 0.16)",
    highlights: [
      {
        term: "Employee master",
        detail: "One canonical record for codes, shifts, roles and reporting.",
      },
      {
        term: "Bulk import",
        detail: "Spreadsheet onboarding with validation before anything saves.",
      },
      {
        term: "Teams & projects",
        detail: "Group by department or project team without duplicating data.",
      },
    ],
    tags: ["Directory", "Employee master", "Bulk import", "Project teams"],
  },
  {
    id: "attendance",
    number: "03",
    label: "Attendance",
    eyebrow: "Evidence, not guesswork",
    title: "Clock-ins you can actually trust.",
    body: "Geo-tagged clock-in and clock-out, automatic shift hours, late detection, working-Saturday rules and configurable auto clock-out keep the daily record complete without anyone chasing it.",
    accent: "#8fc7ff",
    accentSoft: "rgba(143, 199, 255, 0.16)",
    highlights: [
      {
        term: "Geo-verified punches",
        detail: "Coordinates and geofence checks attached to every entry.",
      },
      {
        term: "Auto clock-out",
        detail: "Shift-end closure prevents missing logs and phantom overtime.",
      },
      {
        term: "Overtime & comp-off",
        detail: "Extra hours roll into balances automatically.",
      },
    ],
    tags: ["Geo clock-in", "Working hours", "Auto clock-out", "Overtime"],
  },
  {
    id: "approvals",
    number: "04",
    label: "Approvals",
    eyebrow: "Less chasing",
    title: "Resolve what needs a decision.",
    body: "Late arrivals, early leave, leave requests and comp-off redemptions queue in one review centre — with the story behind each request and an audit trail behind every outcome.",
    accent: "#ffd27f",
    accentSoft: "rgba(255, 210, 127, 0.16)",
    highlights: [
      {
        term: "One review queue",
        detail: "Leave, exceptions and comp-off, prioritised by urgency.",
      },
      {
        term: "Full context",
        detail: "Reason, evidence, manager and balance impact, side by side.",
      },
      {
        term: "Audit trail",
        detail: "Who decided what, when — retained for compliance.",
      },
    ],
    tags: ["Leave queue", "Exceptions", "Comp-off", "Audit trail"],
  },
  {
    id: "field",
    number: "05",
    label: "Field work",
    eyebrow: "For teams that move",
    title: "See the journey, not just the timestamp.",
    body: "Visit progress, routes, distance and duration build a visual record of work happening beyond the office — with out-of-range alerts protecting attendance integrity.",
    accent: "#a5f0d0",
    accentSoft: "rgba(165, 240, 208, 0.16)",
    highlights: [
      {
        term: "Live routes",
        detail: "Replay the day's path with stops and dwell time.",
      },
      {
        term: "Distance alerts",
        detail:
          "Out-of-range movement flags itself before it becomes a dispute.",
      },
      {
        term: "Visit evidence",
        detail: "Activities and leads tied to a verified location history.",
      },
    ],
    tags: ["Live visits", "Route replay", "Geofence", "Distance alerts"],
  },
  {
    id: "intelligence",
    number: "06",
    label: "Intelligence",
    eyebrow: "Patterns into action",
    title: "Data you can actually explain.",
    body: "Heatmaps, trend comparisons and one-click exports turn months of records into a story — and AI meeting notes turn a recording into minutes, summaries and action items.",
    accent: "#d9b8ff",
    accentSoft: "rgba(217, 184, 255, 0.16)",
    highlights: [
      {
        term: "Attendance heatmaps",
        detail: "Spot patterns by person, team or month at a glance.",
      },
      {
        term: "Exports that land",
        detail: "Range reports ready for payroll and compliance reviews.",
      },
      {
        term: "AI meeting notes",
        detail: "Transcripts, summaries and action items from one upload.",
      },
    ],
    tags: ["Heatmaps", "Trends", "Exports", "AI meeting notes"],
  },
];

export type TourMetric = {
  value: number;
  suffix: string;
  decimals: number;
  label: string;
  note: string;
};

export const tourMetrics: TourMetric[] = [
  {
    value: 94.2,
    suffix: "%",
    decimals: 1,
    label: "Attendance visibility",
    note: "Verified daily, not self-reported",
  },
  {
    value: 6,
    suffix: "",
    decimals: 0,
    label: "Connected modules",
    note: "One record, no re-entry",
  },
  {
    value: 12,
    suffix: "s",
    decimals: 0,
    label: "To a clean answer",
    note: "From question to export",
  },
  {
    value: 100,
    suffix: "%",
    decimals: 0,
    label: "Decisions audited",
    note: "Every approval retained",
  },
];

/** Scrolling capability marquee — the modules that ship today. */
export const tourCapabilities = [
  "Geo clock-in",
  "Auto clock-out",
  "Late detection",
  "Early leave requests",
  "Leave & comp-off",
  "Overtime records",
  "Employee master",
  "Project teams",
  "Field visits",
  "Route replay",
  "Distance alerts",
  "Attendance heatmaps",
  "Range exports",
  "AI meeting notes",
  "WhatsApp OTP login",
  "Holiday calendar",
  "Device sessions",
  "API telemetry",
];

export type TourOutcome = {
  role: string;
  team: string;
  quote: string;
  metric: string;
  metricLabel: string;
};

/** Outcome slider — the four operating roles Fawnix is built for. */
export const tourOutcomes: TourOutcome[] = [
  {
    role: "Field operations",
    team: "Distributed service teams",
    quote:
      "Visits, travel and attendance arrive as one verified timeline, so a day in the field is as legible as a day at a desk.",
    metric: "Route-level",
    metricLabel: "visit evidence",
  },
  {
    role: "Retail & branch ops",
    team: "Multi-site rosters",
    quote:
      "Shift compliance, break discipline and daily closure stop depending on whoever remembered to send the message.",
    metric: "Same-day",
    metricLabel: "closure visibility",
  },
  {
    role: "Sales leadership",
    team: "Revenue teams",
    quote:
      "Activities tie back to leads with a verified visit history, so pipeline conversations start from facts.",
    metric: "Lead-linked",
    metricLabel: "activity history",
  },
  {
    role: "HR & compliance",
    team: "People operations",
    quote:
      "Approvals, exceptions and audit history live in one place, which makes month-end a review instead of an investigation.",
    metric: "One trail",
    metricLabel: "for every decision",
  },
];

/** The four-beat daily loop, reused from the landing page workflow. */
export const tourDayLoop = [
  {
    time: "09:02",
    title: "Start day",
    detail: "Employee clocks in with location; the shift clock begins.",
  },
  {
    time: "11:40",
    title: "Track work",
    detail: "Activities, visits and breaks record themselves in real time.",
  },
  {
    time: "16:15",
    title: "Review & approve",
    detail: "Managers clear exceptions and approvals inside the app.",
  },
  {
    time: "18:30",
    title: "Close day",
    detail: "Clock-out settles hours, overtime and comp-off balances.",
  },
];
