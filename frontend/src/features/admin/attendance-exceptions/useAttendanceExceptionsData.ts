import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AdminAttendanceExceptionFilterOptions,
  AdminAttendanceExceptionFilterState,
  AdminAttendanceExceptionKpis,
  AdminAttendanceExceptionPagination,
  AdminAttendanceExceptionRecord,
} from '../../../types/admin'

const EMPTY_FILTERS: AdminAttendanceExceptionFilterState = {
  search: '',
  exceptionType: '',
  status: '',
  department: '',
  fromDate: '',
  toDate: '',
  sortBy: '',
  sortOrder: 'desc',
}

const EMPTY_PAGINATION: AdminAttendanceExceptionPagination = {
  page: 1,
  page_size: 15,
  total_records: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
}

const EMPTY_KPIS: AdminAttendanceExceptionKpis = {
  total: 0,
  pending: 0,
  early_leave: 0,
  late_arrival: 0,
  approved: 0,
  rejected: 0,
  current_month_total: 0,
  previous_month_total: 0,
  oldest_pending_days: null,
  daily_trend: [],
  repeat_offenders: { employee_count: 0, exception_count: 0 },
  top_short_hours: [],
}

const EMPTY_FILTER_OPTIONS: AdminAttendanceExceptionFilterOptions = {
  departments: [],
}

const SEARCH_DEBOUNCE_MS = 400

type UseAttendanceExceptionsDataOptions = {
  isActive: boolean
  accessToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
}

/**
 * Every filter change (except free-text search, which is debounced) applies
 * immediately against the backend — there is no separate "Apply Filters"
 * step. Search is debounced locally before it triggers its own fetch so
 * keystrokes don't each cost a round trip.
 */
export function useAttendanceExceptionsData({
  isActive,
  accessToken,
  apiRequest,
}: UseAttendanceExceptionsDataOptions) {
  const [filters, setFilters] = useState<AdminAttendanceExceptionFilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminAttendanceExceptionRecord[]>([])
  const [kpis, setKpis] = useState<AdminAttendanceExceptionKpis>(EMPTY_KPIS)
  const [filterOptions, setFilterOptions] = useState<AdminAttendanceExceptionFilterOptions>(EMPTY_FILTER_OPTIONS)
  const [pagination, setPagination] = useState<AdminAttendanceExceptionPagination>(EMPTY_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const loadedOnce = useRef(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingSearchDebounce = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
  }, [])

  const buildUrl = useCallback(
    (activeFilters: AdminAttendanceExceptionFilterState, activePage: number) => {
      const params = new URLSearchParams()
      params.set('page', String(activePage))
      params.set('page_size', '15')
      if (activeFilters.search.trim()) params.set('search', activeFilters.search.trim())
      if (activeFilters.exceptionType) params.set('type', activeFilters.exceptionType)
      if (activeFilters.status) params.set('status', activeFilters.status)
      if (activeFilters.department.trim()) params.set('department', activeFilters.department.trim())
      if (activeFilters.fromDate) params.set('from_date', activeFilters.fromDate)
      if (activeFilters.toDate) params.set('to_date', activeFilters.toDate)
      if (activeFilters.sortBy) params.set('sort_by', activeFilters.sortBy)
      if (activeFilters.sortOrder) params.set('sort_order', activeFilters.sortOrder)
      return `/api/admin/attendance-exceptions?${params.toString()}`
    },
    []
  )

  const fetchData = useCallback(
    async (
      activeFilters: AdminAttendanceExceptionFilterState,
      activePage: number,
      token: string
    ) => {
      setLoading(true)
      setError('')
      try {
        const url = buildUrl(activeFilters, activePage)
        const response = await apiRequest(url, {}, token)
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to load attendance exceptions')
        }
        const data = response.data ?? {}
        const records = Array.isArray(data.records) ? data.records : []
        const paginationData = data.pagination ?? {}
        const kpiData = data.kpis ?? {}

        setRows(records)
        setKpis({
          ...EMPTY_KPIS,
          ...kpiData,
          daily_trend: Array.isArray(kpiData.daily_trend) ? kpiData.daily_trend : [],
          repeat_offenders: {
            ...EMPTY_KPIS.repeat_offenders,
            ...(kpiData.repeat_offenders ?? {}),
          },
          top_short_hours: Array.isArray(kpiData.top_short_hours) ? kpiData.top_short_hours : [],
        })
        setFilterOptions({
          ...EMPTY_FILTER_OPTIONS,
          ...(data.filter_options ?? {}),
          departments: Array.isArray(data.filter_options?.departments)
            ? data.filter_options.departments
            : [],
        })
        setPagination({
          ...EMPTY_PAGINATION,
          ...paginationData,
          total_records: paginationData.total_records ?? paginationData.total ?? records.length,
        })
        setLastSyncedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance exceptions')
        setRows([])
        setKpis(EMPTY_KPIS)
      } finally {
        setLoading(false)
      }
    },
    [apiRequest, buildUrl]
  )

  useEffect(() => {
    if (isActive && !loadedOnce.current && accessToken) {
      loadedOnce.current = true
      void fetchData(filters, page, accessToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, accessToken])

  useEffect(() => clearPendingSearchDebounce, [clearPendingSearchDebounce])

  const applyImmediate = useCallback(
    (next: AdminAttendanceExceptionFilterState) => {
      clearPendingSearchDebounce()
      setFilters(next)
      setPage(1)
      void fetchData(next, 1, accessToken)
    },
    [accessToken, fetchData, clearPendingSearchDebounce]
  )

  const updateFilter = useCallback(
    <K extends keyof AdminAttendanceExceptionFilterState>(
      key: K,
      value: AdminAttendanceExceptionFilterState[K]
    ) => {
      if (key === 'search') {
        const next = { ...filters, search: value as string }
        setFilters(next)
        clearPendingSearchDebounce()
        searchDebounceRef.current = setTimeout(() => {
          setPage(1)
          void fetchData(next, 1, accessToken)
        }, SEARCH_DEBOUNCE_MS)
        return
      }
      applyImmediate({ ...filters, [key]: value })
    },
    [filters, accessToken, fetchData, applyImmediate, clearPendingSearchDebounce]
  )

  const setSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      applyImmediate({ ...filters, sortBy, sortOrder })
    },
    [filters, applyImmediate]
  )

  const clearFilters = useCallback(() => {
    applyImmediate(EMPTY_FILTERS)
  }, [applyImmediate])

  const changePage = useCallback(
    (nextPage: number) => {
      setPage(nextPage)
      void fetchData(filters, nextPage, accessToken)
    },
    [filters, accessToken, fetchData]
  )

  const refresh = useCallback(() => {
    void fetchData(filters, page, accessToken)
  }, [filters, page, accessToken, fetchData])

  const applyPreset = useCallback(
    <K extends keyof AdminAttendanceExceptionFilterState>(
      key: K,
      value: AdminAttendanceExceptionFilterState[K]
    ) => {
      applyImmediate({ ...filters, [key]: value })
    },
    [filters, applyImmediate]
  )

  const reset = useCallback(() => {
    clearPendingSearchDebounce()
    setFilters(EMPTY_FILTERS)
    setPage(1)
    setRows([])
    setKpis(EMPTY_KPIS)
    setFilterOptions(EMPTY_FILTER_OPTIONS)
    setPagination(EMPTY_PAGINATION)
    setError('')
    setLastSyncedAt(null)
    loadedOnce.current = false
  }, [clearPendingSearchDebounce])

  return {
    filters,
    rows,
    kpis,
    filterOptions,
    pagination,
    loading,
    error,
    page,
    lastSyncedAt,
    clearFilters,
    changePage,
    refresh,
    setSort,
    updateFilter,
    applyPreset,
    reset,
  }
}
