import { usePaginatedAdminResource } from '../hooks/usePaginatedAdminResource'
import { API_TELEMETRY_EMP_CODE } from '../config/sidebar'
import type { AdminApiLogFilterState, AdminApiLogRecord, AdminProfile } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

const EMPTY_API_LOG_FILTERS: AdminApiLogFilterState = {
  method: '',
  status: '',
  search: '',
  fromDate: '',
  toDate: '',
}

type UseApiTelemetryPanelOptions = {
  isActive: boolean
  accessToken: string
  profile: AdminProfile | null
  apiRequest: ApiRequest
}

export function useApiTelemetryPanel({ isActive, accessToken, profile, apiRequest }: UseApiTelemetryPanelOptions) {
  const {
    filters: apiLogFilters,
    rows: apiLogRows,
    loading: apiLogLoading,
    error: apiLogError,
    pagination: apiLogPagination,
    setPage: setApiLogPage,
    updateFilter: updateApiLogFilter,
    applyFilters: applyApiLogFilters,
    clearFilters: clearApiLogFilters,
    load: loadApiLogs,
    reset: resetApiTelemetryPanel
  } = usePaginatedAdminResource<AdminApiLogFilterState, AdminApiLogRecord>({
    isActive: isActive && profile?.emp_code === API_TELEMETRY_EMP_CODE,
    accessToken,
    apiRequest,
    emptyFilters: EMPTY_API_LOG_FILTERS,
    defaultPageSize: 25,
    endpoint: '/api/admin/api-logs',
    appendFilterParams: (params, filters) => {
      if (filters.method) {
        params.set('method', filters.method)
      }
      if (filters.status) {
        params.set('status', filters.status)
      }
      if (filters.search.trim()) {
        params.set('search', filters.search.trim())
      }
      if (filters.fromDate) {
        params.set('from_date', filters.fromDate)
      }
      if (filters.toDate) {
        params.set('to_date', filters.toDate)
      }
    },
    loadErrorMessage: 'Failed to load API logs'
  })

  return {
    apiLogFilters,
    apiLogRows,
    apiLogLoading,
    apiLogError,
    apiLogPagination,
    setApiLogPage,
    updateApiLogFilter,
    applyApiLogFilters,
    clearApiLogFilters,
    loadApiLogs,
    resetApiTelemetryPanel
  }
}
