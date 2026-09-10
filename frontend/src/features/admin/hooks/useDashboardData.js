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
exports.useDashboardData = useDashboardData;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var fieldVisits_1 = require("../utils/fieldVisits");
var ATTENDANCE_PAGE_SIZE = 1000;
function mapAdminExceptionToAttendanceException(row) {
    return {
        id: row.id,
        attendance_id: row.attendance_id,
        emp_code: row.emp_code || row.employee_code,
        emp_name: row.emp_name || row.employee_name,
        exception_type: row.exception_type,
        exception_date: row.exception_date || row.attendance_date || row.created_date,
        attendance_date: row.attendance_date || row.exception_date,
        exception_time: row.exception_time || row.planned_arrival_time,
        planned_arrival_time: row.planned_arrival_time,
        planned_leave_time: row.planned_leave_time,
        late_by_minutes: row.late_by_minutes,
        early_by_minutes: row.early_by_minutes,
        reason: row.reason || row.notes,
        status: row.status,
        requested_at: row.requested_at || row.created_date,
        actual_login_time: row.login_time,
        actual_logout_time: row.logout_time
    };
}
function dedupeAttendanceExceptions(rows) {
    return Array.from(rows.reduce(function (map, row) {
        var key = row.id
            ? "".concat(row.exception_type || 'exception', "-").concat(row.id)
            : [
                row.exception_type,
                row.emp_code || row.emp_name,
                row.exception_date || row.attendance_date,
                row.requested_at || row.exception_time || row.actual_login_time || row.actual_logout_time
            ]
                .filter(Boolean)
                .join('|')
                .toLowerCase();
        if (key) {
            map.set(key, row);
        }
        return map;
    }, new Map())
        .values());
}
// TODO: loadDashboard eagerly fetches all 8 endpoints for all 6 panels on every
// login/date-filter change, rather than lazily per-panel. That's intentional for
// now (see Phase 3 discussion) - switching panels stays instant with no spinners,
// at the cost of fetching data for panels the user may never visit. Splitting this
// into per-panel fetches is a legitimate follow-up, but it trades instant-switch for
// less waste - a real UX call, not a refactor. Needs its own explicit sign-off
// before changing, not a silent side effect of a cleanup pass.
function useDashboardData(accessToken, apiRequest) {
    var _this = this;
    var _a = (0, react_1.useState)(false), dashboardLoading = _a[0], setDashboardLoading = _a[1];
    var _b = (0, react_1.useState)(''), dashboardError = _b[0], setDashboardError = _b[1];
    var _c = (0, react_1.useState)([]), employees = _c[0], setEmployees = _c[1];
    var _d = (0, react_1.useState)([]), attendanceRows = _d[0], setAttendanceRows = _d[1];
    var _e = (0, react_1.useState)([]), attendanceExceptions = _e[0], setAttendanceExceptions = _e[1];
    var _f = (0, react_1.useState)([]), leaveRows = _f[0], setLeaveRows = _f[1];
    var _g = (0, react_1.useState)([]), activityRows = _g[0], setActivityRows = _g[1];
    var _h = (0, react_1.useState)([]), fieldVisitRows = _h[0], setFieldVisitRows = _h[1];
    var _j = (0, react_1.useState)([]), employeeAuditLogs = _j[0], setEmployeeAuditLogs = _j[1];
    var _k = (0, react_1.useState)(null), missedLoginLeader = _k[0], setMissedLoginLeader = _k[1];
    var _l = (0, react_1.useState)(function () { return (0, dateUtils_1.toDateInputValue)(new Date()); }), attendanceDateFilter = _l[0], setAttendanceDateFilter = _l[1];
    var loadDashboard = function (token) { return __awaiter(_this, void 0, void 0, function () {
        var selectedDateValue, attendanceParams, attendancePath, selectedAttendanceParams, selectedAttendancePath, selectedExceptionParams, selectedExceptionsPath, _a, employeesResponse, attendanceResponse, selectedAttendanceResponse, leavesResponse, activitiesResponse, lateArrivalsResponse, earlyLeavesResponse, selectedExceptionsResponse, employeeAuditLogsResponse, missedLoginLeaderResponse, employeesData, employeeAuditLogsData, missedLoginLeaderData, attendanceData, selectedAttendanceData, leavesData, activitiesData, selectedExceptionData, selectedLateArrivalsData, selectedEarlyLeavesData, legacyLateArrivalsData, legacyEarlyLeavesData, lateArrivalsData, earlyLeavesData, exceptionsData, attendanceDeduped, fieldVisits, error_1, message;
        var _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    setDashboardLoading(true);
                    setDashboardError('');
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 3, 4, 5]);
                    selectedDateValue = attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date());
                    attendanceParams = new URLSearchParams();
                    attendanceParams.set('page_size', String(ATTENDANCE_PAGE_SIZE));
                    attendancePath = "/api/admin/attendance/history?".concat(attendanceParams.toString());
                    selectedAttendanceParams = new URLSearchParams();
                    selectedAttendanceParams.set('page_size', String(ATTENDANCE_PAGE_SIZE));
                    selectedAttendanceParams.set('date', selectedDateValue);
                    selectedAttendancePath = "/api/admin/attendance/history?".concat(selectedAttendanceParams.toString());
                    selectedExceptionParams = new URLSearchParams();
                    selectedExceptionParams.set('page_size', '100');
                    selectedExceptionParams.set('from_date', selectedDateValue);
                    selectedExceptionParams.set('to_date', selectedDateValue);
                    selectedExceptionsPath = "/api/admin/attendance-exceptions?".concat(selectedExceptionParams.toString());
                    return [4 /*yield*/, Promise.all([
                            apiRequest('/api/admin/employees', {}, token),
                            apiRequest(attendancePath, {}, token),
                            apiRequest(selectedAttendancePath, {}, token),
                            apiRequest('/api/admin/leaves?limit=500', {}, token),
                            apiRequest('/api/admin/activities?limit=30&include_tracking=true&include_activity_tracking=true', {}, token),
                            apiRequest('/api/admin/late-arrivals', {}, token).catch(function () { return null; }),
                            apiRequest('/api/admin/early-leaves', {}, token).catch(function () { return null; }),
                            apiRequest(selectedExceptionsPath, {}, token),
                            apiRequest('/api/admin/database-audit-logs?limit=100', {}, token).catch(function () { return ({ data: [] }); }),
                            apiRequest('/api/admin/attendance/missed-login-leader?days=30', {}, token).catch(function () { return ({ data: null }); }),
                        ])];
                case 2:
                    _a = _j.sent(), employeesResponse = _a[0], attendanceResponse = _a[1], selectedAttendanceResponse = _a[2], leavesResponse = _a[3], activitiesResponse = _a[4], lateArrivalsResponse = _a[5], earlyLeavesResponse = _a[6], selectedExceptionsResponse = _a[7], employeeAuditLogsResponse = _a[8], missedLoginLeaderResponse = _a[9];
                    employeesData = Array.isArray(employeesResponse === null || employeesResponse === void 0 ? void 0 : employeesResponse.data) ? employeesResponse.data : [];
                    employeeAuditLogsData = Array.isArray(employeeAuditLogsResponse === null || employeeAuditLogsResponse === void 0 ? void 0 : employeeAuditLogsResponse.data) ? employeeAuditLogsResponse.data : [];
                    missedLoginLeaderData = (missedLoginLeaderResponse === null || missedLoginLeaderResponse === void 0 ? void 0 : missedLoginLeaderResponse.data) || null;
                    attendanceData = Array.isArray((_b = attendanceResponse === null || attendanceResponse === void 0 ? void 0 : attendanceResponse.data) === null || _b === void 0 ? void 0 : _b.records)
                        ? attendanceResponse.data.records
                        : [];
                    selectedAttendanceData = Array.isArray((_c = selectedAttendanceResponse === null || selectedAttendanceResponse === void 0 ? void 0 : selectedAttendanceResponse.data) === null || _c === void 0 ? void 0 : _c.records)
                        ? selectedAttendanceResponse.data.records
                        : [];
                    leavesData = Array.isArray((_d = leavesResponse === null || leavesResponse === void 0 ? void 0 : leavesResponse.data) === null || _d === void 0 ? void 0 : _d.leaves) ? leavesResponse.data.leaves : [];
                    activitiesData = Array.isArray((_e = activitiesResponse === null || activitiesResponse === void 0 ? void 0 : activitiesResponse.data) === null || _e === void 0 ? void 0 : _e.activities) ? activitiesResponse.data.activities : [];
                    selectedExceptionData = Array.isArray((_f = selectedExceptionsResponse === null || selectedExceptionsResponse === void 0 ? void 0 : selectedExceptionsResponse.data) === null || _f === void 0 ? void 0 : _f.records)
                        ? selectedExceptionsResponse.data.records
                            .map(mapAdminExceptionToAttendanceException)
                        : [];
                    selectedLateArrivalsData = selectedExceptionData.filter(function (row) { return row.exception_type === 'late_arrival'; });
                    selectedEarlyLeavesData = selectedExceptionData.filter(function (row) { return row.exception_type === 'early_leave'; });
                    legacyLateArrivalsData = Array.isArray((_g = lateArrivalsResponse === null || lateArrivalsResponse === void 0 ? void 0 : lateArrivalsResponse.data) === null || _g === void 0 ? void 0 : _g.exceptions)
                        ? lateArrivalsResponse.data.exceptions.map(function (row) { return (__assign(__assign({}, row), { exception_type: row.exception_type || 'late_arrival' })); })
                        : [];
                    legacyEarlyLeavesData = Array.isArray((_h = earlyLeavesResponse === null || earlyLeavesResponse === void 0 ? void 0 : earlyLeavesResponse.data) === null || _h === void 0 ? void 0 : _h.exceptions)
                        ? earlyLeavesResponse.data.exceptions.map(function (row) { return (__assign(__assign({}, row), { exception_type: row.exception_type || 'early_leave' })); })
                        : [];
                    lateArrivalsData = dedupeAttendanceExceptions(__spreadArray(__spreadArray([], legacyLateArrivalsData, true), selectedLateArrivalsData, true));
                    earlyLeavesData = dedupeAttendanceExceptions(__spreadArray(__spreadArray([], legacyEarlyLeavesData, true), selectedEarlyLeavesData, true));
                    exceptionsData = dedupeAttendanceExceptions(__spreadArray(__spreadArray(__spreadArray([], lateArrivalsData, true), earlyLeavesData, true), selectedExceptionData, true));
                    setEmployees(employeesData);
                    setEmployeeAuditLogs(employeeAuditLogsData);
                    setMissedLoginLeader(missedLoginLeaderData);
                    attendanceDeduped = Array.from(__spreadArray(__spreadArray([], attendanceData, true), selectedAttendanceData, true).reduce(function (map, row) {
                        var _a;
                        var key = ((_a = row.id) === null || _a === void 0 ? void 0 : _a.toString()) ||
                            "".concat(row.employee_email || 'unknown', "-").concat(row.login_time || row.logout_time || 'time').toLowerCase();
                        if (!map.has(key)) {
                            map.set(key, row);
                        }
                        return map;
                    }, new Map())
                        .values());
                    setAttendanceRows(attendanceDeduped);
                    setLeaveRows(leavesData);
                    setActivityRows(activitiesData);
                    setAttendanceExceptions(exceptionsData);
                    fieldVisits = activitiesData
                        .filter(function (item) { return item.field_visit_id; })
                        .map(function (item) {
                        var _a, _b;
                        var startCoords = (0, fieldVisits_1.parseCoords)(item.start_latitude, item.start_longitude);
                        var endCoords = (0, fieldVisits_1.parseCoords)(item.end_latitude, item.end_longitude);
                        var fieldTrackingPoints = Array.isArray(item.field_visit_tracking) ? item.field_visit_tracking : [];
                        var activityTrackingPoints = Array.isArray(item.activity_tracking) ? item.activity_tracking : [];
                        var latestFieldTrackingPoint = fieldTrackingPoints.length ? fieldTrackingPoints[fieldTrackingPoints.length - 1] : null;
                        var latestActivityTrackingPoint = activityTrackingPoints.length ? activityTrackingPoints[activityTrackingPoints.length - 1] : null;
                        var activityTrackedCoords = activityTrackingPoints
                            .map(function (point) { return (0, fieldVisits_1.parseCoords)(point.latitude, point.longitude); })
                            .filter(function (point) { return Boolean(point); });
                        var fieldTrackedCoords = fieldTrackingPoints
                            .map(function (point) { return (0, fieldVisits_1.parseCoords)(point.latitude, point.longitude); })
                            .filter(function (point) { return Boolean(point); });
                        var trackedCoords = activityTrackedCoords.length ? activityTrackedCoords : fieldTrackedCoords;
                        var _c = (0, fieldVisits_1.getDestinationVisitCounts)(item.destinations), visitedCount = _c.visitedCount, totalCount = _c.totalCount;
                        var status = item.field_visit_status || item.status || 'Unknown';
                        var isCompleted = (0, fieldVisits_1.isCompletedVisitStatus)(status);
                        var visitStartTime = item.field_visit_start_time || item.start_time;
                        var visitEndTime = item.field_visit_end_time;
                        var routePoints = (0, fieldVisits_1.buildRoutePoints)(startCoords, trackedCoords, isCompleted ? endCoords : null);
                        var startAddress = item.field_visit_start_address ||
                            ((_a = activityTrackingPoints.find(function (point) { return point === null || point === void 0 ? void 0 : point.address; })) === null || _a === void 0 ? void 0 : _a.address) ||
                            ((_b = fieldTrackingPoints.find(function (point) { return point === null || point === void 0 ? void 0 : point.address; })) === null || _b === void 0 ? void 0 : _b.address) ||
                            (0, fieldVisits_1.formatCoordsValue)(startCoords);
                        var endAddress = isCompleted
                            ? item.field_visit_end_address ||
                                (latestActivityTrackingPoint === null || latestActivityTrackingPoint === void 0 ? void 0 : latestActivityTrackingPoint.address) ||
                                (latestFieldTrackingPoint === null || latestFieldTrackingPoint === void 0 ? void 0 : latestFieldTrackingPoint.address) ||
                                (0, fieldVisits_1.formatCoordsValue)(endCoords)
                            : undefined;
                        var distanceKmValue = Number(item.total_distance_km) > 0
                            ? Number(item.total_distance_km)
                            : routePoints.length >= 2
                                ? (0, fieldVisits_1.calculateDistanceKm)(routePoints)
                                : null;
                        var durationMinutes = (0, fieldVisits_1.resolveVisitDurationMinutes)(item.field_visit_duration_minutes, visitStartTime, visitEndTime, isCompleted);
                        return {
                            activityId: item.id || item.field_visit_id || '',
                            fieldVisitId: item.field_visit_id ? Number(item.field_visit_id) : undefined,
                            employee: item.employee_name || item.employee_email || 'Unknown employee',
                            visitType: item.field_visit_type || 'Field Visit',
                            purpose: item.field_visit_purpose || item.activity_type || 'Visit',
                            visitDate: visitStartTime,
                            visitStartTime: visitStartTime,
                            visitEndTime: visitEndTime,
                            durationMinutes: durationMinutes,
                            status: status,
                            isCompleted: isCompleted,
                            location: startAddress || endAddress || 'Location unavailable',
                            startName: (0, fieldVisits_1.getLocationName)(startAddress || endAddress, 'Start Location'),
                            endName: (0, fieldVisits_1.getLocationName)(endAddress, 'End Location'),
                            startAddress: startAddress || undefined,
                            endAddress: endAddress || undefined,
                            destinationLocation: (0, fieldVisits_1.formatDestinationLocation)(item.destinations),
                            destinationVisited: (0, fieldVisits_1.getDestinationVisitedStatus)(item.destinations),
                            destinationVisitFlag: (0, fieldVisits_1.getDestinationVisitFlag)(item.destinations),
                            destinationVisitedCount: visitedCount,
                            destinationTotalCount: totalCount,
                            distanceKm: Number.isFinite(distanceKmValue) ? distanceKmValue : null,
                            startCoords: startCoords,
                            endCoords: endCoords,
                            activityTracking: activityTrackingPoints,
                            fieldTracking: fieldTrackingPoints
                        };
                    });
                    setFieldVisitRows(fieldVisits);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _j.sent();
                    message = error_1 instanceof Error ? error_1.message : 'Failed to load admin dashboard';
                    setDashboardError(message);
                    return [3 /*break*/, 5];
                case 4:
                    setDashboardLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var resetDashboardData = function () {
        setEmployees([]);
        setEmployeeAuditLogs([]);
        setMissedLoginLeader(null);
        setAttendanceRows([]);
        setAttendanceExceptions([]);
        setLeaveRows([]);
        setActivityRows([]);
        setFieldVisitRows([]);
    };
    (0, react_1.useEffect)(function () {
        if (!accessToken) {
            return;
        }
        void loadDashboard(accessToken);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, attendanceDateFilter]);
    return {
        employees: employees,
        employeeAuditLogs: employeeAuditLogs,
        missedLoginLeader: missedLoginLeader,
        attendanceRows: attendanceRows,
        leaveRows: leaveRows,
        setLeaveRows: setLeaveRows,
        activityRows: activityRows,
        fieldVisitRows: fieldVisitRows,
        attendanceExceptions: attendanceExceptions,
        dashboardLoading: dashboardLoading,
        dashboardError: dashboardError,
        attendanceDateFilter: attendanceDateFilter,
        setAttendanceDateFilter: setAttendanceDateFilter,
        loadDashboard: loadDashboard,
        resetDashboardData: resetDashboardData
    };
}
