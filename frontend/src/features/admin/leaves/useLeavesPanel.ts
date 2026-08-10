import { useState } from 'react'
import { EMPTY_LEAVE_FILTERS } from '../config/sidebar'
import type { LeaveFilterState } from '../types/sidebar'
import type { EmployeeRow, LeaveRow } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type UseLeavesPanelOptions = {
  employees: EmployeeRow[]
  apiRequest: ApiRequest
  accessToken: string
  refreshAccessToken: () => Promise<string>
  setLeaveRows: (rows: LeaveRow[]) => void
}

type LeaveImportOptions = {
  defaultStatus: string
  strict: boolean
  skipDuplicates: boolean
}

type LeaveImportSummary = {
  total: number
  inserted: number
  skipped: number
  failed: number
  failures: string[]
}

type LeaveImportError = Error & {
  responseData?: unknown
}

const LEAVE_TEMPLATE_COLUMNS = [
  'emp_code',
  'from_date',
  'to_date',
  'leave_type',
  'duration',
  'status',
  'leave_count',
  'applied_at',
  'notes'
]

function getImportData(responseData: unknown): Record<string, unknown> {
  if (typeof responseData !== 'object' || responseData === null) {
    return {}
  }

  const data = (responseData as { data?: unknown }).data
  return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {}
}

function toImportCount(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

function formatFailureReason(item: unknown) {
  if (typeof item !== 'object' || item === null) {
    return String(item || 'Import row failed.')
  }

  const row = item as { row?: unknown; reason?: unknown }
  const rowLabel = row.row ? `Row ${row.row}: ` : ''
  return `${rowLabel}${String(row.reason || 'Import row failed.')}`
}

function buildImportSummary(responseData: unknown): LeaveImportSummary | null {
  const data = getImportData(responseData)
  if (!Object.keys(data).length) {
    return null
  }

  const failures = Array.isArray(data.failed) ? data.failed.slice(0, 5).map(formatFailureReason) : []

  return {
    total: toImportCount(data.total_rows),
    inserted: toImportCount(data.inserted_count),
    skipped: toImportCount(data.skipped_count),
    failed: toImportCount(data.failed_count),
    failures
  }
}

function getImportMessage(responseData: unknown, fallback: string) {
  if (typeof responseData !== 'object' || responseData === null) {
    return fallback
  }

  const message = (responseData as { message?: unknown; error?: unknown }).message ||
    (responseData as { error?: unknown }).error
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}

export function useLeavesPanel({
  employees,
  apiRequest,
  accessToken,
  refreshAccessToken,
  setLeaveRows
}: UseLeavesPanelOptions) {
  const [leaveFilters, setLeaveFilters] = useState<LeaveFilterState>({ ...EMPTY_LEAVE_FILTERS })
  const [leaveFilterLoading, setLeaveFilterLoading] = useState(false)
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('')
  const [leaveImportLoading, setLeaveImportLoading] = useState(false)
  const [leaveImportStatus, setLeaveImportStatus] = useState('')
  const [leaveImportSummary, setLeaveImportSummary] = useState<LeaveImportSummary | null>(null)

  const updateLeaveFilter = (field: keyof LeaveFilterState, value: string) => {
    setLeaveFilters((current) => ({ ...current, [field]: value }))
  }

  const refreshLeaves = async (filters: LeaveFilterState = leaveFilters, showStatus = false) => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setLeaveFilterStatus('From date must be on or before To date.')
      return
    }

    setLeaveFilterLoading(true)
    if (showStatus) {
      setLeaveFilterStatus('Applying leave filters...')
    }

    const params = new URLSearchParams({ limit: '500' })
    if (filters.employeeName.trim()) params.set('employee_name', filters.employeeName.trim())
    if (filters.employeeId.trim()) params.set('employee_id', filters.employeeId.trim())
    if (filters.leaveType.trim()) params.set('leave_type', filters.leaveType.trim().toLowerCase())
    if (filters.fromDate) params.set('from_date', filters.fromDate)
    if (filters.toDate) params.set('to_date', filters.toDate)
    if (filters.status.trim()) params.set('status', filters.status.trim().toLowerCase())

    try {
      const response = await apiRequest(`/api/admin/leaves?${params.toString()}`)
      const leavesData = Array.isArray(response?.data?.leaves) ? response.data.leaves : []
      setLeaveRows(leavesData)
      if (showStatus) {
        setLeaveFilterStatus(`${leavesData.length} leave record${leavesData.length === 1 ? '' : 's'} found.`)
      }
    } catch (error) {
      setLeaveFilterStatus(error instanceof Error ? error.message : 'Failed to filter leave records.')
    } finally {
      setLeaveFilterLoading(false)
    }
  }

  const clearLeaveFilters = async () => {
    const emptyFilters = { ...EMPTY_LEAVE_FILTERS }
    setLeaveFilters(emptyFilters)
    await refreshLeaves(emptyFilters, true)
  }

  const downloadLeavesTemplate = () => {
    const sample = [
      'EMP001',
      '2026-04-10',
      '2026-04-10',
      'casual',
      'full_day',
      'approved',
      '1',
      '2026-04-01 09:30:00',
      'Family appointment'
    ]
    const blob = new Blob(
      [`${LEAVE_TEMPLATE_COLUMNS.join(',')}\n${sample.join(',')}\n`],
      { type: 'text/csv;charset=utf-8' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fawnix_leaves_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importLeaves = async (file: File, options: LeaveImportOptions) => {
    setLeaveImportLoading(true)
    setLeaveImportStatus('Importing leave records...')
    setLeaveImportSummary(null)

    const buildFormData = () => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('default_status', options.defaultStatus)
      formData.append('strict', options.strict ? 'true' : 'false')
      formData.append('skip_duplicates', options.skipDuplicates ? 'true' : 'false')
      return formData
    }

    const uploadWithToken = (token: string) =>
      fetch('/api/admin/leaves/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: buildFormData()
      })

    try {
      let response = await uploadWithToken(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await uploadWithToken(nextAccessToken)
      }

      const responseData = await response.json().catch(() => ({}))
      const summary = buildImportSummary(responseData)
      setLeaveImportSummary(summary)

      if (!response.ok) {
        const error = new Error(getImportMessage(responseData, 'Leave import failed.')) as LeaveImportError
        error.responseData = responseData
        throw error
      }

      const message = getImportMessage(responseData, 'Leave import complete.')
      setLeaveImportStatus(
        summary
          ? `${message}: total ${summary.total}, inserted ${summary.inserted}, skipped ${summary.skipped}, failed ${summary.failed}.`
          : message
      )
      await refreshLeaves(leaveFilters, true)
    } catch (error) {
      const importError = error as LeaveImportError
      const summary = buildImportSummary(importError.responseData)
      if (summary) {
        setLeaveImportSummary(summary)
      }
      setLeaveImportStatus(error instanceof Error ? error.message : 'Could not import this leave file.')
    } finally {
      setLeaveImportLoading(false)
    }
  }

  const leaveEmployeeNameOptions = Array.from(
    new Set(employees.map((employee) => (employee.emp_full_name || '').trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
  const leaveEmployeeIdOptions = Array.from(
    new Set(employees.map((employee) => (employee.emp_code || '').trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))

  const resetLeavesPanel = () => {
    setLeaveFilters({ ...EMPTY_LEAVE_FILTERS })
    setLeaveFilterStatus('')
  }

  return {
    leaveFilters,
    leaveFilterLoading,
    leaveFilterStatus,
    updateLeaveFilter,
    refreshLeaves,
    clearLeaveFilters,
    leaveImportLoading,
    leaveImportStatus,
    leaveImportSummary,
    importLeaves,
    downloadLeavesTemplate,
    leaveEmployeeNameOptions,
    leaveEmployeeIdOptions,
    resetLeavesPanel
  }
}
