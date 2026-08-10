import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import type {
  AdminOvertimeDatePreset,
  AdminOvertimeFilterState,
  AdminOvertimeKpis,
  AdminOvertimeLoadMeta,
  AdminOvertimeRecord,
} from '../../../types/admin'

const DEFAULT_FILTERS: AdminOvertimeFilterState = {
  search: '',
  status: '',
  empCode: '',
  fromDate: '',
  toDate: '',
  datePreset: '',
  limit: '100',
}

const DEFAULT_META: AdminOvertimeLoadMeta = {
  count: 0,
  limit: 100,
}

const EMPTY_KPIS: AdminOvertimeKpis = {
  total_loaded: 0,
  eligible_comp_off_days: 0,
  total_extra_hours: 0,
  expiring_or_expired: 0,
  requested: 0,
  approved: 0,
}

type UseOvertimeRecordsDataOptions = {
  isActive: boolean
  accessToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRequest: (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
}

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function parseDateValue(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return null

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getDeadlineValue(record: AdminOvertimeRecord) {
  return record.recording_deadline || record.expires_at || record.expired_at
}

function isExpiringOrExpired(record: AdminOvertimeRecord) {
  const status = (record.status || '').toLowerCase()
  if (status === 'expired' || record.expired_at) {
    return true
  }

  if (status === 'rejected' || status === 'utilized') {
    return false
  }

  const deadline = parseDateValue(getDeadlineValue(record))
  if (!deadline) {
    return false
  }

  const today = startOfLocalDay(new Date())
  const soon = new Date(today)
  soon.setDate(today.getDate() + 7)
  return startOfLocalDay(deadline) <= soon
}

function buildKpis(records: AdminOvertimeRecord[]): AdminOvertimeKpis {
  return records.reduce<AdminOvertimeKpis>((accumulator, record) => {
    const status = (record.status || '').toLowerCase()
    accumulator.total_loaded += 1
    accumulator.total_extra_hours += toNumber(record.extra_hours)

    if (status === 'eligible') {
      accumulator.eligible_comp_off_days += toNumber(record.comp_off_days)
    }

    if (status === 'requested') {
      accumulator.requested += 1
    }

    if (status === 'approved') {
      accumulator.approved += 1
    }

    if (isExpiringOrExpired(record)) {
      accumulator.expiring_or_expired += 1
    }

    return accumulator
  }, { ...EMPTY_KPIS })
}

function validateFilters(filters: AdminOvertimeFilterState) {
  const limit = Number(filters.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return 'Limit must be a whole number from 1 to 500.'
  }

  if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
    return 'From date must be on or before to date.'
  }

  return ''
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

export function useOvertimeRecordsData({
  isActive,
  accessToken,
  apiRequest,
}: UseOvertimeRecordsDataOptions) {
  const [filters, setFilters] = useState<AdminOvertimeFilterState>(DEFAULT_FILTERS)
  const [records, setRecords] = useState<AdminOvertimeRecord[]>([])
  const [meta, setMeta] = useState<AdminOvertimeLoadMeta>(DEFAULT_META)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const loadedOnce = useRef(false)
  const requestIdRef = useRef(0)

  const buildUrl = useCallback((activeFilters: AdminOvertimeFilterState) => {
    const params = new URLSearchParams()
    params.set('limit', String(Number(activeFilters.limit)))

    if (activeFilters.status) {
      params.set('status', activeFilters.status)
    }

    const empCode = activeFilters.empCode.trim()
    if (empCode) {
      params.set('emp_code', empCode)
    }

    if (activeFilters.fromDate) {
      params.set('from_date', activeFilters.fromDate)
    }

    if (activeFilters.toDate) {
      params.set('to_date', activeFilters.toDate)
    }

    return `/api/admin/overtime-records?${params.toString()}`
  }, [])

  const fetchData = useCallback(
    async (activeFilters: AdminOvertimeFilterState, token: string) => {
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
        const response = await apiRequest(buildUrl(activeFilters), {}, token)
        if (requestId !== requestIdRef.current) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to load overtime records')
        }

        const responseRecords = Array.isArray(response.data?.overtime_records)
          ? response.data.overtime_records
          : []
        const count = Number(response.data?.count)

        setRecords(responseRecords)
        setMeta({
          count: Number.isFinite(count) ? count : responseRecords.length,
          limit: Number(activeFilters.limit),
        })
        setLastSyncedAt(new Date())
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setError(err instanceof Error ? err.message : 'Failed to load overtime records')
        setRecords([])
        setMeta({
          count: 0,
          limit: Number(activeFilters.limit) || DEFAULT_META.limit,
        })
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [apiRequest, buildUrl]
  )

  useEffect(() => {
    if (isActive && !loadedOnce.current && accessToken) {
      loadedOnce.current = true
      void fetchData(filters, accessToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, accessToken])

  const updateFilter = useCallback(
    <K extends keyof AdminOvertimeFilterState>(key: K, value: AdminOvertimeFilterState[K]) => {
      const nextFilters = {
        ...filters,
        [key]: value,
      }

      if (key === 'empCode') {
        nextFilters.empCode = String(value)
      }

      if (key === 'fromDate' || key === 'toDate') {
        nextFilters.datePreset = 'custom'
      }

      setFilters(nextFilters)

      if (key !== 'search') {
        void fetchData(nextFilters, accessToken)
      }
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
      if (preset !== 'custom') {
        void fetchData(nextFilters, accessToken)
      }
    },
    [accessToken, fetchData, filters]
  )

  const refresh = useCallback(() => {
    void fetchData(filters, accessToken)
  }, [accessToken, fetchData, filters])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    void fetchData(DEFAULT_FILTERS, accessToken)
  }, [accessToken, fetchData])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    loadedOnce.current = false
    setFilters(DEFAULT_FILTERS)
    setRecords([])
    setMeta(DEFAULT_META)
    setLoading(false)
    setError('')
    setValidationError('')
    setLastSyncedAt(null)
  }, [])

  const kpis = useMemo(() => buildKpis(records), [records])

  return {
    filters,
    records,
    kpis,
    meta,
    loading,
    error,
    validationError,
    lastSyncedAt,
    updateFilter,
    applyDatePreset,
    clearFilters,
    refresh,
    reset,
  }
}
