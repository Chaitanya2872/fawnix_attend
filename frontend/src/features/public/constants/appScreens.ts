/* ─────────────────────────────────────────────────────────────────────────────
   The mobile app screens shown in the product tour's device wall.

   Screenshots are opt-in and self-binding: export the real app screens into
   `frontend/src/assets/screens/` and each file attaches to the entry below
   whose `slug` appears in its file name (`03-team.png` → the "team" entry).
   Anything left over is assigned in file-name order, so plainly numbered
   exports (`01.png` … `10.png`) also just work.

   Until a screenshot exists, the frame renders the `kind` mock instead — the
   gallery is never empty and never shows a broken image.
   ───────────────────────────────────────────────────────────────────────────── */

export type ScreenMockKind =
  | "rows"
  | "chat"
  | "grid"
  | "menu"
  | "sheet"
  | "ring";

export type AppScreen = {
  id: string;
  /** Matched against dropped screenshot file names. Keep it lowercase. */
  slug: string;
  /** Short name shown under the active phone and in the rail. */
  label: string;
  /** Module tag above the headline. */
  meta: string;
  title: string;
  caption: string;
  /** Per-screen light, so each phone carries its own glow. */
  accent: string;
  kind: ScreenMockKind;
};

export const appScreens: AppScreen[] = [
  {
    id: "clockout",
    slug: "clockout",
    label: "Clock out",
    meta: "Attendance",
    title: "Close the day with proof.",
    caption:
      "Live shift hours, a geo-verified punch and the day's activity — the record finishes itself.",
    accent: "#8fc7ff",
    kind: "rows",
  },
  {
    id: "assistant",
    slug: "assistant",
    label: "Assistant",
    meta: "Fawnix AI",
    title: "Ask instead of digging.",
    caption:
      "The in-app assistant answers attendance, leave and policy questions in plain language.",
    accent: "#d9b8ff",
    kind: "chat",
  },
  {
    id: "team",
    slug: "team",
    label: "My team",
    meta: "People",
    title: "Your team, on any date.",
    caption:
      "Pick a day and read every reportee's status, hours and exceptions in one pass.",
    accent: "#7fe0c8",
    kind: "grid",
  },
  {
    id: "explore",
    slug: "explore",
    label: "Explore",
    meta: "Workspace",
    title: "Every tool, one tap away.",
    caption:
      "Requests, records and documents grouped exactly where people go looking for them.",
    accent: "#c8f45f",
    kind: "menu",
  },
  {
    id: "exceptions",
    slug: "exception",
    label: "Exceptions",
    meta: "Approvals",
    title: "Exceptions carry their context.",
    caption:
      "Late arrivals and early leaves arrive with reason, timing and decision status attached.",
    accent: "#ffd27f",
    kind: "rows",
  },
  {
    id: "compoff",
    slug: "compoff",
    label: "Comp off",
    meta: "Overtime",
    title: "Extra hours become balance.",
    caption:
      "Overtime is measured, approved and converted into comp-off without a spreadsheet.",
    accent: "#a5f0d0",
    kind: "rows",
  },
  {
    id: "notifications",
    slug: "notification",
    label: "Alerts",
    meta: "Notifications",
    title: "Decisions reach people.",
    caption:
      "Approvals, reminders and out-of-range alerts land on the device the moment they happen.",
    accent: "#9fd8ff",
    kind: "rows",
  },
  {
    id: "meeting-notes",
    slug: "meeting",
    label: "Meeting notes",
    meta: "Intelligence",
    title: "Record now, minutes later.",
    caption:
      "Name a note, attach the audio, and get a transcript, summary and action items back.",
    accent: "#e0b8ff",
    kind: "sheet",
  },
  {
    id: "holidays",
    slug: "holiday",
    label: "Holidays",
    meta: "Calendar",
    title: "One calendar everyone shares.",
    caption:
      "Holidays, working Saturdays and the month ahead, identical for every employee.",
    accent: "#ffc2a1",
    kind: "grid",
  },
  {
    id: "leaves",
    slug: "leave",
    label: "Leaves",
    meta: "Leave",
    title: "Balance you can actually see.",
    caption:
      "Entitlement, consumed days and pending requests in a single, honest view.",
    accent: "#7fe0c8",
    kind: "ring",
  },
];
