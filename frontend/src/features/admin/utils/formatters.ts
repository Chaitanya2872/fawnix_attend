import type { EmployeeRow, LeaveRow } from '../../../types/admin'

export function formatEmployeeGrade(value?: string) {
  const raw = (value || '').trim()
  if (!raw) {
    return '--'
  }

  const normalized = raw.toUpperCase()
  const compact = normalized.replace(/[\s\-_]/g, '')

  if (normalized === 'NF' || compact === 'NONFLEXIBLE') {
    return 'NF'
  }
  if (normalized === 'F' || compact === 'FLEXIBLE') {
    return 'F'
  }
  if (normalized === 'M' || compact === 'MODERATE') {
    return 'M'
  }

  return raw
}

export function formatDistanceKm(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return `${value.toFixed(2)} km`
}

export function formatWorkingHours(value?: number | string | null) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '--'
  }
  return `${numericValue.toFixed(2)} h`
}

export function formatCoords(value?: { lat: number; lon: number } | null) {
  if (!value) {
    return '--'
  }
  return `${value.lat.toFixed(6)}, ${value.lon.toFixed(6)}`
}

export function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase())
}

export function formatLeaveTypeLabel(leave: LeaveRow) {
  const rawType = (leave.leave_type || '').trim()
  const normalizedType = rawType.toLowerCase()
  if (!rawType) {
    return 'Leave'
  }

  let count: number | null = null
  if (normalizedType === 'sick' || normalizedType === 'casual') {
    const duration = (leave.duration || '').trim().toLowerCase()
    if (duration === 'first_half' || duration === 'second_half') {
      count = 0.5
    } else if (duration === 'full_day') {
      count = 1
    } else if (leave.leave_count !== undefined && leave.leave_count !== null) {
      const numericCount = Number(leave.leave_count)
      if (Number.isFinite(numericCount)) {
        count = numericCount
      }
    }
  }

  const display = toTitleCase(rawType.replace(/_/g, ' '))
  return count !== null ? `${display} (${count})` : display
}

export function getLeaveApproverLabel(leave: LeaveRow, employees: EmployeeRow[]) {
  const fallback = leave.reviewed_by || leave.manager_code || leave.manager_email || '--'
  const match =
    employees.find((employee) => employee.emp_code && employee.emp_code === leave.reviewed_by) ||
    employees.find((employee) => employee.emp_code && employee.emp_code === leave.manager_code) ||
    employees.find((employee) => employee.emp_email && employee.emp_email === leave.manager_email)
  return match?.emp_full_name || fallback
}

export function getLeaveReasonLabel(leave: LeaveRow) {
  return leave.notes || leave.remarks || '--'
}

export function formatTimeZoneLabel(timeZone: string) {
  if (!timeZone) {
    return 'Device Time'
  }

  const parts = timeZone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}
