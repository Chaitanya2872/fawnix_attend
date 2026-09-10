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
exports.useLeavesPanel = useLeavesPanel;
var react_1 = require("react");
var sidebar_1 = require("../config/sidebar");
var LEAVE_TEMPLATE_COLUMNS = [
    'emp_code',
    'from_date',
    'to_date',
    'leave_type',
    'duration',
    'status',
    'leave_count',
    'applied_at',
    'notes'
];
function getImportData(responseData) {
    if (typeof responseData !== 'object' || responseData === null) {
        return {};
    }
    var data = responseData.data;
    return typeof data === 'object' && data !== null ? data : {};
}
function toImportCount(value) {
    var count = Number(value);
    return Number.isFinite(count) ? count : 0;
}
function formatFailureReason(item) {
    if (typeof item !== 'object' || item === null) {
        return String(item || 'Import row failed.');
    }
    var row = item;
    var rowLabel = row.row ? "Row ".concat(row.row, ": ") : '';
    return "".concat(rowLabel).concat(String(row.reason || 'Import row failed.'));
}
function buildImportSummary(responseData) {
    var data = getImportData(responseData);
    if (!Object.keys(data).length) {
        return null;
    }
    var failures = Array.isArray(data.failed) ? data.failed.slice(0, 5).map(formatFailureReason) : [];
    return {
        total: toImportCount(data.total_rows),
        inserted: toImportCount(data.inserted_count),
        skipped: toImportCount(data.skipped_count),
        failed: toImportCount(data.failed_count),
        failures: failures
    };
}
function getImportMessage(responseData, fallback) {
    if (typeof responseData !== 'object' || responseData === null) {
        return fallback;
    }
    var message = responseData.message ||
        responseData.error;
    return typeof message === 'string' && message.trim() ? message.trim() : fallback;
}
function useLeavesPanel(_a) {
    var _this = this;
    var employees = _a.employees, apiRequest = _a.apiRequest, accessToken = _a.accessToken, refreshAccessToken = _a.refreshAccessToken, setLeaveRows = _a.setLeaveRows;
    var _b = (0, react_1.useState)(__assign({}, sidebar_1.EMPTY_LEAVE_FILTERS)), leaveFilters = _b[0], setLeaveFilters = _b[1];
    var _c = (0, react_1.useState)(false), leaveFilterLoading = _c[0], setLeaveFilterLoading = _c[1];
    var _d = (0, react_1.useState)(''), leaveFilterStatus = _d[0], setLeaveFilterStatus = _d[1];
    var _e = (0, react_1.useState)(false), leaveImportLoading = _e[0], setLeaveImportLoading = _e[1];
    var _f = (0, react_1.useState)(''), leaveImportStatus = _f[0], setLeaveImportStatus = _f[1];
    var _g = (0, react_1.useState)(null), leaveImportSummary = _g[0], setLeaveImportSummary = _g[1];
    var updateLeaveFilter = function (field, value) {
        setLeaveFilters(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[field] = value, _a)));
        });
    };
    var refreshLeaves = function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([], args_1, true), void 0, function (filters, showStatus) {
            var params, response, leavesData, error_1;
            var _a;
            if (filters === void 0) { filters = leaveFilters; }
            if (showStatus === void 0) { showStatus = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
                            setLeaveFilterStatus('From date must be on or before To date.');
                            return [2 /*return*/];
                        }
                        setLeaveFilterLoading(true);
                        if (showStatus) {
                            setLeaveFilterStatus('Applying leave filters...');
                        }
                        params = new URLSearchParams({ limit: '500' });
                        if (filters.employeeName.trim())
                            params.set('employee_name', filters.employeeName.trim());
                        if (filters.employeeId.trim())
                            params.set('employee_id', filters.employeeId.trim());
                        if (filters.leaveType.trim())
                            params.set('leave_type', filters.leaveType.trim().toLowerCase());
                        if (filters.fromDate)
                            params.set('from_date', filters.fromDate);
                        if (filters.toDate)
                            params.set('to_date', filters.toDate);
                        if (filters.status.trim())
                            params.set('status', filters.status.trim().toLowerCase());
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, apiRequest("/api/admin/leaves?".concat(params.toString()))];
                    case 2:
                        response = _b.sent();
                        leavesData = Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.leaves) ? response.data.leaves : [];
                        setLeaveRows(leavesData);
                        if (showStatus) {
                            setLeaveFilterStatus("".concat(leavesData.length, " leave record").concat(leavesData.length === 1 ? '' : 's', " found."));
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _b.sent();
                        setLeaveFilterStatus(error_1 instanceof Error ? error_1.message : 'Failed to filter leave records.');
                        return [3 /*break*/, 5];
                    case 4:
                        setLeaveFilterLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    var clearLeaveFilters = function () { return __awaiter(_this, void 0, void 0, function () {
        var emptyFilters;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    emptyFilters = __assign({}, sidebar_1.EMPTY_LEAVE_FILTERS);
                    setLeaveFilters(emptyFilters);
                    return [4 /*yield*/, refreshLeaves(emptyFilters, true)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var downloadLeavesTemplate = function () {
        var sample = [
            'EMP001',
            '2026-04-10',
            '2026-04-10',
            'casual',
            'full_day',
            'approved',
            '1',
            '2026-04-01 09:30:00',
            'Family appointment'
        ];
        var blob = new Blob(["".concat(LEAVE_TEMPLATE_COLUMNS.join(','), "\n").concat(sample.join(','), "\n")], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'fawnix_leaves_template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };
    var importLeaves = function (file, options) { return __awaiter(_this, void 0, void 0, function () {
        var buildFormData, uploadWithToken, response, nextAccessToken, responseData, summary, error, message, error_2, importError, summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLeaveImportLoading(true);
                    setLeaveImportStatus('Importing leave records...');
                    setLeaveImportSummary(null);
                    buildFormData = function () {
                        var formData = new FormData();
                        formData.append('file', file);
                        formData.append('default_status', options.defaultStatus);
                        formData.append('strict', options.strict ? 'true' : 'false');
                        formData.append('skip_duplicates', options.skipDuplicates ? 'true' : 'false');
                        return formData;
                    };
                    uploadWithToken = function (token) {
                        return fetch('/api/admin/leaves/import', {
                            method: 'POST',
                            headers: token ? { Authorization: "Bearer ".concat(token) } : undefined,
                            body: buildFormData()
                        });
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, 9, 10]);
                    return [4 /*yield*/, uploadWithToken(accessToken)];
                case 2:
                    response = _a.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 5];
                    return [4 /*yield*/, refreshAccessToken()];
                case 3:
                    nextAccessToken = _a.sent();
                    return [4 /*yield*/, uploadWithToken(nextAccessToken)];
                case 4:
                    response = _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 6:
                    responseData = _a.sent();
                    summary = buildImportSummary(responseData);
                    setLeaveImportSummary(summary);
                    if (!response.ok) {
                        error = new Error(getImportMessage(responseData, 'Leave import failed.'));
                        error.responseData = responseData;
                        throw error;
                    }
                    message = getImportMessage(responseData, 'Leave import complete.');
                    setLeaveImportStatus(summary
                        ? "".concat(message, ": total ").concat(summary.total, ", inserted ").concat(summary.inserted, ", skipped ").concat(summary.skipped, ", failed ").concat(summary.failed, ".")
                        : message);
                    return [4 /*yield*/, refreshLeaves(leaveFilters, true)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    error_2 = _a.sent();
                    importError = error_2;
                    summary = buildImportSummary(importError.responseData);
                    if (summary) {
                        setLeaveImportSummary(summary);
                    }
                    setLeaveImportStatus(error_2 instanceof Error ? error_2.message : 'Could not import this leave file.');
                    return [3 /*break*/, 10];
                case 9:
                    setLeaveImportLoading(false);
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    }); };
    var leaveEmployeeNameOptions = Array.from(new Set(employees.map(function (employee) { return (employee.emp_full_name || '').trim(); }).filter(Boolean))).sort(function (left, right) { return left.localeCompare(right, undefined, { sensitivity: 'base' }); });
    var leaveEmployeeIdOptions = Array.from(new Set(employees.map(function (employee) { return (employee.emp_code || '').trim(); }).filter(Boolean))).sort(function (left, right) { return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }); });
    var resetLeavesPanel = function () {
        setLeaveFilters(__assign({}, sidebar_1.EMPTY_LEAVE_FILTERS));
        setLeaveFilterStatus('');
    };
    return {
        leaveFilters: leaveFilters,
        leaveFilterLoading: leaveFilterLoading,
        leaveFilterStatus: leaveFilterStatus,
        updateLeaveFilter: updateLeaveFilter,
        refreshLeaves: refreshLeaves,
        clearLeaveFilters: clearLeaveFilters,
        leaveImportLoading: leaveImportLoading,
        leaveImportStatus: leaveImportStatus,
        leaveImportSummary: leaveImportSummary,
        importLeaves: importLeaves,
        downloadLeavesTemplate: downloadLeavesTemplate,
        leaveEmployeeNameOptions: leaveEmployeeNameOptions,
        leaveEmployeeIdOptions: leaveEmployeeIdOptions,
        resetLeavesPanel: resetLeavesPanel
    };
}
