import { useEffect, useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import type { AttendanceExceptionRow, AttendanceRow, EmployeeRow } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type UseAttendancePanelOptions = {
  isActive: boolean
  accessToken: string
  apiRequest: ApiRequest
  attendanceDateFilter: string
  employees: EmployeeRow[]
  firstClockInRows: AttendanceRow[]
  selectedDateLateArrivals: AttendanceExceptionRow[]
  selectedDateEarlyLeaves: AttendanceExceptionRow[]
}

export function useAttendancePanel({
  isActive,
  accessToken,
  apiRequest,
  attendanceDateFilter,
  employees,
  firstClockInRows,
  selectedDateLateArrivals,
  selectedDateEarlyLeaves
}: UseAttendancePanelOptions) {
  const [attendanceView, setAttendanceView] = useState<
    'attendance' | 'late-arrivals' | 'early-leaves' | 'leaves' | 'missed-logins'
  >('attendance')
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [missedLoginEmpCodes, setMissedLoginEmpCodes] = useState<string[]>([])
  const [alertCandidatesLoading, setAlertCandidatesLoading] = useState(false)
  const [alertTriggerLoading, setAlertTriggerLoading] = useState(false)
  const [alertTriggerStatus, setAlertTriggerStatus] = useState('')
  const [showAlertComposer, setShowAlertComposer] = useState(false)
  const [selectedMissedLoginEmpCodes, setSelectedMissedLoginEmpCodes] = useState<string[]>([])
  const [alertSentEmpCodes, setAlertSentEmpCodes] = useState<string[]>([])
  const [alertSendCounts, setAlertSendCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!accessToken || !isActive) {
      return
    }

    let cancelled = false

    const loadAlertCandidates = async () => {
      setAlertCandidatesLoading(true)

      try {
        const params = new URLSearchParams({
          notification_type: 'attendance_reminder',
          target_date: attendanceDateFilter || toDateInputValue(new Date())
        })
        const response = await apiRequest(`/api/admin/scheduled-notifications/candidates?${params.toString()}`, {}, accessToken)
        const candidateRows = Array.isArray(response?.data)
          ? response.data as Array<{ emp_code?: string; alert_status?: string; alert_eligible?: boolean; alert_send_count?: number }>
          : []
        const nextMissedCodes = candidateRows
          .map((row: { emp_code?: string }) => (row.emp_code || '').trim())
          .filter(Boolean)
        const nextSentCodes = candidateRows
          .filter((row) => (row.alert_status || '').toLowerCase() === 'sent')
          .map((row) => (row.emp_code || '').trim())
          .filter(Boolean)
        const nextSendCounts = candidateRows.reduce<Record<string, number>>((counts, row) => {
          const empCode = (row.emp_code || '').trim()
          if (!empCode) {
            return counts
          }
          counts[empCode] = Number(row.alert_send_count || 0)
          return counts
        }, {})

        if (!cancelled) {
          setMissedLoginEmpCodes(Array.from(new Set(nextMissedCodes)))
          setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)))
          setAlertSendCounts(nextSendCounts)
        }
      } catch {
        if (!cancelled) {
          setMissedLoginEmpCodes([])
          setAlertSentEmpCodes([])
          setAlertSendCounts({})
        }
      } finally {
        if (!cancelled) {
          setAlertCandidatesLoading(false)
        }
      }
    }

    void loadAlertCandidates()

    return () => {
      cancelled = true
    }
  }, [accessToken, isActive, attendanceDateFilter, apiRequest])

  useEffect(() => {
    setAlertTriggerStatus('')
    setShowAlertComposer(false)
    setAlertSentEmpCodes([])
    setAlertSendCounts({})
  }, [attendanceDateFilter])

  useEffect(() => {
    setSelectedMissedLoginEmpCodes((previousCodes) =>
      previousCodes.filter((empCode) => missedLoginEmpCodes.includes(empCode))
    )
  }, [missedLoginEmpCodes])

  const triggerAttendanceReminder = async () => {
    const requestedEmpCodes = Array.from(new Set(selectedMissedLoginEmpCodes))
    if (!requestedEmpCodes.length) {
      setAlertTriggerStatus('Select at least one employee to trigger reminders.')
      return
    }

    try {
      setAlertTriggerLoading(true)
      setAlertTriggerStatus('Triggering reminders...')
      const targetDate = attendanceDateFilter || toDateInputValue(new Date())
      const response = await apiRequest('/api/admin/scheduled-notifications/trigger', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: 'attendance_reminder',
          target_date: targetDate,
          emp_codes: requestedEmpCodes
        })
      })

      const sentCount = Number(response?.sent_count || 0)
      const failedCount = Number(response?.failed_count || 0)
      const sentEmpCodes = Array.isArray(response?.sent_emp_codes)
        ? response.sent_emp_codes
            .map((empCode: unknown) => String(empCode || '').trim())
            .filter(Boolean)
        : []
      const responseMessage =
        typeof response?.message === 'string' && response.message.trim()
          ? response.message.trim()
          : 'Attendance reminders processed'
      setAlertTriggerStatus(`${responseMessage} Sent: ${sentCount}, Failed: ${failedCount}.`)
      setShowAlertComposer(false)
      if (sentEmpCodes.length) {
        setAlertSentEmpCodes((previousCodes) =>
          Array.from(new Set([...previousCodes, ...sentEmpCodes]))
        )
      }

      const params = new URLSearchParams({
        notification_type: 'attendance_reminder',
        target_date: targetDate
      })
      const candidatesResponse = await apiRequest(`/api/admin/scheduled-notifications/candidates?${params.toString()}`, {}, accessToken)
      const candidateRows = Array.isArray(candidatesResponse?.data)
        ? candidatesResponse.data as Array<{ emp_code?: string; alert_status?: string; alert_eligible?: boolean; alert_send_count?: number }>
        : []
      const nextMissedCodes = candidateRows
        .map((row) => (row.emp_code || '').trim())
        .filter(Boolean)
      const nextSentCodes = candidateRows
        .filter((row) => (row.alert_status || '').toLowerCase() === 'sent')
        .map((row) => (row.emp_code || '').trim())
        .filter(Boolean)
      const nextSendCounts = candidateRows.reduce<Record<string, number>>((counts, row) => {
        const empCode = (row.emp_code || '').trim()
        if (!empCode) {
          return counts
        }
        counts[empCode] = Number(row.alert_send_count || 0)
        return counts
      }, {})
      setMissedLoginEmpCodes(Array.from(new Set(nextMissedCodes)))
      setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)))
      setAlertSendCounts(nextSendCounts)
    } catch (error) {
      setAlertTriggerStatus(error instanceof Error ? error.message : 'Failed to trigger attendance reminders')
    } finally {
      setAlertTriggerLoading(false)
    }
  }

  const employeeByCode = new Map(
    employees
      .filter((employee) => employee.emp_code)
      .map((employee) => [employee.emp_code.trim(), employee])
  )

  const missedLoginEmployees = missedLoginEmpCodes
    .map((empCode) => {
      const normalizedEmpCode = (empCode || '').trim()
      if (!normalizedEmpCode) {
        return null
      }
      const employee = employeeByCode.get(normalizedEmpCode)
      if (employee) {
        return employee
      }
      return {
        emp_code: normalizedEmpCode,
        emp_full_name: normalizedEmpCode,
        emp_email: ''
      } as EmployeeRow
    })
    .filter((employee): employee is EmployeeRow => Boolean(employee))
    .sort((left, right) =>
      (left.emp_full_name || left.emp_code || '').localeCompare(right.emp_full_name || right.emp_code || '')
    )
  const actionableMissedLoginEmployeeCodes = missedLoginEmployees
    .map((employee) => employee.emp_code || '')
    .filter(Boolean)
  const selectedMissedLoginCount = selectedMissedLoginEmpCodes.filter((empCode) =>
    actionableMissedLoginEmployeeCodes.includes(empCode)
  ).length
  const allMissedLoginsSelected =
    actionableMissedLoginEmployeeCodes.length > 0 &&
    selectedMissedLoginCount === actionableMissedLoginEmployeeCodes.length
  const reminderTargetDate = attendanceDateFilter || toDateInputValue(new Date())
  const reminderPreviewTitle = 'Attendance Reminder'
  const reminderPreviewBody = 'Clock in. If you already did, please ignore.'

  const attendancePageRows = firstClockInRows
  const normalizedAttendanceSearch = attendanceSearch.trim().toLowerCase()
  const filteredAttendanceRows = normalizedAttendanceSearch
    ? attendancePageRows.filter((row) => {
        const haystack = [
          row.employee_name,
          row.employee_email,
          row.emp_designation,
          row.attendance_type,
          row.login_location,
          row.login_address,
          row.logout_location,
          row.logout_address
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedAttendanceSearch)
      })
    : attendancePageRows

  const exceptionRows =
    attendanceView === 'late-arrivals'
      ? selectedDateLateArrivals
      : attendanceView === 'early-leaves'
        ? selectedDateEarlyLeaves
        : []

  const resetAttendancePanel = () => {
    setAttendanceView('attendance')
    setMissedLoginEmpCodes([])
    setAlertSentEmpCodes([])
    setAlertSendCounts({})
    setSelectedMissedLoginEmpCodes([])
  }

  return {
    attendanceView,
    setAttendanceView,
    attendanceSearch,
    setAttendanceSearch,
    missedLoginEmpCodes,
    alertCandidatesLoading,
    alertTriggerLoading,
    alertTriggerStatus,
    setAlertTriggerStatus,
    showAlertComposer,
    setShowAlertComposer,
    selectedMissedLoginEmpCodes,
    setSelectedMissedLoginEmpCodes,
    alertSentEmpCodes,
    alertSendCounts,
    attendancePageRows,
    filteredAttendanceRows,
    missedLoginEmployees,
    actionableMissedLoginEmployeeCodes,
    allMissedLoginsSelected,
    selectedMissedLoginCount,
    reminderPreviewBody,
    reminderPreviewTitle,
    reminderTargetDate,
    exceptionRows,
    triggerAttendanceReminder,
    resetAttendancePanel
  }
}
