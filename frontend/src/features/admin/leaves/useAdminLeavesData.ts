import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AdminLeaveFilterOptions,
  AdminLeaveFilterState,
  AdminLeaveKpis,
  AdminLeavePagination,
  AdminLeaveRecord,
} from '../../../types/admin'

const EMPTY_FILTERS: AdminLeaveFilterState = {
  search: '',
  leaveType: '',
  status: '',
  department: '',
  manager: '',
  fromDate: '',
  toDate: '',
  sortBy: '',
  sortOrder: 'desc',
}

const EMPTY_PAGINATION: AdminLeavePagination = {
  page: 1,
  page_size: 15,
  total_records: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
}

const EMPTY_KPIS: AdminLeaveKpis = {
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
}

const EMPTY_FILTER_OPTIONS: AdminLeaveFilterOptions = {
  departments: [],
  managers: [],
}

const SEARCH_DEBOUNCE_MS = 400

type UseAdminLeavesDataOptions = {
  isActive: boolean
  accessToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
}

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
export function useAdminLeavesData({ isActive, accessToken, apiRequest }: UseAdminLeavesDataOptions) {
  const [filters, setFilters] = useState<AdminLeaveFilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminLeaveRecord[]>([])
  const [kpis, setKpis] = useState<AdminLeaveKpis>(EMPTY_KPIS)
  const [filterOptions, setFilterOptions] = useState<AdminLeaveFilterOptions>(EMPTY_FILTER_OPTIONS)
  const [pagination, setPagination] = useState<AdminLeavePagination>(EMPTY_PAGINATION)
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
    (activeFilters: AdminLeaveFilterState, activePage: number) => {
      const params = new URLSearchParams()
      params.set('page', String(activePage))
      params.set('page_size', '15')
      if (activeFilters.search.trim()) params.set('search', activeFilters.search.trim())
      if (activeFilters.leaveType) params.set('leave_type', activeFilters.leaveType)
      if (activeFilters.status) params.set('status', activeFilters.status)
      if (activeFilters.department.trim()) params.set('department', activeFilters.department.trim())
      if (activeFilters.manager.trim()) params.set('manager_code', activeFilters.manager.trim())
      if (activeFilters.fromDate) params.set('from_date', activeFilters.fromDate)
      if (activeFilters.toDate) params.set('to_date', activeFilters.toDate)
      if (activeFilters.sortBy) params.set('sort_by', activeFilters.sortBy)
      if (activeFilters.sortOrder) params.set('sort_order', activeFilters.sortOrder)
      return `/api/admin/leaves/board?${params.toString()}`
    },
    []
  )

  const fetchData = useCallback(
    async (activeFilters: AdminLeaveFilterState, activePage: number, token: string) => {
      setLoading(true)
      setError('')
      try {
        const url = buildUrl(activeFilters, activePage)
        const response = await apiRequest(url, {}, token)
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to load leave requests')
        }
        const data = response.data ?? {}
        const records = Array.isArray(data.records) ? data.records : []
        const paginationData = data.pagination ?? {}
        const kpiData = data.kpis ?? {}
        const filterData = data.filter_options ?? {}

        setRows(records)
        setKpis({
          ...EMPTY_KPIS,
          ...kpiData,
          daily_trend: Array.isArray(kpiData.daily_trend) ? kpiData.daily_trend : [],
          age_buckets: {
            ...EMPTY_KPIS.age_buckets,
            ...(kpiData.age_buckets ?? {}),
          },
          top_leave_days: Array.isArray(kpiData.top_leave_days) ? kpiData.top_leave_days : [],
        })
        setFilterOptions({
          ...EMPTY_FILTER_OPTIONS,
          ...filterData,
          departments: Array.isArray(filterData.departments) ? filterData.departments : [],
          managers: Array.isArray(filterData.managers) ? filterData.managers : [],
        })
        setPagination({
          ...EMPTY_PAGINATION,
          ...paginationData,
          total_records: paginationData.total_records ?? paginationData.total ?? records.length,
        })
        setLastSyncedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leave requests')
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
    (next: AdminLeaveFilterState) => {
      clearPendingSearchDebounce()
      setFilters(next)
      setPage(1)
      void fetchData(next, 1, accessToken)
    },
    [accessToken, fetchData, clearPendingSearchDebounce]
  )

  const updateFilter = useCallback(
    <K extends keyof AdminLeaveFilterState>(key: K, value: AdminLeaveFilterState[K]) => {
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
    <K extends keyof AdminLeaveFilterState>(key: K, value: AdminLeaveFilterState[K]) => {
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
