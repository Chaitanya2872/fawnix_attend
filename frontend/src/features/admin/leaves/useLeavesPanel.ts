import { useState } from 'react'
import { EMPTY_LEAVE_FILTERS } from '../config/sidebar'
import type { LeaveFilterState } from '../types/sidebar'
import type { EmployeeRow, LeaveRow } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type UseLeavesPanelOptions = {
  employees: EmployeeRow[]
  apiRequest: ApiRequest
  setLeaveRows: (rows: LeaveRow[]) => void
}

export function useLeavesPanel({ employees, apiRequest, setLeaveRows }: UseLeavesPanelOptions) {
  const [leaveFilters, setLeaveFilters] = useState<LeaveFilterState>({ ...EMPTY_LEAVE_FILTERS })
  const [leaveFilterLoading, setLeaveFilterLoading] = useState(false)
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('')

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
    leaveEmployeeNameOptions,
    leaveEmployeeIdOptions,
    resetLeavesPanel
  }
}
