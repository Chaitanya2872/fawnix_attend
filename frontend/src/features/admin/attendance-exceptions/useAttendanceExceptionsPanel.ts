import { usePaginatedAdminResource } from '../hooks/usePaginatedAdminResource'
import type { AdminAttendanceExceptionFilterState, AdminAttendanceExceptionRecord } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

const EMPTY_ATTENDANCE_EXCEPTION_FILTERS: AdminAttendanceExceptionFilterState = {
  search: '',
  exceptionType: '',
  status: '',
  fromDate: '',
  toDate: '',
}

type UseAttendanceExceptionsPanelOptions = {
  isActive: boolean
  accessToken: string
  apiRequest: ApiRequest
}

export function useAttendanceExceptionsPanel({ isActive, accessToken, apiRequest }: UseAttendanceExceptionsPanelOptions) {
  const {
    filters: attendanceExceptionFilters,
    rows: attendanceExceptionRows,
    loading: attendanceExceptionLoading,
    error: attendanceExceptionError,
    page: attendanceExceptionPage,
    setPage: setAttendanceExceptionPage,
    pagination: attendanceExceptionPagination,
    updateFilter: updateAttendanceExceptionFilter,
    applyFilters: applyAttendanceExceptionFilters,
    clearFilters: clearAttendanceExceptionFilters,
    load: loadAttendanceExceptions,
    reset: resetAttendanceExceptionsPanel
  } = usePaginatedAdminResource<AdminAttendanceExceptionFilterState, AdminAttendanceExceptionRecord>({
    isActive,
    accessToken,
    apiRequest,
    emptyFilters: EMPTY_ATTENDANCE_EXCEPTION_FILTERS,
    defaultPageSize: 10,
    endpoint: '/api/admin/attendance-exceptions',
    appendFilterParams: (params, filters) => {
      if (filters.search.trim()) {
        params.set('search', filters.search.trim())
      }
      if (filters.exceptionType) {
        params.set('type', filters.exceptionType)
      }
      if (filters.status) {
        params.set('status', filters.status)
      }
      if (filters.fromDate) {
        params.set('from_date', filters.fromDate)
      }
      if (filters.toDate) {
        params.set('to_date', filters.toDate)
      }
    },
    loadErrorMessage: 'Failed to load attendance exception records'
  })

  return {
    attendanceExceptionFilters,
    attendanceExceptionRows,
    attendanceExceptionLoading,
    attendanceExceptionError,
    attendanceExceptionPage,
    setAttendanceExceptionPage,
    attendanceExceptionPagination,
    updateAttendanceExceptionFilter,
    applyAttendanceExceptionFilters,
    clearAttendanceExceptionFilters,
    loadAttendanceExceptions,
    resetAttendanceExceptionsPanel
  }
}
