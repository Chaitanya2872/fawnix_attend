"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApiTelemetryPanel = useApiTelemetryPanel;
var usePaginatedAdminResource_1 = require("../hooks/usePaginatedAdminResource");
var sidebar_1 = require("../config/sidebar");
var EMPTY_API_LOG_FILTERS = {
    method: '',
    status: '',
    search: '',
    fromDate: '',
    toDate: '',
};
function useApiTelemetryPanel(_a) {
    var isActive = _a.isActive, accessToken = _a.accessToken, profile = _a.profile, apiRequest = _a.apiRequest;
    var _b = (0, usePaginatedAdminResource_1.usePaginatedAdminResource)({
        isActive: isActive && (profile === null || profile === void 0 ? void 0 : profile.emp_code) === sidebar_1.API_TELEMETRY_EMP_CODE,
        accessToken: accessToken,
        apiRequest: apiRequest,
        emptyFilters: EMPTY_API_LOG_FILTERS,
        defaultPageSize: 25,
        endpoint: '/api/admin/api-logs',
        appendFilterParams: function (params, filters) {
            if (filters.method) {
                params.set('method', filters.method);
            }
            if (filters.status) {
                params.set('status', filters.status);
            }
            if (filters.search.trim()) {
                params.set('search', filters.search.trim());
            }
            if (filters.fromDate) {
                params.set('from_date', filters.fromDate);
            }
            if (filters.toDate) {
                params.set('to_date', filters.toDate);
            }
        },
        loadErrorMessage: 'Failed to load API logs'
    }), apiLogFilters = _b.filters, apiLogRows = _b.rows, apiLogLoading = _b.loading, apiLogError = _b.error, apiLogPagination = _b.pagination, setApiLogPage = _b.setPage, updateApiLogFilter = _b.updateFilter, applyApiLogFilters = _b.applyFilters, clearApiLogFilters = _b.clearFilters, loadApiLogs = _b.load, resetApiTelemetryPanel = _b.reset;
    return {
        apiLogFilters: apiLogFilters,
        apiLogRows: apiLogRows,
        apiLogLoading: apiLogLoading,
        apiLogError: apiLogError,
        apiLogPagination: apiLogPagination,
        setApiLogPage: setApiLogPage,
        updateApiLogFilter: updateApiLogFilter,
        applyApiLogFilters: applyApiLogFilters,
        clearApiLogFilters: clearApiLogFilters,
        loadApiLogs: loadApiLogs,
        resetApiTelemetryPanel: resetApiTelemetryPanel
    };
}
