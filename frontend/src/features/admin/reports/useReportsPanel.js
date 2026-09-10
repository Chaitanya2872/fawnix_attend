"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.useReportsPanel = useReportsPanel;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var ATTENDANCE_STATUS_CODES = ['P', 'S', 'WFH', 'A', 'L', 'H', 'O'];
/** Every ISO date in the given month — the heatmap always renders a full month of columns. */
function buildMonthDates(month, year) {
    var dayCount = new Date(year, month, 0).getDate();
    return Array.from({ length: dayCount }, function (_, index) {
        return "".concat(year, "-").concat(String(month).padStart(2, '0'), "-").concat(String(index + 1).padStart(2, '0'));
    });
}
function toStatusCode(value) {
    var _a;
    var normalised = (value || '').trim().toUpperCase();
    return (_a = ATTENDANCE_STATUS_CODES.find(function (code) { return code === normalised; })) !== null && _a !== void 0 ? _a : null;
}
function toCellSource(value) {
    return (value || '').trim().toLowerCase() === 'manual' ? 'manual' : 'auto';
}
function toWorkingHours(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}
/** Folds the wire payload into the normalised matrix the heatmap renders from. */
function normaliseHeatmapResponse(payload, month, year) {
    var dates = buildMonthDates(month, year);
    var validDates = new Set(dates);
    var employees = (payload.employees || [])
        .filter(function (row) { return Boolean(row === null || row === void 0 ? void 0 : row.emp_code); })
        .map(function (row) {
        var _a;
        var days = {};
        for (var _i = 0, _b = row.days || []; _i < _b.length; _i++) {
            var day = _b[_i];
            var date = ((day === null || day === void 0 ? void 0 : day.date) || '').slice(0, 10);
            var status_1 = toStatusCode(day === null || day === void 0 ? void 0 : day.status);
            if (!date || !status_1 || !validDates.has(date)) {
                continue;
            }
            days[date] = {
                date: date,
                status: status_1,
                workingHours: toWorkingHours(day === null || day === void 0 ? void 0 : day.working_hours),
                source: toCellSource(day === null || day === void 0 ? void 0 : day.source),
                remarks: (_a = day === null || day === void 0 ? void 0 : day.remarks) !== null && _a !== void 0 ? _a : null
            };
        }
        return {
            empCode: String(row.emp_code),
            name: row.emp_full_name || String(row.emp_code),
            designation: row.emp_designation || '',
            department: row.emp_department || '',
            days: days
        };
    });
    return { month: month, year: year, dates: dates, employees: employees };
}
/**
 * Reads a JSON body, but fails loudly when the response is not JSON at all —
 * an unregistered API route falls through to the SPA shell, which would
 * otherwise surface as "Unexpected token '<'".
 */
function readJsonBody(response, endpointLabel) {
    return __awaiter(this, void 0, void 0, function () {
        var contentType;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contentType = response.headers.get('content-type') || '';
                    if (!contentType.toLowerCase().includes('json')) {
                        throw new Error("".concat(endpointLabel, " did not return JSON. Check that the backend route is available."));
                    }
                    return [4 /*yield*/, response.json()];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
/** Pulls a readable message out of an error response, ignoring HTML error pages. */
function readErrorMessage(response, fallback) {
    return __awaiter(this, void 0, void 0, function () {
        var raw, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, response.text()];
                case 1:
                    raw = (_a.sent()).trim();
                    if (!raw || raw.startsWith('<')) {
                        return [2 /*return*/, fallback];
                    }
                    try {
                        parsed = JSON.parse(raw);
                        return [2 /*return*/, parsed.message || fallback];
                    }
                    catch (_b) {
                        return [2 /*return*/, raw.slice(0, 200)];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function toNumber(value, fallback) {
    if (fallback === void 0) { fallback = 0; }
    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}
function toNullableNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}
/** Folds the insights payload into the camelCase model the summary cards read. */
function normaliseInsightsResponse(payload) {
    var efficiency = payload.efficiency || {};
    var totals = payload.totals || {};
    return {
        startDate: payload.start_date || '',
        endDate: payload.end_date || '',
        previousStartDate: payload.previous_start_date || '',
        previousEndDate: payload.previous_end_date || '',
        windowDays: toNumber(payload.window_days, 7),
        efficiency: {
            score: toNullableNumber(efficiency.score),
            rating: efficiency.rating || 'No data',
            previousScore: toNullableNumber(efficiency.previous_score),
            delta: toNullableNumber(efficiency.delta),
            presentDays: toNumber(efficiency.present_days),
            expectedDays: toNumber(efficiency.expected_days)
        },
        totals: {
            employees: toNumber(totals.employees),
            present: toNumber(totals.present),
            leave: toNumber(totals.leave),
            absent: toNumber(totals.absent),
            holiday: toNumber(totals.holiday),
            weekOff: toNumber(totals.week_off)
        },
        trend: (payload.trend || []).map(function (day) { return ({
            date: ((day === null || day === void 0 ? void 0 : day.date) || '').slice(0, 10),
            label: (day === null || day === void 0 ? void 0 : day.label) || '',
            present: toNumber(day === null || day === void 0 ? void 0 : day.present),
            leave: toNumber(day === null || day === void 0 ? void 0 : day.leave),
            absent: toNumber(day === null || day === void 0 ? void 0 : day.absent),
            expected: toNumber(day === null || day === void 0 ? void 0 : day.expected),
            percentage: toNullableNumber(day === null || day === void 0 ? void 0 : day.percentage),
            isWorkingDay: Boolean(day === null || day === void 0 ? void 0 : day.is_working_day)
        }); }),
        employees: (payload.employees || [])
            .filter(function (row) { return Boolean(row === null || row === void 0 ? void 0 : row.emp_code); })
            .map(function (row) { return ({
            empCode: String(row.emp_code),
            name: row.emp_full_name || String(row.emp_code),
            department: row.emp_department || '',
            presentDays: toNumber(row.present_days),
            expectedDays: toNumber(row.expected_days),
            score: toNullableNumber(row.score)
        }); })
    };
}
/** Returns a copy of the matrix with one cell replaced (or removed when cell is null). */
function replaceHeatmapCell(matrix, empCode, date, cell) {
    if (!matrix) {
        return matrix;
    }
    return __assign(__assign({}, matrix), { employees: matrix.employees.map(function (employee) {
            if (employee.empCode !== empCode) {
                return employee;
            }
            var days = __assign({}, employee.days);
            if (cell) {
                days[date] = cell;
            }
            else {
                delete days[date];
            }
            return __assign(__assign({}, employee), { days: days });
        }) });
}
function useReportsPanel(_a) {
    var _this = this;
    var accessToken = _a.accessToken, refreshAccessToken = _a.refreshAccessToken, attendanceDateFilter = _a.attendanceDateFilter, weeklyAttendanceTrend = _a.weeklyAttendanceTrend, resolveDownloadFilename = _a.resolveDownloadFilename;
    var _b = (0, react_1.useState)(function () { return String(new Date().getMonth() + 1); }), attendanceReportMonth = _b[0], setAttendanceReportMonth = _b[1];
    var _c = (0, react_1.useState)(function () { return String(new Date().getFullYear()); }), attendanceReportYear = _c[0], setAttendanceReportYear = _c[1];
    var _d = (0, react_1.useState)('csv'), attendanceReportFormat = _d[0], setAttendanceReportFormat = _d[1];
    var _e = (0, react_1.useState)(''), attendanceReportStatus = _e[0], setAttendanceReportStatus = _e[1];
    var _f = (0, react_1.useState)('month'), reportDateMode = _f[0], setReportDateMode = _f[1];
    var _g = (0, react_1.useState)(function () {
        var now = new Date();
        return "".concat(now.getFullYear(), "-").concat(String(now.getMonth() + 1).padStart(2, '0'), "-01");
    }), reportStartDate = _g[0], setReportStartDate = _g[1];
    var _h = (0, react_1.useState)(function () { return (0, dateUtils_1.toDateInputValue)(new Date()); }), reportEndDate = _h[0], setReportEndDate = _h[1];
    var _j = (0, react_1.useState)(null), attendanceHeatmapData = _j[0], setAttendanceHeatmapData = _j[1];
    var _k = (0, react_1.useState)(false), attendanceHeatmapLoading = _k[0], setAttendanceHeatmapLoading = _k[1];
    var _l = (0, react_1.useState)(''), attendanceHeatmapStatus = _l[0], setAttendanceHeatmapStatus = _l[1];
    var _m = (0, react_1.useState)(null), attendanceHeatmapSavingCell = _m[0], setAttendanceHeatmapSavingCell = _m[1];
    var _o = (0, react_1.useState)(null), attendanceInsights = _o[0], setAttendanceInsights = _o[1];
    var _p = (0, react_1.useState)(false), attendanceInsightsLoading = _p[0], setAttendanceInsightsLoading = _p[1];
    var _q = (0, react_1.useState)(''), attendanceInsightsStatus = _q[0], setAttendanceInsightsStatus = _q[1];
    // fetchAttendanceHeatmapData is consumed from an effect, so it has to stay
    // referentially stable — the auth handles live in refs instead of deps.
    // Keep the ref current during render so child effects that fetch immediately
    // after login don't see an old empty token.
    var authRef = (0, react_1.useRef)({ accessToken: accessToken, refreshAccessToken: refreshAccessToken });
    authRef.current = { accessToken: accessToken, refreshAccessToken: refreshAccessToken };
    /** Guards against an older month's response landing after a newer one. */
    var heatmapRequestRef = (0, react_1.useRef)(0);
    var insightsRequestRef = (0, react_1.useRef)(0);
    var downloadRangeReport = function (reportType) { return __awaiter(_this, void 0, void 0, function () {
        var startDate, endDate, year, month, isMonthlyAttendance, params_1, endpoint_1, makeRequest, response, _a, _b, blob, url, link, fallbackFilename, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 8, , 9]);
                    startDate = reportStartDate;
                    endDate = reportEndDate;
                    if (reportDateMode === 'month') {
                        year = Number(attendanceReportYear);
                        month = Number(attendanceReportMonth);
                        startDate = "".concat(year, "-").concat(String(month).padStart(2, '0'), "-01");
                        endDate = "".concat(year, "-").concat(String(month).padStart(2, '0'), "-").concat(String(new Date(year, month, 0).getDate()).padStart(2, '0'));
                    }
                    if (!startDate || !endDate || startDate > endDate) {
                        throw new Error('Choose a valid start and end date.');
                    }
                    setAttendanceReportStatus("Preparing ".concat(reportType, " report..."));
                    isMonthlyAttendance = reportType === 'attendance' && reportDateMode === 'month';
                    params_1 = isMonthlyAttendance
                        ? new URLSearchParams({
                            month: attendanceReportMonth,
                            year: attendanceReportYear,
                            format: attendanceReportFormat,
                        })
                        : new URLSearchParams({
                            start_date: startDate,
                            end_date: endDate,
                            format: attendanceReportFormat,
                        });
                    endpoint_1 = isMonthlyAttendance
                        ? '/api/admin/attendance/report/monthly'
                        : "/api/admin/reports/".concat(reportType);
                    makeRequest = function (token) { return fetch("".concat(endpoint_1, "?").concat(params_1), {
                        headers: { Authorization: "Bearer ".concat(token) },
                    }); };
                    return [4 /*yield*/, makeRequest(accessToken)];
                case 1:
                    response = _c.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 4];
                    _a = makeRequest;
                    return [4 /*yield*/, refreshAccessToken()];
                case 2: return [4 /*yield*/, _a.apply(void 0, [_c.sent()])];
                case 3:
                    response = _c.sent();
                    _c.label = 4;
                case 4:
                    if (!!response.ok) return [3 /*break*/, 6];
                    _b = Error.bind;
                    return [4 /*yield*/, response.text()];
                case 5: throw new (_b.apply(Error, [void 0, (_c.sent()) || 'Failed to generate report']))();
                case 6: return [4 /*yield*/, response.blob()];
                case 7:
                    blob = _c.sent();
                    url = URL.createObjectURL(blob);
                    link = document.createElement('a');
                    link.href = url;
                    fallbackFilename = isMonthlyAttendance
                        ? "monthly_attendance_report_".concat(attendanceReportYear, "_").concat(attendanceReportMonth.padStart(2, '0'), ".").concat(attendanceReportFormat)
                        : "".concat(reportType, "_report_").concat(startDate, "_").concat(endDate, ".").concat(attendanceReportFormat);
                    link.download = resolveDownloadFilename(response, fallbackFilename);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                    setAttendanceReportStatus("".concat(reportType[0].toUpperCase()).concat(reportType.slice(1), " report downloaded."));
                    window.setTimeout(function () { return setAttendanceReportStatus(''); }, 2500);
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _c.sent();
                    setAttendanceReportStatus(error_1 instanceof Error ? error_1.message : 'Failed to generate report');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var downloadDailyAttendanceReport = function () { return __awaiter(_this, void 0, void 0, function () {
        var targetDate, params_2, makeRequest, response, nextAccessToken, errorText, blob, url, link, error_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    setAttendanceReportStatus('Preparing daily report...');
                    targetDate = attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date());
                    params_2 = new URLSearchParams({
                        date: targetDate,
                        format: attendanceReportFormat
                    });
                    makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, fetch("/api/admin/attendance/report/daily?".concat(params_2.toString()), {
                                    method: 'GET',
                                    headers: {
                                        Authorization: "Bearer ".concat(token)
                                    }
                                })];
                        });
                    }); };
                    return [4 /*yield*/, makeRequest(accessToken)];
                case 1:
                    response = _a.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 4];
                    return [4 /*yield*/, refreshAccessToken()];
                case 2:
                    nextAccessToken = _a.sent();
                    return [4 /*yield*/, makeRequest(nextAccessToken)];
                case 3:
                    response = _a.sent();
                    _a.label = 4;
                case 4:
                    if (!!response.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response.text()];
                case 5:
                    errorText = _a.sent();
                    throw new Error(errorText || 'Failed to download report');
                case 6: return [4 /*yield*/, response.blob()];
                case 7:
                    blob = _a.sent();
                    url = window.URL.createObjectURL(blob);
                    link = document.createElement('a');
                    link.href = url;
                    link.download = resolveDownloadFilename(response, "daily_attendance_report_".concat(targetDate, ".").concat(attendanceReportFormat));
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    setAttendanceReportStatus('Daily report downloaded.');
                    window.setTimeout(function () { return setAttendanceReportStatus(''); }, 2500);
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _a.sent();
                    setAttendanceReportStatus(error_2 instanceof Error ? error_2.message : 'Failed to download daily report');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var downloadMonthlyAttendanceReport = function () { return __awaiter(_this, void 0, void 0, function () {
        var params_3, makeRequest, response, nextAccessToken, errorText, blob, url, link, error_3;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    setAttendanceReportStatus('Preparing monthly report...');
                    params_3 = new URLSearchParams({
                        month: attendanceReportMonth,
                        year: attendanceReportYear,
                        format: attendanceReportFormat
                    });
                    makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, fetch("/api/admin/attendance/report/monthly?".concat(params_3.toString()), {
                                    method: 'GET',
                                    headers: {
                                        Authorization: "Bearer ".concat(token)
                                    }
                                })];
                        });
                    }); };
                    return [4 /*yield*/, makeRequest(accessToken)];
                case 1:
                    response = _a.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 4];
                    return [4 /*yield*/, refreshAccessToken()];
                case 2:
                    nextAccessToken = _a.sent();
                    return [4 /*yield*/, makeRequest(nextAccessToken)];
                case 3:
                    response = _a.sent();
                    _a.label = 4;
                case 4:
                    if (!!response.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response.text()];
                case 5:
                    errorText = _a.sent();
                    throw new Error(errorText || 'Failed to download report');
                case 6: return [4 /*yield*/, response.blob()];
                case 7:
                    blob = _a.sent();
                    url = window.URL.createObjectURL(blob);
                    link = document.createElement('a');
                    link.href = url;
                    link.download = resolveDownloadFilename(response, "monthly_attendance_report_".concat(attendanceReportYear, "_").concat(attendanceReportMonth.padStart(2, '0'), ".").concat(attendanceReportFormat));
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    setAttendanceReportStatus('Monthly report downloaded.');
                    window.setTimeout(function () { return setAttendanceReportStatus(''); }, 2500);
                    return [3 /*break*/, 9];
                case 8:
                    error_3 = _a.sent();
                    setAttendanceReportStatus(error_3 instanceof Error ? error_3.message : 'Failed to download monthly report');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    /**
     * Loads the monthly per-employee/per-day status matrix behind the heatmap.
     * Follows the same accessToken/refreshAccessToken/401-retry shape as the
     * report downloads above.
     */
    var fetchAttendanceHeatmapData = (0, react_1.useCallback)(function (month, year) { return __awaiter(_this, void 0, void 0, function () {
        var requestId, params_4, makeRequest, response, nextAccessToken, _a, payload, error_4;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!Number.isFinite(month) || !Number.isFinite(year)) {
                        setAttendanceHeatmapStatus('Choose a valid month and year.');
                        return [2 /*return*/];
                    }
                    requestId = heatmapRequestRef.current + 1;
                    heatmapRequestRef.current = requestId;
                    setAttendanceHeatmapLoading(true);
                    setAttendanceHeatmapStatus('Loading attendance heatmap...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, 10, 11]);
                    params_4 = new URLSearchParams({ month: String(month), year: String(year) });
                    makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, fetch("/api/admin/attendance/heatmap?".concat(params_4.toString()), {
                                    method: 'GET',
                                    headers: {
                                        Authorization: "Bearer ".concat(token)
                                    }
                                })];
                        });
                    }); };
                    return [4 /*yield*/, makeRequest(authRef.current.accessToken)];
                case 2:
                    response = _b.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 5];
                    return [4 /*yield*/, authRef.current.refreshAccessToken()];
                case 3:
                    nextAccessToken = _b.sent();
                    return [4 /*yield*/, makeRequest(nextAccessToken)];
                case 4:
                    response = _b.sent();
                    _b.label = 5;
                case 5:
                    if (!!response.ok) return [3 /*break*/, 7];
                    _a = Error.bind;
                    return [4 /*yield*/, readErrorMessage(response, 'Failed to load attendance heatmap')];
                case 6: throw new (_a.apply(Error, [void 0, _b.sent()]))();
                case 7: return [4 /*yield*/, readJsonBody(response, 'The attendance heatmap endpoint')];
                case 8:
                    payload = _b.sent();
                    if (heatmapRequestRef.current !== requestId) {
                        return [2 /*return*/];
                    }
                    setAttendanceHeatmapData(normaliseHeatmapResponse(payload, month, year));
                    setAttendanceHeatmapStatus('');
                    return [3 /*break*/, 11];
                case 9:
                    error_4 = _b.sent();
                    if (heatmapRequestRef.current !== requestId) {
                        return [2 /*return*/];
                    }
                    setAttendanceHeatmapData(null);
                    setAttendanceHeatmapStatus(error_4 instanceof Error ? error_4.message : 'Failed to load attendance heatmap');
                    return [3 /*break*/, 11];
                case 10:
                    if (heatmapRequestRef.current === requestId) {
                        setAttendanceHeatmapLoading(false);
                    }
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); }, []);
    /**
     * Loads the organisation-wide efficiency score and daily attendance rate.
     * Same auth/401-retry shape as the heatmap fetch above, and equally stable so
     * it can be called straight from an effect.
     */
    var fetchAttendanceInsights = (0, react_1.useCallback)(function (endDate_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([endDate_1], args_1, true), void 0, function (endDate, windowDays) {
            var requestId, params_5, makeRequest, response, nextAccessToken, _a, payload, error_5;
            var _this = this;
            if (windowDays === void 0) { windowDays = 7; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        requestId = insightsRequestRef.current + 1;
                        insightsRequestRef.current = requestId;
                        setAttendanceInsightsLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, 10, 11]);
                        params_5 = new URLSearchParams({ days: String(windowDays) });
                        if (endDate) {
                            params_5.set('end_date', endDate);
                        }
                        makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, fetch("/api/admin/attendance/insights?".concat(params_5.toString()), {
                                        method: 'GET',
                                        headers: {
                                            Authorization: "Bearer ".concat(token)
                                        }
                                    })];
                            });
                        }); };
                        return [4 /*yield*/, makeRequest(authRef.current.accessToken)];
                    case 2:
                        response = _b.sent();
                        if (!(response.status === 401)) return [3 /*break*/, 5];
                        return [4 /*yield*/, authRef.current.refreshAccessToken()];
                    case 3:
                        nextAccessToken = _b.sent();
                        return [4 /*yield*/, makeRequest(nextAccessToken)];
                    case 4:
                        response = _b.sent();
                        _b.label = 5;
                    case 5:
                        if (!!response.ok) return [3 /*break*/, 7];
                        _a = Error.bind;
                        return [4 /*yield*/, readErrorMessage(response, 'Failed to load attendance insights')];
                    case 6: throw new (_a.apply(Error, [void 0, _b.sent()]))();
                    case 7: return [4 /*yield*/, readJsonBody(response, 'The attendance insights endpoint')];
                    case 8:
                        payload = _b.sent();
                        if (insightsRequestRef.current !== requestId) {
                            return [2 /*return*/];
                        }
                        setAttendanceInsights(normaliseInsightsResponse(payload));
                        setAttendanceInsightsStatus('');
                        return [3 /*break*/, 11];
                    case 9:
                        error_5 = _b.sent();
                        if (insightsRequestRef.current !== requestId) {
                            return [2 /*return*/];
                        }
                        setAttendanceInsights(null);
                        setAttendanceInsightsStatus(error_5 instanceof Error ? error_5.message : 'Failed to load attendance insights');
                        return [3 /*break*/, 11];
                    case 10:
                        if (insightsRequestRef.current === requestId) {
                            setAttendanceInsightsLoading(false);
                        }
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    }, []);
    /**
     * Applies a manual status correction to a single day. The cell is repainted
     * immediately and rolled back to its previous value if the PATCH fails.
     */
    var updateAttendanceCell = function (employeeId, date, status) { return __awaiter(_this, void 0, void 0, function () {
        var previousCell, cellKey, payload_1, makeRequest, response, nextAccessToken, _a, result_1, savedStatus_1, error_6;
        var _this = this;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    previousCell = (_c = (_b = attendanceHeatmapData === null || attendanceHeatmapData === void 0 ? void 0 : attendanceHeatmapData.employees.find(function (employee) { return employee.empCode === employeeId; })) === null || _b === void 0 ? void 0 : _b.days[date]) !== null && _c !== void 0 ? _c : null;
                    cellKey = "".concat(employeeId, "|").concat(date);
                    setAttendanceHeatmapSavingCell(cellKey);
                    setAttendanceHeatmapStatus('Updating attendance...');
                    setAttendanceHeatmapData(function (current) {
                        var _a, _b;
                        return replaceHeatmapCell(current, employeeId, date, {
                            date: date,
                            status: status,
                            workingHours: (_a = previousCell === null || previousCell === void 0 ? void 0 : previousCell.workingHours) !== null && _a !== void 0 ? _a : null,
                            source: 'manual',
                            remarks: (_b = previousCell === null || previousCell === void 0 ? void 0 : previousCell.remarks) !== null && _b !== void 0 ? _b : null
                        });
                    });
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 9, 10, 11]);
                    payload_1 = { emp_code: employeeId, date: date, status: status };
                    makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, fetch('/api/admin/attendance/day', {
                                    method: 'PATCH',
                                    headers: {
                                        Authorization: "Bearer ".concat(token),
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(payload_1)
                                })];
                        });
                    }); };
                    return [4 /*yield*/, makeRequest(authRef.current.accessToken)];
                case 2:
                    response = _e.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 5];
                    return [4 /*yield*/, authRef.current.refreshAccessToken()];
                case 3:
                    nextAccessToken = _e.sent();
                    return [4 /*yield*/, makeRequest(nextAccessToken)];
                case 4:
                    response = _e.sent();
                    _e.label = 5;
                case 5:
                    if (!!response.ok) return [3 /*break*/, 7];
                    _a = Error.bind;
                    return [4 /*yield*/, readErrorMessage(response, 'Failed to update attendance')];
                case 6: throw new (_a.apply(Error, [void 0, _e.sent()]))();
                case 7: return [4 /*yield*/, readJsonBody(response, 'The attendance update endpoint')];
                case 8:
                    result_1 = _e.sent();
                    savedStatus_1 = toStatusCode((_d = result_1.cell) === null || _d === void 0 ? void 0 : _d.status);
                    if (savedStatus_1) {
                        setAttendanceHeatmapData(function (current) {
                            var _a, _b, _c, _d;
                            return replaceHeatmapCell(current, employeeId, date, {
                                date: date,
                                status: savedStatus_1,
                                workingHours: toWorkingHours((_a = result_1.cell) === null || _a === void 0 ? void 0 : _a.working_hours),
                                source: toCellSource((_b = result_1.cell) === null || _b === void 0 ? void 0 : _b.source),
                                remarks: (_d = (_c = result_1.cell) === null || _c === void 0 ? void 0 : _c.remarks) !== null && _d !== void 0 ? _d : null
                            });
                        });
                    }
                    setAttendanceHeatmapStatus(result_1.message || 'Attendance updated.');
                    window.setTimeout(function () { return setAttendanceHeatmapStatus(''); }, 2500);
                    return [2 /*return*/, true];
                case 9:
                    error_6 = _e.sent();
                    setAttendanceHeatmapData(function (current) { return replaceHeatmapCell(current, employeeId, date, previousCell); });
                    setAttendanceHeatmapStatus(error_6 instanceof Error ? error_6.message : 'Failed to update attendance');
                    return [2 /*return*/, false];
                case 10:
                    setAttendanceHeatmapSavingCell(function (current) { return (current === cellKey ? null : current); });
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); };
    var maxWeeklyAttendance = Math.max.apply(Math, __spreadArray(__spreadArray([], weeklyAttendanceTrend.map(function (item) { return item.count; }), false), [1], false));
    // The chart prefers the server-derived attendance rate, which accounts for
    // leave, holidays and week offs. Without it we still plot the locally derived
    // login counts, scaled against the busiest day in the window.
    var attendanceTrendSeries = (attendanceInsights === null || attendanceInsights === void 0 ? void 0 : attendanceInsights.trend.length)
        ? attendanceInsights.trend.map(function (day) {
            var _a;
            return ({
                key: day.date,
                label: day.label,
                ratio: ((_a = day.percentage) !== null && _a !== void 0 ? _a : 0) / 100,
                valueLabel: day.percentage === null ? '—' : "".concat(Math.round(day.percentage), "%"),
                caption: day.isWorkingDay ? "".concat(day.present, "/").concat(day.expected) : 'Off',
                isMuted: !day.isWorkingDay
            });
        })
        : weeklyAttendanceTrend.map(function (item) { return ({
            key: item.dateKey,
            label: item.label,
            ratio: item.count / maxWeeklyAttendance,
            valueLabel: String(item.count),
            caption: 'clocked in',
            isMuted: false
        }); });
    var isAttendanceTrendPercentage = Boolean(attendanceInsights === null || attendanceInsights === void 0 ? void 0 : attendanceInsights.trend.length);
    var weeklyTrendPoints = attendanceTrendSeries.map(function (item, index) {
        var x = attendanceTrendSeries.length > 1 ? (index / (attendanceTrendSeries.length - 1)) * 100 : 50;
        var y = 100 - Math.min(Math.max(item.ratio, 0), 1) * 100;
        return "".concat(x, ",").concat(y);
    }).join(' ');
    return {
        attendanceReportMonth: attendanceReportMonth,
        setAttendanceReportMonth: setAttendanceReportMonth,
        attendanceReportYear: attendanceReportYear,
        setAttendanceReportYear: setAttendanceReportYear,
        attendanceReportFormat: attendanceReportFormat,
        setAttendanceReportFormat: setAttendanceReportFormat,
        attendanceReportStatus: attendanceReportStatus,
        reportDateMode: reportDateMode,
        setReportDateMode: setReportDateMode,
        reportStartDate: reportStartDate,
        setReportStartDate: setReportStartDate,
        reportEndDate: reportEndDate,
        setReportEndDate: setReportEndDate,
        downloadRangeReport: downloadRangeReport,
        downloadDailyAttendanceReport: downloadDailyAttendanceReport,
        downloadMonthlyAttendanceReport: downloadMonthlyAttendanceReport,
        attendanceHeatmapData: attendanceHeatmapData,
        attendanceHeatmapLoading: attendanceHeatmapLoading,
        attendanceHeatmapStatus: attendanceHeatmapStatus,
        attendanceHeatmapSavingCell: attendanceHeatmapSavingCell,
        fetchAttendanceHeatmapData: fetchAttendanceHeatmapData,
        updateAttendanceCell: updateAttendanceCell,
        attendanceInsights: attendanceInsights,
        attendanceInsightsLoading: attendanceInsightsLoading,
        attendanceInsightsStatus: attendanceInsightsStatus,
        fetchAttendanceInsights: fetchAttendanceInsights,
        attendanceTrendSeries: attendanceTrendSeries,
        isAttendanceTrendPercentage: isAttendanceTrendPercentage,
        maxWeeklyAttendance: maxWeeklyAttendance,
        weeklyTrendPoints: weeklyTrendPoints
    };
}
