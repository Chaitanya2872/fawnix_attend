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
exports.useOvertimeRecordsData = useOvertimeRecordsData;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var OVERTIME_STATUSES = [
    'eligible',
    'requested',
    'approved',
    'rejected',
    'expired',
    'utilized',
];
var DEFAULT_FILTERS = {
    search: '',
    status: '',
    empCode: '',
    department: '',
    fromDate: '',
    toDate: '',
    datePreset: '',
    pageSize: '15',
    sortBy: 'work_date',
    sortOrder: 'desc',
};
var DEFAULT_PAGINATION = {
    page: 1,
    page_size: 15,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
};
var DEFAULT_FILTER_OPTIONS = {
    departments: [],
    statuses: OVERTIME_STATUSES,
};
var EMPTY_KPIS = {
    total_loaded: 0,
    total: 0,
    eligible: 0,
    eligible_comp_off_days: 0,
    total_extra_hours: 0,
    expiring_or_expired: 0,
    requested: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    utilized: 0,
    current_month_total: 0,
    previous_month_total: 0,
};
function toFiniteNumber(value, fallback) {
    if (fallback === void 0) { fallback = 0; }
    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}
function toInteger(value, fallback) {
    if (fallback === void 0) { fallback = 0; }
    var numericValue = Number(value);
    return Number.isInteger(numericValue) ? numericValue : fallback;
}
function startOfLocalDay(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
function getPresetRange(preset) {
    var today = startOfLocalDay(new Date());
    var fromDate = new Date(today);
    if (preset === 'today') {
        return {
            fromDate: (0, dateUtils_1.toDateInputValue)(today),
            toDate: (0, dateUtils_1.toDateInputValue)(today),
        };
    }
    if (preset === 'last7') {
        fromDate.setDate(today.getDate() - 6);
        return {
            fromDate: (0, dateUtils_1.toDateInputValue)(fromDate),
            toDate: (0, dateUtils_1.toDateInputValue)(today),
        };
    }
    if (preset === 'last30') {
        fromDate.setDate(today.getDate() - 29);
        return {
            fromDate: (0, dateUtils_1.toDateInputValue)(fromDate),
            toDate: (0, dateUtils_1.toDateInputValue)(today),
        };
    }
    if (preset === 'thisMonth') {
        fromDate.setDate(1);
        return {
            fromDate: (0, dateUtils_1.toDateInputValue)(fromDate),
            toDate: (0, dateUtils_1.toDateInputValue)(today),
        };
    }
    return {
        fromDate: '',
        toDate: '',
    };
}
function normalizeKpis(value) {
    return {
        total_loaded: toInteger(value === null || value === void 0 ? void 0 : value.total_loaded, 0),
        total: toInteger(value === null || value === void 0 ? void 0 : value.total, 0),
        eligible: toInteger(value === null || value === void 0 ? void 0 : value.eligible, 0),
        eligible_comp_off_days: toFiniteNumber(value === null || value === void 0 ? void 0 : value.eligible_comp_off_days, 0),
        total_extra_hours: toFiniteNumber(value === null || value === void 0 ? void 0 : value.total_extra_hours, 0),
        expiring_or_expired: toInteger(value === null || value === void 0 ? void 0 : value.expiring_or_expired, 0),
        requested: toInteger(value === null || value === void 0 ? void 0 : value.requested, 0),
        approved: toInteger(value === null || value === void 0 ? void 0 : value.approved, 0),
        rejected: toInteger(value === null || value === void 0 ? void 0 : value.rejected, 0),
        expired: toInteger(value === null || value === void 0 ? void 0 : value.expired, 0),
        utilized: toInteger(value === null || value === void 0 ? void 0 : value.utilized, 0),
        current_month_total: toInteger(value === null || value === void 0 ? void 0 : value.current_month_total, 0),
        previous_month_total: toInteger(value === null || value === void 0 ? void 0 : value.previous_month_total, 0),
    };
}
function normalizePagination(value, fallbackPageSize) {
    var _a, _b;
    var pageSize = Math.min(Math.max(toInteger(value === null || value === void 0 ? void 0 : value.page_size, fallbackPageSize), 1), 100);
    var totalRecords = Math.max(toInteger(value === null || value === void 0 ? void 0 : value.total_records, 0), 0);
    var totalPages = Math.max(toInteger(value === null || value === void 0 ? void 0 : value.total_pages, totalRecords ? Math.ceil(totalRecords / pageSize) : 0), 0);
    var page = Math.min(Math.max(toInteger(value === null || value === void 0 ? void 0 : value.page, 1), 1), Math.max(totalPages, 1));
    return {
        page: page,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_next: Boolean((_a = value === null || value === void 0 ? void 0 : value.has_next) !== null && _a !== void 0 ? _a : (totalPages > 0 && page < totalPages)),
        has_previous: Boolean((_b = value === null || value === void 0 ? void 0 : value.has_previous) !== null && _b !== void 0 ? _b : page > 1),
    };
}
function validateFilters(filters) {
    var pageSize = Number(filters.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        return 'Page size must be a whole number from 1 to 100.';
    }
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
        return 'From date must be on or before to date.';
    }
    return '';
}
function buildUrl(activeFilters, page) {
    var params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(Number(activeFilters.pageSize)));
    var search = activeFilters.search.trim();
    if (search) {
        params.set('search', search);
    }
    if (activeFilters.status) {
        params.set('status', activeFilters.status);
    }
    var empCode = activeFilters.empCode.trim();
    if (empCode) {
        params.set('emp_code', empCode);
    }
    var department = activeFilters.department.trim();
    if (department) {
        params.set('department', department);
    }
    if (activeFilters.fromDate) {
        params.set('from_date', activeFilters.fromDate);
    }
    if (activeFilters.toDate) {
        params.set('to_date', activeFilters.toDate);
    }
    if (activeFilters.sortBy) {
        params.set('sort_by', activeFilters.sortBy);
    }
    if (activeFilters.sortOrder) {
        params.set('sort_order', activeFilters.sortOrder);
    }
    return "/api/admin/overtime-records?".concat(params.toString());
}
function useOvertimeRecordsData(_a) {
    var _this = this;
    var isActive = _a.isActive, accessToken = _a.accessToken, apiRequest = _a.apiRequest;
    var _b = (0, react_1.useState)(DEFAULT_FILTERS), filters = _b[0], setFilters = _b[1];
    var _c = (0, react_1.useState)([]), records = _c[0], setRecords = _c[1];
    var _d = (0, react_1.useState)(EMPTY_KPIS), kpis = _d[0], setKpis = _d[1];
    var _e = (0, react_1.useState)(DEFAULT_FILTER_OPTIONS), filterOptions = _e[0], setFilterOptions = _e[1];
    var _f = (0, react_1.useState)(DEFAULT_PAGINATION), pagination = _f[0], setPagination = _f[1];
    var _g = (0, react_1.useState)(false), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)(false), actionLoading = _h[0], setActionLoading = _h[1];
    var _j = (0, react_1.useState)(''), error = _j[0], setError = _j[1];
    var _k = (0, react_1.useState)(''), actionStatus = _k[0], setActionStatus = _k[1];
    var _l = (0, react_1.useState)(''), validationError = _l[0], setValidationError = _l[1];
    var _m = (0, react_1.useState)(null), lastSyncedAt = _m[0], setLastSyncedAt = _m[1];
    var loadedOnce = (0, react_1.useRef)(false);
    var requestIdRef = (0, react_1.useRef)(0);
    var searchTimerRef = (0, react_1.useRef)(null);
    var fetchData = (0, react_1.useCallback)(function (activeFilters_1, token_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([activeFilters_1, token_1], args_1, true), void 0, function (activeFilters, token, page) {
            var nextValidationError, requestId, response, responseRecords, pageSize, nextPagination, responseStatuses, responseDepartments, err_1;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (page === void 0) { page = 1; }
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        nextValidationError = validateFilters(activeFilters);
                        setValidationError(nextValidationError);
                        if (nextValidationError || !token) {
                            return [2 /*return*/];
                        }
                        requestId = requestIdRef.current + 1;
                        requestIdRef.current = requestId;
                        setLoading(true);
                        setError('');
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, apiRequest(buildUrl(activeFilters, page), {}, token)];
                    case 2:
                        response = _j.sent();
                        if (requestId !== requestIdRef.current) {
                            return [2 /*return*/];
                        }
                        if (!(response === null || response === void 0 ? void 0 : response.success)) {
                            throw new Error((response === null || response === void 0 ? void 0 : response.message) || 'Failed to load overtime records');
                        }
                        responseRecords = Array.isArray((_a = response.data) === null || _a === void 0 ? void 0 : _a.records)
                            ? response.data.records
                            : Array.isArray((_b = response.data) === null || _b === void 0 ? void 0 : _b.overtime_records)
                                ? response.data.overtime_records
                                : [];
                        pageSize = Number(activeFilters.pageSize) || DEFAULT_PAGINATION.page_size;
                        nextPagination = normalizePagination((_c = response.data) === null || _c === void 0 ? void 0 : _c.pagination, pageSize);
                        responseStatuses = Array.isArray((_e = (_d = response.data) === null || _d === void 0 ? void 0 : _d.filter_options) === null || _e === void 0 ? void 0 : _e.statuses)
                            ? response.data.filter_options.statuses
                            : OVERTIME_STATUSES;
                        responseDepartments = Array.isArray((_g = (_f = response.data) === null || _f === void 0 ? void 0 : _f.filter_options) === null || _g === void 0 ? void 0 : _g.departments)
                            ? response.data.filter_options.departments
                            : [];
                        setRecords(responseRecords);
                        setKpis(normalizeKpis((_h = response.data) === null || _h === void 0 ? void 0 : _h.kpis));
                        setPagination(nextPagination);
                        setFilterOptions({
                            departments: responseDepartments,
                            statuses: responseStatuses,
                        });
                        setLastSyncedAt(new Date());
                        return [3 /*break*/, 5];
                    case 3:
                        err_1 = _j.sent();
                        if (requestId !== requestIdRef.current) {
                            return [2 /*return*/];
                        }
                        setError(err_1 instanceof Error ? err_1.message : 'Failed to load overtime records');
                        setRecords([]);
                        setKpis(EMPTY_KPIS);
                        setPagination(__assign(__assign({}, DEFAULT_PAGINATION), { page: page, page_size: Number(activeFilters.pageSize) || DEFAULT_PAGINATION.page_size }));
                        return [3 /*break*/, 5];
                    case 4:
                        if (requestId === requestIdRef.current) {
                            setLoading(false);
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }, [apiRequest]);
    (0, react_1.useEffect)(function () {
        if (isActive && !loadedOnce.current && accessToken) {
            loadedOnce.current = true;
            void fetchData(filters, accessToken, 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, accessToken]);
    (0, react_1.useEffect)(function () {
        return function () {
            if (searchTimerRef.current) {
                window.clearTimeout(searchTimerRef.current);
            }
        };
    }, []);
    var updateFilter = (0, react_1.useCallback)(function (key, value) {
        var _a;
        var nextFilters = __assign(__assign({}, filters), (_a = {}, _a[key] = value, _a));
        if (key === 'empCode') {
            nextFilters.empCode = String(value);
        }
        if (key === 'department') {
            nextFilters.department = String(value);
        }
        if (key === 'fromDate' || key === 'toDate') {
            nextFilters.datePreset = 'custom';
        }
        setFilters(nextFilters);
        setPagination(function (previousPagination) { return (__assign(__assign({}, previousPagination), { page: 1 })); });
        if (searchTimerRef.current) {
            window.clearTimeout(searchTimerRef.current);
        }
        if (key === 'search') {
            searchTimerRef.current = window.setTimeout(function () {
                void fetchData(nextFilters, accessToken, 1);
            }, 350);
            return;
        }
        void fetchData(nextFilters, accessToken, 1);
    }, [accessToken, fetchData, filters]);
    var applyDatePreset = (0, react_1.useCallback)(function (preset) {
        var range = getPresetRange(preset);
        var nextFilters = __assign(__assign({}, filters), { datePreset: preset, fromDate: preset === 'custom' ? filters.fromDate : range.fromDate, toDate: preset === 'custom' ? filters.toDate : range.toDate });
        setFilters(nextFilters);
        setPagination(function (previousPagination) { return (__assign(__assign({}, previousPagination), { page: 1 })); });
        if (preset !== 'custom') {
            void fetchData(nextFilters, accessToken, 1);
        }
    }, [accessToken, fetchData, filters]);
    var changePage = (0, react_1.useCallback)(function (nextPage) {
        var normalizedPage = Math.max(1, nextPage);
        setPagination(function (previousPagination) { return (__assign(__assign({}, previousPagination), { page: normalizedPage })); });
        void fetchData(filters, accessToken, normalizedPage);
    }, [accessToken, fetchData, filters]);
    var setSort = (0, react_1.useCallback)(function (sortBy, sortOrder) {
        var nextFilters = __assign(__assign({}, filters), { sortBy: sortBy, sortOrder: sortOrder });
        setFilters(nextFilters);
        setPagination(function (previousPagination) { return (__assign(__assign({}, previousPagination), { page: 1 })); });
        void fetchData(nextFilters, accessToken, 1);
    }, [accessToken, fetchData, filters]);
    var refresh = (0, react_1.useCallback)(function () {
        void fetchData(filters, accessToken, pagination.page);
    }, [accessToken, fetchData, filters, pagination.page]);
    var clearFilters = (0, react_1.useCallback)(function () {
        setFilters(DEFAULT_FILTERS);
        setPagination(DEFAULT_PAGINATION);
        if (searchTimerRef.current) {
            window.clearTimeout(searchTimerRef.current);
        }
        void fetchData(DEFAULT_FILTERS, accessToken, 1);
    }, [accessToken, fetchData]);
    var runMutation = (0, react_1.useCallback)(function (path_1, options_1, successMessage_1) {
        var args_1 = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args_1[_i - 3] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([path_1, options_1, successMessage_1], args_1, true), void 0, function (path, options, successMessage, refreshPage) {
            var response, err_2, message;
            var _a;
            if (refreshPage === void 0) { refreshPage = pagination.page; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!accessToken) {
                            throw new Error('Admin session is missing. Please log in again.');
                        }
                        setActionLoading(true);
                        setActionStatus('');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, apiRequest(path, options, accessToken)];
                    case 2:
                        response = _b.sent();
                        if (!(response === null || response === void 0 ? void 0 : response.success)) {
                            throw new Error((response === null || response === void 0 ? void 0 : response.message) || successMessage);
                        }
                        setActionStatus(response.message || successMessage);
                        return [4 /*yield*/, fetchData(filters, accessToken, refreshPage)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, (_a = response.data) === null || _a === void 0 ? void 0 : _a.record];
                    case 4:
                        err_2 = _b.sent();
                        message = err_2 instanceof Error ? err_2.message : successMessage;
                        setActionStatus(message);
                        throw err_2;
                    case 5:
                        setActionLoading(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }, [accessToken, apiRequest, fetchData, filters, pagination.page]);
    var createRecord = (0, react_1.useCallback)(function (payload) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            setPagination(function (previousPagination) { return (__assign(__assign({}, previousPagination), { page: 1 })); });
            return [2 /*return*/, runMutation('/api/admin/overtime-records', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }, 'Overtime record created successfully', 1)];
        });
    }); }, [runMutation]);
    var updateRecord = (0, react_1.useCallback)(function (recordId, payload) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, runMutation("/api/admin/overtime-records/".concat(recordId), {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                }, 'Overtime record updated successfully')];
        });
    }); }, [runMutation]);
    var deleteRecord = (0, react_1.useCallback)(function (recordId_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([recordId_1], args_1, true), void 0, function (recordId, force) {
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, runMutation("/api/admin/overtime-records/".concat(recordId).concat(force ? '?force=true' : ''), {
                        method: 'DELETE',
                    }, 'Overtime record deleted successfully')];
            });
        });
    }, [runMutation]);
    var updateStatus = (0, react_1.useCallback)(function (recordId_1, status_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([recordId_1, status_1], args_1, true), void 0, function (recordId, status, remarks) {
            if (remarks === void 0) { remarks = ''; }
            return __generator(this, function (_a) {
                return [2 /*return*/, runMutation("/api/admin/overtime-records/".concat(recordId, "/status"), {
                        method: 'PATCH',
                        body: JSON.stringify({ status: status, remarks: remarks }),
                    }, 'Overtime record status updated successfully')];
            });
        });
    }, [runMutation]);
    var approveRecord = (0, react_1.useCallback)(function (recordId_1, action_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([recordId_1, action_1], args_1, true), void 0, function (recordId, action, remarks) {
            if (remarks === void 0) { remarks = ''; }
            return __generator(this, function (_a) {
                return [2 /*return*/, runMutation("/api/admin/overtime-records/".concat(recordId, "/approval"), {
                        method: 'POST',
                        body: JSON.stringify({ action: action, remarks: remarks }),
                    }, action === 'approved' ? 'Overtime record approved successfully' : 'Overtime record rejected successfully')];
            });
        });
    }, [runMutation]);
    var reset = (0, react_1.useCallback)(function () {
        requestIdRef.current += 1;
        loadedOnce.current = false;
        if (searchTimerRef.current) {
            window.clearTimeout(searchTimerRef.current);
        }
        setFilters(DEFAULT_FILTERS);
        setRecords([]);
        setKpis(EMPTY_KPIS);
        setFilterOptions(DEFAULT_FILTER_OPTIONS);
        setPagination(DEFAULT_PAGINATION);
        setLoading(false);
        setActionLoading(false);
        setError('');
        setActionStatus('');
        setValidationError('');
        setLastSyncedAt(null);
    }, []);
    return {
        filters: filters,
        records: records,
        kpis: kpis,
        filterOptions: filterOptions,
        pagination: pagination,
        loading: loading,
        actionLoading: actionLoading,
        error: error,
        actionStatus: actionStatus,
        validationError: validationError,
        lastSyncedAt: lastSyncedAt,
        updateFilter: updateFilter,
        applyDatePreset: applyDatePreset,
        clearFilters: clearFilters,
        changePage: changePage,
        setSort: setSort,
        refresh: refresh,
        createRecord: createRecord,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        updateStatus: updateStatus,
        approveRecord: approveRecord,
        reset: reset,
    };
}
