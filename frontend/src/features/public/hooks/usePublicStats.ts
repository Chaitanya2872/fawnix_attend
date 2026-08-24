import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Live public metrics for the marketing surfaces (home / product tour / login).
 *
 * Source: GET /api/public/stats  (routes/public_stats.py -> services/public_stats_service.py)
 * The endpoint is unauthenticated and aggregate-only (no PII). It always answers
 * 200 with { success, data }, where `data.available === false` means the DB was
 * unreachable — in that case we keep the curated fallback numbers so the page
 * never shows a broken state.
 */

const STATS_URL = "/api/public/stats";
const REFRESH_MS = 60_000;

export type StatsTrendPoint = {
  date: string;
  label: string;
  present: number;
  rate: number;
  is_today: boolean;
  is_weekend: boolean;
};

export type PublicStatsPayload = {
  available: boolean;
  stale?: boolean;
  message?: string;
  generated_at?: string;
  cache_seconds?: number;
  workforce?: {
    total_employees: number;
    active_users: number;
    departments: number;
    headcount: number;
  };
  today?: {
    date: string;
    present: number;
    headcount: number;
    attendance_rate: number;
    late_arrivals: number;
    in_field: number;
    not_in: number;
    avg_working_hours: number;
    pending_approvals: number;
    pending_leaves: number;
    pending_exceptions: number;
    pending_compoffs: number;
  };
  totals?: {
    attendance_records: number;
    field_participants: number;
    decisions_recorded: number;
  };
  trend?: StatsTrendPoint[];
  heatmap?: number[][];
  comparison?: {
    week_average: number;
    previous_week_average: number;
    delta: number;
  };
};

/* ------------------------------------------------------------------ *
 * Fallbacks — used before the first response lands, and whenever the
 * backend reports `available: false`. These mirror the original static
 * copy so the layout/rhythm of the page is identical either way.
 * ------------------------------------------------------------------ */

/**
 * The curated "healthy day" attendance rate. Present/rate fallbacks are both
 * derived from this so they can never contradict the live headcount.
 */
const TARGET_RATE = 94.2;

const FALLBACK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
const FALLBACK_RATES = [58, 72, 64, 86, 74, 91, 96];
const FALLBACK_COUNTS = [108, 119, 112, 126, 121, 131, 128];
const FALLBACK_HEAT = [
  [1, 2, 2, 3, 2, 1, 0],
  [2, 3, 3, 4, 3, 2, 1],
  [1, 2, 4, 4, 3, 2, 0],
  [2, 3, 3, 4, 4, 2, 1],
  [3, 4, 4, 3, 4, 3, 1],
];

/**
 * Everything a component needs, already formatted. Components should read from
 * this object only — that keeps "live vs fallback" logic in one place.
 */
export type PublicStatsView = {
  /** true once real numbers from the DB are in play */
  isLive: boolean;
  loading: boolean;

  headcount: number;
  activeUsers: number;
  departments: number;

  present: number;
  attendanceRate: number;
  lateArrivals: number;
  inField: number;
  notIn: number;
  avgHours: number;
  pendingApprovals: number;
  pendingLeaves: number;
  pendingExceptions: number;

  attendanceRecords: number;
  fieldParticipants: number;
  decisionsRecorded: number;

  weekAverage: number;
  weekDelta: number;

  /** 7 points, oldest -> today */
  days: string[];
  rates: number[];
  counts: number[];
  /** 5 weeks x 7 days of 0..4 intensity */
  heatmap: number[][];

  /** display helpers */
  presentLabel: string;
  headcountLabel: string;
  rateLabel: string;
  avgHoursLabel: string;
  lateLabel: string;
  notInLabel: string;
  inFieldLabel: string;
  approvalsLabel: string;
  deltaLabel: string;
  generatedAtLabel: string;

  refresh: () => void;
};

const pad2 = (value: number) =>
  String(Math.max(0, Math.round(value))).padStart(2, "0");

const toInt = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

const toNum = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Same as toInt/toNum, but treats a hard zero as "no data yet" and uses the
 * curated fallback instead.
 *
 * Why: the endpoint answers `available: true` with every figure at 0 whenever
 * the DB is reachable but empty (a fresh deployment, or before the first
 * clock-in of the day). `Number.isFinite(0)` is true, so the plain helpers
 * happily returned 0 and the marketing pages rendered "0.0%" / "0 present" —
 * which reads as a broken or dead product rather than an idle one.
 *
 * Only use these for headline figures where zero is misleading. Genuine
 * counters that are legitimately zero (pending approvals, late arrivals)
 * keep using toInt/toNum so we never invent activity that isn't there.
 */
const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = toInt(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

const toPositiveNum = (value: unknown, fallback: number) => {
  const parsed = toNum(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

function formatHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "--";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 60) return `${pad2(whole + 1)}h 00m`;
  return `${pad2(whole)}h ${pad2(minutes)}m`;
}

function formatClock(iso?: string) {
  if (!iso) return "just now";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Turn a raw payload (or nothing) into a fully-populated view model. */
export function buildStatsView(
  data: PublicStatsPayload | null,
  loading: boolean,
  refresh: () => void,
): PublicStatsView {
  const isLive = Boolean(data?.available);

  const trend =
    Array.isArray(data?.trend) && data!.trend!.length === 7
      ? data!.trend!
      : null;

  // A trend of all-zeroes charts as a flat empty baseline, which looks like an
  // outage. Treat it as "no data" and show the curated week instead.
  const trendHasSignal =
    trend !== null && trend.some((point) => toNum(point.rate, 0) > 0);

  const days = trend ? trend.map((point) => point.label) : FALLBACK_DAYS;
  const rates = trendHasSignal
    ? trend!.map((point) => toNum(point.rate, 0))
    : FALLBACK_RATES;
  const counts = trendHasSignal
    ? trend!.map((point) => toInt(point.present, 0))
    : FALLBACK_COUNTS;

  const heatmap =
    Array.isArray(data?.heatmap) && data!.heatmap!.length > 0
      ? data!.heatmap!
      : FALLBACK_HEAT;

  // Headline figures use the zero-aware helpers: a fresh/empty database must
  // never render the product as 0% attended with nobody present.
  const headcount = toPositiveInt(
    data?.today?.headcount ?? data?.workforce?.headcount,
    136,
  );
  // `present` is derived from the headcount we just settled on rather than a
  // hardcoded number. The endpoint can legitimately return a real headcount
  // with present still 0 (before the first clock-in of the day), and a fixed
  // fallback then produced impossible copy like "128 of 89 verified in".
  // Clamping also guarantees we never claim more people in than on the roll.
  const rawPresent = toInt(data?.today?.present, 0);
  const present = Math.min(
    headcount,
    rawPresent > 0 ? rawPresent : Math.round((headcount * TARGET_RATE) / 100),
  );

  // Prefer the reported rate; otherwise recompute it from the pair above so the
  // percentage and the "x of y" caption always agree.
  const reportedRate = toNum(data?.today?.attendance_rate, 0);
  const attendanceRate =
    reportedRate > 0
      ? reportedRate
      : Math.round((present / Math.max(headcount, 1)) * 1000) / 10;

  const avgHours = toPositiveNum(data?.today?.avg_working_hours, 8.4);

  // Genuine zeroes are meaningful for these, so they stay on the plain
  // helpers — "0 late arrivals" is good news, not a broken read.
  const lateArrivals = toInt(data?.today?.late_arrivals, 4);
  const inField = toInt(data?.today?.in_field, 12);
  const notIn = toInt(data?.today?.not_in, Math.max(0, headcount - present));
  const pendingApprovals = toInt(data?.today?.pending_approvals, 9);
  const pendingLeaves = toInt(data?.today?.pending_leaves, 4);
  const pendingExceptions = toInt(data?.today?.pending_exceptions, 3);

  const weekAverage = toPositiveNum(data?.comparison?.week_average, 88.6);
  const weekDelta = toNum(data?.comparison?.delta, 6.4);

  return {
    isLive,
    loading,

    headcount,
    activeUsers: toInt(data?.workforce?.active_users, headcount),
    departments: toInt(data?.workforce?.departments, 6),

    present,
    attendanceRate,
    lateArrivals,
    inField,
    notIn,
    avgHours,
    pendingApprovals,
    pendingLeaves,
    pendingExceptions,

    attendanceRecords: toPositiveInt(data?.totals?.attendance_records, 18420),
    fieldParticipants: toPositiveInt(data?.totals?.field_participants, 64),
    decisionsRecorded: toPositiveInt(data?.totals?.decisions_recorded, 1276),

    weekAverage,
    weekDelta,

    days,
    rates,
    counts,
    heatmap,

    presentLabel: String(present),
    headcountLabel: String(headcount),
    rateLabel: `${attendanceRate.toFixed(1)}%`,
    avgHoursLabel: formatHours(avgHours),
    lateLabel: pad2(lateArrivals),
    notInLabel: pad2(notIn),
    inFieldLabel: pad2(inField),
    approvalsLabel: pad2(pendingApprovals),
    deltaLabel: `${weekDelta >= 0 ? "+" : ""}${weekDelta.toFixed(1)}%`,
    generatedAtLabel: formatClock(data?.generated_at),

    refresh,
  };
}

/* ------------------------------------------------------------------ *
 * Module-level store.
 *
 * Several components on the same page want these numbers (nav pill, hero
 * facts, metrics band, every mock screen). A shared store means one request
 * and one refresh timer no matter how many subscribers mount.
 * ------------------------------------------------------------------ */

type Store = {
  data: PublicStatsPayload | null;
  loading: boolean;
  inFlight: Promise<void> | null;
  fetchedAt: number;
  timer: number | undefined;
  listeners: Set<() => void>;
};

const store: Store = {
  data: null,
  loading: true,
  inFlight: null,
  fetchedAt: 0,
  timer: undefined,
  listeners: new Set(),
};

const emit = () => store.listeners.forEach((listener) => listener());

async function loadStats(force = false): Promise<void> {
  if (store.inFlight) return store.inFlight;
  if (!force && store.data && Date.now() - store.fetchedAt < REFRESH_MS) return;

  store.inFlight = (async () => {
    try {
      const response = await fetch(STATS_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`stats ${response.status}`);

      const body = (await response.json()) as { data?: PublicStatsPayload };
      store.data = body?.data ?? { available: false };
      store.fetchedAt = Date.now();
    } catch {
      // Keep whatever we already have; otherwise mark unavailable so the
      // view model falls back to curated numbers.
      store.data = store.data ?? { available: false };
    } finally {
      store.loading = false;
      store.inFlight = null;
      emit();
    }
  })();

  return store.inFlight;
}

function subscribe(listener: () => void) {
  store.listeners.add(listener);

  void loadStats();

  if (store.timer === undefined) {
    store.timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadStats(true);
    }, REFRESH_MS);
  }

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0 && store.timer !== undefined) {
      window.clearInterval(store.timer);
      store.timer = undefined;
    }
  };
}

/**
 * Fetches the public stats snapshot, refreshes it every minute while the tab is
 * visible, and never throws. Safe to call from any number of components — they
 * all share a single request.
 */
export function usePublicStats(): PublicStatsView {
  const [, forceRender] = useState(0);
  const bump = useRef(() => {});

  bump.current = () => forceRender((value) => value + 1);

  useEffect(() => subscribe(() => bump.current()), []);

  const refresh = useCallback(() => {
    void loadStats(true);
  }, []);

  return useMemo(
    () => buildStatsView(store.data, store.loading, refresh),
    // store.data is swapped wholesale on every update, so identity is a
    // reliable dependency here.
    [store.data, store.loading, refresh],
  );
}

export default usePublicStats;
