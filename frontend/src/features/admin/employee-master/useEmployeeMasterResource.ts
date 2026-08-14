import { useCallback, useEffect, useState } from 'react'
import type {
  EmployeeMasterFilterOptions,
  EmployeeMasterFilterState,
  EmployeeMasterPagination,
  EmployeeMasterRecord,
  EmployeeMasterResourceConfig,
} from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

const DEFAULT_PAGE_SIZE = 15

export const EMPTY_EMPLOYEE_MASTER_FILTERS: EmployeeMasterFilterState = {
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
}

const EMPTY_PAGINATION: EmployeeMasterPagination = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total_records: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
}

type UseEmployeeMasterResourceOptions = {
  isActive: boolean
  accessToken: string
  apiRequest: ApiRequest
  resource: EmployeeMasterResourceConfig
}

function cloneEmptyFilters() {
  return { ...EMPTY_EMPLOYEE_MASTER_FILTERS }
}

function getPageSize(filters: EmployeeMasterFilterState) {
  const pageSize = Number(filters.pageSize || DEFAULT_PAGE_SIZE)
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return DEFAULT_PAGE_SIZE
  }
  return pageSize
}

function buildListUrl(resource: EmployeeMasterResourceConfig, filters: EmployeeMasterFilterState, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(getPageSize(filters)),
  })

  if (filters.search.trim()) {
    params.set('search', filters.search.trim())
  }

  if (filters.status) {
    params.set('status', filters.status)
  }

  resource.filters.forEach((filter) => {
    const value = String(filters[filter.stateKey] || '').trim()
    if (value) {
      params.set(filter.param, value)
    }
  })

  return `${resource.endpoint}?${params.toString()}`
}

function normalizePagination(
  responseData: Record<string, unknown>,
  records: EmployeeMasterRecord[],
  requestPage: number,
  fallbackPageSize: number
): EmployeeMasterPagination {
  const rawPagination = (
    typeof responseData.pagination === 'object' && responseData.pagination !== null
      ? responseData.pagination
      : {}
  ) as Partial<EmployeeMasterPagination>
  const pageSize = Number(rawPagination.page_size || fallbackPageSize || DEFAULT_PAGE_SIZE)
  const totalRecords = Number(
    rawPagination.total_records ?? responseData.count ?? records.length
  )
  const totalPages = Number(
    rawPagination.total_pages ?? (totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0)
  )
  const page = Number(rawPagination.page || requestPage || 1)

  return {
    page,
    page_size: pageSize,
    total_records: totalRecords,
    total_pages: totalPages,
    has_next: rawPagination.has_next ?? (totalPages > 0 && page < totalPages),
    has_previous: rawPagination.has_previous ?? page > 1,
  }
}

function ensureSuccessfulResponse(response: unknown, fallbackMessage: string) {
  const maybeResponse = response as { success?: boolean; message?: string } | null
  if (maybeResponse?.success === false) {
    throw new Error(maybeResponse.message || fallbackMessage)
  }
}

export function useEmployeeMasterResource({
  isActive,
  accessToken,
  apiRequest,
  resource,
}: UseEmployeeMasterResourceOptions) {
  const [filters, setFilters] = useState<EmployeeMasterFilterState>(() => cloneEmptyFilters())
  const [appliedFilters, setAppliedFilters] = useState<EmployeeMasterFilterState>(() => cloneEmptyFilters())
  const [records, setRecords] = useState<EmployeeMasterRecord[]>([])
  const [filterOptions, setFilterOptions] = useState<EmployeeMasterFilterOptions>({})
  const [pagination, setPagination] = useState<EmployeeMasterPagination>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionStatus, setActionStatus] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const load = useCallback(
    async (requestPage = page, requestFilters = appliedFilters) => {
      if (!accessToken || !isActive) {
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await apiRequest(buildListUrl(resource, requestFilters, requestPage), {}, accessToken)
        ensureSuccessfulResponse(response, `Failed to load ${resource.title.toLowerCase()}`)

        const data = (response?.data || {}) as Record<string, unknown>
        const nextRecords = Array.isArray(data.records)
          ? (data.records as EmployeeMasterRecord[])
          : []

        setRecords(nextRecords)
        setFilterOptions((data.filter_options || {}) as EmployeeMasterFilterOptions)
        setPagination(normalizePagination(data, nextRecords, requestPage, getPageSize(requestFilters)))
        setLastSyncedAt(new Date())
      } catch (loadError) {
        setRecords([])
        setPagination({
          ...EMPTY_PAGINATION,
          page: requestPage,
          has_previous: requestPage > 1,
        })
        setError(loadError instanceof Error ? loadError.message : `Failed to load ${resource.title.toLowerCase()}`)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, apiRequest, appliedFilters, isActive, page, resource]
  )

  useEffect(() => {
    setFilters(cloneEmptyFilters())
    setAppliedFilters(cloneEmptyFilters())
    setRecords([])
    setFilterOptions({})
    setPagination(EMPTY_PAGINATION)
    setPage(1)
    setError('')
    setActionStatus('')
    setLastSyncedAt(null)
  }, [resource.key])

  useEffect(() => {
    if (!accessToken || !isActive) {
      return
    }

    void load(page, appliedFilters)
  }, [accessToken, appliedFilters, isActive, load, page, resource.key])

  const updateFilter = useCallback(
    <K extends keyof EmployeeMasterFilterState>(key: K, value: EmployeeMasterFilterState[K]) => {
      setFilters((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const applyFilters = useCallback(() => {
    setPage(1)
    setAppliedFilters({ ...filters })
    setError('')
  }, [filters])

  const clearFilters = useCallback(() => {
    const nextFilters = cloneEmptyFilters()
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setPage(1)
    setError('')
  }, [])

  const changePage = useCallback((nextPage: number) => {
    setPage(Math.max(1, nextPage))
  }, [])

  const refresh = useCallback(() => {
    void load(page, appliedFilters)
  }, [appliedFilters, load, page])

  const createRecord = useCallback(
    async (payload: Record<string, string>) => {
      setActionLoading(true)
      setActionStatus(`Creating ${resource.singularLabel.toLowerCase()}...`)

      try {
        const response = await apiRequest(
          resource.endpoint,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          accessToken
        )
        ensureSuccessfulResponse(response, `Failed to create ${resource.singularLabel.toLowerCase()}`)
        setActionStatus(`${resource.singularLabel} created.`)
        await load(page, appliedFilters)
      } catch (mutationError) {
        setActionStatus(
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to create ${resource.singularLabel.toLowerCase()}`
        )
        throw mutationError
      } finally {
        setActionLoading(false)
      }
    },
    [accessToken, apiRequest, appliedFilters, load, page, resource]
  )

  const updateRecord = useCallback(
    async (recordId: string | number, payload: Record<string, string>) => {
      setActionLoading(true)
      setActionStatus(`Saving ${resource.singularLabel.toLowerCase()}...`)

      try {
        const response = await apiRequest(
          `${resource.endpoint}/${encodeURIComponent(String(recordId))}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
          accessToken
        )
        ensureSuccessfulResponse(response, `Failed to update ${resource.singularLabel.toLowerCase()}`)
        setActionStatus(`${resource.singularLabel} updated.`)
        await load(page, appliedFilters)
      } catch (mutationError) {
        setActionStatus(
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to update ${resource.singularLabel.toLowerCase()}`
        )
        throw mutationError
      } finally {
        setActionLoading(false)
      }
    },
    [accessToken, apiRequest, appliedFilters, load, page, resource]
  )

  const deleteRecord = useCallback(
    async (recordId: string | number) => {
      setActionLoading(true)
      setActionStatus(`Deleting ${resource.singularLabel.toLowerCase()}...`)

      try {
        const response = await apiRequest(
          `${resource.endpoint}/${encodeURIComponent(String(recordId))}`,
          { method: 'DELETE' },
          accessToken
        )
        ensureSuccessfulResponse(response, `Failed to delete ${resource.singularLabel.toLowerCase()}`)
        setActionStatus(`${resource.singularLabel} deleted.`)
        const nextPage = records.length === 1 && page > 1 ? page - 1 : page
        if (nextPage !== page) {
          setPage(nextPage)
        }
        await load(nextPage, appliedFilters)
      } catch (mutationError) {
        setActionStatus(
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to delete ${resource.singularLabel.toLowerCase()}`
        )
        throw mutationError
      } finally {
        setActionLoading(false)
      }
    },
    [accessToken, apiRequest, appliedFilters, load, page, records.length, resource]
  )

  const reset = useCallback(() => {
    setFilters(cloneEmptyFilters())
    setAppliedFilters(cloneEmptyFilters())
    setRecords([])
    setFilterOptions({})
    setPagination(EMPTY_PAGINATION)
    setPage(1)
    setError('')
    setActionLoading(false)
    setActionStatus('')
    setLastSyncedAt(null)
  }, [])

  return {
    filters,
    records,
    filterOptions,
    pagination,
    loading,
    error,
    actionLoading,
    actionStatus,
    lastSyncedAt,
    updateFilter,
    applyFilters,
    clearFilters,
    changePage,
    refresh,
    createRecord,
    updateRecord,
    deleteRecord,
    reset,
  }
}
