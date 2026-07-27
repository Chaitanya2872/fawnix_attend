import { useEffect, useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import {
  buildRoutePoints,
  calculateDistanceKm,
  formatCoordsValue,
  formatDestinationLocation,
  getDestinationVisitCounts,
  getDestinationVisitFlag,
  getDestinationVisitedStatus,
  getLocationName,
  isCompletedVisitStatus,
  parseCoords,
  resolveVisitDurationMinutes
} from '../utils/fieldVisits'
import type {
  ActivityRow,
  AdminAttendanceExceptionRecord,
  AttendanceExceptionRow,
  AttendanceRow,
  EmployeeRow,
  FieldVisitRow,
  LeaveRow
} from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

const ATTENDANCE_PAGE_SIZE = 1000

function mapAdminExceptionToAttendanceException(
  row: AdminAttendanceExceptionRecord
): AttendanceExceptionRow {
  return {
    id: row.id,
    attendance_id: row.attendance_id,
    emp_code: row.emp_code || row.employee_code,
    emp_name: row.emp_name || row.employee_name,
    exception_type: row.exception_type,
    exception_date: row.exception_date || row.attendance_date || row.created_date,
    attendance_date: row.attendance_date || row.exception_date,
    exception_time: row.exception_time || row.planned_arrival_time,
    planned_arrival_time: row.planned_arrival_time,
    planned_leave_time: row.planned_leave_time,
    late_by_minutes: row.late_by_minutes,
    early_by_minutes: row.early_by_minutes,
    reason: row.reason || row.notes,
    status: row.status,
    requested_at: row.requested_at || row.created_date,
    actual_login_time: row.login_time,
    actual_logout_time: row.logout_time
  }
}

function dedupeAttendanceExceptions(rows: AttendanceExceptionRow[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = row.id
        ? `${row.exception_type || 'exception'}-${row.id}`
        : [
            row.exception_type,
            row.emp_code || row.emp_name,
            row.exception_date || row.attendance_date,
            row.requested_at || row.exception_time || row.actual_login_time || row.actual_logout_time
          ]
            .filter(Boolean)
            .join('|')
            .toLowerCase()

      if (key) {
        map.set(key, row)
      }

      return map
    }, new Map<string, AttendanceExceptionRow>())
      .values()
  )
}

// TODO: loadDashboard eagerly fetches all 8 endpoints for all 6 panels on every
// login/date-filter change, rather than lazily per-panel. That's intentional for
// now (see Phase 3 discussion) - switching panels stays instant with no spinners,
// at the cost of fetching data for panels the user may never visit. Splitting this
// into per-panel fetches is a legitimate follow-up, but it trades instant-switch for
// less waste - a real UX call, not a refactor. Needs its own explicit sign-off
// before changing, not a silent side effect of a cleanup pass.
export function useDashboardData(accessToken: string, apiRequest: ApiRequest) {
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [attendanceExceptions, setAttendanceExceptions] = useState<AttendanceExceptionRow[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(() => toDateInputValue(new Date()))

  const loadDashboard = async (token: string) => {
    setDashboardLoading(true)
    setDashboardError('')

    try {
      const selectedDateValue = attendanceDateFilter || toDateInputValue(new Date())
      const attendanceParams = new URLSearchParams()
      attendanceParams.set('page_size', String(ATTENDANCE_PAGE_SIZE))
      const attendancePath = `/api/admin/attendance/history?${attendanceParams.toString()}`
      const selectedAttendanceParams = new URLSearchParams()
      selectedAttendanceParams.set('page_size', String(ATTENDANCE_PAGE_SIZE))
      selectedAttendanceParams.set('date', selectedDateValue)
      const selectedAttendancePath = `/api/admin/attendance/history?${selectedAttendanceParams.toString()}`
      const selectedExceptionParams = new URLSearchParams()
      selectedExceptionParams.set('page_size', '100')
      selectedExceptionParams.set('from_date', selectedDateValue)
      selectedExceptionParams.set('to_date', selectedDateValue)
      const selectedExceptionsPath = `/api/admin/attendance-exceptions?${selectedExceptionParams.toString()}`

      const [
        employeesResponse,
        attendanceResponse,
        selectedAttendanceResponse,
        leavesResponse,
        activitiesResponse,
        lateArrivalsResponse,
        earlyLeavesResponse,
        selectedExceptionsResponse,
      ] = await Promise.all([
        apiRequest('/api/admin/employees', {}, token),
        apiRequest(attendancePath, {}, token),
        apiRequest(selectedAttendancePath, {}, token),
        apiRequest('/api/admin/leaves?limit=500', {}, token),
        apiRequest('/api/admin/activities?limit=30&include_tracking=true&include_activity_tracking=true', {}, token),
        apiRequest('/api/admin/late-arrivals', {}, token).catch(() => null),
        apiRequest('/api/admin/early-leaves', {}, token).catch(() => null),
        apiRequest(selectedExceptionsPath, {}, token),
      ])

      const employeesData = Array.isArray(employeesResponse?.data) ? employeesResponse.data : []
      const attendanceData: AttendanceRow[] = Array.isArray(attendanceResponse?.data?.records)
        ? attendanceResponse.data.records
        : []
      const selectedAttendanceData: AttendanceRow[] = Array.isArray(selectedAttendanceResponse?.data?.records)
        ? selectedAttendanceResponse.data.records
        : []
      const leavesData = Array.isArray(leavesResponse?.data?.leaves) ? leavesResponse.data.leaves : []
      const activitiesData = Array.isArray(activitiesResponse?.data?.activities) ? activitiesResponse.data.activities : []
      const selectedExceptionData: AttendanceExceptionRow[] = Array.isArray(selectedExceptionsResponse?.data?.records)
        ? (selectedExceptionsResponse.data.records as AdminAttendanceExceptionRecord[])
            .map(mapAdminExceptionToAttendanceException)
        : []
      const selectedLateArrivalsData = selectedExceptionData.filter((row) => row.exception_type === 'late_arrival')
      const selectedEarlyLeavesData = selectedExceptionData.filter((row) => row.exception_type === 'early_leave')
      const legacyLateArrivalsData: AttendanceExceptionRow[] = Array.isArray(lateArrivalsResponse?.data?.exceptions)
        ? lateArrivalsResponse.data.exceptions.map((row: AttendanceExceptionRow) => ({
            ...row,
            exception_type: row.exception_type || 'late_arrival'
          }))
        : []
      const legacyEarlyLeavesData: AttendanceExceptionRow[] = Array.isArray(earlyLeavesResponse?.data?.exceptions)
        ? earlyLeavesResponse.data.exceptions.map((row: AttendanceExceptionRow) => ({
            ...row,
            exception_type: row.exception_type || 'early_leave'
          }))
        : []
      const lateArrivalsData = dedupeAttendanceExceptions([
        ...legacyLateArrivalsData,
        ...selectedLateArrivalsData
      ])
      const earlyLeavesData = dedupeAttendanceExceptions([
        ...legacyEarlyLeavesData,
        ...selectedEarlyLeavesData
      ])
      const exceptionsData: AttendanceExceptionRow[] = dedupeAttendanceExceptions([
        ...lateArrivalsData,
        ...earlyLeavesData,
        ...selectedExceptionData
      ])

      setEmployees(employeesData)
      const attendanceDeduped = Array.from(
        [...attendanceData, ...selectedAttendanceData].reduce((map, row) => {
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
      setLeaveRows(leavesData)
      setActivityRows(activitiesData)
      setAttendanceExceptions(exceptionsData)

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admin dashboard'
      setDashboardError(message)
    } finally {
      setDashboardLoading(false)
    }
  }

  const resetDashboardData = () => {
    setEmployees([])
    setAttendanceRows([])
    setAttendanceExceptions([])
    setLeaveRows([])
    setActivityRows([])
    setFieldVisitRows([])
  }

  useEffect(() => {
    if (!accessToken) {
      return
    }

    void loadDashboard(accessToken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, attendanceDateFilter])

  return {
    employees,
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
  }
}
