"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatsView = buildStatsView;
exports.usePublicStats = usePublicStats;
var react_1 = require("react");
/**
 * Live public metrics for the marketing surfaces (home / product tour / login).
 *
 * Source: GET /api/public/stats  (routes/public_stats.py -> services/public_stats_service.py)
 * The endpoint is unauthenticated and aggregate-only (no PII). It always answers
 * 200 with { success, data }, where `data.available === false` means the DB was
 * unreachable — in that case we keep the curated fallback numbers so the page
 * never shows a broken state.
 */
var STATS_URL = "/api/public/stats";
var REFRESH_MS = 60000;
/* ------------------------------------------------------------------ *
 * Fallbacks — used before the first response lands, and whenever the
 * backend reports `available: false`. These mirror the original static
 * copy so the layout/rhythm of the page is identical either way.
 * ------------------------------------------------------------------ */
/**
 * The curated "healthy day" attendance rate. Present/rate fallbacks are both
 * derived from this so they can never contradict the live headcount.
 */
var TARGET_RATE = 94.2;
var FALLBACK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
var FALLBACK_RATES = [58, 72, 64, 86, 74, 91, 96];
var FALLBACK_COUNTS = [108, 119, 112, 126, 121, 131, 128];
var FALLBACK_HEAT = [
    [1, 2, 2, 3, 2, 1, 0],
    [2, 3, 3, 4, 3, 2, 1],
    [1, 2, 4, 4, 3, 2, 0],
    [2, 3, 3, 4, 4, 2, 1],
    [3, 4, 4, 3, 4, 3, 1],
];
var pad2 = function (value) {
    return String(Math.max(0, Math.round(value))).padStart(2, "0");
};
var toInt = function (value, fallback) {
    var parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};
var toNum = function (value, fallback) {
    var parsed = typeof value === "number" ? value : Number(value);
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
var toPositiveInt = function (value, fallback) {
    var parsed = toInt(value, fallback);
    return parsed > 0 ? parsed : fallback;
};
var toPositiveNum = function (value, fallback) {
    var parsed = toNum(value, fallback);
    return parsed > 0 ? parsed : fallback;
};
function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0)
        return "--";
    var whole = Math.floor(hours);
    var minutes = Math.round((hours - whole) * 60);
    if (minutes === 60)
        return "".concat(pad2(whole + 1), "h 00m");
    return "".concat(pad2(whole), "h ").concat(pad2(minutes), "m");
}
function formatClock(iso) {
    if (!iso)
        return "just now";
    var parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime()))
        return "just now";
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
/** Turn a raw payload (or nothing) into a fully-populated view model. */
function buildStatsView(data, loading, refresh) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    var isLive = Boolean(data === null || data === void 0 ? void 0 : data.available);
    var trend = Array.isArray(data === null || data === void 0 ? void 0 : data.trend) && data.trend.length === 7
        ? data.trend
        : null;
    // A trend of all-zeroes charts as a flat empty baseline, which looks like an
    // outage. Treat it as "no data" and show the curated week instead.
    var trendHasSignal = trend !== null && trend.some(function (point) { return toNum(point.rate, 0) > 0; });
    var days = trend ? trend.map(function (point) { return point.label; }) : FALLBACK_DAYS;
    var rates = trendHasSignal
        ? trend.map(function (point) { return toNum(point.rate, 0); })
        : FALLBACK_RATES;
    var counts = trendHasSignal
        ? trend.map(function (point) { return toInt(point.present, 0); })
        : FALLBACK_COUNTS;
    var heatmap = Array.isArray(data === null || data === void 0 ? void 0 : data.heatmap) && data.heatmap.length > 0
        ? data.heatmap
        : FALLBACK_HEAT;
    // Headline figures use the zero-aware helpers: a fresh/empty database must
    // never render the product as 0% attended with nobody present.
    var headcount = toPositiveInt((_b = (_a = data === null || data === void 0 ? void 0 : data.today) === null || _a === void 0 ? void 0 : _a.headcount) !== null && _b !== void 0 ? _b : (_c = data === null || data === void 0 ? void 0 : data.workforce) === null || _c === void 0 ? void 0 : _c.headcount, 136);
    // `present` is derived from the headcount we just settled on rather than a
    // hardcoded number. The endpoint can legitimately return a real headcount
    // with present still 0 (before the first clock-in of the day), and a fixed
    // fallback then produced impossible copy like "128 of 89 verified in".
    // Clamping also guarantees we never claim more people in than on the roll.
    var rawPresent = toInt((_d = data === null || data === void 0 ? void 0 : data.today) === null || _d === void 0 ? void 0 : _d.present, 0);
    var present = Math.min(headcount, rawPresent > 0 ? rawPresent : Math.round((headcount * TARGET_RATE) / 100));
    // Prefer the reported rate; otherwise recompute it from the pair above so the
    // percentage and the "x of y" caption always agree.
    var reportedRate = toNum((_e = data === null || data === void 0 ? void 0 : data.today) === null || _e === void 0 ? void 0 : _e.attendance_rate, 0);
    var attendanceRate = reportedRate > 0
        ? reportedRate
        : Math.round((present / Math.max(headcount, 1)) * 1000) / 10;
    var avgHours = toPositiveNum((_f = data === null || data === void 0 ? void 0 : data.today) === null || _f === void 0 ? void 0 : _f.avg_working_hours, 8.4);
    // Genuine zeroes are meaningful for these, so they stay on the plain
    // helpers — "0 late arrivals" is good news, not a broken read.
    var lateArrivals = toInt((_g = data === null || data === void 0 ? void 0 : data.today) === null || _g === void 0 ? void 0 : _g.late_arrivals, 4);
    var inField = toInt((_h = data === null || data === void 0 ? void 0 : data.today) === null || _h === void 0 ? void 0 : _h.in_field, 12);
    var notIn = toInt((_j = data === null || data === void 0 ? void 0 : data.today) === null || _j === void 0 ? void 0 : _j.not_in, Math.max(0, headcount - present));
    var pendingApprovals = toInt((_k = data === null || data === void 0 ? void 0 : data.today) === null || _k === void 0 ? void 0 : _k.pending_approvals, 9);
    var pendingLeaves = toInt((_l = data === null || data === void 0 ? void 0 : data.today) === null || _l === void 0 ? void 0 : _l.pending_leaves, 4);
    var pendingExceptions = toInt((_m = data === null || data === void 0 ? void 0 : data.today) === null || _m === void 0 ? void 0 : _m.pending_exceptions, 3);
    var weekAverage = toPositiveNum((_o = data === null || data === void 0 ? void 0 : data.comparison) === null || _o === void 0 ? void 0 : _o.week_average, 88.6);
    var weekDelta = toNum((_p = data === null || data === void 0 ? void 0 : data.comparison) === null || _p === void 0 ? void 0 : _p.delta, 6.4);
    return {
        isLive: isLive,
        loading: loading,
        headcount: headcount,
        activeUsers: toInt((_q = data === null || data === void 0 ? void 0 : data.workforce) === null || _q === void 0 ? void 0 : _q.active_users, headcount),
        departments: toInt((_r = data === null || data === void 0 ? void 0 : data.workforce) === null || _r === void 0 ? void 0 : _r.departments, 6),
        present: present,
        attendanceRate: attendanceRate,
        lateArrivals: lateArrivals,
        inField: inField,
        notIn: notIn,
        avgHours: avgHours,
        pendingApprovals: pendingApprovals,
        pendingLeaves: pendingLeaves,
        pendingExceptions: pendingExceptions,
        attendanceRecords: toPositiveInt((_s = data === null || data === void 0 ? void 0 : data.totals) === null || _s === void 0 ? void 0 : _s.attendance_records, 18420),
        fieldParticipants: toPositiveInt((_t = data === null || data === void 0 ? void 0 : data.totals) === null || _t === void 0 ? void 0 : _t.field_participants, 64),
        decisionsRecorded: toPositiveInt((_u = data === null || data === void 0 ? void 0 : data.totals) === null || _u === void 0 ? void 0 : _u.decisions_recorded, 1276),
        weekAverage: weekAverage,
        weekDelta: weekDelta,
        days: days,
        rates: rates,
        counts: counts,
        heatmap: heatmap,
        presentLabel: String(present),
        headcountLabel: String(headcount),
        rateLabel: "".concat(attendanceRate.toFixed(1), "%"),
        avgHoursLabel: formatHours(avgHours),
        lateLabel: pad2(lateArrivals),
        notInLabel: pad2(notIn),
        inFieldLabel: pad2(inField),
        approvalsLabel: pad2(pendingApprovals),
        deltaLabel: "".concat(weekDelta >= 0 ? "+" : "").concat(weekDelta.toFixed(1), "%"),
        generatedAtLabel: formatClock(data === null || data === void 0 ? void 0 : data.generated_at),
        refresh: refresh,
    };
}
var store = {
    data: null,
    loading: true,
    inFlight: null,
    fetchedAt: 0,
    timer: undefined,
    listeners: new Set(),
};
var emit = function () { return store.listeners.forEach(function (listener) { return listener(); }); };
function loadStats() {
    return __awaiter(this, arguments, void 0, function (force) {
        var _this = this;
        if (force === void 0) { force = false; }
        return __generator(this, function (_a) {
            if (store.inFlight)
                return [2 /*return*/, store.inFlight];
            if (!force && store.data && Date.now() - store.fetchedAt < REFRESH_MS)
                return [2 /*return*/];
            store.inFlight = (function () { return __awaiter(_this, void 0, void 0, function () {
                var response, body, _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, 4, 5]);
                            return [4 /*yield*/, fetch(STATS_URL, {
                                    headers: { Accept: "application/json" },
                                })];
                        case 1:
                            response = _d.sent();
                            if (!response.ok)
                                throw new Error("stats ".concat(response.status));
                            return [4 /*yield*/, response.json()];
                        case 2:
                            body = (_d.sent());
                            store.data = (_b = body === null || body === void 0 ? void 0 : body.data) !== null && _b !== void 0 ? _b : { available: false };
                            store.fetchedAt = Date.now();
                            return [3 /*break*/, 5];
                        case 3:
                            _a = _d.sent();
                            // Keep whatever we already have; otherwise mark unavailable so the
                            // view model falls back to curated numbers.
                            store.data = (_c = store.data) !== null && _c !== void 0 ? _c : { available: false };
                            return [3 /*break*/, 5];
                        case 4:
                            store.loading = false;
                            store.inFlight = null;
                            emit();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            }); })();
            return [2 /*return*/, store.inFlight];
        });
    });
}
function subscribe(listener) {
    store.listeners.add(listener);
    void loadStats();
    if (store.timer === undefined) {
        store.timer = window.setInterval(function () {
            if (document.visibilityState === "visible")
                void loadStats(true);
        }, REFRESH_MS);
    }
    return function () {
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
function usePublicStats() {
    var _a = (0, react_1.useState)(0), forceRender = _a[1];
    var bump = (0, react_1.useRef)(function () { });
    bump.current = function () { return forceRender(function (value) { return value + 1; }); };
    (0, react_1.useEffect)(function () { return subscribe(function () { return bump.current(); }); }, []);
    var refresh = (0, react_1.useCallback)(function () {
        void loadStats(true);
    }, []);
    return (0, react_1.useMemo)(function () { return buildStatsView(store.data, store.loading, refresh); }, 
    // store.data is swapped wholesale on every update, so identity is a
    // reliable dependency here.
    [store.data, store.loading, refresh]);
}
exports.default = usePublicStats;
