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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdminLeavesData = useAdminLeavesData;
var react_1 = require("react");
var EMPTY_FILTERS = {
    search: '',
    leaveType: '',
    status: '',
    department: '',
    manager: '',
    fromDate: '',
    toDate: '',
    sortBy: '',
    sortOrder: 'desc',
};
var EMPTY_PAGINATION = {
    page: 1,
    page_size: 15,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
};
var EMPTY_KPIS = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    current_month_total: 0,
    previous_month_total: 0,
    oldest_pending_days: null,
    pending_employee_count: 0,
    daily_trend: [],
    age_buckets: { under_7: 0, d7_30: 0, d30_90: 0, over_90: 0 },
    top_leave_days: [],
};
var EMPTY_FILTER_OPTIONS = {
    departments: [],
    managers: [],
};
var SEARCH_DEBOUNCE_MS = 400;
/**
 * Dedicated, separate hook for the redesigned admin Leaves board
 * (GET /api/admin/leaves/board). Distinct from useLeavesPanel, whose
 * `leaveRows` state also backs unrelated dashboard panels elsewhere in
 * FawnixApp.tsx — that hook and its route are left untouched.
 *
 * Every filter change (except free-text search, which is debounced)
 * applies immediately against the backend, mirroring the attendance
 * exceptions board.
 */
function useAdminLeavesData(_a) {
    var _this = this;
    var isActive = _a.isActive, accessToken = _a.accessToken, apiRequest = _a.apiRequest;
    var _b = (0, react_1.useState)(EMPTY_FILTERS), filters = _b[0], setFilters = _b[1];
    var _c = (0, react_1.useState)(1), page = _c[0], setPage = _c[1];
    var _d = (0, react_1.useState)([]), rows = _d[0], setRows = _d[1];
    var _e = (0, react_1.useState)(EMPTY_KPIS), kpis = _e[0], setKpis = _e[1];
    var _f = (0, react_1.useState)(EMPTY_FILTER_OPTIONS), filterOptions = _f[0], setFilterOptions = _f[1];
    var _g = (0, react_1.useState)(EMPTY_PAGINATION), pagination = _g[0], setPagination = _g[1];
    var _h = (0, react_1.useState)(false), loading = _h[0], setLoading = _h[1];
    var _j = (0, react_1.useState)(''), error = _j[0], setError = _j[1];
    var _k = (0, react_1.useState)(null), lastSyncedAt = _k[0], setLastSyncedAt = _k[1];
    var loadedOnce = (0, react_1.useRef)(false);
    var searchDebounceRef = (0, react_1.useRef)(null);
    var clearPendingSearchDebounce = (0, react_1.useCallback)(function () {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
    }, []);
    var buildUrl = (0, react_1.useCallback)(function (activeFilters, activePage) {
        var params = new URLSearchParams();
        params.set('page', String(activePage));
        params.set('page_size', '15');
        if (activeFilters.search.trim())
            params.set('search', activeFilters.search.trim());
        if (activeFilters.leaveType)
            params.set('leave_type', activeFilters.leaveType);
        if (activeFilters.status)
            params.set('status', activeFilters.status);
        if (activeFilters.department.trim())
            params.set('department', activeFilters.department.trim());
        if (activeFilters.manager.trim())
            params.set('manager_code', activeFilters.manager.trim());
        if (activeFilters.fromDate)
            params.set('from_date', activeFilters.fromDate);
        if (activeFilters.toDate)
            params.set('to_date', activeFilters.toDate);
        if (activeFilters.sortBy)
            params.set('sort_by', activeFilters.sortBy);
        if (activeFilters.sortOrder)
            params.set('sort_order', activeFilters.sortOrder);
        return "/api/admin/leaves/board?".concat(params.toString());
    }, []);
    var fetchData = (0, react_1.useCallback)(function (activeFilters, activePage, token) { return __awaiter(_this, void 0, void 0, function () {
        var url, response, data, records, paginationData, kpiData, filterData, err_1;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    setLoading(true);
                    setError('');
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 3, 4, 5]);
                    url = buildUrl(activeFilters, activePage);
                    return [4 /*yield*/, apiRequest(url, {}, token)];
                case 2:
                    response = _h.sent();
                    if (!(response === null || response === void 0 ? void 0 : response.success)) {
                        throw new Error((response === null || response === void 0 ? void 0 : response.message) || 'Failed to load leave requests');
                    }
                    data = (_a = response.data) !== null && _a !== void 0 ? _a : {};
                    records = Array.isArray(data.records) ? data.records : [];
                    paginationData = (_b = data.pagination) !== null && _b !== void 0 ? _b : {};
                    kpiData = (_c = data.kpis) !== null && _c !== void 0 ? _c : {};
                    filterData = (_d = data.filter_options) !== null && _d !== void 0 ? _d : {};
                    setRows(records);
                    setKpis(__assign(__assign(__assign({}, EMPTY_KPIS), kpiData), { daily_trend: Array.isArray(kpiData.daily_trend) ? kpiData.daily_trend : [], age_buckets: __assign(__assign({}, EMPTY_KPIS.age_buckets), ((_e = kpiData.age_buckets) !== null && _e !== void 0 ? _e : {})), top_leave_days: Array.isArray(kpiData.top_leave_days) ? kpiData.top_leave_days : [] }));
                    setFilterOptions(__assign(__assign(__assign({}, EMPTY_FILTER_OPTIONS), filterData), { departments: Array.isArray(filterData.departments) ? filterData.departments : [], managers: Array.isArray(filterData.managers) ? filterData.managers : [] }));
                    setPagination(__assign(__assign(__assign({}, EMPTY_PAGINATION), paginationData), { total_records: (_g = (_f = paginationData.total_records) !== null && _f !== void 0 ? _f : paginationData.total) !== null && _g !== void 0 ? _g : records.length }));
                    setLastSyncedAt(new Date());
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _h.sent();
                    setError(err_1 instanceof Error ? err_1.message : 'Failed to load leave requests');
                    setRows([]);
                    setKpis(EMPTY_KPIS);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [apiRequest, buildUrl]);
    (0, react_1.useEffect)(function () {
        if (isActive && !loadedOnce.current && accessToken) {
            loadedOnce.current = true;
            void fetchData(filters, page, accessToken);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, accessToken]);
    (0, react_1.useEffect)(function () { return clearPendingSearchDebounce; }, [clearPendingSearchDebounce]);
    var applyImmediate = (0, react_1.useCallback)(function (next) {
        clearPendingSearchDebounce();
        setFilters(next);
        setPage(1);
        void fetchData(next, 1, accessToken);
    }, [accessToken, fetchData, clearPendingSearchDebounce]);
    var updateFilter = (0, react_1.useCallback)(function (key, value) {
        var _a;
        if (key === 'search') {
            var next_1 = __assign(__assign({}, filters), { search: value });
            setFilters(next_1);
            clearPendingSearchDebounce();
            searchDebounceRef.current = setTimeout(function () {
                setPage(1);
                void fetchData(next_1, 1, accessToken);
            }, SEARCH_DEBOUNCE_MS);
            return;
        }
        applyImmediate(__assign(__assign({}, filters), (_a = {}, _a[key] = value, _a)));
    }, [filters, accessToken, fetchData, applyImmediate, clearPendingSearchDebounce]);
    var setSort = (0, react_1.useCallback)(function (sortBy, sortOrder) {
        applyImmediate(__assign(__assign({}, filters), { sortBy: sortBy, sortOrder: sortOrder }));
    }, [filters, applyImmediate]);
    var clearFilters = (0, react_1.useCallback)(function () {
        applyImmediate(EMPTY_FILTERS);
    }, [applyImmediate]);
    var changePage = (0, react_1.useCallback)(function (nextPage) {
        setPage(nextPage);
        void fetchData(filters, nextPage, accessToken);
    }, [filters, accessToken, fetchData]);
    var refresh = (0, react_1.useCallback)(function () {
        void fetchData(filters, page, accessToken);
    }, [filters, page, accessToken, fetchData]);
    var applyPreset = (0, react_1.useCallback)(function (key, value) {
        var _a;
        applyImmediate(__assign(__assign({}, filters), (_a = {}, _a[key] = value, _a)));
    }, [filters, applyImmediate]);
    var reset = (0, react_1.useCallback)(function () {
        clearPendingSearchDebounce();
        setFilters(EMPTY_FILTERS);
        setPage(1);
        setRows([]);
        setKpis(EMPTY_KPIS);
        setFilterOptions(EMPTY_FILTER_OPTIONS);
        setPagination(EMPTY_PAGINATION);
        setError('');
        setLastSyncedAt(null);
        loadedOnce.current = false;
    }, [clearPendingSearchDebounce]);
    return {
        filters: filters,
        rows: rows,
        kpis: kpis,
        filterOptions: filterOptions,
        pagination: pagination,
        loading: loading,
        error: error,
        page: page,
        lastSyncedAt: lastSyncedAt,
        clearFilters: clearFilters,
        changePage: changePage,
        refresh: refresh,
        setSort: setSort,
        updateFilter: updateFilter,
        applyPreset: applyPreset,
        reset: reset,
    };
}
