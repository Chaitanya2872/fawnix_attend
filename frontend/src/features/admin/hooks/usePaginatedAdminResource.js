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
exports.usePaginatedAdminResource = usePaginatedAdminResource;
var react_1 = require("react");
// Shared by any admin panel with the filters + applied-filters + paginated-rows shape
// (attendance exceptions, API telemetry). Extracted once the two were confirmed to be
// the same hook, twice - see Phase 4 audit.
function usePaginatedAdminResource(_a) {
    var _this = this;
    var isActive = _a.isActive, accessToken = _a.accessToken, apiRequest = _a.apiRequest, emptyFilters = _a.emptyFilters, defaultPageSize = _a.defaultPageSize, endpoint = _a.endpoint, appendFilterParams = _a.appendFilterParams, loadErrorMessage = _a.loadErrorMessage;
    var _b = (0, react_1.useState)(__assign({}, emptyFilters)), filters = _b[0], setFilters = _b[1];
    var _c = (0, react_1.useState)(__assign({}, emptyFilters)), appliedFilters = _c[0], setAppliedFilters = _c[1];
    var _d = (0, react_1.useState)([]), rows = _d[0], setRows = _d[1];
    var _e = (0, react_1.useState)(false), loading = _e[0], setLoading = _e[1];
    var _f = (0, react_1.useState)(''), error = _f[0], setError = _f[1];
    var _g = (0, react_1.useState)(1), page = _g[0], setPage = _g[1];
    var _h = (0, react_1.useState)({
        page: 1,
        page_size: defaultPageSize,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
    }), pagination = _h[0], setPagination = _h[1];
    var updateFilter = function (key, value) {
        setFilters(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[key] = value, _a)));
        });
    };
    var applyFilters = function () {
        setPage(1);
        setError('');
        setAppliedFilters(__assign({}, filters));
    };
    var clearFilters = function () {
        setFilters(__assign({}, emptyFilters));
        setAppliedFilters(__assign({}, emptyFilters));
        setPage(1);
        setError('');
    };
    var load = function (token_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([token_1], args_1, true), void 0, function (token, requestPage, requestFilters) {
            var params, response, records, nextPagination, loadError_1;
            var _a, _b;
            if (requestPage === void 0) { requestPage = page; }
            if (requestFilters === void 0) { requestFilters = appliedFilters; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        setLoading(true);
                        setError('');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, 4, 5]);
                        params = new URLSearchParams({
                            page: String(requestPage),
                            page_size: String(pagination.page_size || defaultPageSize),
                        });
                        appendFilterParams(params, requestFilters);
                        return [4 /*yield*/, apiRequest("".concat(endpoint, "?").concat(params.toString()), {}, token)];
                    case 2:
                        response = _c.sent();
                        records = Array.isArray((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.records)
                            ? response.data.records
                            : [];
                        nextPagination = ((_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.pagination) || {};
                        setRows(records);
                        setPagination({
                            page: Number(nextPagination.page || requestPage || 1),
                            page_size: Number(nextPagination.page_size || pagination.page_size || defaultPageSize),
                            total_records: Number(nextPagination.total_records || 0),
                            total_pages: Number(nextPagination.total_pages || 0),
                            has_next: Boolean(nextPagination.has_next),
                            has_previous: Boolean(nextPagination.has_previous),
                        });
                        return [3 /*break*/, 5];
                    case 3:
                        loadError_1 = _c.sent();
                        setRows([]);
                        setPagination(function (current) { return (__assign(__assign({}, current), { page: requestPage, total_records: 0, total_pages: 0, has_next: false, has_previous: requestPage > 1 })); });
                        setError(loadError_1 instanceof Error ? loadError_1.message : loadErrorMessage);
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    (0, react_1.useEffect)(function () {
        if (!accessToken || !isActive) {
            return;
        }
        void load(accessToken, page, appliedFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, isActive, page, appliedFilters]);
    var reset = function () {
        setFilters(__assign({}, emptyFilters));
        setAppliedFilters(__assign({}, emptyFilters));
        setRows([]);
        setError('');
        setPage(1);
        setPagination({
            page: 1,
            page_size: defaultPageSize,
            total_records: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false
        });
    };
    return {
        filters: filters,
        rows: rows,
        loading: loading,
        error: error,
        page: page,
        setPage: setPage,
        pagination: pagination,
        updateFilter: updateFilter,
        applyFilters: applyFilters,
        clearFilters: clearFilters,
        load: load,
        reset: reset
    };
}
