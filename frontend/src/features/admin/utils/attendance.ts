import type { AttendanceExceptionRow, AttendanceRow, EmployeeRow } from '../../../types/admin'
import { toDateInputValue } from '../../../utils/date/dateUtils'

export function getExceptionDateValue(row: AttendanceExceptionRow) {
  return row.exception_date || row.requested_at
}

export function getSortTime(row: AttendanceExceptionRow) {
  const times = [
    row.actual_login_time,
    row.exception_time,
    row.requested_at
  ].filter(Boolean) as string[]

  if (times.length === 0) {
    return 0
  }

  return times.map((time) => new Date(time).getTime()).reduce((left, right) => Math.min(left, right))
}

export function isDateWithinRange(targetDate: string, startDate?: string, endDate?: string) {
  if (!targetDate || !startDate || !endDate) {
    return false
  }

  return targetDate >= startDate.slice(0, 10) && targetDate <= endDate.slice(0, 10)
}

export function buildWeeklyAttendanceTrend(rows: AttendanceRow[], endDateValue: string) {
  const endDate = new Date(`${endDateValue}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) {
    return []
  }

  const uniqueLogins = new Set<string>()
  rows.forEach((row) => {
    if (!row.login_time) {
      return
    }
    const loginDate = new Date(row.login_time)
    if (Number.isNaN(loginDate.getTime())) {
      return
    }
    const dateKey = toDateInputValue(loginDate)
    const employeeKey = (row.employee_email || row.employee_name || row.id || '').toString().toLowerCase()
    uniqueLogins.add(`${dateKey}-${employeeKey}`)
  })

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(endDate)
    currentDate.setDate(endDate.getDate() - (6 - index))
    const dateKey = toDateInputValue(currentDate)
    let count = 0

    uniqueLogins.forEach((entry) => {
      if (entry.startsWith(`${dateKey}-`)) {
        count += 1
      }
    })

    return {
      dateKey,
      count,
      label: currentDate.toLocaleDateString('en-IN', { weekday: 'short' })
    }
  })
}

export function buildAttendanceEfficiencyScores(
  employees: EmployeeRow[],
  rows: AttendanceRow[],
  endDateValue: string
) {
  const weeklyTrend = buildWeeklyAttendanceTrend(rows, endDateValue)
  const rangeDays = Math.max(weeklyTrend.length, 1)
  const allowedDates = new Set(weeklyTrend.map((item) => item.dateKey))
  const attendanceByEmployee = new Map<string, Set<string>>()

  rows.forEach((row) => {
    if (!row.login_time) {
      return
    }
    const loginDate = new Date(row.login_time)
    if (Number.isNaN(loginDate.getTime())) {
      return
    }
    const dateKey = toDateInputValue(loginDate)
    if (!allowedDates.has(dateKey)) {
      return
    }
    const employeeKey = (row.employee_email || '').toLowerCase()
    if (!employeeKey) {
      return
    }
    if (!attendanceByEmployee.has(employeeKey)) {
      attendanceByEmployee.set(employeeKey, new Set<string>())
    }
    attendanceByEmployee.get(employeeKey)?.add(dateKey)
  })

  return employees
    .map((employee) => {
      const employeeKey = (employee.emp_email || '').toLowerCase()
      const presentDays = employeeKey ? attendanceByEmployee.get(employeeKey)?.size || 0 : 0
      const score = Math.round((presentDays / rangeDays) * 100)
      return {
        empCode: employee.emp_code || '',
        name: employee.emp_full_name || employee.emp_code || 'Unknown',
        score,
        presentDays
      }
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }
      return left.name.localeCompare(right.name)
    })
}

export type LoginSceneMode = 'dawn' | 'day' | 'dusk' | 'night'

export function getLoginSceneMode(value: Date): LoginSceneMode {
  const hour = value.getHours()

  if (hour >= 5 && hour < 10) {
    return 'dawn'
  }

  if (hour >= 10 && hour < 17) {
    return 'day'
  }

  if (hour >= 17 && hour < 20) {
    return 'dusk'
  }

  return 'night'
}
