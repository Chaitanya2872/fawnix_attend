import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { appRoutes } from '../../../app/config/routes'
import '../../../App.css'
import {
  API_TELEMETRY_EMP_CODE
} from '../config/sidebar'
import { useAdminLoginExperience } from '../hooks/useAdminLoginExperience'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useDashboardData } from '../hooks/useDashboardData'
import { useEmployeesPanel } from '../employees/useEmployeesPanel'
import { useAttendancePanel } from '../attendance/useAttendancePanel'
import { useAttendanceExceptionsData } from '../attendance-exceptions/useAttendanceExceptionsData'
import { useOvertimeRecordsData } from '../overtime-records/useOvertimeRecordsData'
import { useLeavesPanel } from '../leaves/useLeavesPanel'
import { useAdminLeavesData } from '../leaves/useAdminLeavesData'
import { useActivitiesPanel } from '../activities/useActivitiesPanel'
import { useFieldVisitsPanel } from '../field-visits/useFieldVisitsPanel'
import { useCalendarPanel } from '../calendar/useCalendarPanel'
import { useReportsPanel } from '../reports/useReportsPanel'
import { useApiTelemetryPanel } from '../api-telemetry/useApiTelemetryPanel'
import { useEmployeeMasterResource } from '../employee-master/useEmployeeMasterResource'
import AdminLoginPage from './AdminLoginPage'
import AdminSidebar from '../components/AdminSidebar'
import DeleteEmployeeModal from '../employees/DeleteEmployeeModal'
import EmployeeFormDrawer from '../employees/EmployeeFormDrawer'
import EmployeeImportDrawer from '../employees/import/EmployeeImportDrawer'
import EmployeeViewDrawer from '../employees/EmployeeViewDrawer'
import FieldVisitDetailDrawer from '../field-visits/FieldVisitDetailDrawer'
import MapDialog from '../field-visits/MapDialog'
import AdminActivitiesPage from '../activities/AdminActivitiesPage'
import AdminApiTelemetryPage from '../api-telemetry/AdminApiTelemetryPage'
import AdminAttendancePage from '../attendance/AdminAttendancePage'
import AdminAttendanceRecordsPage from '../attendance/AdminAttendanceRecordsPage'
import AdminAttendanceExceptionsPage from '../attendance-exceptions/AdminAttendanceExceptionsPage'
import AdminCalendarPage from '../calendar/AdminCalendarPage'
import AdminEmployeesPage from '../employees/AdminEmployeesPage'
import AdminFieldVisitsPage from '../field-visits/AdminFieldVisitsPage'
import AdminLeavesPage from '../leaves/AdminLeavesPage'
import AdminOvertimeRecordsPage from '../overtime-records/AdminOvertimeRecordsPage'
import AdminEmployeeMasterPage from '../employee-master/AdminEmployeeMasterPage'
import AdminOverviewPage from './sidebar/AdminOverviewPage'
import AdminReportsPage from '../reports/AdminReportsPage'
import {
  employeeMasterResourceConfigs,
  getEmployeeMasterResourceByPanel,
  isEmployeeMasterSidebarId
} from '../employee-master/employeeMasterConfig'
import {
  formatDistanceKm,
  formatEmployeeGrade,
  formatLeaveTypeLabel,
  formatWorkingHours,
  getLeaveApproverLabel
} from '../utils/formatters'
import {
  formatVisitDuration,
  resolveVisitDurationMinutes
} from '../utils/fieldVisits'
import { hasWriteAccess } from '../utils/permissions'
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
  isSameDate,
  toDateInputValue
} from '../../../utils/date/dateUtils'
import type {
  AttendanceExceptionRow,
  AttendanceRow,
  EmployeeRow,
  LeaveRow,
  SidebarId
} from '../../../types/admin'

const adminPanelPathMap: Record<SidebarId, string> = {
  dashboard: '',
  employees: 'employees',
  'employee-master-working-units': 'employee-master/working-units',
  'employee-master-payroll-units': 'employee-master/payroll-units',
  'employee-master-designations': 'employee-master/designations',
  'employee-master-departments': 'employee-master/departments',
  attendance: 'attendance',
  'attendance-records': 'attendance-records',
  'attendance-exceptions': 'attendance-exceptions',
  'overtime-records': 'overtime-records',
  inbox: 'inbox',
  calendar: 'calendar',
  reports: 'reports',
  leaves: 'leaves',
  activities: 'activities',
  'field-visits': 'field-visits',
  'api-telemetry': 'api-telemetry',
}

function getAdminPanelPath(panel: SidebarId) {
  const slug = adminPanelPathMap[panel]
  return slug ? `${appRoutes.admin}/${slug}` : appRoutes.admin
}

function getAdminPanelFromPath(pathname: string): SidebarId {
  const normalizedPath = pathname.replace(/\/+$/, '')
  if (normalizedPath === appRoutes.admin) {
    return 'dashboard'
  }

  const prefix = `${appRoutes.admin}/`
  if (!normalizedPath.startsWith(prefix)) {
    return 'dashboard'
  }

  const slug = normalizedPath.slice(prefix.length)
  const matched = Object.entries(adminPanelPathMap).find(([, value]) => value === slug)
  return (matched?.[0] as SidebarId | undefined) || 'dashboard'
}

function getExceptionDateValue(row: AttendanceExceptionRow) {
  return row.exception_date || row.attendance_date || row.requested_at
}

function getSortTime(row: AttendanceExceptionRow): number {
  const times = [
    row.actual_login_time,
    row.exception_time, 
    row.requested_at
  ].filter(Boolean) as string[]
  
  if (times.length === 0) return 0
  
  const earliest = times.map(time => new Date(time).getTime()).reduce((a, b) => Math.min(a, b))
  return earliest
}

function isDateWithinRange(
  targetDate: string,
  startDate?: string,
  endDate?: string
) {
  if (!targetDate || !startDate || !endDate) {
    return false
  }

  return targetDate >= startDate.slice(0, 10) && targetDate <= endDate.slice(0, 10)
}

function buildWeeklyAttendanceTrend(rows: AttendanceRow[], endDateValue: string) {
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

function buildAttendanceEfficiencyScores(
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
    attendanceByEmployee.get(employeeKey)!.add(dateKey)
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

type LoginSceneMode = 'dawn' | 'day' | 'dusk' | 'night'

function getLoginSceneMode(value: Date): LoginSceneMode {
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

function formatTimeZoneLabel(timeZone: string) {
  if (!timeZone) {
    return 'Device Time'
  }

  const parts = timeZone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

function AdminEmptyPanel({
  eyebrow,
  title,
  message
}: {
  eyebrow: string
  title: string
  message: string
}) {
  return (
    <div className="admin-aligned-page">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="empty-state">
        <strong>{message}</strong>
      </div>
    </div>
  )
}

function FawnixApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activePanel, setActivePanel] = useState<SidebarId>(() => getAdminPanelFromPath(window.location.pathname))
  const clearAdminData = () => {
    resetDashboardData()
    resetLeavesPanel()
    resetAttendanceExceptionsPanel()
    resetOvertimeRecordsPanel()
    resetApiTelemetryPanel()
    resetEmployeeMasterPanel()
    resetAttendancePanel()
  }
  const {
    accessToken,
    profile,
    refreshNotice,
    telemetryEntries,
    clearTelemetryEntries,
    refreshAccessToken,
    apiRequest,
    showAdminLogin,
    authLoading,
    authStatus,
    adminEmpCode,
    adminOtp,
    setAdminEmpCode,
    setAdminOtp,
    handleAdminRequestOtp,
    handleAdminLogin,
    handleLogout,
    handleSessionExpired
  } = useAdminAuth({
    onSessionCleared: clearAdminData
  })
  const {
    employees,
    employeeAuditLogs,
    missedLoginLeader,
    attendanceRows,
    leaveRows,
    setLeaveRows,
    activityRows,
    fieldVisitRows,
    attendanceExceptions,
    dashboardLoading,
    dashboardError,
    attendanceDateFilter,
    setAttendanceDateFilter,
    loadDashboard,
    resetDashboardData
  } = useDashboardData(showAdminLogin ? '' : accessToken, apiRequest)
  const { loginSceneTime, loginLocationDetails } = useAdminLoginExperience(showAdminLogin)

  useEffect(() => {
    const nextPanel = getAdminPanelFromPath(location.pathname)
    setActivePanel((currentPanel) => (currentPanel === nextPanel ? currentPanel : nextPanel))
  }, [location.pathname])

  useEffect(() => {
    if (dashboardError && (dashboardError.toLowerCase().includes('expired') || dashboardError.toLowerCase().includes('token'))) {
      handleSessionExpired()
    }
  }, [dashboardError])

  const resolveDownloadFilename = (response: Response, fallbackFilename: string) => {
    const disposition = response.headers.get('Content-Disposition') || ''
    const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i)
    if (!filenameMatch?.[1]) {
      return fallbackFilename
    }
    try {
      return decodeURIComponent(filenameMatch[1])
    } catch {
      return filenameMatch[1]
    }
  }

  const canWriteAdminData = hasWriteAccess(profile)
  const employeeMasterResource =
    getEmployeeMasterResourceByPanel(activePanel) || employeeMasterResourceConfigs.workingUnits
  const employeeMasterIsActive = isEmployeeMasterSidebarId(activePanel)
  const {
    filters: employeeMasterFilters,
    records: employeeMasterRecords,
    filterOptions: employeeMasterFilterOptions,
    pagination: employeeMasterPagination,
    loading: employeeMasterLoading,
    error: employeeMasterError,
    actionLoading: employeeMasterActionLoading,
    actionStatus: employeeMasterActionStatus,
    lastSyncedAt: employeeMasterLastSyncedAt,
    updateFilter: updateEmployeeMasterFilter,
    applyFilters: applyEmployeeMasterFilters,
    clearFilters: clearEmployeeMasterFilters,
    changePage: changeEmployeeMasterPage,
    refresh: refreshEmployeeMaster,
    createRecord: createEmployeeMasterRecord,
    updateRecord: updateEmployeeMasterRecord,
    deleteRecord: deleteEmployeeMasterRecord,
    reset: resetEmployeeMasterPanel
  } = useEmployeeMasterResource({
    isActive: employeeMasterIsActive,
    accessToken,
    apiRequest,
    resource: employeeMasterResource
  })

  const {
    employeeSearch,
    setEmployeeSearch,
    employeeStatusFilter,
    setEmployeeStatusFilter,
    employeeKpiFilter,
    applyEmployeeKpiFilter,
    employeeStatusMenuOpen,
    setEmployeeStatusMenuOpen,
    employeeExportFormat,
    setEmployeeExportFormat,
    employeeExportStatus,
    employeeStatusMenuRef,
    filteredEmployees,
    editingEmployee,
    editFormData,
    setEditFormData,
    editLoading,
    editStatus,
    employeePanelMode,
    viewingEmployee,
    openEmployeeView,
    closeEmployeeView,
    employeeImportStatus,
    employeeImportOpen,
    openEmployeeImport,
    closeEmployeeImport,
    refreshAfterEmployeeImport,
    downloadEmployeesTemplate,
    deleteEmployeeTarget,
    setDeleteEmployeeTarget,
    deleteEmployeeLoading,
    createEmployeeLoading,
    createEmployeeStatus,
    newEmployee,
    updateNewEmployee,
    resetNewEmployee,
    shiftOptions,
    closeEmployeePanel,
    openAddEmployeePanel,
    handleCreateEmployee,
    handleEditEmployee,
    handleSaveEmployee,
    requestDeleteEmployee,
    handleDeleteEmployee,
    downloadEmployeesReport
  } = useEmployeesPanel({
    employees,
    canWriteAdminData,
    apiRequest,
    accessToken,
    refreshAccessToken,
    loadDashboard,
    resolveDownloadFilename
  })

  const {
    apiLogFilters,
    apiLogRows,
    apiLogLoading,
    apiLogError,
    apiLogPagination,
    setApiLogPage,
    updateApiLogFilter,
    applyApiLogFilters,
    clearApiLogFilters,
    loadApiLogs,
    resetApiTelemetryPanel
  } = useApiTelemetryPanel({
    isActive: activePanel === 'api-telemetry',
    accessToken,
    profile,
    apiRequest
  })

  const alertLeaveManager = async (leave: LeaveRow) => {
    const matchedManager =
      employees.find((employee) => employee.emp_code && employee.emp_code === leave.manager_code) ||
      employees.find((employee) => employee.emp_email && employee.emp_email === leave.manager_email)
    const managerEmail = (leave.manager_email || matchedManager?.emp_email || '').trim()
    const managerName = matchedManager?.emp_full_name || getLeaveApproverLabel(leave, employees)

    if (!managerEmail) {
      throw new Error('Manager email is unavailable for this leave request.')
    }

    const employeeName = leave.emp_full_name || leave.emp_code || 'An employee'
    const leaveType = formatLeaveTypeLabel(leave)
    const leaveDateRange = `${formatDate(leave.from_date)} - ${formatDate(leave.to_date)}`

    await apiRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        module: 'admin_dashboard',
        eventType: 'leave_pending_manager_alert',
        recipients: [
          {
            email: managerEmail,
            name: managerName
          }
        ],
        channels: ['email'],
        content: {
          title: 'Pending leave approval reminder',
          bodyText: `${employeeName} has a pending ${leaveType} request for ${leaveDateRange}. Please review it from the admin dashboard.`
        },
        deeplinkUrl: `${window.location.origin}${appRoutes.admin}`,
        priority: 'normal',
        idempotencyKey: `leave-manager-alert-${leave.id || leave.emp_code || 'request'}-${Date.now()}`
      })
    })

    return `Alert sent to ${managerName || managerEmail}.`
  }

  const selectedAttendanceDate = attendanceDateFilter || toDateInputValue(new Date())
  const selectedDateAttendanceRows = attendanceRows.filter((row) =>
    isSameDate(row.login_time || row.date, selectedAttendanceDate)
  )

  const firstClockInRows = Array.from(
    selectedDateAttendanceRows.reduce((map, row) => {
      const employeeKey = (row.employee_email || row.employee_name || row.id || '').toString().toLowerCase()
      const existingRow = map.get(employeeKey)
      const currentTime = row.login_time ? new Date(row.login_time).getTime() : Number.MAX_SAFE_INTEGER
      const existingTime = existingRow?.login_time ? new Date(existingRow.login_time).getTime() : Number.MAX_SAFE_INTEGER

      if (!existingRow || currentTime < existingTime) {
        map.set(employeeKey, row)
      }

      return map
    }, new Map<string, AttendanceRow>()).values()
  ).sort((left, right) => {
    const leftTime = left.login_time ? new Date(left.login_time).getTime() : 0
    const rightTime = right.login_time ? new Date(right.login_time).getTime() : 0
    return rightTime - leftTime
  })

  const lateLoginCutoff = new Date(`${selectedAttendanceDate}T10:00:00`)
  const employeeByEmail = new Map(
    employees
      .filter((employee) => employee.emp_email)
      .map((employee) => [employee.emp_email!.toLowerCase(), employee])
  )
  const employeeEmailByCode = new Map(
    employees
      .filter((employee) => employee.emp_code && employee.emp_email)
      .map((employee) => [employee.emp_code!, employee.emp_email!.toLowerCase()])
  )
  const exceptionLateArrivals = attendanceExceptions.filter(
    (item) => item.exception_type === 'late_arrival' && isSameDate(getExceptionDateValue(item), selectedAttendanceDate)
  )
  const lateArrivalsFromAttendance = firstClockInRows
    .filter((row) => {
      if (row.late_arrival?.is_late || row.late_arrival?.informed) {
        return true
      }
      if (!row.login_time) {
        return false
      }
      if (!isSameDate(row.login_time, selectedAttendanceDate)) {
        return false
      }
      const loginDate = new Date(row.login_time)
      return !Number.isNaN(loginDate.getTime()) && loginDate > lateLoginCutoff
    })
    .map((row) => {
      const loginDate = new Date(row.login_time as string)
      const lateByMinutes = Math.max(
        Math.floor((loginDate.getTime() - lateLoginCutoff.getTime()) / 60000),
        0
      )
      const employee =
        row.employee_email ? employeeByEmail.get(row.employee_email.toLowerCase()) : undefined
      const lateArrival = row.late_arrival
      return {
        id: row.id,
        emp_code: employee?.emp_code,
        emp_name: row.employee_name || employee?.emp_full_name || row.employee_email,
        exception_type: 'late_arrival',
        exception_date: selectedAttendanceDate,
        actual_login_time: lateArrival?.actual_login_time || row.login_time,
        exception_time: lateArrival?.planned_arrival_time || undefined,
        late_by_minutes: lateArrival?.late_by_minutes ?? lateByMinutes,
        reason: lateArrival?.reason || undefined,
        status: lateArrival?.status || 'not_informed',
        requested_at: lateArrival?.requested_at || row.login_time
      } as AttendanceExceptionRow
    })

  const selectedDateLateArrivals = (() => {
    const merged = new Map<string, AttendanceExceptionRow>()
    const getKey = (row: AttendanceExceptionRow) => {
      const emailFromCode = row.emp_code ? employeeEmailByCode.get(row.emp_code) : undefined
      const rawKey =
        emailFromCode ||
        row.emp_code ||
        row.emp_name ||
        row.actual_login_time ||
        row.exception_time ||
        row.requested_at ||
        ''
      return rawKey.toString().toLowerCase()
    }

    exceptionLateArrivals.forEach((row) => {
      const key = getKey(row)
      merged.set(key, row)
    })
    lateArrivalsFromAttendance.forEach((row) => {
      const key = getKey(row)
      if (!merged.has(key)) {
        merged.set(key, row)
      }
    })

    return Array.from(merged.values()).sort((left, right) => {
      const leftInformed = (left.status || '').toLowerCase() !== 'not_informed'
      const rightInformed = (right.status || '').toLowerCase() !== 'not_informed'
      if (leftInformed !== rightInformed) {
        return leftInformed ? -1 : 1
      }
      const leftTime = getSortTime(left)
      const rightTime = getSortTime(right)
      return leftTime - rightTime
    })
  })()
  const exceptionEarlyLeaves = attendanceExceptions.filter(
    (item) => item.exception_type === 'early_leave' && isSameDate(getExceptionDateValue(item), selectedAttendanceDate)
  )
  const earlyLeavesFromAttendance = selectedDateAttendanceRows
    .filter((row) => {
      return Boolean(row.early_leave?.is_early_departure || row.early_leave?.requested)
    })
    .map((row) => {
      const employee =
        row.employee_email ? employeeByEmail.get(row.employee_email.toLowerCase()) : undefined
      const earlyLeave = row.early_leave
      return {
        id: row.id,
        emp_code: employee?.emp_code,
        emp_name: row.employee_name || employee?.emp_full_name || row.employee_email,
        exception_type: 'early_leave',
        exception_date: selectedAttendanceDate,
        planned_leave_time: earlyLeave?.planned_leave_time || undefined,
        actual_logout_time: earlyLeave?.actual_logout_time || row.logout_time,
        early_by_minutes: earlyLeave?.early_by_minutes ?? undefined,
        reason: earlyLeave?.reason || undefined,
        status: earlyLeave?.status || (earlyLeave?.requested ? 'pending' : 'not_requested'),
        requested_at: earlyLeave?.requested_at || row.logout_time
      } as AttendanceExceptionRow
    })
  const selectedDateEarlyLeaves = (() => {
    const merged = new Map<string, AttendanceExceptionRow>()
    const getKey = (row: AttendanceExceptionRow) => {
      const emailFromCode = row.emp_code ? employeeEmailByCode.get(row.emp_code) : undefined
      const rawKey =
        emailFromCode ||
        row.emp_code ||
        row.emp_name ||
        row.actual_logout_time ||
        row.planned_leave_time ||
        row.requested_at ||
        ''
      return rawKey.toString().toLowerCase()
    }

    exceptionEarlyLeaves.forEach((row) => {
      merged.set(getKey(row), row)
    })
    earlyLeavesFromAttendance.forEach((row) => {
      const key = getKey(row)
      if (!merged.has(key)) {
        merged.set(key, row)
      }
    })

    return Array.from(merged.values()).sort((left, right) => {
      const leftRequested = !['not_requested', ''].includes((left.status || '').toLowerCase())
      const rightRequested = !['not_requested', ''].includes((right.status || '').toLowerCase())
      if (leftRequested !== rightRequested) {
        return leftRequested ? -1 : 1
      }
      const leftTime = new Date(left.requested_at || left.actual_logout_time || left.exception_date || '').getTime() || 0
      const rightTime = new Date(right.requested_at || right.actual_logout_time || right.exception_date || '').getTime() || 0
      return leftTime - rightTime
    })
  })()
  const selectedDateExceptions = [
    ...selectedDateLateArrivals.map((row) => ({
      ...row,
      exceptionKind: 'late_arrival' as const
    })),
    ...selectedDateEarlyLeaves.map((row) => ({
      ...row,
      exceptionKind: 'early_leave' as const
    }))
  ].sort((left, right) => getSortTime(right) - getSortTime(left))

  const {
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
  } = useAttendancePanel({
    isActive: activePanel === 'attendance',
    accessToken,
    apiRequest,
    attendanceDateFilter,
    employees,
    firstClockInRows,
    selectedDateLateArrivals,
    selectedDateEarlyLeaves
  })

  const {
    filters: attendanceExceptionFilters,
    rows: attendanceExceptionRows,
    kpis: attendanceExceptionKpis,
    filterOptions: attendanceExceptionFilterOptions,
    loading: attendanceExceptionLoading,
    error: attendanceExceptionError,
    changePage: setAttendanceExceptionPage,
    pagination: attendanceExceptionPagination,
    lastSyncedAt: attendanceExceptionLastSyncedAt,
    updateFilter: updateAttendanceExceptionFilter,
    clearFilters: clearAttendanceExceptionFilters,
    refresh: loadAttendanceExceptions,
    setSort: setAttendanceExceptionSort,
    applyPreset: presetAttendanceExceptionFilter,
    reset: resetAttendanceExceptionsPanel
  } = useAttendanceExceptionsData({
    isActive: activePanel === 'attendance-exceptions',
    accessToken,
    apiRequest
  })

  const {
    filters: overtimeRecordFilters,
    records: overtimeRecordRows,
    kpis: overtimeRecordKpis,
    filterOptions: overtimeRecordFilterOptions,
    pagination: overtimeRecordPagination,
    loading: overtimeRecordLoading,
    actionLoading: overtimeRecordActionLoading,
    actionStatus: overtimeRecordActionStatus,
    error: overtimeRecordError,
    validationError: overtimeRecordValidationError,
    lastSyncedAt: overtimeRecordLastSyncedAt,
    updateFilter: updateOvertimeRecordFilter,
    changePage: changeOvertimeRecordPage,
    refresh: refreshOvertimeRecords,
    createRecord: createOvertimeRecord,
    updateRecord: updateOvertimeRecord,
    deleteRecord: deleteOvertimeRecord,
    updateStatus: updateOvertimeRecordStatus,
    approveRecord: approveOvertimeRecord,
    reset: resetOvertimeRecordsPanel
  } = useOvertimeRecordsData({
    isActive: activePanel === 'overtime-records',
    accessToken,
    apiRequest
  })

  // Only resetLeavesPanel is consumed here (on logout) - the rest of this
  // hook's filter/refresh surface was exclusive to the legacy Leaves admin
  // page, now replaced by useAdminLeavesData below. leaveRows/setLeaveRows
  // themselves come from useDashboardData and back unrelated dashboard
  // panels, so that state is untouched.
  const { resetLeavesPanel } = useLeavesPanel({
    employees,
    apiRequest,
    accessToken,
    refreshAccessToken,
    setLeaveRows
  })

  const {
    filters: adminLeaveFilters,
    rows: adminLeaveRows,
    kpis: adminLeaveKpis,
    filterOptions: adminLeaveFilterOptions,
    loading: adminLeaveLoading,
    error: adminLeaveError,
    changePage: setAdminLeavePage,
    pagination: adminLeavePagination,
    lastSyncedAt: adminLeaveLastSyncedAt,
    updateFilter: updateAdminLeaveFilter,
    clearFilters: clearAdminLeaveFilters,
    refresh: refreshAdminLeaves,
    setSort: setAdminLeaveSort,
    applyPreset: presetAdminLeaveFilter
  } = useAdminLeavesData({
    isActive: activePanel === 'leaves',
    accessToken,
    apiRequest
  })

  const { showTodayActivities, setShowTodayActivities, filteredActivities } = useActivitiesPanel({
    activityRows
  })

  const {
    fieldVisitDurationTick,
    fieldVisitPanelOpen,
    setFieldVisitPanelOpen,
    fieldVisitPanelRow,
    fieldVisitPanelLoading,
    fieldVisitPanelError,
    fieldVisitTimelineItems,
    mapDialogOpen,
    setMapDialogOpen,
    mapDialogTitle,
    mapDialogLoading,
    mapDialogError,
    mapTrackingPoints,
    mapCenter,
    mapSummary,
    mapContainerRef,
    openFieldVisitPanel,
    openMapForFieldVisit,
    fieldVisitPanelDurationMinutes,
    fieldPointCount,
    activityPointCount,
    startPoint,
    endPoint
  } = useFieldVisitsPanel({
    showAdminLogin,
    fieldVisitRows,
    apiRequest
  })

  const attendanceCountByDate = attendanceRows.reduce<Record<string, number>>((accumulator, row) => {
    const key = row.login_time ? toDateInputValue(new Date(row.login_time)) : row.date?.slice(0, 10)
    if (key) {
      accumulator[key] = (accumulator[key] || 0) + 1
    }
    return accumulator
  }, {})
  const exceptionCountByDate = attendanceExceptions.reduce<Record<string, number>>((accumulator, row) => {
    const key = getExceptionDateValue(row)?.slice(0, 10)
    if (key) {
      accumulator[key] = (accumulator[key] || 0) + 1
    }
    return accumulator
  }, {})
  const selectedDateLeaves = leaveRows
    .filter((row) => {
      const status = (row.status || '').toLowerCase()
      return (
        !['rejected', 'cancelled'].includes(status) &&
        isDateWithinRange(selectedAttendanceDate, row.from_date, row.to_date)
      )
    })
    .sort((left, right) =>
      (left.emp_full_name || left.emp_code || '').localeCompare(right.emp_full_name || right.emp_code || '')
    )
  const weeklyAttendanceTrend = buildWeeklyAttendanceTrend(attendanceRows, selectedAttendanceDate)
  const attendanceEfficiencyScores = buildAttendanceEfficiencyScores(employees, attendanceRows, selectedAttendanceDate)

  const {
    calendarMonthView,
    setCalendarMonthView,
    calendarMonthLabel,
    calendarDays,
    maxCalendarAttendance,
    leaveCountByDate
  } = useCalendarPanel({
    attendanceDateFilter,
    attendanceCountByDate,
    leaveRows
  })

  const {
    attendanceReportMonth,
    setAttendanceReportMonth,
    attendanceReportYear,
    setAttendanceReportYear,
    attendanceReportFormat,
    setAttendanceReportFormat,
    attendanceReportStatus,
    reportDateMode,
    setReportDateMode,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    downloadRangeReport,
    downloadDailyAttendanceReport,
    downloadMonthlyAttendanceReport,
    maxWeeklyAttendance,
    weeklyTrendPoints
  } = useReportsPanel({
    accessToken,
    refreshAccessToken,
    attendanceDateFilter,
    weeklyAttendanceTrend,
    resolveDownloadFilename
  })

    const renderDashboardPanel = () => {
    if (dashboardLoading) {
      return <div className="empty-state">Loading admin data...</div>
    }

    if (dashboardError) {
      return (
        <div className="empty-state">
          <strong>Unable to load dashboard</strong>
          <p>{dashboardError}</p>
          <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
            Retry
          </button>
        </div>
      )
    }

    if (activePanel === 'dashboard') {
      return (
        <AdminOverviewPage
          attendanceDateFilter={attendanceDateFilter}
          attendanceCountByDate={attendanceCountByDate}
          exceptionCountByDate={exceptionCountByDate}
          employees={employees}
          employeeAuditLogs={employeeAuditLogs}
          missedLoginLeader={missedLoginLeader}
          fieldVisitRows={fieldVisitRows}
          firstClockInRows={firstClockInRows}
          formatLeaveTypeLabel={formatLeaveTypeLabel}
          leaveRows={leaveRows}
          loadDashboard={() => loadDashboard(accessToken)}
          onAlertManager={alertLeaveManager}
          selectedDateExceptions={selectedDateExceptions}
          selectedDateLeaves={selectedDateLeaves}
          weeklyAttendanceTrend={weeklyAttendanceTrend}
        />
      )
    }

    if (activePanel === 'employees') {
      return (
        <AdminEmployeesPage
          canWriteAdminData={canWriteAdminData}
          downloadEmployeesReport={downloadEmployeesReport}
          employeeExportFormat={employeeExportFormat}
          employeeExportStatus={employeeExportStatus}
          employeeKpiFilter={employeeKpiFilter}
          employeeSearch={employeeSearch}
          employeeStatusFilter={employeeStatusFilter}
          employeeStatusMenuOpen={employeeStatusMenuOpen}
          employeeStatusMenuRef={employeeStatusMenuRef}
          employees={employees}
          filteredEmployees={filteredEmployees}
          formatEmployeeGrade={formatEmployeeGrade}
          handleEditEmployee={handleEditEmployee}
          openEmployeeView={openEmployeeView}
          employeeImportStatus={employeeImportStatus}
          openEmployeeImport={openEmployeeImport}
          downloadEmployeesTemplate={downloadEmployeesTemplate}
          loadDashboard={() => loadDashboard(accessToken)}
          openAddEmployeePanel={openAddEmployeePanel}
          applyEmployeeKpiFilter={applyEmployeeKpiFilter}
          requestDeleteEmployee={requestDeleteEmployee}
          setEmployeeExportFormat={setEmployeeExportFormat}
          setEmployeeSearch={setEmployeeSearch}
          setEmployeeStatusFilter={setEmployeeStatusFilter}
          setEmployeeStatusMenuOpen={setEmployeeStatusMenuOpen}
        />
      )
    }

    if (employeeMasterIsActive) {
      return (
        <AdminEmployeeMasterPage
          key={employeeMasterResource.key}
          actionLoading={employeeMasterActionLoading}
          actionStatus={employeeMasterActionStatus}
          canWriteAdminData={canWriteAdminData}
          error={employeeMasterError}
          filterOptions={employeeMasterFilterOptions}
          filters={employeeMasterFilters}
          lastSyncedAt={employeeMasterLastSyncedAt}
          loading={employeeMasterLoading}
          pagination={employeeMasterPagination}
          records={employeeMasterRecords}
          resource={employeeMasterResource}
          applyFilters={applyEmployeeMasterFilters}
          changePage={changeEmployeeMasterPage}
          clearFilters={clearEmployeeMasterFilters}
          createRecord={createEmployeeMasterRecord}
          deleteRecord={deleteEmployeeMasterRecord}
          refresh={refreshEmployeeMaster}
          updateFilter={updateEmployeeMasterFilter}
          updateRecord={updateEmployeeMasterRecord}
        />
      )
    }

    if (activePanel === 'attendance-exceptions') {
      return (
        <AdminAttendanceExceptionsPage
          error={attendanceExceptionError}
          filters={attendanceExceptionFilters}
          filterOptions={attendanceExceptionFilterOptions}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          kpis={attendanceExceptionKpis}
          loading={attendanceExceptionLoading}
          lastSyncedAt={attendanceExceptionLastSyncedAt}
          onChangePage={setAttendanceExceptionPage}
          onClearFilters={clearAttendanceExceptionFilters}
          onRefresh={loadAttendanceExceptions}
          onSort={setAttendanceExceptionSort}
          onPresetFilter={presetAttendanceExceptionFilter}
          pagination={attendanceExceptionPagination}
          records={attendanceExceptionRows}
          updateFilter={updateAttendanceExceptionFilter}
          apiRequest={apiRequest}
          accessToken={accessToken}
        />
      )
    }

    if (activePanel === 'attendance') {
      return (
        <AdminAttendancePage
          actionableMissedLoginEmployeeCodes={actionableMissedLoginEmployeeCodes}
          alertCandidatesLoading={alertCandidatesLoading}
          alertSentEmpCodes={alertSentEmpCodes}
          alertSendCounts={alertSendCounts}
          alertTriggerLoading={alertTriggerLoading}
          alertTriggerStatus={alertTriggerStatus}
          allMissedLoginsSelected={allMissedLoginsSelected}
          attendanceDateFilter={attendanceDateFilter}
          attendancePageRows={attendancePageRows}
          attendanceSearch={attendanceSearch}
          attendanceView={attendanceView}
          exceptionRows={exceptionRows}
          filteredAttendanceRows={filteredAttendanceRows}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
          formatDateTime={formatDateTime}
          formatLeaveTypeLabel={formatLeaveTypeLabel}
          formatWorkingHours={formatWorkingHours}
          loadDashboard={() => loadDashboard(accessToken)}
          missedLoginEmpCodes={missedLoginEmpCodes}
          missedLoginEmployees={missedLoginEmployees}
          reminderPreviewBody={reminderPreviewBody}
          reminderPreviewTitle={reminderPreviewTitle}
          reminderTargetDate={reminderTargetDate}
          selectedAttendanceDate={selectedAttendanceDate}
          selectedDateEarlyLeaves={selectedDateEarlyLeaves}
          selectedDateLateArrivals={selectedDateLateArrivals}
          selectedDateLeaves={selectedDateLeaves}
          selectedMissedLoginCount={selectedMissedLoginCount}
          selectedMissedLoginEmpCodes={selectedMissedLoginEmpCodes}
          setAlertTriggerStatus={setAlertTriggerStatus}
          setAttendanceDateFilter={setAttendanceDateFilter}
          setAttendanceSearch={setAttendanceSearch}
          setAttendanceView={setAttendanceView}
          setSelectedMissedLoginEmpCodes={setSelectedMissedLoginEmpCodes}
          setShowAlertComposer={setShowAlertComposer}
          showAlertComposer={showAlertComposer}
          triggerAttendanceReminder={triggerAttendanceReminder}
        />
        )
      }

    if (activePanel === 'attendance-records') {
      return (
        <AdminAttendanceRecordsPage
          attendanceDateFilter={attendanceDateFilter}
          attendanceRows={attendanceRows}
          formatDateOnly={formatDateOnly}
          formatDateTime={formatDateTime}
          formatWorkingHours={formatWorkingHours}
          loadDashboard={() => loadDashboard(accessToken)}
          setAttendanceDateFilter={setAttendanceDateFilter}
        />
      )
    }

      if (activePanel === 'calendar') {
        return (
        <AdminCalendarPage
          attendanceCountByDate={attendanceCountByDate}
          calendarDays={calendarDays}
          calendarMonthLabel={calendarMonthLabel}
          calendarMonthView={calendarMonthView}
          exceptionCountByDate={exceptionCountByDate}
          leaveCountByDate={leaveCountByDate}
          maxCalendarAttendance={maxCalendarAttendance}
          setAttendanceDateFilter={setAttendanceDateFilter}
          setCalendarMonthView={setCalendarMonthView}
          toDateInputValue={toDateInputValue}
        />
      )
    }

    if (activePanel === 'reports') {
      return (
        <AdminReportsPage
          attendanceDateFilter={attendanceDateFilter}
          attendanceEfficiencyScores={attendanceEfficiencyScores}
          attendanceReportFormat={attendanceReportFormat}
          attendanceReportMonth={attendanceReportMonth}
          attendanceReportStatus={attendanceReportStatus}
          attendanceReportYear={attendanceReportYear}
          reportDateMode={reportDateMode}
          setReportDateMode={setReportDateMode}
          reportStartDate={reportStartDate}
          setReportStartDate={setReportStartDate}
          reportEndDate={reportEndDate}
          setReportEndDate={setReportEndDate}
          downloadRangeReport={downloadRangeReport}
          downloadDailyAttendanceReport={downloadDailyAttendanceReport}
          downloadMonthlyAttendanceReport={downloadMonthlyAttendanceReport}
          loadDashboard={() => loadDashboard(accessToken)}
          maxWeeklyAttendance={maxWeeklyAttendance}
          setAttendanceDateFilter={setAttendanceDateFilter}
          setAttendanceReportFormat={setAttendanceReportFormat}
          setAttendanceReportMonth={setAttendanceReportMonth}
          setAttendanceReportYear={setAttendanceReportYear}
          weeklyAttendanceTrend={weeklyAttendanceTrend}
          weeklyTrendPoints={weeklyTrendPoints}
        />
      )
    }

    if (activePanel === 'leaves') {
      return (
        <AdminLeavesPage
          error={adminLeaveError}
          filters={adminLeaveFilters}
          filterOptions={adminLeaveFilterOptions}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          kpis={adminLeaveKpis}
          loading={adminLeaveLoading}
          lastSyncedAt={adminLeaveLastSyncedAt}
          onChangePage={setAdminLeavePage}
          onClearFilters={clearAdminLeaveFilters}
          onRefresh={refreshAdminLeaves}
          onSort={setAdminLeaveSort}
          onPresetFilter={presetAdminLeaveFilter}
          pagination={adminLeavePagination}
          records={adminLeaveRows}
          updateFilter={updateAdminLeaveFilter}
          onAlertManager={alertLeaveManager}
          apiRequest={apiRequest}
          accessToken={accessToken}
        />
      )
    }

    if (activePanel === 'overtime-records') {
      return (
        <AdminOvertimeRecordsPage
          actionLoading={overtimeRecordActionLoading}
          actionStatus={overtimeRecordActionStatus}
          canWriteAdminData={canWriteAdminData}
          error={overtimeRecordError}
          filterOptions={overtimeRecordFilterOptions}
          filters={overtimeRecordFilters}
          formatDateOnly={formatDateOnly}
          formatDateTime={formatDateTime}
          kpis={overtimeRecordKpis}
          lastSyncedAt={overtimeRecordLastSyncedAt}
          loading={overtimeRecordLoading}
          pagination={overtimeRecordPagination}
          records={overtimeRecordRows}
          validationError={overtimeRecordValidationError}
          approveRecord={approveOvertimeRecord}
          createRecord={createOvertimeRecord}
          deleteRecord={deleteOvertimeRecord}
          onChangePage={changeOvertimeRecordPage}
          refresh={refreshOvertimeRecords}
          updateRecord={updateOvertimeRecord}
          updateFilter={updateOvertimeRecordFilter}
          updateStatus={updateOvertimeRecordStatus}
        />
      )
    }

    if (activePanel === 'activities') {
      return (
        <AdminActivitiesPage
          filteredActivities={filteredActivities}
          formatDateTime={formatDateTime}
          loadDashboard={() => loadDashboard(accessToken)}
          setShowTodayActivities={setShowTodayActivities}
          showTodayActivities={showTodayActivities}
        />
      )
    }

    if (activePanel === 'inbox') {
      return (
        <AdminEmptyPanel
          eyebrow="Administration"
          title="Inbox"
          message="Inbox is empty."
        />
      )
    }

    if (activePanel === 'api-telemetry' && profile?.emp_code === API_TELEMETRY_EMP_CODE) {
      return (
        <AdminApiTelemetryPage
          clientEntries={telemetryEntries}
          onClearClientEntries={clearTelemetryEntries}
          serverError={apiLogError}
          serverFilters={apiLogFilters}
          serverLoading={apiLogLoading}
          serverPagination={apiLogPagination}
          serverRecords={apiLogRows}
          onApplyServerFilters={applyApiLogFilters}
          onChangeServerPage={setApiLogPage}
          onClearServerFilters={clearApiLogFilters}
          onRefreshServerLogs={() => void loadApiLogs(accessToken)}
          updateServerFilter={updateApiLogFilter}
        />
      )
    }

    return (
      <AdminFieldVisitsPage
        fieldVisitDurationTick={fieldVisitDurationTick}
        fieldVisitRows={fieldVisitRows}
        formatDateTime={formatDateTime}
        formatDistanceKm={formatDistanceKm}
        formatVisitDuration={formatVisitDuration}
        loadDashboard={() => loadDashboard(accessToken)}
        openFieldVisitPanel={openFieldVisitPanel}
        openMapForFieldVisit={openMapForFieldVisit}
        resolveVisitDurationMinutes={resolveVisitDurationMinutes}
      />
    )
  }

    const loginTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device Time'
    const loginTimeLabel = new Intl.DateTimeFormat([], {
      hour: 'numeric',
      minute: '2-digit'
    }).format(loginSceneTime)
    const loginDateLabel = new Intl.DateTimeFormat([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).format(loginSceneTime)
    const loginSceneMode = getLoginSceneMode(loginSceneTime)

    return (
      <div className={`admin-shell${showAdminLogin ? ' admin-shell-login' : ''}`}>
        {!showAdminLogin ? (
          <AdminSidebar
            profile={profile}
            activePanel={activePanel}
            onSelectPanel={(id) => {
              setActivePanel(id)
              navigate(getAdminPanelPath(id))
            }}
            onLogout={handleLogout}
          />
        ) : null}

        <main className={`dashboard-main${showAdminLogin ? ' dashboard-main-login' : ''}`}>
          {fieldVisitPanelOpen && fieldVisitPanelRow ? (
            <FieldVisitDetailDrawer
              row={fieldVisitPanelRow}
              durationMinutes={fieldVisitPanelDurationMinutes}
              loading={fieldVisitPanelLoading}
              error={fieldVisitPanelError}
              timelineItems={fieldVisitTimelineItems}
              formatDateTime={formatDateTime}
              onClose={() => setFieldVisitPanelOpen(false)}
            />
          ) : null}
          {mapDialogOpen ? (
            <MapDialog
              title={mapDialogTitle}
              loading={mapDialogLoading}
              error={mapDialogError}
              mapContainerRef={mapContainerRef}
              mapCenter={mapCenter}
              fieldPointCount={fieldPointCount}
              activityPointCount={activityPointCount}
              distanceKm={mapSummary?.distanceKm}
              startPoint={startPoint}
              endPoint={endPoint}
              mapTrackingPoints={mapTrackingPoints}
              onClose={() => setMapDialogOpen(false)}
            />
          ) : null}
          {showAdminLogin ? (
            <AdminLoginPage
              adminEmpCode={adminEmpCode}
              adminOtp={adminOtp}
              authLoading={authLoading}
              authStatus={authStatus}
              loginDateLabel={loginDateLabel}
              loginLocationDetails={loginLocationDetails}
              loginSceneMode={loginSceneMode}
              loginTimeLabel={loginTimeLabel}
              loginTimeZone={loginTimeZone}
              onAdminEmpCodeChange={setAdminEmpCode}
              onAdminOtpChange={setAdminOtp}
              onBack={() => navigate(appRoutes.home)}
              onLogin={() => void handleAdminLogin()}
              onRequestOtp={() => void handleAdminRequestOtp()}
              timeZoneLabel={formatTimeZoneLabel(loginTimeZone)}
            />
          ) : (
            <>
              {refreshNotice ? <div className="refresh-toast">{refreshNotice}</div> : null}
              {renderDashboardPanel()}
            </>
          )}

          {employeePanelMode ? (
            <EmployeeFormDrawer
              mode={employeePanelMode}
              newEmployee={newEmployee}
              updateNewEmployee={updateNewEmployee}
              resetNewEmployee={resetNewEmployee}
              createEmployeeLoading={createEmployeeLoading}
              createEmployeeStatus={createEmployeeStatus}
              onCreateEmployee={() => void handleCreateEmployee()}
              editingEmployee={editingEmployee}
              editFormData={editFormData}
              setEditFormData={setEditFormData}
              editLoading={editLoading}
              editStatus={editStatus}
              onSaveEmployee={handleSaveEmployee}
              onClose={closeEmployeePanel}
              shiftOptions={shiftOptions}
            />
          ) : null}
          {employeeImportOpen ? (
            <EmployeeImportDrawer
              employees={employees}
              apiRequest={apiRequest}
              onClose={closeEmployeeImport}
              onImported={refreshAfterEmployeeImport}
              onDownloadTemplate={downloadEmployeesTemplate}
            />
          ) : null}
          {viewingEmployee ? (
            <EmployeeViewDrawer employee={viewingEmployee} onClose={closeEmployeeView} onEdit={canWriteAdminData ? () => { closeEmployeeView(); handleEditEmployee(viewingEmployee) } : undefined} />
          ) : null}
          {deleteEmployeeTarget ? (
            <DeleteEmployeeModal
              target={deleteEmployeeTarget}
              deleteLoading={deleteEmployeeLoading}
              statusMessage={editStatus}
              onClose={() => setDeleteEmployeeTarget(null)}
              onConfirmDelete={() => void handleDeleteEmployee()}
            />
          ) : null}
        </main>
      </div>
    )
}

export default FawnixApp
