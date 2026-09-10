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
exports.useAttendancePanel = useAttendancePanel;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
function useAttendancePanel(_a) {
    var _this = this;
    var isActive = _a.isActive, accessToken = _a.accessToken, apiRequest = _a.apiRequest, attendanceDateFilter = _a.attendanceDateFilter, employees = _a.employees, firstClockInRows = _a.firstClockInRows, selectedDateLateArrivals = _a.selectedDateLateArrivals, selectedDateEarlyLeaves = _a.selectedDateEarlyLeaves;
    var _b = (0, react_1.useState)('attendance'), attendanceView = _b[0], setAttendanceView = _b[1];
    var _c = (0, react_1.useState)(''), attendanceSearch = _c[0], setAttendanceSearch = _c[1];
    var _d = (0, react_1.useState)([]), missedLoginEmpCodes = _d[0], setMissedLoginEmpCodes = _d[1];
    var _e = (0, react_1.useState)(false), alertCandidatesLoading = _e[0], setAlertCandidatesLoading = _e[1];
    var _f = (0, react_1.useState)(false), alertTriggerLoading = _f[0], setAlertTriggerLoading = _f[1];
    var _g = (0, react_1.useState)(''), alertTriggerStatus = _g[0], setAlertTriggerStatus = _g[1];
    var _h = (0, react_1.useState)(false), showAlertComposer = _h[0], setShowAlertComposer = _h[1];
    var _j = (0, react_1.useState)([]), selectedMissedLoginEmpCodes = _j[0], setSelectedMissedLoginEmpCodes = _j[1];
    var _k = (0, react_1.useState)([]), alertSentEmpCodes = _k[0], setAlertSentEmpCodes = _k[1];
    var _l = (0, react_1.useState)({}), alertSendCounts = _l[0], setAlertSendCounts = _l[1];
    (0, react_1.useEffect)(function () {
        if (!accessToken || !isActive) {
            return;
        }
        var cancelled = false;
        var loadAlertCandidates = function () { return __awaiter(_this, void 0, void 0, function () {
            var params, response, candidateRows, nextMissedCodes, nextSentCodes, nextSendCounts, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setAlertCandidatesLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        params = new URLSearchParams({
                            notification_type: 'attendance_reminder',
                            target_date: attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date())
                        });
                        return [4 /*yield*/, apiRequest("/api/admin/scheduled-notifications/candidates?".concat(params.toString()), {}, accessToken)];
                    case 2:
                        response = _b.sent();
                        candidateRows = Array.isArray(response === null || response === void 0 ? void 0 : response.data)
                            ? response.data
                            : [];
                        nextMissedCodes = candidateRows
                            .map(function (row) { return (row.emp_code || '').trim(); })
                            .filter(Boolean);
                        nextSentCodes = candidateRows
                            .filter(function (row) { return (row.alert_status || '').toLowerCase() === 'sent'; })
                            .map(function (row) { return (row.emp_code || '').trim(); })
                            .filter(Boolean);
                        nextSendCounts = candidateRows.reduce(function (counts, row) {
                            var empCode = (row.emp_code || '').trim();
                            if (!empCode) {
                                return counts;
                            }
                            counts[empCode] = Number(row.alert_send_count || 0);
                            return counts;
                        }, {});
                        if (!cancelled) {
                            setMissedLoginEmpCodes(Array.from(new Set(nextMissedCodes)));
                            setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)));
                            setAlertSendCounts(nextSendCounts);
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        _a = _b.sent();
                        if (!cancelled) {
                            setMissedLoginEmpCodes([]);
                            setAlertSentEmpCodes([]);
                            setAlertSendCounts({});
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        if (!cancelled) {
                            setAlertCandidatesLoading(false);
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        void loadAlertCandidates();
        return function () {
            cancelled = true;
        };
    }, [accessToken, isActive, attendanceDateFilter, apiRequest]);
    (0, react_1.useEffect)(function () {
        setAlertTriggerStatus('');
        setShowAlertComposer(false);
        setAlertSentEmpCodes([]);
        setAlertSendCounts({});
    }, [attendanceDateFilter]);
    (0, react_1.useEffect)(function () {
        setSelectedMissedLoginEmpCodes(function (previousCodes) {
            return previousCodes.filter(function (empCode) { return missedLoginEmpCodes.includes(empCode); });
        });
    }, [missedLoginEmpCodes]);
    var triggerAttendanceReminder = function () { return __awaiter(_this, void 0, void 0, function () {
        var requestedEmpCodes, targetDate, response, sentCount, failedCount, sentEmpCodes_1, responseMessage, params, candidatesResponse, candidateRows, nextMissedCodes, nextSentCodes, nextSendCounts, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    requestedEmpCodes = Array.from(new Set(selectedMissedLoginEmpCodes));
                    if (!requestedEmpCodes.length) {
                        setAlertTriggerStatus('Select at least one employee to trigger reminders.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    setAlertTriggerLoading(true);
                    setAlertTriggerStatus('Triggering reminders...');
                    targetDate = attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date());
                    return [4 /*yield*/, apiRequest('/api/admin/scheduled-notifications/trigger', {
                            method: 'POST',
                            body: JSON.stringify({
                                notification_type: 'attendance_reminder',
                                target_date: targetDate,
                                emp_codes: requestedEmpCodes
                            })
                        })];
                case 2:
                    response = _a.sent();
                    sentCount = Number((response === null || response === void 0 ? void 0 : response.sent_count) || 0);
                    failedCount = Number((response === null || response === void 0 ? void 0 : response.failed_count) || 0);
                    sentEmpCodes_1 = Array.isArray(response === null || response === void 0 ? void 0 : response.sent_emp_codes)
                        ? response.sent_emp_codes
                            .map(function (empCode) { return String(empCode || '').trim(); })
                            .filter(Boolean)
                        : [];
                    responseMessage = typeof (response === null || response === void 0 ? void 0 : response.message) === 'string' && response.message.trim()
                        ? response.message.trim()
                        : 'Attendance reminders processed';
                    setAlertTriggerStatus("".concat(responseMessage, " Sent: ").concat(sentCount, ", Failed: ").concat(failedCount, "."));
                    setShowAlertComposer(false);
                    if (sentEmpCodes_1.length) {
                        setAlertSentEmpCodes(function (previousCodes) {
                            return Array.from(new Set(__spreadArray(__spreadArray([], previousCodes, true), sentEmpCodes_1, true)));
                        });
                    }
                    params = new URLSearchParams({
                        notification_type: 'attendance_reminder',
                        target_date: targetDate
                    });
                    return [4 /*yield*/, apiRequest("/api/admin/scheduled-notifications/candidates?".concat(params.toString()), {}, accessToken)];
                case 3:
                    candidatesResponse = _a.sent();
                    candidateRows = Array.isArray(candidatesResponse === null || candidatesResponse === void 0 ? void 0 : candidatesResponse.data)
                        ? candidatesResponse.data
                        : [];
                    nextMissedCodes = candidateRows
                        .map(function (row) { return (row.emp_code || '').trim(); })
                        .filter(Boolean);
                    nextSentCodes = candidateRows
                        .filter(function (row) { return (row.alert_status || '').toLowerCase() === 'sent'; })
                        .map(function (row) { return (row.emp_code || '').trim(); })
                        .filter(Boolean);
                    nextSendCounts = candidateRows.reduce(function (counts, row) {
                        var empCode = (row.emp_code || '').trim();
                        if (!empCode) {
                            return counts;
                        }
                        counts[empCode] = Number(row.alert_send_count || 0);
                        return counts;
                    }, {});
                    setMissedLoginEmpCodes(Array.from(new Set(nextMissedCodes)));
                    setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)));
                    setAlertSendCounts(nextSendCounts);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    setAlertTriggerStatus(error_1 instanceof Error ? error_1.message : 'Failed to trigger attendance reminders');
                    return [3 /*break*/, 6];
                case 5:
                    setAlertTriggerLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var employeeByCode = new Map(employees
        .filter(function (employee) { return employee.emp_code; })
        .map(function (employee) { return [employee.emp_code.trim(), employee]; }));
    var missedLoginEmployees = missedLoginEmpCodes
        .map(function (empCode) {
        var normalizedEmpCode = (empCode || '').trim();
        if (!normalizedEmpCode) {
            return null;
        }
        var employee = employeeByCode.get(normalizedEmpCode);
        if (employee) {
            return employee;
        }
        return {
            emp_code: normalizedEmpCode,
            emp_full_name: normalizedEmpCode,
            emp_email: ''
        };
    })
        .filter(function (employee) { return Boolean(employee); })
        .sort(function (left, right) {
        return (left.emp_full_name || left.emp_code || '').localeCompare(right.emp_full_name || right.emp_code || '');
    });
    var actionableMissedLoginEmployeeCodes = missedLoginEmployees
        .map(function (employee) { return employee.emp_code || ''; })
        .filter(Boolean);
    var selectedMissedLoginCount = selectedMissedLoginEmpCodes.filter(function (empCode) {
        return actionableMissedLoginEmployeeCodes.includes(empCode);
    }).length;
    var allMissedLoginsSelected = actionableMissedLoginEmployeeCodes.length > 0 &&
        selectedMissedLoginCount === actionableMissedLoginEmployeeCodes.length;
    var reminderTargetDate = attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date());
    var reminderPreviewTitle = 'Attendance Reminder';
    var reminderPreviewBody = 'Clock in. If you already did, please ignore.';
    var attendancePageRows = firstClockInRows;
    var normalizedAttendanceSearch = attendanceSearch.trim().toLowerCase();
    var filteredAttendanceRows = normalizedAttendanceSearch
        ? attendancePageRows.filter(function (row) {
            var haystack = [
                row.employee_name,
                row.employee_email,
                row.emp_designation,
                row.attendance_type,
                row.login_location,
                row.login_address,
                row.logout_location,
                row.logout_address
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(normalizedAttendanceSearch);
        })
        : attendancePageRows;
    var exceptionRows = attendanceView === 'late-arrivals'
        ? selectedDateLateArrivals
        : attendanceView === 'early-leaves'
            ? selectedDateEarlyLeaves
            : [];
    var resetAttendancePanel = function () {
        setAttendanceView('attendance');
        setMissedLoginEmpCodes([]);
        setAlertSentEmpCodes([]);
        setAlertSendCounts({});
        setSelectedMissedLoginEmpCodes([]);
    };
    return {
        attendanceView: attendanceView,
        setAttendanceView: setAttendanceView,
        attendanceSearch: attendanceSearch,
        setAttendanceSearch: setAttendanceSearch,
        missedLoginEmpCodes: missedLoginEmpCodes,
        alertCandidatesLoading: alertCandidatesLoading,
        alertTriggerLoading: alertTriggerLoading,
        alertTriggerStatus: alertTriggerStatus,
        setAlertTriggerStatus: setAlertTriggerStatus,
        showAlertComposer: showAlertComposer,
        setShowAlertComposer: setShowAlertComposer,
        selectedMissedLoginEmpCodes: selectedMissedLoginEmpCodes,
        setSelectedMissedLoginEmpCodes: setSelectedMissedLoginEmpCodes,
        alertSentEmpCodes: alertSentEmpCodes,
        alertSendCounts: alertSendCounts,
        attendancePageRows: attendancePageRows,
        filteredAttendanceRows: filteredAttendanceRows,
        missedLoginEmployees: missedLoginEmployees,
        actionableMissedLoginEmployeeCodes: actionableMissedLoginEmployeeCodes,
        allMissedLoginsSelected: allMissedLoginsSelected,
        selectedMissedLoginCount: selectedMissedLoginCount,
        reminderPreviewBody: reminderPreviewBody,
        reminderPreviewTitle: reminderPreviewTitle,
        reminderTargetDate: reminderTargetDate,
        exceptionRows: exceptionRows,
        triggerAttendanceReminder: triggerAttendanceReminder,
        resetAttendancePanel: resetAttendancePanel
    };
}
