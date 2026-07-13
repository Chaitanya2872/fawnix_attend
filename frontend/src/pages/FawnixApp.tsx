/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { appRoutes } from '../app/config/routes'
import '../App.css'
import {
  EMPTY_LEAVE_FILTERS,
  LEAVE_STATUS_FILTER_OPTIONS,
  LEAVE_TYPE_FILTER_OPTIONS,
  sidebarItems as sidebarItemDefinitions
} from '../features/admin/config/sidebar'
import { useAdminLoginExperience } from '../features/admin/hooks/useAdminLoginExperience'
import { useAdminSession } from '../features/admin/hooks/useAdminSession'
import AdminLoginPage from '../features/admin/pages/AdminLoginPage'
import AdminActivitiesPage from '../features/admin/pages/sidebar/AdminActivitiesPage'
import AdminAttendancePage from '../features/admin/pages/sidebar/AdminAttendancePage'
import AdminAttendanceExceptionsPage from '../features/admin/pages/sidebar/AdminAttendanceExceptionsPage'
import AdminCalendarPage from '../features/admin/pages/sidebar/AdminCalendarPage'
import AdminEmployeesPage from '../features/admin/pages/sidebar/AdminEmployeesPage'
import AdminFieldVisitsPage from '../features/admin/pages/sidebar/AdminFieldVisitsPage'
import AdminLeavesPage from '../features/admin/pages/sidebar/AdminLeavesPage'
import AdminOverviewPage from '../features/admin/pages/sidebar/AdminOverviewPage'
import AdminReportsPage from '../features/admin/pages/sidebar/AdminReportsPage'
import type { LeaveFilterState } from '../features/admin/types/sidebar'
import {
  formatCoords,
  formatDistanceKm,
  formatEmployeeGrade,
  formatLeaveTypeLabel,
  formatWorkingHours,
  getLeaveApproverLabel,
  getLeaveReasonLabel,
  toTitleCase
} from '../features/admin/utils/formatters'
import {
  buildFieldVisitTimelineItems,
  buildRoutePoints,
  calculateDistanceKm,
  compactCoords,
  formatCoordsValue,
  formatDestinationLocation,
  formatVisitDuration,
  getDestinationVisitCounts,
  getDestinationVisitFlag,
  getDestinationVisitedStatus,
  getLocationName,
  isCompletedVisitStatus,
  normalizeFieldVisitTrackingPoints,
  parseCoords,
  resolveVisitDurationMinutes
} from '../features/admin/utils/fieldVisits'
import { hasWriteAccess, isPrivilegedUser } from '../features/admin/utils/permissions'
import { features, useCases, workflowSteps as steps } from '../features/public/constants/publicContent'
import { useClickOutside } from '../hooks/useClickOutside'
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
  getCalendarDays,
  getCalendarMonthLabel,
  isSameDate,
  parseDateInputValue,
  toDateInputValue
} from '../utils/date/dateUtils'
import type {
  ActivityRow,
  AdminAttendanceExceptionFilterState,
  AdminAttendanceExceptionPagination,
  AdminAttendanceExceptionRecord,
  AdminProfile,
  AttendanceExceptionRow,
  AttendanceRow,
  EmployeeRow,
  FieldVisitRow,
  FieldVisitTimelineItem,
  FieldVisitTrackingPoint,
  LeaveRow,
  MapTrackingPoint,
  SidebarId
} from '../types/admin'

const sidebarItems = sidebarItemDefinitions
const EMPTY_ATTENDANCE_EXCEPTION_FILTERS: AdminAttendanceExceptionFilterState = {
  search: '',
  exceptionType: '',
  status: '',
  fromDate: '',
  toDate: '',
}
const EMPTY_ATTENDANCE_EXCEPTION_PAGINATION: AdminAttendanceExceptionPagination = {
  page: 1,
  page_size: 10,
  total_records: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
}
const adminPanelPathMap: Record<SidebarId, string> = {
  dashboard: '',
  employees: 'employees',
  attendance: 'attendance',
  'attendance-exceptions': 'attendance-exceptions',
  calendar: 'calendar',
  reports: 'reports',
  leaves: 'leaves',
  activities: 'activities',
  'field-visits': 'field-visits',
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
  return row.exception_date || row.requested_at
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

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`
}

void formatCoordinate

function formatTimeZoneLabel(timeZone: string) {
  if (!timeZone) {
    return 'Device Time'
  }

  const parts = timeZone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

function SidebarIcon({ name }: { name: 'home' | 'users' | 'pulse' | 'alert' | 'calendar' | 'chart' | 'leaf' | 'activity' | 'pin' }) {
  const paths = {
    users: (
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8m8.5 10v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    pulse: (
      <path
        d="M3 12h4l2.5-5 4 10 2.5-5H21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    alert: (
      <path
        d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    calendar: (
      <path
        d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    chart: (
      <path
        d="M4 19h16M7 15l3-3 3 2 4-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    leaf: (
      <path
        d="M6 21C16 18 20 11 20 4c-7 0-14 4-17 14c-.5 1.9.1 3 3 3Zm0 0c0-5 4-9 9-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    activity: (
      <path
        d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    pin: (
      <path
        d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    home: (
      <path
        d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function FawnixApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const [empCode, setEmpCode] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true)
  const [activePanel, setActivePanel] = useState<SidebarId>(() => getAdminPanelFromPath(window.location.pathname))
  const [showAdminLogin, setShowAdminLogin] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState('')
  const [adminEmpCode, setAdminEmpCode] = useState('')
  const [adminOtp, setAdminOtp] = useState('')
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<EmployeeRow>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [employeeStatusMenuOpen, setEmployeeStatusMenuOpen] = useState(false)
  const [employeePanelMode, setEmployeePanelMode] = useState<'add' | 'edit' | null>(null)
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<EmployeeRow | null>(null)
  const [deleteEmployeeLoading, setDeleteEmployeeLoading] = useState(false)
  const [showTodayActivities, setShowTodayActivities] = useState(true)
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [, setAttendanceTotalCount] = useState(0)
  const [, setAttendanceShiftMetrics] = useState({
    lateLogins: 0,
    onTimeLogins: 0,
    loggedOut: 0,
    lateExceptions: 0
  })
  const [attendanceExceptions, setAttendanceExceptions] = useState<AttendanceExceptionRow[]>([])
  const [, setAttendanceExceptionSummary] = useState({
    lateArrivals: 0,
    earlyLeaves: 0
  })
  const [attendanceView, setAttendanceView] = useState<'attendance' | 'late-arrivals' | 'early-leaves' | 'leaves' | 'missed-logins'>('attendance')
  const [, setAttendanceSummary] = useState({
    attendanceCount: 0,
    compOffDays: 0,
    efficiencyScore: 0
  })
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [leaveFilters, setLeaveFilters] = useState<LeaveFilterState>({ ...EMPTY_LEAVE_FILTERS })
  const [leaveFilterLoading, setLeaveFilterLoading] = useState(false)
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('')
  const [attendanceExceptionFilters, setAttendanceExceptionFilters] = useState<AdminAttendanceExceptionFilterState>({
    ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS
  })
  const [appliedAttendanceExceptionFilters, setAppliedAttendanceExceptionFilters] =
    useState<AdminAttendanceExceptionFilterState>({
      ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS
    })
  const [attendanceExceptionRows, setAttendanceExceptionRows] = useState<AdminAttendanceExceptionRecord[]>([])
  const [attendanceExceptionLoading, setAttendanceExceptionLoading] = useState(false)
  const [attendanceExceptionError, setAttendanceExceptionError] = useState('')
  const [attendanceExceptionPage, setAttendanceExceptionPage] = useState(1)
  const [attendanceExceptionPagination, setAttendanceExceptionPagination] =
    useState<AdminAttendanceExceptionPagination>({ ...EMPTY_ATTENDANCE_EXCEPTION_PAGINATION })
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [fieldVisitDurationTick, setFieldVisitDurationTick] = useState(() => Date.now())
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(() => toDateInputValue(new Date()))
  const [calendarMonthView, setCalendarMonthView] = useState(() => parseDateInputValue(toDateInputValue(new Date())))
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceReportMonth, setAttendanceReportMonth] = useState(() => String(new Date().getMonth() + 1))
  const [attendanceReportYear, setAttendanceReportYear] = useState(() => String(new Date().getFullYear()))
  const [attendanceReportFormat, setAttendanceReportFormat] = useState<'csv' | 'pdf' | 'xlsx'>('csv')
  const [attendanceReportStatus, setAttendanceReportStatus] = useState('')
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [mapDialogTitle, setMapDialogTitle] = useState('')
  const [mapDialogLoading, setMapDialogLoading] = useState(false)
  const [mapDialogError, setMapDialogError] = useState('')
  const [mapPoints, setMapPoints] = useState<Array<{ lat: number; lon: number }>>([])
  const [mapTrackingPoints, setMapTrackingPoints] = useState<MapTrackingPoint[]>([])
  const [mapFieldTrackingPoints, setMapFieldTrackingPoints] = useState<MapTrackingPoint[]>([])
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [mapSummary, setMapSummary] = useState<{
    startName?: string
    startAddress?: string
    endName?: string
    endAddress?: string
    startCoords?: { lat: number; lon: number } | null
    endCoords?: { lat: number; lon: number } | null
    distanceKm?: number | null
    pointsCount?: number
    isCompleted?: boolean
  } | null>(null)
  const [fieldVisitPanelOpen, setFieldVisitPanelOpen] = useState(false)
  const [fieldVisitPanelRow, setFieldVisitPanelRow] = useState<FieldVisitRow | null>(null)
  const [fieldVisitPanelLoading, setFieldVisitPanelLoading] = useState(false)
  const [fieldVisitPanelError, setFieldVisitPanelError] = useState('')
  const [fieldVisitTimelineItems, setFieldVisitTimelineItems] = useState<FieldVisitTimelineItem[]>([])
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const employeeStatusMenuRef = useRef<HTMLDivElement | null>(null)
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false)
  const [createEmployeeStatus, setCreateEmployeeStatus] = useState('')
  const [missedLoginEmpCodes, setMissedLoginEmpCodes] = useState<string[]>([])
  const [, setAlertEligibleEmpCodes] = useState<string[]>([])
  const [alertCandidatesLoading, setAlertCandidatesLoading] = useState(false)
  const [alertTriggerLoading, setAlertTriggerLoading] = useState(false)
  const [alertTriggerStatus, setAlertTriggerStatus] = useState('')
  const [showAlertComposer, setShowAlertComposer] = useState(false)
  const [selectedMissedLoginEmpCodes, setSelectedMissedLoginEmpCodes] = useState<string[]>([])
  const [alertSentEmpCodes, setAlertSentEmpCodes] = useState<string[]>([])
  const [alertSendCounts, setAlertSendCounts] = useState<Record<string, number>>({})
  const [newEmployee, setNewEmployee] = useState({
    emp_code: '',
    emp_full_name: '',
    emp_email: '',
    emp_contact: '',
    emp_grade: '',
    emp_designation: '',
    emp_department: '',
    emp_manager: '',
    role: 'employee'
  })
  const attendancePageSize = 1000
  const clearAdminData = () => {
    setEmployees([])
    setAttendanceRows([])
    setAttendanceExceptions([])
    setAttendanceExceptionSummary({ lateArrivals: 0, earlyLeaves: 0 })
    setAttendanceView('attendance')
    setLeaveRows([])
    setLeaveFilters({ ...EMPTY_LEAVE_FILTERS })
    setLeaveFilterStatus('')
    setAttendanceExceptionFilters({ ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS })
    setAppliedAttendanceExceptionFilters({ ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS })
    setAttendanceExceptionRows([])
    setAttendanceExceptionError('')
    setAttendanceExceptionPage(1)
    setAttendanceExceptionPagination({ ...EMPTY_ATTENDANCE_EXCEPTION_PAGINATION })
    setActivityRows([])
    setFieldVisitRows([])
    setMissedLoginEmpCodes([])
    setAlertEligibleEmpCodes([])
    setAlertSentEmpCodes([])
    setAlertSendCounts({})
    setSelectedMissedLoginEmpCodes([])
  }
  const {
    accessToken,
    hasStoredSession,
    refreshToken,
    profile,
    refreshNotice,
    persistSession,
    clearSession,
    refreshAccessToken,
    apiRequest
  } = useAdminSession({
    onSessionCleared: clearAdminData,
    onSessionExpired: (message) => {
      setShowAdminLogin(true)
      setAuthStatus(message)
    }
  })
  const { loginSceneTime, loginLocationDetails } = useAdminLoginExperience(showAdminLogin)

  useEffect(() => {
    if (hasStoredSession) {
      setShowAdminLogin(false)
    }
  }, [hasStoredSession])

  useEffect(() => {
    const nextPanel = getAdminPanelFromPath(location.pathname)
    setActivePanel((currentPanel) => (currentPanel === nextPanel ? currentPanel : nextPanel))
  }, [location.pathname])

  useEffect(() => {
    setCalendarMonthView(parseDateInputValue(attendanceDateFilter || toDateInputValue(new Date())))
  }, [attendanceDateFilter])

  useClickOutside(employeeStatusMenuRef, employeeStatusMenuOpen, () => setEmployeeStatusMenuOpen(false), {
    closeOnEscape: false
  })

  useEffect(() => {
    if (showAdminLogin) {
      return undefined
    }

    const hasActiveFieldVisit = fieldVisitRows.some((row) => !row.isCompleted)
    if (!hasActiveFieldVisit) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setFieldVisitDurationTick(Date.now())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [showAdminLogin, fieldVisitRows])

  useEffect(() => {
    if (!accessToken || showAdminLogin) {
      return
    }

    void loadDashboard(accessToken)
  }, [accessToken, showAdminLogin])

  useEffect(() => {
    if (!accessToken || showAdminLogin || activePanel !== 'attendance-exceptions') {
      return
    }

    void loadAttendanceExceptions(accessToken, attendanceExceptionPage, appliedAttendanceExceptionFilters)
  }, [
    accessToken,
    showAdminLogin,
    activePanel,
    attendanceExceptionPage,
    appliedAttendanceExceptionFilters,
  ])

  useEffect(() => {
    if (!accessToken || showAdminLogin || activePanel !== 'attendance') {
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
        const nextEligibleCodes = candidateRows
          .filter((row) => Boolean(row.alert_eligible))
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

        if (!cancelled) {
          setMissedLoginEmpCodes(Array.from(new Set(nextMissedCodes)))
          setAlertEligibleEmpCodes(Array.from(new Set(nextEligibleCodes)))
          setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)))
          setAlertSendCounts(nextSendCounts)
        }
      } catch {
        if (!cancelled) {
          setMissedLoginEmpCodes([])
          setAlertEligibleEmpCodes([])
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
  }, [accessToken, showAdminLogin, activePanel, attendanceDateFilter])

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

  const downloadDailyAttendanceReport = async () => {
    try {
      setAttendanceReportStatus('Preparing daily report...')
      const targetDate = attendanceDateFilter || toDateInputValue(new Date())
      const params = new URLSearchParams({
        date: targetDate,
        format: attendanceReportFormat
      })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/report/daily?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(
        response,
        `daily_attendance_report_${targetDate}.${attendanceReportFormat}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setAttendanceReportStatus('Daily report downloaded.')
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to download daily report')
    }
  }

  const downloadMonthlyAttendanceReport = async () => {
    try {
      setAttendanceReportStatus('Preparing monthly report...')
      const params = new URLSearchParams({
        month: attendanceReportMonth,
        year: attendanceReportYear,
        format: attendanceReportFormat
      })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/report/monthly?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(
        response,
        `monthly_attendance_report_${attendanceReportYear}_${attendanceReportMonth.padStart(2, '0')}.${attendanceReportFormat}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setAttendanceReportStatus('Monthly report downloaded.')
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to download monthly report')
    }
  }

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
      const nextEligibleCodes = nextMissedCodes
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
      setAlertEligibleEmpCodes(Array.from(new Set(nextEligibleCodes)))
      setAlertSentEmpCodes(Array.from(new Set(nextSentCodes)))
      setAlertSendCounts(nextSendCounts)
    } catch (error) {
      setAlertTriggerStatus(error instanceof Error ? error.message : 'Failed to trigger attendance reminders')
    } finally {
      setAlertTriggerLoading(false)
    }
  }

  const updateAttendanceExceptionFilter = <K extends keyof AdminAttendanceExceptionFilterState>(
    key: K,
    value: AdminAttendanceExceptionFilterState[K]
  ) => {
    setAttendanceExceptionFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
  }

  const applyAttendanceExceptionFilters = () => {
    setAttendanceExceptionPage(1)
    setAttendanceExceptionError('')
    setAppliedAttendanceExceptionFilters({ ...attendanceExceptionFilters })
  }

  const clearAttendanceExceptionFilters = () => {
    setAttendanceExceptionFilters({ ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS })
    setAppliedAttendanceExceptionFilters({ ...EMPTY_ATTENDANCE_EXCEPTION_FILTERS })
    setAttendanceExceptionPage(1)
    setAttendanceExceptionError('')
  }

  const loadAttendanceExceptions = async (
    token: string,
    page = attendanceExceptionPage,
    filters = appliedAttendanceExceptionFilters
  ) => {
    setAttendanceExceptionLoading(true)
    setAttendanceExceptionError('')

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(attendanceExceptionPagination.page_size || 10),
      })

      if (filters.search.trim()) {
        params.set('search', filters.search.trim())
      }
      if (filters.exceptionType) {
        params.set('type', filters.exceptionType)
      }
      if (filters.status) {
        params.set('status', filters.status)
      }
      if (filters.fromDate) {
        params.set('from_date', filters.fromDate)
      }
      if (filters.toDate) {
        params.set('to_date', filters.toDate)
      }

      const response = await apiRequest(`/api/admin/attendance-exceptions?${params.toString()}`, {}, token)
      const records = Array.isArray(response?.data?.records)
        ? response.data.records as AdminAttendanceExceptionRecord[]
        : []
      const pagination = response?.data?.pagination || {}

      setAttendanceExceptionRows(records)
      setAttendanceExceptionPagination({
        page: Number(pagination.page || page || 1),
        page_size: Number(pagination.page_size || attendanceExceptionPagination.page_size || 10),
        total_records: Number(pagination.total_records || 0),
        total_pages: Number(pagination.total_pages || 0),
        has_next: Boolean(pagination.has_next),
        has_previous: Boolean(pagination.has_previous),
      })
    } catch (error) {
      setAttendanceExceptionRows([])
      setAttendanceExceptionPagination((currentPagination) => ({
        ...currentPagination,
        page,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_previous: page > 1,
      }))
      setAttendanceExceptionError(
        error instanceof Error ? error.message : 'Failed to load attendance exception records'
      )
    } finally {
      setAttendanceExceptionLoading(false)
    }
  }

  const loadDashboard = async (token: string) => {
    setDashboardLoading(true)
    setDashboardError('')

    try {
      const attendanceParams = new URLSearchParams()
      attendanceParams.set('page_size', String(attendancePageSize))
      const attendancePath = `/api/admin/attendance/history?${attendanceParams.toString()}`

      const [employeesResponse, attendanceResponse, leavesResponse, activitiesResponse] = await Promise.all([
        apiRequest('/api/admin/employees', {}, token),
        apiRequest(attendancePath, {}, token),
        apiRequest('/api/admin/leaves?limit=500', {}, token),
        apiRequest('/api/admin/activities?limit=30&include_tracking=true&include_activity_tracking=true', {}, token)
      ])
      let exceptionsResponse: any = null
      try {
        exceptionsResponse = await apiRequest('/api/attendance-exceptions/team-exceptions', {}, token)
      } catch {
        exceptionsResponse = null
      }

      const employeesData = Array.isArray(employeesResponse?.data) ? employeesResponse.data : []
      const attendanceData: AttendanceRow[] = Array.isArray(attendanceResponse?.data?.records)
        ? attendanceResponse.data.records
        : []
      const attendanceCount =
        typeof attendanceResponse?.data?.total_records === 'number'
          ? attendanceResponse.data.total_records
          : attendanceData.length
      const nextShiftMetrics = attendanceResponse?.data?.shift_compliance || {}
      const nextSummary = attendanceResponse?.data?.attendance_summary || {}
      const leavesData = Array.isArray(leavesResponse?.data?.leaves) ? leavesResponse.data.leaves : []
      const activitiesData = Array.isArray(activitiesResponse?.data?.activities) ? activitiesResponse.data.activities : []
      const exceptionsData: AttendanceExceptionRow[] = Array.isArray(exceptionsResponse?.data?.exceptions)
        ? exceptionsResponse.data.exceptions
        : []

      setEmployees(employeesData)
      const attendanceDeduped = Array.from(
        attendanceData.reduce((map, row) => {
          const key =
            row.id?.toString() ||
            `${row.employee_email || 'unknown'}-${row.login_time || row.logout_time || 'time'}`.toLowerCase()
          if (!map.has(key)) {
            map.set(key, row)
          }
          return map
        }, new Map<string, AttendanceRow>())
          .values()
      )
      setAttendanceRows(attendanceDeduped)
      setAttendanceTotalCount(attendanceCount)
      setAttendanceShiftMetrics({
        lateLogins: Number(nextShiftMetrics.late_logins || 0),
        onTimeLogins: Number(nextShiftMetrics.on_time_logins || 0),
        loggedOut: Number(nextShiftMetrics.logged_out || 0),
        lateExceptions: Number(nextShiftMetrics.late_exceptions || 0)
      })
      setAttendanceSummary({
        attendanceCount: Number(nextSummary.attendance_count || attendanceCount),
        compOffDays: Number(nextSummary.comp_off_days || 0),
        efficiencyScore: Number(nextSummary.efficiency_score || 0)
      })
      setLeaveRows(leavesData)
      setActivityRows(activitiesData)
      setAttendanceExceptions(exceptionsData)
      setAttendanceExceptionSummary({
        lateArrivals: exceptionsData.filter((item) => item.exception_type === 'late_arrival').length,
        earlyLeaves: exceptionsData.filter((item) => item.exception_type === 'early_leave').length
      })

      const fieldVisits = activitiesData
        .filter((item: ActivityRow) => item.field_visit_id)
        .map((item: ActivityRow) => {
          const startCoords = parseCoords(item.start_latitude, item.start_longitude)
          const endCoords = parseCoords(item.end_latitude, item.end_longitude)
          const fieldTrackingPoints = Array.isArray(item.field_visit_tracking) ? item.field_visit_tracking : []
          const activityTrackingPoints = Array.isArray(item.activity_tracking) ? item.activity_tracking : []
          const latestFieldTrackingPoint = fieldTrackingPoints.length ? fieldTrackingPoints[fieldTrackingPoints.length - 1] : null
          const latestActivityTrackingPoint =
            activityTrackingPoints.length ? activityTrackingPoints[activityTrackingPoints.length - 1] : null
          const activityTrackedCoords = activityTrackingPoints
            .map((point) => parseCoords(point.latitude, point.longitude))
            .filter((point): point is { lat: number; lon: number } => Boolean(point))
          const fieldTrackedCoords = fieldTrackingPoints
            .map((point) => parseCoords(point.latitude, point.longitude))
            .filter((point): point is { lat: number; lon: number } => Boolean(point))
          const trackedCoords = activityTrackedCoords.length ? activityTrackedCoords : fieldTrackedCoords
          const { visitedCount, totalCount } = getDestinationVisitCounts(item.destinations)
          const status = item.field_visit_status || item.status || 'Unknown'
          const isCompleted = isCompletedVisitStatus(status)
          const visitStartTime = item.field_visit_start_time || item.start_time
          const visitEndTime = item.field_visit_end_time
          const routePoints = buildRoutePoints(startCoords, trackedCoords, isCompleted ? endCoords : null)
          const startAddress =
            item.field_visit_start_address ||
            activityTrackingPoints.find((point) => point?.address)?.address ||
            fieldTrackingPoints.find((point) => point?.address)?.address ||
            formatCoordsValue(startCoords)
          const endAddress = isCompleted
            ? item.field_visit_end_address ||
              latestActivityTrackingPoint?.address ||
              latestFieldTrackingPoint?.address ||
              formatCoordsValue(endCoords)
            : undefined
          const distanceKmValue =
            Number(item.total_distance_km) > 0
              ? Number(item.total_distance_km)
              : routePoints.length >= 2
                ? calculateDistanceKm(routePoints)
                : null
          const durationMinutes = resolveVisitDurationMinutes(
            item.field_visit_duration_minutes,
            visitStartTime,
            visitEndTime,
            isCompleted
          )

          return {
            activityId: item.id || item.field_visit_id || '',
            fieldVisitId: item.field_visit_id ? Number(item.field_visit_id) : undefined,
            employee: item.employee_name || item.employee_email || 'Unknown employee',
            visitType: item.field_visit_type || 'Field Visit',
            purpose: item.field_visit_purpose || item.activity_type || 'Visit',
            visitDate: visitStartTime,
            visitStartTime,
            visitEndTime,
            durationMinutes,
            status,
            isCompleted,
            location: startAddress || endAddress || 'Location unavailable',
            startName: getLocationName(startAddress || endAddress, 'Start Location'),
            endName: getLocationName(endAddress, 'End Location'),
            startAddress: startAddress || undefined,
            endAddress: endAddress || undefined,
            destinationLocation: formatDestinationLocation(item.destinations),
            destinationVisited: getDestinationVisitedStatus(item.destinations),
            destinationVisitFlag: getDestinationVisitFlag(item.destinations),
            destinationVisitedCount: visitedCount,
            destinationTotalCount: totalCount,
            distanceKm: Number.isFinite(distanceKmValue) ? distanceKmValue : null,
            startCoords,
            endCoords,
            activityTracking: activityTrackingPoints,
            fieldTracking: fieldTrackingPoints
          }
        })

      setFieldVisitRows(fieldVisits)
      setFieldVisitDurationTick(Date.now())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admin dashboard'
      setDashboardError(message)
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('token')) {
        clearSession()
        setShowAdminLogin(true)
      }
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleRequestOtp = async () => {
    if (!empCode.trim()) {
      setStatus('Enter your Employee ID to request OTP.')
      return
    }

    setLoading(true)
    setStatus('Requesting OTP...')

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim() })
      })
      const data = await response.json().catch(() => ({}))
      setStatus(
        response.ok
          ? 'OTP sent. Please check your device and enter it below.'
          : data?.message || 'Failed to request OTP.'
      )
    } catch {
      setStatus('Unable to reach server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!empCode.trim() || !otp.trim()) {
      setStatus('Employee ID and OTP are required.')
      return
    }

    setLoading(true)
    setStatus('Submitting delete request...')

    try {
      const response = await fetch('/api/auth/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim(), otp: otp.trim() })
      })
      const data = await response.json().catch(() => ({}))
      setStatus(
        response.ok
          ? 'Account deletion submitted successfully.'
          : data?.message || 'Delete request failed.'
      )
    } catch {
      setStatus('Unable to reach server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminRequestOtp = async () => {
    if (!adminEmpCode.trim()) {
      setAuthStatus('Enter your Employee ID to request OTP.')
      return
    }

    setAuthLoading(true)
    setAuthStatus('Requesting admin OTP...')

    try {
      const data = await apiRequest('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ emp_code: adminEmpCode.trim() })
      })

      setAuthStatus(data?.message || 'OTP sent successfully.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'Failed to request OTP')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    if (!adminEmpCode.trim() || !adminOtp.trim()) {
      setAuthStatus('Employee ID and OTP are required.')
      return
    }

    setAuthLoading(true)
    setAuthStatus('Verifying admin login...')

    try {
      const loginData = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          emp_code: adminEmpCode.trim(),
          otp: adminOtp.trim(),
          device_info: {
            device_name: 'Fawnix Admin Web',
            os: navigator.platform || 'web',
            app_version: 'frontend-admin-dashboard'
          }
        })
      })

      const nextAccessToken = loginData?.access_token || ''
      const nextRefreshToken = loginData?.refresh_token || ''

      if (!nextAccessToken) {
        throw new Error('Access token missing from login response')
      }

      const profileResponse = await apiRequest('/api/auth/me', {}, nextAccessToken)
      const nextProfile = (profileResponse?.data || null) as AdminProfile | null

      if (!isPrivilegedUser(nextProfile)) {
        throw new Error('This dashboard currently requires DevTester or admin permissions access')
      }

      persistSession(nextAccessToken, nextRefreshToken, nextProfile as AdminProfile)
      setShowAdminLogin(false)
      setAuthStatus('Admin login successful.')
      setAdminOtp('')
      await loadDashboard(nextAccessToken)
    } catch (error) {
      clearSession()
      setAuthStatus(error instanceof Error ? error.message : 'Admin login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (accessToken && refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken })
        })
      }
    } catch {
      // Ignore logout failures and clear local session anyway.
    } finally {
      clearSession()
      setShowAdminLogin(true)
      setAuthStatus('')
    }
  }

  const openAdminDashboard = () => {
    setShowDashboard(true)
    setShowAdminLogin(!accessToken)
    setAuthStatus('')
  }

  const openFieldVisitPanel = async (row: FieldVisitRow) => {
    setFieldVisitPanelOpen(true)
    setFieldVisitPanelRow(row)
    setFieldVisitPanelError('')
    setFieldVisitPanelLoading(true)
    setFieldVisitDurationTick(Date.now())
    setFieldVisitTimelineItems(buildFieldVisitTimelineItems(
      row,
      Array.isArray(row.activityTracking) ? row.activityTracking : [],
      Array.isArray(row.fieldTracking) ? row.fieldTracking : []
    ))

    if (!row.fieldVisitId) {
      setFieldVisitPanelLoading(false)
      return
    }

    try {
      const trackingResponse = await apiRequest(`/api/admin/field-visits/${row.fieldVisitId}/tracking`, {})
      const visit = trackingResponse?.data?.field_visit || {}
      const trackingPoints: FieldVisitTrackingPoint[] = Array.isArray(trackingResponse?.data?.tracking_points)
        ? trackingResponse.data.tracking_points
        : []
      const status = visit.status || row.status
      const isCompleted = isCompletedVisitStatus(status)
      const visitStartTime = row.visitStartTime || row.visitDate || visit.start_time
      const visitEndTime = visit.end_time || row.visitEndTime

      const enrichedRow: FieldVisitRow = {
        ...row,
        status,
        isCompleted,
        visitDate: row.visitDate || visitStartTime,
        visitStartTime,
        visitEndTime,
        durationMinutes: resolveVisitDurationMinutes(
          visit.duration_minutes ?? row.durationMinutes,
          visitStartTime,
          visitEndTime,
          isCompleted
        ),
        startAddress: visit.start_address || row.startAddress,
        endAddress: visit.end_address || row.endAddress,
        startCoords: parseCoords(visit.start_latitude, visit.start_longitude) || row.startCoords,
        endCoords: parseCoords(visit.end_latitude, visit.end_longitude) || row.endCoords,
        distanceKm: Number.isFinite(Number(trackingResponse?.data?.total_distance_km))
          ? Number(trackingResponse.data.total_distance_km)
          : row.distanceKm
      }

      setFieldVisitPanelRow(enrichedRow)
      setFieldVisitTimelineItems(buildFieldVisitTimelineItems(
        enrichedRow,
        Array.isArray(row.activityTracking) ? row.activityTracking : [],
        trackingPoints.length ? trackingPoints : (Array.isArray(row.fieldTracking) ? row.fieldTracking : [])
      ))
    } catch (error) {
      setFieldVisitPanelError(error instanceof Error ? error.message : 'Failed to load field visit details')
    } finally {
      setFieldVisitPanelLoading(false)
    }
  }

  const openMapForFieldVisit = async (row: FieldVisitRow) => {
    const startLocationText = (row.startAddress || row.location || '').trim()
    const isCompleted = isCompletedVisitStatus(row.status)
    const coordMatch = startLocationText.match(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/)
    const activityTrackingFromRow = normalizeFieldVisitTrackingPoints(Array.isArray(row.activityTracking) ? row.activityTracking : [])
    const fieldTrackingFromRow = normalizeFieldVisitTrackingPoints(Array.isArray(row.fieldTracking) ? row.fieldTracking : [])

    setMapDialogTitle(isCompleted ? 'Activity Route' : 'Activity Location')
    setMapDialogOpen(true)
    setMapDialogError('')
    setMapDialogLoading(true)
    setMapPoints([])
    setMapTrackingPoints([])
    setMapFieldTrackingPoints([])
    setMapCenter(null)
    setMapSummary({
      startName: row.startName || getLocationName(row.startAddress || row.location, 'Start Location'),
      startAddress: row.startAddress || row.location,
      endName: isCompleted ? row.endName || getLocationName(row.endAddress, 'End Location') : undefined,
      endAddress: isCompleted ? row.endAddress : undefined,
      startCoords: row.startCoords,
      endCoords: isCompleted ? row.endCoords : undefined,
      distanceKm: isCompleted ? row.distanceKm : null,
      pointsCount: undefined,
      isCompleted
    })

    if (row.activityId) {
      try {
        const routeResponse = await apiRequest(`/api/activities/route/${row.activityId}`, {})
        const routeData = routeResponse?.data || {}
        const activityTrackingPoints = normalizeFieldVisitTrackingPoints(
          Array.isArray(routeData?.tracking_points) ? routeData.tracking_points : []
        )
        const fieldTrackingPoints = normalizeFieldVisitTrackingPoints(
          Array.isArray(routeData?.field_visit_checkpoints) ? routeData.field_visit_checkpoints : []
        )
        const nextActivityTracking = activityTrackingPoints.length ? activityTrackingPoints : activityTrackingFromRow
        const nextFieldTracking = fieldTrackingPoints.length ? fieldTrackingPoints : fieldTrackingFromRow
        const trackingForRoute = nextActivityTracking.length ? nextActivityTracking : nextFieldTracking
        const startCoordsFromRoute = parseCoords(routeData?.start_location?.latitude, routeData?.start_location?.longitude)
        const endCoordsFromRoute = parseCoords(routeData?.end_location?.latitude, routeData?.end_location?.longitude)
        const startCoords =
          startCoordsFromRoute ||
          row.startCoords ||
          (trackingForRoute.length ? { lat: trackingForRoute[0].lat, lon: trackingForRoute[0].lon } : null)
        const endCoords =
          endCoordsFromRoute ||
          row.endCoords ||
          (trackingForRoute.length
            ? { lat: trackingForRoute[trackingForRoute.length - 1].lat, lon: trackingForRoute[trackingForRoute.length - 1].lon }
            : null)
        const routeStatus = routeData?.status || row.status
        const routeIsCompleted = isCompletedVisitStatus(routeStatus)
        const nextPoints = buildRoutePoints(
          startCoords,
          trackingForRoute.map((point) => ({ lat: point.lat, lon: point.lon })),
          routeIsCompleted ? endCoords : null
        )
        const fallbackPoints = nextPoints.length ? nextPoints : compactCoords([startCoords, endCoords])

        setMapTrackingPoints(nextActivityTracking)
        setMapFieldTrackingPoints(nextFieldTracking)
        setMapPoints(fallbackPoints)
        if (fallbackPoints.length) {
          setMapCenter(fallbackPoints[0])
        }

        const startAddress = routeData?.start_location?.address || row.startAddress || row.location
        const endAddress = routeData?.end_location?.address || row.endAddress
        const totalDistanceValue = Number(routeData?.total_distance_km)
        const computedDistance =
          Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
            ? totalDistanceValue
            : fallbackPoints.length >= 2
              ? calculateDistanceKm(fallbackPoints)
              : (row.distanceKm ?? null)

        setMapSummary({
          startName: getLocationName(startAddress, 'Start Location'),
          startAddress,
          endName: routeIsCompleted ? getLocationName(endAddress, 'End Location') : undefined,
          endAddress: routeIsCompleted ? endAddress : undefined,
          startCoords,
          endCoords: routeIsCompleted ? endCoords : undefined,
          distanceKm:
            computedDistance !== null && computedDistance !== undefined && Number.isFinite(computedDistance)
              ? computedDistance
              : null,
          pointsCount: nextActivityTracking.length,
          isCompleted: routeIsCompleted
        })
        setMapDialogLoading(false)
        if (fallbackPoints.length || nextActivityTracking.length || nextFieldTracking.length) {
          return
        }
      } catch {
        // Continue to field-visit and geocode fallbacks.
      }
    }

    if (row.fieldVisitId) {
      try {
        const trackingResponse = await apiRequest(`/api/admin/field-visits/${row.fieldVisitId}/tracking`, {})
        const visit = trackingResponse?.data?.field_visit || {}
        const points: FieldVisitTrackingPoint[] = Array.isArray(trackingResponse?.data?.tracking_points)
          ? trackingResponse.data.tracking_points
          : []
        const normalizedFieldPoints = normalizeFieldVisitTrackingPoints(points)
        const normalizedActivityPoints = activityTrackingFromRow
        const trackedRoutePoints = normalizedActivityPoints.length ? normalizedActivityPoints : normalizedFieldPoints
        setMapTrackingPoints(normalizedActivityPoints)
        setMapFieldTrackingPoints(normalizedFieldPoints)
        const latestTrackedPoint = points.length ? points[points.length - 1] : null
        const firstTrackedPoint = points.find((point: { address?: string }) => point?.address)
        const mappedPoints = trackedRoutePoints.map((point) => ({
          lat: point.lat,
          lon: point.lon
        }))
        const visitStatus = visit.status || row.status
        const visitIsCompleted = isCompletedVisitStatus(visitStatus)
        setMapDialogTitle(visitIsCompleted ? 'Activity Route' : 'Activity Location')
        const startCoordsFromVisit = parseCoords(visit.start_latitude, visit.start_longitude)
        const endCoordsFromVisit = parseCoords(visit.end_latitude, visit.end_longitude)
        const startCoords = startCoordsFromVisit || row.startCoords || (mappedPoints.length ? mappedPoints[0] : null)
        const endCoords =
          endCoordsFromVisit || row.endCoords || (mappedPoints.length ? mappedPoints[mappedPoints.length - 1] : null)
        const nextPoints =
          buildRoutePoints(startCoords, mappedPoints, visitIsCompleted ? endCoords : null)
        const fallbackPoints = nextPoints.length ? nextPoints : compactCoords([startCoords, endCoords])
        setMapPoints(fallbackPoints)
        if (fallbackPoints.length) {
          setMapCenter(fallbackPoints[0])
        }
        const startAddress = visit.start_address || firstTrackedPoint?.address || row.startAddress || row.location
        const endAddress = visitIsCompleted
          ? visit.end_address || latestTrackedPoint?.address || row.endAddress
          : undefined
        const totalDistanceValue = Number(trackingResponse?.data?.total_distance_km)
        const computedDistance = visitIsCompleted
          ? Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
            ? totalDistanceValue
            : calculateDistanceKm(fallbackPoints)
          : null
        setMapSummary({
          startName: getLocationName(startAddress, 'Start Location'),
          startAddress,
          endName: visitIsCompleted ? getLocationName(endAddress, 'End Location') : undefined,
          endAddress: visitIsCompleted ? endAddress : undefined,
          startCoords,
          endCoords: visitIsCompleted ? endCoords : undefined,
          distanceKm: visitIsCompleted ? (computedDistance ?? row.distanceKm ?? null) : null,
          pointsCount: normalizedActivityPoints.length || trackedRoutePoints.length || fallbackPoints.length,
          isCompleted: visitIsCompleted
        })
        setMapDialogLoading(false)
        if (fallbackPoints.length || normalizedActivityPoints.length || normalizedFieldPoints.length) {
          return
        }
      } catch (error) {
        setMapDialogError(error instanceof Error ? error.message : 'Unable to load tracking points.')
      }
    }

    if (coordMatch) {
      const [lat, lon] = coordMatch[0].split(',').map((value) => value.trim())
      const latNum = Number(lat)
      const lonNum = Number(lon)
      setMapPoints([{ lat: latNum, lon: lonNum }])
      setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }])
      setMapCenter({ lat: latNum, lon: lonNum })
      setMapDialogLoading(false)
      return
    }

    if (!startLocationText) {
      setMapDialogError('Start location unavailable.')
      setMapDialogLoading(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocationText)}&limit=1`
      )
      const results = await response.json()
      const match = Array.isArray(results) ? results[0] : null
      if (!match) {
        throw new Error('Unable to locate this address.')
      }
      const latNum = Number(match.lat)
      const lonNum = Number(match.lon)
      setMapPoints([{ lat: latNum, lon: lonNum }])
      setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }])
      setMapCenter({ lat: latNum, lon: lonNum })
    } catch (error) {
      setMapDialogError(error instanceof Error ? error.message : 'Unable to load map.')
    } finally {
      setMapDialogLoading(false)
    }
  }

  useEffect(() => {
    if (!mapDialogOpen || !mapContainerRef.current || !mapCenter) {
      return
    }

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(mapContainerRef.current, { zoomControl: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })

    if (mapPoints.length > 1) {
      const latlngs = mapPoints.map((point) => [point.lat, point.lon] as [number, number])
      const dotLatLngs = (mapTrackingPoints.length ? mapTrackingPoints : mapPoints).map((point) => [
        point.lat,
        point.lon
      ] as [number, number])
      L.polyline(latlngs, { color: '#2f6fe4', weight: 4 }).addTo(map)
      L.marker(latlngs[0], { icon: defaultIcon }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: defaultIcon }).addTo(map)

      dotLatLngs.forEach((latlng) => {
        L.circleMarker(latlng, {
          radius: 5,
          color: '#ffffff',
          fillColor: '#2f6fe4',
          fillOpacity: 1,
          weight: 2
        }).addTo(map)
      })

      map.fitBounds(latlngs, { padding: [30, 30] })
    } else {
      map.setView([mapCenter.lat, mapCenter.lon], 14)
      L.marker([mapCenter.lat, mapCenter.lon], { icon: defaultIcon }).addTo(map)
    }

    // Ensure Leaflet recalculates tiles after modal layout settles.
    window.setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapDialogOpen, mapCenter, mapPoints, mapTrackingPoints])

  const updateNewEmployee = (field: keyof typeof newEmployee, value: string) => {
    setNewEmployee((current) => ({
      ...current,
      [field]: value
    }))
  }

  const resetNewEmployee = () => {
    setNewEmployee({
      emp_code: '',
      emp_full_name: '',
      emp_email: '',
      emp_contact: '',
      emp_grade: '',
      emp_designation: '',
      emp_department: '',
      emp_manager: '',
      role: 'employee'
    })
  }

  const closeEmployeePanel = () => {
    setEmployeePanelMode(null)
    setEditingEmployee(null)
    setEditFormData({})
    setEditStatus('')
    setCreateEmployeeStatus('')
  }

  const openAddEmployeePanel = () => {
    resetNewEmployee()
    setCreateEmployeeStatus('')
    setEmployeePanelMode('add')
  }

  const canWriteAdminData = hasWriteAccess(profile)

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

  const clearLeaveFilters = async () => {
    const emptyFilters = { ...EMPTY_LEAVE_FILTERS }
    setLeaveFilters(emptyFilters)
    await refreshLeaves(emptyFilters, true)
  }

  const handleCreateEmployee = async () => {
    if (!canWriteAdminData) {
      setCreateEmployeeStatus('Write permission is required to create employees.')
      return
    }

    if (!newEmployee.emp_code.trim() || !newEmployee.emp_full_name.trim() || !newEmployee.emp_email.trim()) {
      setCreateEmployeeStatus('Employee ID, full name, and email are required.')
      return
    }

    setCreateEmployeeLoading(true)
    setCreateEmployeeStatus('Creating employee...')

    const payload = Object.fromEntries(
      Object.entries(newEmployee)
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        .filter(([, value]) => value !== '')
    )

    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload)
        })

        setCreateEmployeeStatus(response?.message || 'Employee created successfully.')
        resetNewEmployee()
        setEmployeePanelMode(null)
        await loadDashboard(accessToken)
      } catch (error) {
        setCreateEmployeeStatus(error instanceof Error ? error.message : 'Failed to create employee')
    } finally {
      setCreateEmployeeLoading(false)
    }
  }

  const handleEditEmployee = (employee: EmployeeRow) => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to edit employees.')
      return
      }

      setEditingEmployee(employee)
      setEditFormData({ ...employee })
      setEmployeePanelMode('edit')
      setEditStatus('')
    }

  const handleSaveEmployee = async () => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to edit employees.')
      return
    }

    if (!editingEmployee?.emp_code) {
      setEditStatus('Employee code is required.')
      return
    }

      setEditLoading(true)
      setEditStatus('Updating employee...')

    try {
      const allowedFields = new Set([
        'emp_full_name',
        'emp_contact',
        'emp_email',
        'emp_designation',
        'emp_department',
        'emp_manager',
        'emp_grade',
        'emp_shift_id',
        'emp_joined_date'
      ])

      const payload = Object.fromEntries(
        Object.entries(editFormData).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      )

      const updatePayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => allowedFields.has(key) && value !== undefined)
      )

      const response = await apiRequest(`/api/users/${editingEmployee.emp_code}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      })

        setEditStatus(response?.message || 'Employee updated successfully.')
        closeEmployeePanel()
        await loadDashboard(accessToken)
      } catch (error) {
        setEditStatus(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setEditLoading(false)
    }
  }

  const requestDeleteEmployee = (employee: EmployeeRow) => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to delete employees.')
      return
    }

    setDeleteEmployeeTarget(employee)
  }

  const handleDeleteEmployee = async () => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to delete employees.')
      return
    }

    if (!deleteEmployeeTarget?.emp_code) {
      return
    }

    setDeleteEmployeeLoading(true)
    setEditStatus('Deleting employee...')

    try {
      const response = await apiRequest(`/api/users/${deleteEmployeeTarget.emp_code}`, {
        method: 'DELETE'
      })

      setEditStatus(response?.message || 'Employee deleted successfully.')
      setDeleteEmployeeTarget(null)
      if (editingEmployee?.emp_code === deleteEmployeeTarget.emp_code) {
        closeEmployeePanel()
      }
      await loadDashboard(accessToken)
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setDeleteEmployeeLoading(false)
    }
  }

  const selectedAttendanceDate = attendanceDateFilter || toDateInputValue(new Date())
  const todayDateValue = toDateInputValue(new Date())
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
  const employeeByCode = new Map(
    employees
      .filter((employee) => employee.emp_code)
      .map((employee) => [employee.emp_code.trim(), employee])
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
  const calendarMonthLabel = getCalendarMonthLabel(calendarMonthView)
  const calendarDays = getCalendarDays(calendarMonthView)
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
  const leaveCountByDate = leaveRows.reduce<Record<string, number>>((accumulator, row) => {
    const fromDate = row.from_date ? new Date(row.from_date) : null
    const toDate = row.to_date ? new Date(row.to_date) : fromDate
    if (!fromDate || Number.isNaN(fromDate.getTime()) || !toDate || Number.isNaN(toDate.getTime())) {
      return accumulator
    }

    const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())

    while (cursor <= end) {
      const key = toDateInputValue(cursor)
      accumulator[key] = (accumulator[key] || 0) + 1
      cursor.setDate(cursor.getDate() + 1)
    }

    return accumulator
  }, {})
  const maxCalendarAttendance = Math.max(...Object.values(attendanceCountByDate), 1)
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
  const maxWeeklyAttendance = Math.max(...weeklyAttendanceTrend.map((item) => item.count), 1)
  const weeklyTrendPoints = weeklyAttendanceTrend.map((item, index) => {
    const x = weeklyAttendanceTrend.length > 1 ? (index / (weeklyAttendanceTrend.length - 1)) * 100 : 50
    const y = 100 - (item.count / maxWeeklyAttendance) * 100
    return `${x},${y}`
  }).join(' ')
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
    const missedLoginEmployeeCodes = missedLoginEmployees
      .map((employee) => employee.emp_code || '')
      .filter(Boolean)
    const actionableMissedLoginEmployeeCodes = missedLoginEmployeeCodes
    const selectedMissedLoginCount = selectedMissedLoginEmpCodes.filter((empCode) =>
      actionableMissedLoginEmployeeCodes.includes(empCode)
    ).length
    const allMissedLoginsSelected =
      actionableMissedLoginEmployeeCodes.length > 0 &&
      selectedMissedLoginCount === actionableMissedLoginEmployeeCodes.length
    const reminderTargetDate = attendanceDateFilter || toDateInputValue(new Date())
    const reminderPreviewTitle = 'Attendance Reminder'
    const reminderPreviewBody = 'Clock in. If you already did, please ignore.'

    const renderDashboardPanel = () => {
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
    const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase()
    const filteredEmployees = employees
      .filter((employee) => {
        if (employeeStatusFilter === 'active') {
          return Boolean(employee.is_active)
        }
        if (employeeStatusFilter === 'inactive') {
          return !employee.is_active
        }
        return true
      })
      .filter((employee) => {
        if (!normalizedEmployeeSearch) {
          return true
        }

            const haystack = [
              employee.emp_full_name || '',
              employee.emp_code || '',
            employee.emp_email || '',
            employee.emp_designation || '',
            employee.emp_department || '',
            employee.manager_name || '',
              employee.emp_manager || ''
            ].join(' ').toLowerCase()
        return haystack.includes(normalizedEmployeeSearch)
      })
      .sort((left, right) => {
        const leftCode = (left.emp_code || '').trim()
        const rightCode = (right.emp_code || '').trim()
        if (!leftCode) {
          return rightCode ? 1 : 0
        }
        if (!rightCode) {
          return -1
        }
        return leftCode.localeCompare(rightCode, undefined, { numeric: true, sensitivity: 'base' })
      })
    const leaveEmployeeNameOptions = Array.from(
      new Set(employees.map((employee) => (employee.emp_full_name || '').trim()).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
    const leaveEmployeeIdOptions = Array.from(
      new Set(employees.map((employee) => (employee.emp_code || '').trim()).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
    const filteredActivities = showTodayActivities
      ? activityRows.filter((row) => isSameDate(row.start_time, todayDateValue))
      : activityRows

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
          employeeSearch={employeeSearch}
          employeeStatusFilter={employeeStatusFilter}
          employeeStatusMenuOpen={employeeStatusMenuOpen}
          employeeStatusMenuRef={employeeStatusMenuRef}
          employees={employees}
          filteredEmployees={filteredEmployees}
          formatEmployeeGrade={formatEmployeeGrade}
          handleEditEmployee={handleEditEmployee}
          loadDashboard={() => loadDashboard(accessToken)}
          openAddEmployeePanel={openAddEmployeePanel}
          requestDeleteEmployee={requestDeleteEmployee}
          setEmployeeSearch={setEmployeeSearch}
          setEmployeeStatusFilter={setEmployeeStatusFilter}
          setEmployeeStatusMenuOpen={setEmployeeStatusMenuOpen}
        />
      )
    }

    if (activePanel === 'attendance-exceptions') {
      return (
        <AdminAttendanceExceptionsPage
          error={attendanceExceptionError}
          filters={attendanceExceptionFilters}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          loading={attendanceExceptionLoading}
          onApplyFilters={applyAttendanceExceptionFilters}
          onChangePage={setAttendanceExceptionPage}
          onClearFilters={clearAttendanceExceptionFilters}
          onRefresh={() => void loadAttendanceExceptions(accessToken)}
          pagination={attendanceExceptionPagination}
          records={attendanceExceptionRows}
          updateFilter={updateAttendanceExceptionFilter}
        />
      )
    }

    if (activePanel === 'attendance') {
      const exceptionRows =
        attendanceView === 'late-arrivals'
          ? selectedDateLateArrivals
          : attendanceView === 'early-leaves'
            ? selectedDateEarlyLeaves
            : []

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
          clearLeaveFilters={() => clearLeaveFilters()}
          employees={employees}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
          formatLeaveTypeLabel={formatLeaveTypeLabel}
          getLeaveApproverLabel={getLeaveApproverLabel}
          getLeaveReasonLabel={getLeaveReasonLabel}
          leaveEmployeeIdOptions={leaveEmployeeIdOptions}
          leaveEmployeeNameOptions={leaveEmployeeNameOptions}
          leaveFilterLoading={leaveFilterLoading}
          leaveFilters={leaveFilters}
          leaveFilterStatus={leaveFilterStatus}
          leaveRows={leaveRows}
          leaveStatusOptions={LEAVE_STATUS_FILTER_OPTIONS}
          leaveTypeOptions={LEAVE_TYPE_FILTER_OPTIONS}
          onAlertManager={alertLeaveManager}
          refreshLeaves={refreshLeaves}
          updateLeaveFilter={updateLeaveFilter}
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

  if (showDashboard) {
    const fieldPointCount = mapFieldTrackingPoints.length
    const activityPointCount = mapTrackingPoints.length || mapSummary?.pointsCount || 0
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
    const startPoint =
      mapSummary?.startCoords ||
      (mapTrackingPoints.length ? { lat: mapTrackingPoints[0].lat, lon: mapTrackingPoints[0].lon } : null) ||
      (mapPoints.length ? mapPoints[0] : null)
    const endPoint =
      mapSummary?.endCoords ||
      (mapTrackingPoints.length
        ? { lat: mapTrackingPoints[mapTrackingPoints.length - 1].lat, lon: mapTrackingPoints[mapTrackingPoints.length - 1].lon }
        : null) ||
      (mapPoints.length ? mapPoints[mapPoints.length - 1] : null)
    const fieldVisitPanelDurationMinutes = fieldVisitPanelRow
      ? resolveVisitDurationMinutes(
          fieldVisitPanelRow.durationMinutes,
          fieldVisitPanelRow.visitStartTime || fieldVisitPanelRow.visitDate,
          fieldVisitPanelRow.visitEndTime,
          fieldVisitPanelRow.isCompleted,
          fieldVisitDurationTick
        )
      : null

    return (
      <div className={`admin-shell${showAdminLogin ? ' admin-shell-login' : ''}`}>
        {!showAdminLogin ? (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">F</div>
            <div className="sidebar-brand-text">
              <div className="brand-name">Fawnix</div>
              <div className="brand-admin-badge">ADMIN</div>
            </div>
          </div>

          <div className="sidebar-group">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activePanel === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActivePanel(item.id)
                  navigate(getAdminPanelPath(item.id))
                }}
              >
                <span className="sidebar-link-main">
                  <span className="sidebar-link-icon">
                    <SidebarIcon name={item.icon} />
                  </span>
                  <span className="sidebar-link-label">{item.label}</span>
                </span>
                {item.badge ? <span className="sidebar-link-badge">{item.badge}</span> : null}
              </button>
            ))}

          </div>

          <div className="sidebar-foot">
            <div className="sidebar-profile">
              <div className="sidebar-avatar" aria-hidden="true">
                {(profile?.emp_full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-profile-info">
                <strong>{profile?.emp_full_name || 'Admin'}</strong>
                <span>{profile?.emp_designation || profile?.role || 'Administrator'}</span>
              </div>
            </div>
            <div className="sidebar-foot-actions">
              <button className="sidebar-foot-btn" onClick={handleLogout} title="Logout">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Logout
              </button>
            </div>
          </div>
        </aside>
        ) : null}

        <main className={`dashboard-main${showAdminLogin ? ' dashboard-main-login' : ''}`}>
          {fieldVisitPanelOpen && fieldVisitPanelRow ? (
            <>
              <button
                className="side-panel-scrim"
                type="button"
                aria-label="Close field visit details"
                onClick={() => setFieldVisitPanelOpen(false)}
              />
              <aside className="field-visit-panel" aria-label="Field visit details">
                <div className="field-visit-panel-head">
                  <div>
                    <p className="eyebrow">Field Visit</p>
                    <h3>{fieldVisitPanelRow.employee}</h3>
                    <span>{fieldVisitPanelRow.visitType} • {formatDateTime(fieldVisitPanelRow.visitDate)}</span>
                  </div>
                  <button
                    className="field-visit-panel-close"
                    type="button"
                    onClick={() => setFieldVisitPanelOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="field-visit-panel-summary">
                  <div className="field-visit-panel-card">
                    <span>Start</span>
                    <strong>{fieldVisitPanelRow.startName || 'Start location unavailable'}</strong>
                    <small>{fieldVisitPanelRow.startAddress || fieldVisitPanelRow.location || '--'}</small>
                  </div>
                  <div className="field-visit-panel-card">
                    <span>End</span>
                    <strong>{fieldVisitPanelRow.isCompleted ? fieldVisitPanelRow.endName || 'End location unavailable' : 'Visit in progress'}</strong>
                    <small>{fieldVisitPanelRow.isCompleted ? fieldVisitPanelRow.endAddress || '--' : '--'}</small>
                  </div>
                </div>

                <div className="field-visit-panel-meta">
                  <span className="table-pill accent">{fieldVisitPanelRow.status}</span>
                  <span>Hours there: {formatVisitDuration(fieldVisitPanelDurationMinutes)}</span>
                  <span>Distance: {fieldVisitPanelRow.distanceKm ? formatDistanceKm(fieldVisitPanelRow.distanceKm) : '--'}</span>
                </div>

                {fieldVisitPanelLoading ? (
                  <div className="empty-state">Loading field visit details...</div>
                ) : fieldVisitPanelError ? (
                  <div className="empty-state">{fieldVisitPanelError}</div>
                ) : (
                  <div className="field-visit-timeline">
                    {fieldVisitTimelineItems.map((item) => (
                      <div key={item.id} className={`field-visit-timeline-item ${item.kind}`}>
                        <div className="field-visit-timeline-icon" aria-hidden="true" />
                        <div className="field-visit-timeline-content">
                          <strong>{item.title}</strong>
                          <span>{item.address}</span>
                          <span>{formatCoordsValue(item.coords) || '--'}</span>
                          <small>
                            {[item.trackedAt ? formatDateTime(item.trackedAt) : '', item.trackingType ? toTitleCase(item.trackingType.replace(/_/g, ' ')) : '']
                              .filter(Boolean)
                              .join(' • ') || '--'}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </>
          ) : null}
          {mapDialogOpen ? (
            <div className="map-dialog-backdrop" role="dialog" aria-modal="true">
              <div className="map-dialog">
                <div className="map-dialog-header">
                  <strong>{mapDialogTitle || 'Activity Route'}</strong>
                </div>
                <div className="map-dialog-body">
                  {mapDialogLoading ? (
                    <div className="map-dialog-state">Loading map...</div>
                  ) : mapDialogError ? (
                    <div className="map-dialog-state">{mapDialogError}</div>
                  ) : mapCenter ? (
                    <>
                      <div ref={mapContainerRef} className="map-dialog-map" />
                      <div className="map-dialog-meta">
                        <div className="map-dialog-chip-row">
                          <span className="map-dialog-chip">Field points: {fieldPointCount}</span>
                          <span className="map-dialog-chip">Activity points: {activityPointCount}</span>
                          {mapSummary?.distanceKm !== null &&
                          mapSummary?.distanceKm !== undefined &&
                          !Number.isNaN(mapSummary.distanceKm) ? (
                            <span className="map-dialog-chip">Distance: {formatDistanceKm(mapSummary.distanceKm)}</span>
                          ) : null}
                        </div>
                        <div className="map-dialog-coords-row">
                          <div>Start: {formatCoords(startPoint)}</div>
                          <div>End: {formatCoords(endPoint)}</div>
                        </div>
                        <div className="map-dialog-points">
                          <strong>Activity GPS Points</strong>
                          {mapTrackingPoints.length ? (
                            <ol>
                              {mapTrackingPoints.map((point, index) => {
                                const typeLabel = (point.trackingType || 'auto').trim().toLowerCase()
                                return (
                                  <li key={`${point.lat}-${point.lon}-${point.trackedAt || index}`}>
                                    {`${point.lat.toFixed(6)}, ${point.lon.toFixed(6)} [${typeLabel}]`}
                                    {point.trackedAt ? ` at ${point.trackedAt}` : ''}
                                  </li>
                                )
                              })}
                            </ol>
                          ) : (
                            <div className="map-dialog-empty-points">No activity GPS points found.</div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="map-dialog-state">No location data available.</div>
                  )}
                </div>
                <div className="map-dialog-footer">
                  <button className="map-dialog-close" onClick={() => setMapDialogOpen(false)} type="button">
                    Close
                  </button>
                </div>
              </div>
            </div>
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
            <>
              <button className="side-panel-scrim" type="button" aria-label="Close employee panel" onClick={closeEmployeePanel} />
              <aside className="field-visit-panel employee-form-panel" aria-label={employeePanelMode === 'add' ? 'Add employee' : 'Edit employee'}>
                <div className="field-visit-panel-head employee-panel-head">
                  <div>
                    <span>{employeePanelMode === 'add' ? 'Directory' : 'Profile Editor'}</span>
                    <h3>{employeePanelMode === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
                    <p className="employee-panel-copy">
                      {employeePanelMode === 'add'
                        ? 'Create a new employee from the right-side panel without leaving the list.'
                        : 'Update employee details in place and save them back to the admin API.'}
                    </p>
                  </div>
                  <button className="field-visit-panel-close" onClick={closeEmployeePanel} type="button">
                    Close
                  </button>
                </div>

                <div className="employee-panel-summary">
                  <div className="field-visit-panel-card">
                    <small>
                      {employeePanelMode === 'add'
                        ? 'The current admin session is used to create the employee record.'
                        : editingEmployee?.emp_email || 'Email unavailable'}
                    </small>
                  </div>
                </div>

                <div className="form-card employee-form-card">
                  <div className="form-grid employee-form-grid">
                    {employeePanelMode === 'add' ? (
                      <>
                        <div>
                          <label htmlFor="new-emp-code">Employee ID</label>
                          <input
                            id="new-emp-code"
                            value={newEmployee.emp_code}
                            onChange={(event) => updateNewEmployee('emp_code', event.target.value)}
                            placeholder="e.g. 3051"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-name">Full Name</label>
                          <input
                            id="new-emp-name"
                            value={newEmployee.emp_full_name}
                            onChange={(event) => updateNewEmployee('emp_full_name', event.target.value)}
                            placeholder="Employee full name"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-email">Email</label>
                          <input
                            id="new-emp-email"
                            type="email"
                            value={newEmployee.emp_email}
                            onChange={(event) => updateNewEmployee('emp_email', event.target.value)}
                            placeholder="name@example.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-contact">Contact</label>
                          <input
                            id="new-emp-contact"
                            value={newEmployee.emp_contact}
                            onChange={(event) => updateNewEmployee('emp_contact', event.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-designation">Designation</label>
                          <input
                            id="new-emp-designation"
                            value={newEmployee.emp_designation}
                            onChange={(event) => updateNewEmployee('emp_designation', event.target.value)}
                            placeholder="HR / Sales Executive / DevTester"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-grade">Grade</label>
                          <select
                            id="new-emp-grade"
                            value={newEmployee.emp_grade}
                            onChange={(event) => updateNewEmployee('emp_grade', event.target.value)}
                          >
                            <option value="">Select grade</option>
                            <option value="F">Flexible (F)</option>
                            <option value="M">Moderate (M)</option>
                            <option value="NF">Non-Flexible (NF)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="new-emp-department">Department</label>
                          <input
                            id="new-emp-department"
                            value={newEmployee.emp_department}
                            onChange={(event) => updateNewEmployee('emp_department', event.target.value)}
                            placeholder="Department"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-emp-manager">Manager Code</label>
                          <input
                            id="new-emp-manager"
                            value={newEmployee.emp_manager}
                            onChange={(event) => updateNewEmployee('emp_manager', event.target.value)}
                            placeholder="e.g. 2981"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label htmlFor="edit-emp-code">Employee Code</label>
                          <input
                            id="edit-emp-code"
                            type="text"
                            value={editingEmployee?.emp_code || ''}
                            disabled
                            placeholder="Cannot change"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-full-name">Full Name</label>
                          <input
                            id="edit-emp-full-name"
                            type="text"
                            value={editFormData.emp_full_name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_full_name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-email">Email</label>
                          <input
                            id="edit-emp-email"
                            type="email"
                            value={editFormData.emp_email || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_email: e.target.value })}
                            placeholder="email@company.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-contact">Contact</label>
                          <input
                            id="edit-emp-contact"
                            type="text"
                            value={editFormData.emp_contact || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_contact: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-grade">Grade</label>
                          <select
                            id="edit-emp-grade"
                            value={editFormData.emp_grade || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_grade: e.target.value })}
                          >
                            <option value="">Select grade</option>
                            <option value="F">Flexible (F)</option>
                            <option value="M">Moderate (M)</option>
                            <option value="NF">Non-Flexible (NF)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="edit-emp-designation">Designation</label>
                          <input
                            id="edit-emp-designation"
                            type="text"
                            value={editFormData.emp_designation || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_designation: e.target.value })}
                            placeholder="Job title"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-department">Department</label>
                          <input
                            id="edit-emp-department"
                            type="text"
                            value={editFormData.emp_department || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_department: e.target.value })}
                            placeholder="Department name"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-emp-manager">Manager Code</label>
                          <input
                            id="edit-emp-manager"
                            type="text"
                            value={editFormData.emp_manager || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emp_manager: e.target.value })}
                            placeholder="e.g., EMP001"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {employeePanelMode === 'add' ? (
                    <>
                      <div className="form-actions employee-panel-actions">
                        <button className="ghost" onClick={resetNewEmployee} disabled={createEmployeeLoading} type="button">
                          Reset
                        </button>
                        <button className="cta" onClick={() => void handleCreateEmployee()} disabled={createEmployeeLoading} type="button">
                          Create Employee
                        </button>
                      </div>
                      {createEmployeeStatus ? <p className="form-note">{createEmployeeStatus}</p> : null}
                    </>
                  ) : (
                    <>
                      <div className="form-actions employee-panel-actions">
                        <button className="ghost" onClick={closeEmployeePanel} disabled={editLoading} type="button">
                          Cancel
                        </button>
                        <button className="cta" onClick={handleSaveEmployee} disabled={editLoading} type="button">
                          Save Changes
                        </button>
                      </div>
                      {editStatus ? <p className="form-note">{editStatus}</p> : null}
                    </>
                  )}
                </div>
              </aside>
            </>
          ) : null}
          {deleteEmployeeTarget ? (
            <div className="modal-backdrop" role="dialog" aria-modal="true">
              <div className="modal-card delete-modal-card">
                <div className="modal-header">
                  <strong>Delete Employee</strong>
                  <button className="ghost" onClick={() => setDeleteEmployeeTarget(null)} type="button">
                    Close
                  </button>
                </div>
                <div className="modal-body">
                  <p className="delete-modal-copy">
                    {`Are you sure you want to delete ${deleteEmployeeTarget.emp_full_name || deleteEmployeeTarget.emp_code}? This action cannot be undone.`}
                  </p>
                  <div className="delete-modal-summary">
                    <strong>{deleteEmployeeTarget.emp_code}</strong>
                    <span>{deleteEmployeeTarget.emp_email || 'Email unavailable'}</span>
                  </div>
                  {editStatus ? <p className="form-note">{editStatus}</p> : null}
                </div>
                <div className="modal-actions">
                  <button className="ghost" onClick={() => setDeleteEmployeeTarget(null)} disabled={deleteEmployeeLoading} type="button">
                    Cancel
                  </button>
                  <button className="danger" onClick={() => void handleDeleteEmployee()} disabled={deleteEmployeeLoading} type="button">
                    Delete Employee
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="hero" data-animate>
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">Fawnix</div>
              <div className="brand-tag">Workforce Operations Suite</div>
            </div>
          </div>
          <div className="nav-links">
            <a href="#use-cases">Use cases</a>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#delete">Delete account</a>
          </div>
          <button className="cta">Request Demo</button>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Modern attendance and field operations</p>
            <h1>Make every workday traceable, compliant, and effortless.</h1>
            <p className="lead">
              Fawnix unifies attendance, activities, approvals, and on-field tracking into a
              single mobile-first experience for teams that move.
            </p>
            <div className="hero-actions">
              <button className="cta" onClick={openAdminDashboard}>
                Get Started
              </button>
              <button className="ghost">View Product Tour</button>
            </div>
            <div className="hero-stats">
              <div>
                <span>99.9%</span>
                <small>attendance integrity</small>
              </div>
              <div>
                <span>1 app</span>
                <small>for HR, managers, and teams</small>
              </div>
              <div>
                <span>Realtime</span>
                <small>location and activity logs</small>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-card">
              <div className="panel-header">
                <h3>Today at a glance</h3>
                <span className="status">Live</span>
              </div>
              <div className="panel-body">
                <div className="panel-row">
                  <div>
                    <strong>128</strong>
                    <span>checked in</span>
                  </div>
                  <div>
                    <strong>14</strong>
                    <span>late arrivals</span>
                  </div>
                  <div>
                    <strong>9</strong>
                    <span>pending approvals</span>
                  </div>
                </div>
                <div className="panel-activity">
                  <p>Field visits in progress</p>
                  <div className="chip-row">
                    <span className="chip">Branch visit · 08:45</span>
                    <span className="chip">Lead demo · 09:20</span>
                    <span className="chip">Break · 10:10</span>
                  </div>
                </div>
                <div className="panel-note">
                  {/* Admin dashboard now supports OTP login and live admin API data. */}
                </div>
              </div>
            </div>
            <div className="panel-card subtle">
              <h4>Built for mobile teams</h4>
              <p>Works for sales, logistics, service crews, and retail operations.</p>
            </div>
          </div>
        </div>
      </header>

      <section id="use-cases" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Use cases</p>
          <h2>Designed for every operational role.</h2>
          <p>Clear visibility for leaders, simple actions for employees.</p>
        </div>
        <div className="grid">
          {useCases.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="section alt" data-animate>
        <div className="section-head">
          <p className="eyebrow">What you get</p>
          <h2>Every feature that keeps operations accountable.</h2>
          <p>From attendance to approvals, nothing slips through.</p>
        </div>
        <div className="grid features">
          {features.map((item) => (
            <article key={item.title} className="card feature">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Workflow</p>
          <h2>One simple flow for every workday.</h2>
        </div>
        <div className="timeline">
          {steps.map((step, index) => (
            <div key={step.title} className="timeline-step">
              <div className="step-index">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt" data-animate>
        <div className="split">
          <div>
            <p className="eyebrow">Security & compliance</p>
            <h2>Built for audit-ready operations.</h2>
            <ul className="list">
              <li>Location-stamped attendance logs</li>
              <li>Exception approvals with manager trails</li>
              <li>Automated reminders and auto clock-out</li>
              <li>Centralized reports for HR and leadership</li>
            </ul>
          </div>
          <div className="panel-card">
            <h3>Operational confidence</h3>
            <p>
              Fawnix keeps compliance simple by capturing the right data automatically and
              presenting it clearly for approvals.
            </p>
            <div className="chip-row">
              <span className="chip">Audit trail</span>
              <span className="chip">Shift rules</span>
              <span className="chip">Manager approvals</span>
            </div>
          </div>
        </div>
      </section>

      <section id="delete" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Account control</p>
          <h2>Delete your account securely.</h2>
          <p>Enter your Employee ID and OTP to permanently delete your account.</p>
        </div>
        <div className="delete-card">
          <div>
            <label htmlFor="emp-code">Employee ID</label>
            <input
              id="emp-code"
              type="text"
              placeholder="e.g., 2872"
              value={empCode}
              onChange={(event) => setEmpCode(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="otp">OTP</label>
            <input
              id="otp"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </div>
          <div className="delete-actions">
            <button className="ghost" onClick={handleRequestOtp} disabled={loading}>
              Request OTP
            </button>
            <button className="danger" onClick={handleDelete} disabled={loading}>
              Delete Account
            </button>
          </div>
          {status ? <p className="delete-note">{status}</p> : null}
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>Fawnix</strong>
          <p>Modern workforce operations for distributed teams.</p>
        </div>
        <div className="footer-links">
          <a href="/privacy-policy">Privacy</a>
          <a href="/#delete">Delete account</a>
          <a href="/">Home</a>
        </div>
      </footer>
    </div>
  )
}

export default FawnixApp
