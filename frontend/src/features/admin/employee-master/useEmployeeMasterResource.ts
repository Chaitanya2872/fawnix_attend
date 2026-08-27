import { useCallback, useEffect, useRef, useState } from 'react'
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
const EMPLOYEE_MASTER_REQUEST_TIMEOUT_MS = 30_000

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

function getLoadErrorMessage(loadError: unknown, fallbackMessage: string) {
  if (
    loadError instanceof DOMException &&
    loadError.name === 'AbortError'
  ) {
    return 'Request timed out while loading employee master records.'
  }

  return loadError instanceof Error ? loadError.message : fallbackMessage
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

  // apiRequest is rebuilt on every render of the session hook, and `resource`/
  // page/filters change independently of a fetch. Holding them in a ref keeps
  // `load` referentially stable, so the effect below fires only when something
  // that should actually trigger a request changes -- without this the effect
  // re-ran on every render and the page refetched in a loop.
  const latestRef = useRef({ apiRequest, resource, page, appliedFilters, accessToken, isActive })
  latestRef.current = { apiRequest, resource, page, appliedFilters, accessToken, isActive }

  /** Cancels a superseded request and lets us ignore its late response. */
  const inFlightRef = useRef<{ controller: AbortController; superseded: boolean } | null>(null)
  const hasAccessToken = Boolean(accessToken)

  const load = useCallback(
    async (requestPage?: number, requestFilters?: EmployeeMasterFilterState) => {
      const { apiRequest: request, resource: activeResource, accessToken: token, isActive: active } =
        latestRef.current

      if (!token || !active) {
        return
      }

      const targetPage = requestPage ?? latestRef.current.page
      const targetFilters = requestFilters ?? latestRef.current.appliedFilters

      setLoading(true)
      setError('')

      if (inFlightRef.current) {
        inFlightRef.current.superseded = true
        inFlightRef.current.controller.abort()
      }

      const controller = new AbortController()
      const pending = { controller, superseded: false }
      inFlightRef.current = pending
      const timeoutId = window.setTimeout(() => {
        controller.abort()
      }, EMPLOYEE_MASTER_REQUEST_TIMEOUT_MS)

      try {
        const response = await request(
          buildListUrl(activeResource, targetFilters, targetPage),
          { signal: controller.signal },
          token
        )
        ensureSuccessfulResponse(response, `Failed to load ${activeResource.title.toLowerCase()}`)

        const data = (response?.data || {}) as Record<string, unknown>
        const nextRecords = Array.isArray(data.records)
          ? (data.records as EmployeeMasterRecord[])
          : []

        setRecords(nextRecords)
        setFilterOptions((data.filter_options || {}) as EmployeeMasterFilterOptions)
        setPagination(normalizePagination(data, nextRecords, targetPage, getPageSize(targetFilters)))
        setLastSyncedAt(new Date())
      } catch (loadError) {
        if (pending.superseded) {
          return
        }
        setRecords([])
        setPagination({
          ...EMPTY_PAGINATION,
          page: targetPage,
          has_previous: targetPage > 1,
        })
        setError(getLoadErrorMessage(loadError, `Failed to load ${activeResource.title.toLowerCase()}`))
      } finally {
        window.clearTimeout(timeoutId)
        if (inFlightRef.current === pending) {
          inFlightRef.current = null
          setLoading(false)
        }
      }
    },
    []
  )

  // Switching resource clears the panel during render rather than in an effect,
  // so the fetch below runs once with the new resource's blank filters instead
  // of firing a stale request first and a corrected one straight after.
  const [activeResourceKey, setActiveResourceKey] = useState(resource.key)
  if (activeResourceKey !== resource.key) {
    setActiveResourceKey(resource.key)
    setFilters(cloneEmptyFilters())
    setAppliedFilters(cloneEmptyFilters())
    setRecords([])
    setFilterOptions({})
    setPagination(EMPTY_PAGINATION)
    setPage(1)
    setError('')
    setActionStatus('')
    setLastSyncedAt(null)
  }

  useEffect(() => {
    if (!hasAccessToken || !isActive) {
      return
    }

    void load(page, appliedFilters)
  }, [hasAccessToken, appliedFilters, isActive, load, page, resource.key])

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
    void load()
  }, [load])

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
        await load()
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
    [accessToken, apiRequest, load, resource]
  )

  const updateRecord = useCallback(
    async (recordId: string | number, payload: Record<string, string>) => {
      setActionLoading(true)
      setActionStatus(`Saving ${resource.singularLabel.toLowerCase()}...`)

      try {
        const response = await apiRequest(
          `${resource.endpoint}/${encodeURIComponent(String(recordId))}`,
          {
            // PATCH, not PUT: only the supplied fields are written.
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
          accessToken
        )
        ensureSuccessfulResponse(response, `Failed to update ${resource.singularLabel.toLowerCase()}`)
        setActionStatus(`${resource.singularLabel} updated.`)
        await load()
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
    [accessToken, apiRequest, load, resource]
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
        await load(nextPage)
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
    [accessToken, apiRequest, load, page, records.length, resource]
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
    /** What the current rows were actually fetched with (not the draft form). */
    appliedFilters,
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
