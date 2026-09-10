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
exports.EMPTY_EMPLOYEE_MASTER_FILTERS = void 0;
exports.useEmployeeMasterResource = useEmployeeMasterResource;
var react_1 = require("react");
var DEFAULT_PAGE_SIZE = 15;
var EMPLOYEE_MASTER_REQUEST_TIMEOUT_MS = 30000;
exports.EMPTY_EMPLOYEE_MASTER_FILTERS = {
    search: '',
    status: '',
    pageSize: String(DEFAULT_PAGE_SIZE),
    location: '',
    city: '',
    state: '',
    country: '',
    unitHeadManager: '',
    payrollManager: '',
    payGroupId: '',
    payCycle: '',
    jobLevelGrade: '',
    department: '',
    workingUnit: '',
    parentDepartment: '',
};
var EMPTY_PAGINATION = {
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
};
function cloneEmptyFilters() {
    return __assign({}, exports.EMPTY_EMPLOYEE_MASTER_FILTERS);
}
function getPageSize(filters) {
    var pageSize = Number(filters.pageSize || DEFAULT_PAGE_SIZE);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        return DEFAULT_PAGE_SIZE;
    }
    return pageSize;
}
function buildListUrl(resource, filters, page) {
    var params = new URLSearchParams({
        page: String(page),
        page_size: String(getPageSize(filters)),
    });
    if (filters.search.trim()) {
        params.set('search', filters.search.trim());
    }
    if (filters.status) {
        params.set('status', filters.status);
    }
    resource.filters.forEach(function (filter) {
        var value = String(filters[filter.stateKey] || '').trim();
        if (value) {
            params.set(filter.param, value);
        }
    });
    return "".concat(resource.endpoint, "?").concat(params.toString());
}
function normalizePagination(responseData, records, requestPage, fallbackPageSize) {
    var _a, _b, _c, _d, _e;
    var rawPagination = (typeof responseData.pagination === 'object' && responseData.pagination !== null
        ? responseData.pagination
        : {});
    var pageSize = Number(rawPagination.page_size || fallbackPageSize || DEFAULT_PAGE_SIZE);
    var totalRecords = Number((_b = (_a = rawPagination.total_records) !== null && _a !== void 0 ? _a : responseData.count) !== null && _b !== void 0 ? _b : records.length);
    var totalPages = Number((_c = rawPagination.total_pages) !== null && _c !== void 0 ? _c : (totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0));
    var page = Number(rawPagination.page || requestPage || 1);
    return {
        page: page,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_next: (_d = rawPagination.has_next) !== null && _d !== void 0 ? _d : (totalPages > 0 && page < totalPages),
        has_previous: (_e = rawPagination.has_previous) !== null && _e !== void 0 ? _e : page > 1,
    };
}
function ensureSuccessfulResponse(response, fallbackMessage) {
    var maybeResponse = response;
    if ((maybeResponse === null || maybeResponse === void 0 ? void 0 : maybeResponse.success) === false) {
        throw new Error(maybeResponse.message || fallbackMessage);
    }
}
function getLoadErrorMessage(loadError, fallbackMessage) {
    if (loadError instanceof DOMException &&
        loadError.name === 'AbortError') {
        return 'Request timed out while loading employee master records.';
    }
    return loadError instanceof Error ? loadError.message : fallbackMessage;
}
function useEmployeeMasterResource(_a) {
    var _this = this;
    var isActive = _a.isActive, accessToken = _a.accessToken, apiRequest = _a.apiRequest, resource = _a.resource;
    var _b = (0, react_1.useState)(function () { return cloneEmptyFilters(); }), filters = _b[0], setFilters = _b[1];
    var _c = (0, react_1.useState)(function () { return cloneEmptyFilters(); }), appliedFilters = _c[0], setAppliedFilters = _c[1];
    var _d = (0, react_1.useState)([]), records = _d[0], setRecords = _d[1];
    var _e = (0, react_1.useState)({}), filterOptions = _e[0], setFilterOptions = _e[1];
    var _f = (0, react_1.useState)(EMPTY_PAGINATION), pagination = _f[0], setPagination = _f[1];
    var _g = (0, react_1.useState)(1), page = _g[0], setPage = _g[1];
    var _h = (0, react_1.useState)(false), loading = _h[0], setLoading = _h[1];
    var _j = (0, react_1.useState)(''), error = _j[0], setError = _j[1];
    var _k = (0, react_1.useState)(false), actionLoading = _k[0], setActionLoading = _k[1];
    var _l = (0, react_1.useState)(''), actionStatus = _l[0], setActionStatus = _l[1];
    var _m = (0, react_1.useState)(null), lastSyncedAt = _m[0], setLastSyncedAt = _m[1];
    // apiRequest is rebuilt on every render of the session hook, and `resource`/
    // page/filters change independently of a fetch. Holding them in a ref keeps
    // `load` referentially stable, so the effect below fires only when something
    // that should actually trigger a request changes -- without this the effect
    // re-ran on every render and the page refetched in a loop.
    var latestRef = (0, react_1.useRef)({ apiRequest: apiRequest, resource: resource, page: page, appliedFilters: appliedFilters, accessToken: accessToken, isActive: isActive });
    latestRef.current = { apiRequest: apiRequest, resource: resource, page: page, appliedFilters: appliedFilters, accessToken: accessToken, isActive: isActive };
    /** Cancels a superseded request and lets us ignore its late response. */
    var inFlightRef = (0, react_1.useRef)(null);
    var hasAccessToken = Boolean(accessToken);
    var load = (0, react_1.useCallback)(function (requestPage, requestFilters) { return __awaiter(_this, void 0, void 0, function () {
        var _a, request, activeResource, token, active, targetPage, targetFilters, controller, pending, timeoutId, response, data, nextRecords, loadError_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = latestRef.current, request = _a.apiRequest, activeResource = _a.resource, token = _a.accessToken, active = _a.isActive;
                    if (!token || !active) {
                        return [2 /*return*/];
                    }
                    targetPage = requestPage !== null && requestPage !== void 0 ? requestPage : latestRef.current.page;
                    targetFilters = requestFilters !== null && requestFilters !== void 0 ? requestFilters : latestRef.current.appliedFilters;
                    setLoading(true);
                    setError('');
                    if (inFlightRef.current) {
                        inFlightRef.current.superseded = true;
                        inFlightRef.current.controller.abort();
                    }
                    controller = new AbortController();
                    pending = { controller: controller, superseded: false };
                    inFlightRef.current = pending;
                    timeoutId = window.setTimeout(function () {
                        controller.abort();
                    }, EMPLOYEE_MASTER_REQUEST_TIMEOUT_MS);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, request(buildListUrl(activeResource, targetFilters, targetPage), { signal: controller.signal }, token)];
                case 2:
                    response = _b.sent();
                    ensureSuccessfulResponse(response, "Failed to load ".concat(activeResource.title.toLowerCase()));
                    data = ((response === null || response === void 0 ? void 0 : response.data) || {});
                    nextRecords = Array.isArray(data.records)
                        ? data.records
                        : [];
                    setRecords(nextRecords);
                    setFilterOptions((data.filter_options || {}));
                    setPagination(normalizePagination(data, nextRecords, targetPage, getPageSize(targetFilters)));
                    setLastSyncedAt(new Date());
                    return [3 /*break*/, 5];
                case 3:
                    loadError_1 = _b.sent();
                    if (pending.superseded) {
                        return [2 /*return*/];
                    }
                    setRecords([]);
                    setPagination(__assign(__assign({}, EMPTY_PAGINATION), { page: targetPage, has_previous: targetPage > 1 }));
                    setError(getLoadErrorMessage(loadError_1, "Failed to load ".concat(activeResource.title.toLowerCase())));
                    return [3 /*break*/, 5];
                case 4:
                    window.clearTimeout(timeoutId);
                    if (inFlightRef.current === pending) {
                        inFlightRef.current = null;
                        setLoading(false);
                    }
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, []);
    // Switching resource clears the panel during render rather than in an effect,
    // so the fetch below runs once with the new resource's blank filters instead
    // of firing a stale request first and a corrected one straight after.
    var _o = (0, react_1.useState)(resource.key), activeResourceKey = _o[0], setActiveResourceKey = _o[1];
    if (activeResourceKey !== resource.key) {
        setActiveResourceKey(resource.key);
        setFilters(cloneEmptyFilters());
        setAppliedFilters(cloneEmptyFilters());
        setRecords([]);
        setFilterOptions({});
        setPagination(EMPTY_PAGINATION);
        setPage(1);
        setError('');
        setActionStatus('');
        setLastSyncedAt(null);
    }
    (0, react_1.useEffect)(function () {
        if (!hasAccessToken || !isActive) {
            return;
        }
        void load(page, appliedFilters);
    }, [hasAccessToken, appliedFilters, isActive, load, page, resource.key]);
    var updateFilter = (0, react_1.useCallback)(function (key, value) {
        setFilters(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[key] = value, _a)));
        });
    }, []);
    var applyFilters = (0, react_1.useCallback)(function () {
        setPage(1);
        setAppliedFilters(__assign({}, filters));
        setError('');
    }, [filters]);
    var clearFilters = (0, react_1.useCallback)(function () {
        var nextFilters = cloneEmptyFilters();
        setFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
        setError('');
    }, []);
    var changePage = (0, react_1.useCallback)(function (nextPage) {
        setPage(Math.max(1, nextPage));
    }, []);
    var refresh = (0, react_1.useCallback)(function () {
        void load();
    }, [load]);
    var createRecord = (0, react_1.useCallback)(function (payload) { return __awaiter(_this, void 0, void 0, function () {
        var response, mutationError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setActionLoading(true);
                    setActionStatus("Creating ".concat(resource.singularLabel.toLowerCase(), "..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest(resource.endpoint, {
                            method: 'POST',
                            body: JSON.stringify(payload),
                        }, accessToken)];
                case 2:
                    response = _a.sent();
                    ensureSuccessfulResponse(response, "Failed to create ".concat(resource.singularLabel.toLowerCase()));
                    setActionStatus("".concat(resource.singularLabel, " created."));
                    return [4 /*yield*/, load()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    mutationError_1 = _a.sent();
                    setActionStatus(mutationError_1 instanceof Error
                        ? mutationError_1.message
                        : "Failed to create ".concat(resource.singularLabel.toLowerCase()));
                    throw mutationError_1;
                case 5:
                    setActionLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [accessToken, apiRequest, load, resource]);
    var updateRecord = (0, react_1.useCallback)(function (recordId, payload) { return __awaiter(_this, void 0, void 0, function () {
        var response, mutationError_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setActionLoading(true);
                    setActionStatus("Saving ".concat(resource.singularLabel.toLowerCase(), "..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest("".concat(resource.endpoint, "/").concat(encodeURIComponent(String(recordId))), {
                            // PATCH, not PUT: only the supplied fields are written.
                            method: 'PATCH',
                            body: JSON.stringify(payload),
                        }, accessToken)];
                case 2:
                    response = _a.sent();
                    ensureSuccessfulResponse(response, "Failed to update ".concat(resource.singularLabel.toLowerCase()));
                    setActionStatus("".concat(resource.singularLabel, " updated."));
                    return [4 /*yield*/, load()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    mutationError_2 = _a.sent();
                    setActionStatus(mutationError_2 instanceof Error
                        ? mutationError_2.message
                        : "Failed to update ".concat(resource.singularLabel.toLowerCase()));
                    throw mutationError_2;
                case 5:
                    setActionLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [accessToken, apiRequest, load, resource]);
    var deleteRecord = (0, react_1.useCallback)(function (recordId) { return __awaiter(_this, void 0, void 0, function () {
        var response, nextPage, mutationError_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setActionLoading(true);
                    setActionStatus("Deleting ".concat(resource.singularLabel.toLowerCase(), "..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest("".concat(resource.endpoint, "/").concat(encodeURIComponent(String(recordId))), { method: 'DELETE' }, accessToken)];
                case 2:
                    response = _a.sent();
                    ensureSuccessfulResponse(response, "Failed to delete ".concat(resource.singularLabel.toLowerCase()));
                    setActionStatus("".concat(resource.singularLabel, " deleted."));
                    nextPage = records.length === 1 && page > 1 ? page - 1 : page;
                    if (nextPage !== page) {
                        setPage(nextPage);
                    }
                    return [4 /*yield*/, load(nextPage)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    mutationError_3 = _a.sent();
                    setActionStatus(mutationError_3 instanceof Error
                        ? mutationError_3.message
                        : "Failed to delete ".concat(resource.singularLabel.toLowerCase()));
                    throw mutationError_3;
                case 5:
                    setActionLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [accessToken, apiRequest, load, page, records.length, resource]);
    var reset = (0, react_1.useCallback)(function () {
        setFilters(cloneEmptyFilters());
        setAppliedFilters(cloneEmptyFilters());
        setRecords([]);
        setFilterOptions({});
        setPagination(EMPTY_PAGINATION);
        setPage(1);
        setError('');
        setActionLoading(false);
        setActionStatus('');
        setLastSyncedAt(null);
    }, []);
    return {
        filters: filters,
        /** What the current rows were actually fetched with (not the draft form). */
        appliedFilters: appliedFilters,
        records: records,
        filterOptions: filterOptions,
        pagination: pagination,
        loading: loading,
        error: error,
        actionLoading: actionLoading,
        actionStatus: actionStatus,
        lastSyncedAt: lastSyncedAt,
        updateFilter: updateFilter,
        applyFilters: applyFilters,
        clearFilters: clearFilters,
        changePage: changePage,
        refresh: refresh,
        createRecord: createRecord,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        reset: reset,
    };
}
