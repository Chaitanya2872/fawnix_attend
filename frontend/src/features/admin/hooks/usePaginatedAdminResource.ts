import { useEffect, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

export type AdminResourcePagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

type UsePaginatedAdminResourceOptions<TFilters> = {
  isActive: boolean
  accessToken: string
  apiRequest: ApiRequest
  emptyFilters: TFilters
  defaultPageSize: number
  endpoint: string
  appendFilterParams: (params: URLSearchParams, filters: TFilters) => void
  loadErrorMessage: string
}

// Shared by any admin panel with the filters + applied-filters + paginated-rows shape
// (attendance exceptions, API telemetry). Extracted once the two were confirmed to be
// the same hook, twice - see Phase 4 audit.
export function usePaginatedAdminResource<TFilters, TRecord>({
  isActive,
  accessToken,
  apiRequest,
  emptyFilters,
  defaultPageSize,
  endpoint,
  appendFilterParams,
  loadErrorMessage
}: UsePaginatedAdminResourceOptions<TFilters>) {
  const [filters, setFilters] = useState<TFilters>({ ...emptyFilters })
  const [appliedFilters, setAppliedFilters] = useState<TFilters>({ ...emptyFilters })
  const [rows, setRows] = useState<TRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<AdminResourcePagination>({
    page: 1,
    page_size: defaultPageSize,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  })

  const updateFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const applyFilters = () => {
    setPage(1)
    setError('')
    setAppliedFilters({ ...filters })
  }

  const clearFilters = () => {
    setFilters({ ...emptyFilters })
    setAppliedFilters({ ...emptyFilters })
    setPage(1)
    setError('')
  }

  const load = async (
    token: string,
    requestPage = page,
    requestFilters = appliedFilters
  ) => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: String(requestPage),
        page_size: String(pagination.page_size || defaultPageSize),
      })
      appendFilterParams(params, requestFilters)

      const response = await apiRequest(`${endpoint}?${params.toString()}`, {}, token)
      const records = Array.isArray(response?.data?.records)
        ? response.data.records as TRecord[]
        : []
      const nextPagination = response?.data?.pagination || {}

      setRows(records)
      setPagination({
        page: Number(nextPagination.page || requestPage || 1),
        page_size: Number(nextPagination.page_size || pagination.page_size || defaultPageSize),
        total_records: Number(nextPagination.total_records || 0),
        total_pages: Number(nextPagination.total_pages || 0),
        has_next: Boolean(nextPagination.has_next),
        has_previous: Boolean(nextPagination.has_previous),
      })
    } catch (loadError) {
      setRows([])
      setPagination((current) => ({
        ...current,
        page: requestPage,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_previous: requestPage > 1,
      }))
      setError(loadError instanceof Error ? loadError.message : loadErrorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken || !isActive) {
      return
    }

    void load(accessToken, page, appliedFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isActive, page, appliedFilters])

  const reset = () => {
    setFilters({ ...emptyFilters })
    setAppliedFilters({ ...emptyFilters })
    setRows([])
    setError('')
    setPage(1)
    setPagination({
      page: 1,
      page_size: defaultPageSize,
      total_records: 0,
      total_pages: 0,
      has_next: false,
      has_previous: false
    })
  }

  return {
    filters,
    rows,
    loading,
    error,
    page,
    setPage,
    pagination,
    updateFilter,
    applyFilters,
    clearFilters,
    load,
    reset
  }
}
