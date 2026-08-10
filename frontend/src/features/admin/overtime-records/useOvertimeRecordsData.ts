import { useCallback, useEffect, useRef, useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import type {
  AdminOvertimeDatePreset,
  AdminOvertimeFilterOptions,
  AdminOvertimeFilterState,
  AdminOvertimeKpis,
  AdminOvertimeMutationPayload,
  AdminOvertimePagination,
  AdminOvertimeRecord,
  AdminOvertimeStatus,
} from '../../../types/admin'

const OVERTIME_STATUSES: AdminOvertimeStatus[] = [
  'eligible',
  'requested',
  'approved',
  'rejected',
  'expired',
  'utilized',
]

const DEFAULT_FILTERS: AdminOvertimeFilterState = {
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
}

const DEFAULT_PAGINATION: AdminOvertimePagination = {
  page: 1,
  page_size: 15,
  total_records: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
}

const DEFAULT_FILTER_OPTIONS: AdminOvertimeFilterOptions = {
  departments: [],
  statuses: OVERTIME_STATUSES,
}

const EMPTY_KPIS: AdminOvertimeKpis = {
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
}

type UseOvertimeRecordsDataOptions = {
  isActive: boolean
  accessToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toInteger(value: unknown, fallback = 0) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) ? numericValue : fallback
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getPresetRange(preset: AdminOvertimeDatePreset) {
  const today = startOfLocalDay(new Date())
  const fromDate = new Date(today)

  if (preset === 'today') {
    return {
      fromDate: toDateInputValue(today),
      toDate: toDateInputValue(today),
    }
  }

  if (preset === 'last7') {
    fromDate.setDate(today.getDate() - 6)
    return {
      fromDate: toDateInputValue(fromDate),
      toDate: toDateInputValue(today),
    }
  }

  if (preset === 'last30') {
    fromDate.setDate(today.getDate() - 29)
    return {
      fromDate: toDateInputValue(fromDate),
      toDate: toDateInputValue(today),
    }
  }

  if (preset === 'thisMonth') {
    fromDate.setDate(1)
    return {
      fromDate: toDateInputValue(fromDate),
      toDate: toDateInputValue(today),
    }
  }

  return {
    fromDate: '',
    toDate: '',
  }
}

function normalizeKpis(value: Partial<AdminOvertimeKpis> | undefined): AdminOvertimeKpis {
  return {
    total_loaded: toInteger(value?.total_loaded, 0),
    total: toInteger(value?.total, 0),
    eligible: toInteger(value?.eligible, 0),
    eligible_comp_off_days: toFiniteNumber(value?.eligible_comp_off_days, 0),
    total_extra_hours: toFiniteNumber(value?.total_extra_hours, 0),
    expiring_or_expired: toInteger(value?.expiring_or_expired, 0),
    requested: toInteger(value?.requested, 0),
    approved: toInteger(value?.approved, 0),
    rejected: toInteger(value?.rejected, 0),
    expired: toInteger(value?.expired, 0),
    utilized: toInteger(value?.utilized, 0),
    current_month_total: toInteger(value?.current_month_total, 0),
    previous_month_total: toInteger(value?.previous_month_total, 0),
  }
}

function normalizePagination(value: Partial<AdminOvertimePagination> | undefined, fallbackPageSize: number) {
  const pageSize = Math.min(Math.max(toInteger(value?.page_size, fallbackPageSize), 1), 100)
  const totalRecords = Math.max(toInteger(value?.total_records, 0), 0)
  const totalPages = Math.max(toInteger(value?.total_pages, totalRecords ? Math.ceil(totalRecords / pageSize) : 0), 0)
  const page = Math.min(Math.max(toInteger(value?.page, 1), 1), Math.max(totalPages, 1))

  return {
    page,
    page_size: pageSize,
    total_records: totalRecords,
    total_pages: totalPages,
    has_next: Boolean(value?.has_next ?? (totalPages > 0 && page < totalPages)),
    has_previous: Boolean(value?.has_previous ?? page > 1),
  }
}

function validateFilters(filters: AdminOvertimeFilterState) {
  const pageSize = Number(filters.pageSize)
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return 'Page size must be a whole number from 1 to 100.'
  }

  if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
    return 'From date must be on or before to date.'
  }

  return ''
}

function buildUrl(activeFilters: AdminOvertimeFilterState, page: number) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(Number(activeFilters.pageSize)))

  const search = activeFilters.search.trim()
  if (search) {
    params.set('search', search)
  }

  if (activeFilters.status) {
    params.set('status', activeFilters.status)
  }

  const empCode = activeFilters.empCode.trim()
  if (empCode) {
    params.set('emp_code', empCode)
  }

  const department = activeFilters.department.trim()
  if (department) {
    params.set('department', department)
  }

  if (activeFilters.fromDate) {
    params.set('from_date', activeFilters.fromDate)
  }

  if (activeFilters.toDate) {
    params.set('to_date', activeFilters.toDate)
  }

  if (activeFilters.sortBy) {
    params.set('sort_by', activeFilters.sortBy)
  }

  if (activeFilters.sortOrder) {
    params.set('sort_order', activeFilters.sortOrder)
  }

  return `/api/admin/overtime-records?${params.toString()}`
}

export function useOvertimeRecordsData({
  isActive,
  accessToken,
  apiRequest,
}: UseOvertimeRecordsDataOptions) {
  const [filters, setFilters] = useState<AdminOvertimeFilterState>(DEFAULT_FILTERS)
  const [records, setRecords] = useState<AdminOvertimeRecord[]>([])
  const [kpis, setKpis] = useState<AdminOvertimeKpis>(EMPTY_KPIS)
  const [filterOptions, setFilterOptions] = useState<AdminOvertimeFilterOptions>(DEFAULT_FILTER_OPTIONS)
  const [pagination, setPagination] = useState<AdminOvertimePagination>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionStatus, setActionStatus] = useState('')
  const [validationError, setValidationError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const loadedOnce = useRef(false)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef<number | null>(null)

  const fetchData = useCallback(
    async (activeFilters: AdminOvertimeFilterState, token: string, page = 1) => {
      const nextValidationError = validateFilters(activeFilters)
      setValidationError(nextValidationError)

      if (nextValidationError || !token) {
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setLoading(true)
      setError('')

      try {
        const response = await apiRequest(buildUrl(activeFilters, page), {}, token)
        if (requestId !== requestIdRef.current) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to load overtime records')
        }

        const responseRecords = Array.isArray(response.data?.records)
          ? response.data.records
          : Array.isArray(response.data?.overtime_records)
            ? response.data.overtime_records
            : []
        const pageSize = Number(activeFilters.pageSize) || DEFAULT_PAGINATION.page_size
        const nextPagination = normalizePagination(response.data?.pagination, pageSize)
        const responseStatuses = Array.isArray(response.data?.filter_options?.statuses)
          ? response.data.filter_options.statuses
          : OVERTIME_STATUSES
        const responseDepartments = Array.isArray(response.data?.filter_options?.departments)
          ? response.data.filter_options.departments
          : []

        setRecords(responseRecords)
        setKpis(normalizeKpis(response.data?.kpis))
        setPagination(nextPagination)
        setFilterOptions({
          departments: responseDepartments,
          statuses: responseStatuses,
        })
        setLastSyncedAt(new Date())
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setError(err instanceof Error ? err.message : 'Failed to load overtime records')
        setRecords([])
        setKpis(EMPTY_KPIS)
        setPagination({
          ...DEFAULT_PAGINATION,
          page,
          page_size: Number(activeFilters.pageSize) || DEFAULT_PAGINATION.page_size,
        })
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [apiRequest]
  )

  useEffect(() => {
    if (isActive && !loadedOnce.current && accessToken) {
      loadedOnce.current = true
      void fetchData(filters, accessToken, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, accessToken])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current)
      }
    }
  }, [])

  const updateFilter = useCallback(
    <K extends keyof AdminOvertimeFilterState>(key: K, value: AdminOvertimeFilterState[K]) => {
      const nextFilters = {
        ...filters,
        [key]: value,
      }

      if (key === 'empCode') {
        nextFilters.empCode = String(value)
      }

      if (key === 'department') {
        nextFilters.department = String(value)
      }

      if (key === 'fromDate' || key === 'toDate') {
        nextFilters.datePreset = 'custom'
      }

      setFilters(nextFilters)
      setPagination((previousPagination) => ({
        ...previousPagination,
        page: 1,
      }))

      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current)
      }

      if (key === 'search') {
        searchTimerRef.current = window.setTimeout(() => {
          void fetchData(nextFilters, accessToken, 1)
        }, 350)
        return
      }

      void fetchData(nextFilters, accessToken, 1)
    },
    [accessToken, fetchData, filters]
  )

  const applyDatePreset = useCallback(
    (preset: AdminOvertimeDatePreset) => {
      const range = getPresetRange(preset)
      const nextFilters = {
        ...filters,
        datePreset: preset,
        fromDate: preset === 'custom' ? filters.fromDate : range.fromDate,
        toDate: preset === 'custom' ? filters.toDate : range.toDate,
      }

      setFilters(nextFilters)
      setPagination((previousPagination) => ({
        ...previousPagination,
        page: 1,
      }))
      if (preset !== 'custom') {
        void fetchData(nextFilters, accessToken, 1)
      }
    },
    [accessToken, fetchData, filters]
  )

  const changePage = useCallback(
    (nextPage: number) => {
      const normalizedPage = Math.max(1, nextPage)
      setPagination((previousPagination) => ({
        ...previousPagination,
        page: normalizedPage,
      }))
      void fetchData(filters, accessToken, normalizedPage)
    },
    [accessToken, fetchData, filters]
  )

  const setSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      const nextFilters = {
        ...filters,
        sortBy,
        sortOrder,
      }
      setFilters(nextFilters)
      setPagination((previousPagination) => ({
        ...previousPagination,
        page: 1,
      }))
      void fetchData(nextFilters, accessToken, 1)
    },
    [accessToken, fetchData, filters]
  )

  const refresh = useCallback(() => {
    void fetchData(filters, accessToken, pagination.page)
  }, [accessToken, fetchData, filters, pagination.page])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPagination(DEFAULT_PAGINATION)
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current)
    }
    void fetchData(DEFAULT_FILTERS, accessToken, 1)
  }, [accessToken, fetchData])

  const runMutation = useCallback(
    async (
      path: string,
      options: RequestInit,
      successMessage: string,
      refreshPage = pagination.page
    ) => {
      if (!accessToken) {
        throw new Error('Admin session is missing. Please log in again.')
      }

      setActionLoading(true)
      setActionStatus('')
      try {
        const response = await apiRequest(path, options, accessToken)
        if (!response?.success) {
          throw new Error(response?.message || successMessage)
        }

        setActionStatus(response.message || successMessage)
        await fetchData(filters, accessToken, refreshPage)
        return response.data?.record as AdminOvertimeRecord | undefined
      } catch (err) {
        const message = err instanceof Error ? err.message : successMessage
        setActionStatus(message)
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [accessToken, apiRequest, fetchData, filters, pagination.page]
  )

  const createRecord = useCallback(
    async (payload: AdminOvertimeMutationPayload) => {
      setPagination((previousPagination) => ({
        ...previousPagination,
        page: 1,
      }))
      return runMutation(
        '/api/admin/overtime-records',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        'Overtime record created successfully',
        1
      )
    },
    [runMutation]
  )

  const updateRecord = useCallback(
    async (recordId: number, payload: AdminOvertimeMutationPayload) => runMutation(
      `/api/admin/overtime-records/${recordId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      'Overtime record updated successfully'
    ),
    [runMutation]
  )

  const deleteRecord = useCallback(
    async (recordId: number, force = false) => runMutation(
      `/api/admin/overtime-records/${recordId}${force ? '?force=true' : ''}`,
      {
        method: 'DELETE',
      },
      'Overtime record deleted successfully'
    ),
    [runMutation]
  )

  const updateStatus = useCallback(
    async (recordId: number, status: AdminOvertimeStatus, remarks = '') => runMutation(
      `/api/admin/overtime-records/${recordId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, remarks }),
      },
      'Overtime record status updated successfully'
    ),
    [runMutation]
  )

  const approveRecord = useCallback(
    async (recordId: number, action: 'approved' | 'rejected', remarks = '') => runMutation(
      `/api/admin/overtime-records/${recordId}/approval`,
      {
        method: 'POST',
        body: JSON.stringify({ action, remarks }),
      },
      action === 'approved' ? 'Overtime record approved successfully' : 'Overtime record rejected successfully'
    ),
    [runMutation]
  )

  const reset = useCallback(() => {
    requestIdRef.current += 1
    loadedOnce.current = false
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current)
    }
    setFilters(DEFAULT_FILTERS)
    setRecords([])
    setKpis(EMPTY_KPIS)
    setFilterOptions(DEFAULT_FILTER_OPTIONS)
    setPagination(DEFAULT_PAGINATION)
    setLoading(false)
    setActionLoading(false)
    setError('')
    setActionStatus('')
    setValidationError('')
    setLastSyncedAt(null)
  }, [])

  return {
    filters,
    records,
    kpis,
    filterOptions,
    pagination,
    loading,
    actionLoading,
    error,
    actionStatus,
    validationError,
    lastSyncedAt,
    updateFilter,
    applyDatePreset,
    clearFilters,
    changePage,
    setSort,
    refresh,
    createRecord,
    updateRecord,
    deleteRecord,
    updateStatus,
    approveRecord,
    reset,
  }
}
