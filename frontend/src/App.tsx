import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import fawnixBg from './assets/fawnix_bg.png'

type PrivacySection = {
  title: string
  body: string[]
  bullets: string[]
}

const privacySections: PrivacySection[] = [
  {
    title: 'Information We Collect',
    body: [
      'Fawnix collects account and workforce management information such as employee ID, name, phone number, email address, role, Todays Activity, activity records, leave requests, and device/session details needed to authenticate users and operate the service.',
      'Fawnix also collects and processes location data to support attendance and workforce features, including clock-in, clock-out, field visits, route tracking, geofence validation, working-hours pause and resume, and attendance-related notifications.'
    ],
    bullets: []
  },
  {
    title: 'Location Information',
    body: [
      'Our app collects and processes location data to support attendance and workforce management features such as clock-in/clock-out, field visits, route tracking, and geofence-based validation.'
    ],
    bullets: []
  },
  {
    title: 'What Location Data We Collect',
    body: [],
    bullets: [
      'Precise location data from your device (GPS and network-based)',
      'Clock-in and clock-out location coordinates',
      'Field visit locations and movement tracking',
      'Background location data (only when enabled) for attendance and geofence monitoring'
    ]
  },
  {
    title: 'How We Use Location Data',
    body: [
      'We use location data to:'
    ],
    bullets: [
      'Verify attendance actions such as clock-in and clock-out',
      'Ensure employees are within the assigned work or geofence area',
      'Automatically pause or resume working hours based on location rules',
      'Enable field visit tracking and route history',
      'Improve accuracy, security, and compliance of Todays Activity'
    ]
  },
  {
    title: 'When Location Is Collected',
    body: [
      'Location data may be collected:'
    ],
    bullets: [
      'While the app is actively in use',
      'In the background, only when attendance tracking or field visit tracking is enabled, and required permissions are granted'
    ]
  },
  {
    title: 'Background Location Usage',
    body: [
      'Background location is used strictly for attendance and workforce tracking features, such as:'
    ],
    bullets: [
      'Ensuring accurate work hour tracking',
      'Validating presence within assigned locations',
      'Supporting continuous field visit tracking',
      'Users are informed and can control this permission at any time through device settings.'
    ]
  },
  {
    title: 'Sharing of Location Data',
    body: [
      'Location data is shared only with:',
      'We do not sell or use location data for advertising purposes.'
    ],
    bullets: [
      'Your organization (employer/admin)',
      'Secure backend services required to provide attendance, reporting, and compliance features'
    ]
  },
  {
    title: 'Data Retention',
    body: [
      'Location data is retained only as long as necessary for:'
    ],
    bullets: [
      'Todays Activity',
      'Field visit logs',
      'Organizational compliance and reporting',
      'Retention duration may vary based on organizational policies. Data is securely stored and protected.'
    ]
  },
  {
    title: 'Retention and Deletion',
    body: [
      'Users can request account deletion from the website section below. After a valid deletion request is completed, personal data is deleted or anonymized except where retention is required for legal, fraud-prevention, security, payroll, tax, or dispute-resolution purposes.'
    ],
    bullets: []
  },
  {
    title: 'User Control',
    body: [
      'Users can:'
    ],
    bullets: [
      'Enable or disable location permissions at any time via device settings',
      'Stop background tracking by disabling permissions or logging out of the app'
    ]
  },
  {
    title: 'Security',
    body: [
      'Fawnix uses reasonable administrative, technical, and organizational measures to protect personal information from unauthorized access, disclosure, alteration, or loss. No method of storage or transmission is completely secure, so absolute security cannot be guaranteed.'
    ],
    bullets: []
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions, data requests, or policy concerns, contact ACS Technologies Ltd.',
      'Email: chaitanya.k@acstechnologies.co.in',
      'Phone: 6304718795'
    ],
    bullets: []
  }
]

const useCases = [
  {
    title: 'Field Teams',
    desc: 'Track visits, travel, and attendance with location-aware check-ins.'
  },
  {
    title: 'Retail & Branch Ops',
    desc: 'Ensure shift compliance, break discipline, and daily closure visibility.'
  },
  {
    title: 'Sales & Leads',
    desc: 'Tie activities to leads and keep a verified visit history.'
  },
  {
    title: 'HR & Admin',
    desc: 'One place for approvals, exceptions, and compliance auditing.'
  }
]

const features = [
  {
    title: 'Smart Attendance',
    desc: 'Clock-in/out with geo-tagging, auto shift hours, and late detection.'
  },
  {
    title: 'Activity Tracking',
    desc: 'Start/end activities, log visits, and capture route evidence.'
  },
  {
    title: 'Approvals & Exceptions',
    desc: 'Late arrivals and early leave requests with manager workflows.'
  },
  {
    title: 'Leave & Comp-off',
    desc: 'Apply leave, track status, and redeem comp-off automatically.'
  },
  {
    title: 'Distance Alerts',
    desc: 'Detect out-of-range movement to protect attendance integrity.'
  },
  {
    title: 'Auto Clock-out',
    desc: 'Prevents missing logs with configurable shift-end closure.'
  }
]

const steps = [
  {
    title: 'Start Day',
    desc: 'Employee clocks in with location and begins the shift.'
  },
  {
    title: 'Track Work',
    desc: 'Activities, visits, and breaks are recorded in real time.'
  },
  {
    title: 'Review & Approve',
    desc: 'Managers handle exceptions and approvals within the app.'
  },
  {
    title: 'Close Day',
    desc: 'Clock-out completes hours and comp-off calculations.'
  }
]

const sidebarItems = [
  { id: 'employees', label: 'Employees List' },
  { id: 'attendance', label: 'Todays Activity' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'leaves', label: 'Leaves' },
  { id: 'activities', label: 'Activities' },
  { id: 'field-visits', label: 'Field Visits' }
] as const

type SidebarId = (typeof sidebarItems)[number]['id']

type AdminProfile = {
  emp_code: string
  emp_full_name: string
  emp_email: string
  emp_designation?: string
  emp_department?: string
  role?: string
  can_read?: boolean
  can_write?: boolean
}

type EmployeeRow = {
  emp_code: string
  emp_full_name: string
  emp_email?: string
  emp_contact?: string
  emp_grade?: string
  emp_designation?: string
  emp_department?: string
  emp_manager?: string
  manager_name?: string
  manager_email?: string
  manager_code?: string
  role?: string
  is_active?: boolean
}

type AttendanceRow = {
  id?: number
  date?: string
  employee_email?: string
  employee_name?: string
  emp_designation?: string
  attendance_type?: string
  login_time?: string
  login_location?: string
  login_address?: string
  logout_time?: string
  logout_location?: string
  logout_address?: string
  working_hours?: number
  status?: string
  shift_end_time?: string
  late_arrival?: {
    is_late?: boolean
    informed?: boolean
    status?: string | null
    planned_arrival_time?: string | null
    actual_login_time?: string | null
    late_by_minutes?: number | null
    reason?: string | null
    requested_at?: string | null
  } | null
  early_leave?: {
    is_early_departure?: boolean
    requested?: boolean
    status?: string | null
    planned_leave_time?: string | null
    actual_logout_time?: string | null
    early_by_minutes?: number | null
    reason?: string | null
    requested_at?: string | null
  } | null
}

type LeaveRow = {
  id?: number
  emp_code?: string
  emp_full_name?: string
  emp_designation?: string
  leave_type?: string
  duration?: string
  leave_count?: number | string
  manager_code?: string
  manager_email?: string
  reviewed_by?: string
  notes?: string
  remarks?: string
  from_date?: string
  to_date?: string
  status?: string
}

type AttendanceExceptionRow = {
  id?: number
  emp_code?: string
  emp_name?: string
  exception_type?: string
  exception_date?: string
  exception_time?: string
  planned_leave_time?: string
  late_by_minutes?: number
  early_by_minutes?: number
  reason?: string
  status?: string
  requested_at?: string
  actual_login_time?: string
  actual_logout_time?: string
}

type ActivityRow = {
  id?: number
  employee_name?: string
  employee_email?: string
  activity_type?: string
  status?: string
  start_time?: string
  field_visit_id?: number
  field_visit_type?: string
  field_visit_purpose?: string
  field_visit_status?: string
  field_visit_start_address?: string
  field_visit_end_address?: string
  total_distance_km?: number | string
  start_latitude?: number | string
  start_longitude?: number | string
  end_latitude?: number | string
  end_longitude?: number | string
  destinations?: Array<{
    name?: string
    address?: string
    lat?: number | string
    lon?: number | string
    visited?: boolean
    visited_at?: string | null
    sequence?: number
  }>
  field_visit_tracking?: Array<{
    latitude?: number | string
    longitude?: number | string
    address?: string
    tracked_at?: string
    tracking_type?: string
    location?: string
  }>
  activity_tracking?: Array<{
    latitude?: number | string
    longitude?: number | string
    address?: string
    tracked_at?: string
    tracking_type?: string
    location?: string
  }>
}

type FieldVisitRow = {
  activityId: number | string
  fieldVisitId?: number
  employee: string
  visitType: string
  purpose: string
  visitDate?: string
  status: string
  isCompleted: boolean
  location: string
  startName?: string
  endName?: string
  startAddress?: string
  endAddress?: string
  destinationLocation?: string
  destinationVisited?: boolean | null
  distanceKm?: number | null
  startCoords?: { lat: number; lon: number } | null
  endCoords?: { lat: number; lon: number } | null
  activityTracking?: FieldVisitTrackingPoint[]
  fieldTracking?: FieldVisitTrackingPoint[]
}

type FieldVisitTrackingPoint = {
  latitude?: number | string
  longitude?: number | string
  tracked_at?: string
  tracking_type?: string
  address?: string
  location?: string
}

type MapTrackingPoint = {
  lat: number
  lon: number
  trackedAt?: string
  trackingType?: string
}

type FieldVisitTimelineItem = {
  id: string
  kind: 'start' | 'point' | 'end'
  title: string
  address: string
  coords?: { lat: number; lon: number } | null
  trackedAt?: string
  trackingType?: string
}

const ACCESS_TOKEN_KEY = 'fawnix_admin_access_token'
const REFRESH_TOKEN_KEY = 'fawnix_admin_refresh_token'
const USER_KEY = 'fawnix_admin_user'

function isPrivilegedUser(profile: AdminProfile | null) {
  if (!profile) {
    return false
  }

  const designation = (profile.emp_designation || '').trim().toLowerCase()
  if (designation === 'devtester') {
    return true
  }

  const role = (profile.role || '').trim().toLowerCase()
  if (role !== 'admin') {
    return false
  }

  return Boolean(profile.can_read || profile.can_write)
}

function hasWriteAccess(profile: AdminProfile | null) {
  if (!profile) {
    return false
  }

  const designation = (profile.emp_designation || '').trim().toLowerCase()
  if (designation === 'devtester') {
    return true
  }

  return (profile.role || '').trim().toLowerCase() === 'admin' && Boolean(profile.can_write)
}

function formatDateTime(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatEmployeeGrade(value?: string) {
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

function formatDistanceKm(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return `${value.toFixed(2)} km`
}

function formatWorkingHours(value?: number | string | null) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '--'
  }
  return `${numericValue.toFixed(2)} h`
}

function formatCoords(value?: { lat: number; lon: number } | null) {
  if (!value) {
    return '--'
  }
  return `${value.lat.toFixed(6)}, ${value.lon.toFixed(6)}`
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatLeaveTypeLabel(leave: LeaveRow) {
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

function getLeaveApproverLabel(leave: LeaveRow, employees: EmployeeRow[]) {
  const fallback = leave.reviewed_by || leave.manager_code || leave.manager_email || '--'
  const match =
    employees.find((employee) => employee.emp_code && employee.emp_code === leave.reviewed_by) ||
    employees.find((employee) => employee.emp_code && employee.emp_code === leave.manager_code) ||
    employees.find((employee) => employee.emp_email && employee.emp_email === leave.manager_email)
  return match?.emp_full_name || fallback
}

function getLeaveReasonLabel(leave: LeaveRow) {
  return leave.notes || leave.remarks || '--'
}

function parseCoords(lat?: number | string, lon?: number | string) {
  const latNum = Number(lat)
  const lonNum = Number(lon)
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null
  }
  // Treat backend-default "0,0" as missing location data.
  if (latNum === 0 && lonNum === 0) {
    return null
  }
  return { lat: latNum, lon: lonNum }
}

function formatCoordsValue(coords?: { lat: number; lon: number } | null) {
  if (!coords) {
    return undefined
  }
  return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`
}

function isCompletedVisitStatus(status?: string) {
  const normalized = (status || '').trim().toLowerCase()
  return ['completed', 'complete', 'closed', 'ended'].includes(normalized)
}

function getLocationName(address?: string, fallback = 'Location') {
  const text = (address || '').trim()
  if (!text) {
    return fallback
  }
  const [firstPart] = text.split(',')
  const name = (firstPart || '').trim()
  return name || text
}

function compactCoords(points: Array<{ lat: number; lon: number } | null | undefined>) {
  return points.filter((point): point is { lat: number; lon: number } => Boolean(point))
}

function calculateDistanceKm(points: Array<{ lat: number; lon: number }>) {
  if (points.length < 2) {
    return 0
  }

  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371
  let total = 0

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const deltaLat = toRad(curr.lat - prev.lat)
    const deltaLon = toRad(curr.lon - prev.lon)
    const lat1 = toRad(prev.lat)
    const lat2 = toRad(curr.lat)
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    total += earthRadius * c
  }

  return total
}

function formatDestinationLocation(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return '--'
  }

  const labels = destinations
    .map((destination) => destination?.name || destination?.address)
    .filter((value): value is string => Boolean(value && value.trim()))

  return labels.length ? labels.join(', ') : '--'
}

function getDestinationVisitedStatus(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return null
  }

  return destinations.every((destination) => Boolean(destination?.visited))
}

function normalizeFieldVisitTrackingPoints(points: FieldVisitTrackingPoint[] = []): MapTrackingPoint[] {
  const normalized: MapTrackingPoint[] = []

  points.forEach((point) => {
    const parsedFromLatLon = parseCoords(point.latitude, point.longitude)
    const parsedFromLocation = point.location
      ? (() => {
          const [latValue = '', lonValue = ''] = point.location.split(',').map((value) => value.trim())
          return parseCoords(latValue, lonValue)
        })()
      : null
    const coords = parsedFromLatLon || parsedFromLocation
    if (!coords) {
      return
    }

    normalized.push({
      lat: coords.lat,
      lon: coords.lon,
      trackedAt: point.tracked_at,
      trackingType: point.tracking_type
    })
  })

  return normalized
}

function buildFieldVisitTimelineItems(
  row: FieldVisitRow,
  activityTracking: FieldVisitTrackingPoint[] = [],
  fieldTracking: FieldVisitTrackingPoint[] = []
): FieldVisitTimelineItem[] {
  const items: FieldVisitTimelineItem[] = []

  items.push({
    id: `${row.activityId}-start`,
    kind: 'start',
    title: row.startName || 'Start',
    address: row.startAddress || row.location || 'Start address unavailable',
    coords: row.startCoords,
    trackedAt: row.visitDate
  })

  const trackingSource = activityTracking.length ? activityTracking : fieldTracking
  trackingSource.forEach((point, index) => {
    const coords =
      parseCoords(point.latitude, point.longitude) ||
      (point.location
        ? (() => {
            const [latValue = '', lonValue = ''] = point.location.split(',').map((value) => value.trim())
            return parseCoords(latValue, lonValue)
          })()
        : null)

    items.push({
      id: `${row.activityId}-point-${index}`,
      kind: 'point',
      title: point.tracking_type ? toTitleCase(point.tracking_type.replace(/_/g, ' ')) : `Point ${index + 1}`,
      address: point.address || point.location || 'Address unavailable',
      coords,
      trackedAt: point.tracked_at,
      trackingType: point.tracking_type
    })
  })

  if (row.isCompleted) {
    items.push({
      id: `${row.activityId}-end`,
      kind: 'end',
      title: row.endName || 'End',
      address: row.endAddress || 'End address unavailable',
      coords: row.endCoords,
      trackedAt: undefined
    })
  }

  return items
}

function areSameCoords(
  left?: { lat: number; lon: number } | null,
  right?: { lat: number; lon: number } | null
) {
  if (!left || !right) {
    return false
  }

  return Math.abs(left.lat - right.lat) < 0.000001 && Math.abs(left.lon - right.lon) < 0.000001
}

function buildRoutePoints(
  start?: { lat: number; lon: number } | null,
  tracked: Array<{ lat: number; lon: number }> = [],
  end?: { lat: number; lon: number } | null
) {
  const route: Array<{ lat: number; lon: number }> = []

  if (start) {
    route.push(start)
  }

  for (const point of tracked) {
    if (!route.length || !areSameCoords(route[route.length - 1], point)) {
      route.push(point)
    }
  }

  if (end && (!route.length || !areSameCoords(route[route.length - 1], end))) {
    route.push(end)
  }

  return route
}

function toDateInputValue(value: Date) {
  const offsetValue = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offsetValue).toISOString().slice(0, 10)
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) {
    return new Date()
  }
  return new Date(year, month - 1, day)
}

function formatAttendanceDateLabel(value: string) {
  if (!value) {
    return 'Pick a date'
  }

  const parsed = parseDateInputValue(value)
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function getCalendarMonthLabel(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

function isSameDate(value: string | undefined, targetDate: string) {
  if (!value || !targetDate) {
    return false
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return toDateInputValue(parsed) === targetDate
  }

  return value.slice(0, 10) === targetDate
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

function normalizePath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/'
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

function PrivacyPolicyPage() {
  return (
    <div className="policy-page">
      <header className="policy-hero">
        <div className="policy-hero-inner">
          <a className="policy-back" href="/">
            Back to home
          </a>
          <p className="eyebrow">Privacy Policy</p>
          <h1>Privacy Policy for Fawnix</h1>
          <p className="policy-lead">
            Effective date: April 5, 2026. This policy explains how Fawnix collects, uses,
            shares, retains, and protects personal information, including location data used
            for attendance and field operations.
          </p>
        </div>
      </header>

      <main className="policy-content">
        <section className="policy-card">
          <h2>Summary</h2>
          <p>
            Fawnix is a workforce operations platform used for attendance, activity tracking,
            field visits, approvals, reporting, and account management. Because these features
            rely on verified work-location events, the app collects location data when required
            for attendance and field workflows.
          </p>
        </section>

        {privacySections.map((section) => (
          <section key={section.title} className="policy-card">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets.length ? (
              <ul className="policy-list">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section className="policy-card">
          <h2>Children</h2>
          <p>
            Fawnix is intended for workforce and business use and is not directed to children.
          </p>
        </section>

        <section className="policy-card">
          <h2>Policy Updates</h2>
          <p>
            We may update this Privacy Policy from time to time. Material updates will be
            reflected on this page with a revised effective date.
          </p>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Fawnix</strong>
          <p>Modern workforce operations for distributed teams.</p>
        </div>
        <div className="footer-links">
          <a href="/privacy-policy">Privacy</a>
          <a href="/">Home</a>
          <a href="/#delete">Delete account</a>
        </div>
      </footer>
    </div>
  )
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

function formatTimeZoneLabel(timeZone: string) {
  if (!timeZone) {
    return 'Device Time'
  }

  const parts = timeZone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

function App() {
  const [empCode, setEmpCode] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const [showDashboard, setShowDashboard] = useState(false)
  const [activePanel, setActivePanel] = useState<SidebarId>('employees')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState('')
  const [adminEmpCode, setAdminEmpCode] = useState('')
  const [adminOtp, setAdminOtp] = useState('')
  const [loginSceneTime, setLoginSceneTime] = useState(() => new Date())
  const [loginLocationDetails, setLoginLocationDetails] = useState('Waiting for device location')
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [refreshNotice, setRefreshNotice] = useState('')
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

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
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(() => toDateInputValue(new Date()))
  const [attendanceDatePickerOpen, setAttendanceDatePickerOpen] = useState(false)
  const [attendanceDatePickerMonth, setAttendanceDatePickerMonth] = useState(() =>
    parseDateInputValue(toDateInputValue(new Date()))
  )
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
  const attendanceDatePickerRef = useRef<HTMLDivElement | null>(null)
  const employeeStatusMenuRef = useRef<HTMLDivElement | null>(null)
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false)
  const [createEmployeeStatus, setCreateEmployeeStatus] = useState('')
  const [alertEligibleEmpCodes, setAlertEligibleEmpCodes] = useState<string[]>([])
  const [alertCandidatesLoading, setAlertCandidatesLoading] = useState(false)
  const [alertTriggerLoading, setAlertTriggerLoading] = useState(false)
  const [alertTriggerStatus, setAlertTriggerStatus] = useState('')
  const [showAlertComposer, setShowAlertComposer] = useState(false)
  const [selectedMissedLoginEmpCodes, setSelectedMissedLoginEmpCodes] = useState<string[]>([])
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
  const currentPath = normalizePath(window.location.pathname)
  const isPrivacyPage = currentPath === '/privacy-policy' || currentPath === '/privacy'

  if (isPrivacyPage) {
    return <PrivacyPolicyPage />
  }

  useEffect(() => {
    const storedAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY) || ''
    const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY) || ''
    const storedUser = window.localStorage.getItem(USER_KEY)

    if (storedAccessToken) {
      setAccessToken(storedAccessToken)
    }

    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken)
    }

    if (storedUser) {
      try {
        setProfile(JSON.parse(storedUser))
      } catch {
        window.localStorage.removeItem(USER_KEY)
      }
    }
  }, [])

  useEffect(() => {
    setAttendanceDatePickerMonth(parseDateInputValue(attendanceDateFilter || toDateInputValue(new Date())))
  }, [attendanceDateFilter])

  useEffect(() => {
    if (!attendanceDatePickerOpen) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!attendanceDatePickerRef.current?.contains(event.target as Node)) {
        setAttendanceDatePickerOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAttendanceDatePickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [attendanceDatePickerOpen])

  useEffect(() => {
    if (!employeeStatusMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!employeeStatusMenuRef.current?.contains(event.target as Node)) {
        setEmployeeStatusMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [employeeStatusMenuOpen])

  useEffect(() => {
    if (!showDashboard || !showAdminLogin) {
      return
    }

    setLoginSceneTime(new Date())
    const intervalId = window.setInterval(() => setLoginSceneTime(new Date()), 60000)

    return () => window.clearInterval(intervalId)
  }, [showDashboard, showAdminLogin])

  useEffect(() => {
    if (!showDashboard || !showAdminLogin) {
      return
    }

    if (!('geolocation' in navigator)) {
      setLoginLocationDetails('Location unavailable in this browser')
      return
    }

    let cancelled = false
    setLoginLocationDetails('Locating device')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return
        }

        const { latitude, longitude } = position.coords
        setLoginLocationDetails(
          `${formatCoordinate(latitude, 'N', 'S')} / ${formatCoordinate(longitude, 'E', 'W')}`
        )
      },
      () => {
        if (!cancelled) {
          setLoginLocationDetails('Location access is off')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    )

    return () => {
      cancelled = true
    }
  }, [showDashboard, showAdminLogin])

  useEffect(() => {
    if (!accessToken || !showDashboard || showAdminLogin) {
      return
    }

    void loadDashboard(accessToken)
  }, [accessToken, showDashboard, showAdminLogin])

  useEffect(() => {
    if (!accessToken || !showDashboard || showAdminLogin || activePanel !== 'attendance') {
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
        const nextCodes = Array.isArray(response?.data)
          ? response.data
              .map((row: { emp_code?: string }) => row.emp_code || '')
              .filter(Boolean)
          : []

        if (!cancelled) {
          setAlertEligibleEmpCodes(nextCodes)
        }
      } catch {
        if (!cancelled) {
          setAlertEligibleEmpCodes([])
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
  }, [accessToken, showDashboard, showAdminLogin, activePanel, attendanceDateFilter])

  useEffect(() => {
    setAlertTriggerStatus('')
    setShowAlertComposer(false)
  }, [attendanceDateFilter])

  useEffect(() => {
    setSelectedMissedLoginEmpCodes((previousCodes) =>
      previousCodes.filter((empCode) => alertEligibleEmpCodes.includes(empCode))
    )
  }, [alertEligibleEmpCodes])

  const updateTokens = (nextAccessToken: string, nextRefreshToken: string) => {
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken)
    window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
  }

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error('Refresh token missing')
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to refresh session')
        }

        const nextAccessToken = data?.access_token || ''
        const nextRefreshToken = data?.refresh_token || ''

        if (!nextAccessToken || !nextRefreshToken) {
          throw new Error('Invalid refresh response')
        }

        updateTokens(nextAccessToken, nextRefreshToken)
        setRefreshNotice('Session refreshed')
        window.setTimeout(() => setRefreshNotice(''), 2500)
        return nextAccessToken
      })()
        .finally(() => {
          refreshPromiseRef.current = null
        })
    }

    return refreshPromiseRef.current
  }

  const apiRequest = async (
    path: string,
    options: RequestInit = {},
    tokenOverride?: string,
    allowRetry = true
  ) => {
    const token = tokenOverride || accessToken
    const headers = new Headers(options.headers || {})

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(path, {
      ...options,
      headers
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = data?.message || 'Request failed'
      const shouldRefresh =
        allowRetry &&
        (response.status === 401 || message.toLowerCase().includes('token') || message.toLowerCase().includes('expired'))

      if (shouldRefresh) {
        try {
          const nextAccessToken = await refreshAccessToken()
          return apiRequest(path, options, nextAccessToken, false)
        } catch (refreshError) {
          clearSession()
          setShowAdminLogin(true)
          setShowDashboard(true)
          setAuthStatus('Session expired. Please log in again.')
          throw refreshError
        }
      }

      throw new Error(message)
    }

    return data
  }

  const downloadAttendanceReport = async () => {
    try {
      setAttendanceReportStatus('Preparing report...')
      const params = new URLSearchParams({
        month: attendanceReportMonth,
        year: attendanceReportYear,
        format: attendanceReportFormat
      })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/report?${params.toString()}`, {
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
      link.download = `attendance_report_${attendanceReportYear}_${attendanceReportMonth.padStart(2, '0')}.${attendanceReportFormat}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setAttendanceReportStatus('Report downloaded.')
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to download report')
    }
  }

  const triggerAttendanceReminder = async () => {
    if (!selectedMissedLoginEmpCodes.length) {
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
          emp_codes: selectedMissedLoginEmpCodes
        })
      })

      const sentCount = Number(response?.sent_count || 0)
      const failedCount = Number(response?.failed_count || 0)
      const responseMessage =
        typeof response?.message === 'string' && response.message.trim()
          ? response.message.trim()
          : 'Attendance reminders processed'
      setAlertTriggerStatus(`${responseMessage} Sent: ${sentCount}, Failed: ${failedCount}.`)
      setShowAlertComposer(false)

      const params = new URLSearchParams({
        notification_type: 'attendance_reminder',
        target_date: targetDate
      })
      const candidatesResponse = await apiRequest(`/api/admin/scheduled-notifications/candidates?${params.toString()}`, {}, accessToken)
      const nextCodes = Array.isArray(candidatesResponse?.data)
        ? candidatesResponse.data
            .map((row: { emp_code?: string }) => row.emp_code || '')
            .filter(Boolean)
        : []
      setAlertEligibleEmpCodes(nextCodes)
    } catch (error) {
      setAlertTriggerStatus(error instanceof Error ? error.message : 'Failed to trigger attendance reminders')
    } finally {
      setAlertTriggerLoading(false)
    }
  }

  const persistSession = (nextAccessToken: string, nextRefreshToken: string, nextProfile: AdminProfile) => {
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    setProfile(nextProfile)
    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken)
    window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextProfile))
  }

  const clearSession = () => {
    setAccessToken('')
    setRefreshToken('')
    setProfile(null)
    setEmployees([])
    setAttendanceRows([])
    setAttendanceExceptions([])
    setAttendanceExceptionSummary({ lateArrivals: 0, earlyLeaves: 0 })
    setAttendanceView('attendance')
    setLeaveRows([])
    setActivityRows([])
    setFieldVisitRows([])
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
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
        apiRequest('/api/admin/leaves?limit=30', {}, token),
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
          const status = item.field_visit_status || item.status || 'Unknown'
          const isCompleted = isCompletedVisitStatus(status)
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

          return {
            activityId: item.id || item.field_visit_id || '',
            fieldVisitId: item.field_visit_id ? Number(item.field_visit_id) : undefined,
            employee: item.employee_name || item.employee_email || 'Unknown employee',
            visitType: item.field_visit_type || 'Field Visit',
            purpose: item.field_visit_purpose || item.activity_type || 'Visit',
            visitDate: item.start_time,
            status,
            isCompleted,
            location: startAddress || endAddress || 'Location unavailable',
            startName: getLocationName(startAddress || endAddress, 'Start Location'),
            endName: getLocationName(endAddress, 'End Location'),
            startAddress: startAddress || undefined,
            endAddress: endAddress || undefined,
            destinationLocation: formatDestinationLocation(item.destinations),
            destinationVisited: getDestinationVisitedStatus(item.destinations),
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
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('token')) {
        clearSession()
        setShowAdminLogin(true)
        setShowDashboard(true)
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
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data?.message || 'Failed to request OTP.')
      } else {
        setStatus('OTP sent. Please check your device and enter it below.')
      }
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
      const res = await fetch('/api/auth/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim(), otp: otp.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data?.message || 'Delete request failed.')
      } else {
        setStatus('Account deletion submitted successfully.')
      }
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
      setShowDashboard(true)
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
      setShowDashboard(false)
      setShowAdminLogin(false)
      setAuthStatus('')
    }
  }

  const openAdminDashboard = () => {
    setShowDashboard(true)
    if (!accessToken) {
      setShowAdminLogin(true)
      setAuthStatus('')
      return
    }

    setShowAdminLogin(false)
  }

  const openFieldVisitPanel = async (row: FieldVisitRow) => {
    setFieldVisitPanelOpen(true)
    setFieldVisitPanelRow(row)
    setFieldVisitPanelError('')
    setFieldVisitPanelLoading(true)
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

      const enrichedRow: FieldVisitRow = {
        ...row,
        visitDate: row.visitDate || visit.start_time,
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

  const downloadEmployeesReport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    try {
      const makeRequest = async (token: string) =>
        fetch(`/api/admin/employees/report?format=${format}`, {
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
        throw new Error(errorText || 'Failed to download employees report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `employees_${toDateInputValue(new Date())}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to download employees report')
    }
  }

  const selectedAttendanceDate = attendanceDateFilter || toDateInputValue(new Date())
  const attendanceCalendarMonthLabel = getCalendarMonthLabel(attendanceDatePickerMonth)
  const attendanceCalendarDays = getCalendarDays(attendanceDatePickerMonth)
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
    return leftTime - rightTime
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
  const lateLogins = selectedDateLateArrivals.length
  const onTimeLogins = Math.max(firstClockInRows.length - lateLogins, 0)
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
    const missedLoginEmployees = employees
      .filter((employee) => (employee.emp_code ? alertEligibleEmpCodes.includes(employee.emp_code) : false))
      .sort((left, right) =>
        (left.emp_full_name || left.emp_code || '').localeCompare(right.emp_full_name || right.emp_code || '')
      )
    const missedLoginEmployeeCodes = missedLoginEmployees
      .map((employee) => employee.emp_code || '')
      .filter(Boolean)
    const selectedMissedLoginCount = selectedMissedLoginEmpCodes.filter((empCode) =>
      missedLoginEmployeeCodes.includes(empCode)
    ).length
    const allMissedLoginsSelected =
      missedLoginEmployeeCodes.length > 0 && selectedMissedLoginCount === missedLoginEmployeeCodes.length
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

    if (activePanel === 'employees') {
      return (
        <>
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Employees List</h2>
            </div>
            <div className="employee-actions">
              {canWriteAdminData ? (
                <button className="ghost dashboard-button" onClick={openAddEmployeePanel}>
                  Add Employee
                </button>
              ) : null}
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            </div>
          </div>
          <div className="employee-search-card">
            <div className="employee-search-copy">
              <label htmlFor="employee-search">Search Employees</label>
              <span>
                {filteredEmployees.length} result{filteredEmployees.length === 1 ? '' : 's'} from {employees.length} employees
              </span>
            </div>
            <div className="employee-search-shell">
              <span className="employee-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z" />
                </svg>
              </span>
              <input
                id="employee-search"
                type="text"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search by name, code, email, designation, department, or manager"
              />
              {employeeSearch ? (
                <button
                  className="employee-search-clear"
                  type="button"
                  onClick={() => setEmployeeSearch('')}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="employee-toolbar-meta">
              <span className="employee-filter-chip">
                Status: {employeeStatusFilter === 'all' ? 'All' : employeeStatusFilter === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-card">
              <span>Total Employees</span>
              <strong>{employees.length}</strong>
            </div>
            <div className="metric-card">
              <span>HR / Admin</span>
              <strong>
                {
                  filteredEmployees.filter((employee) =>
                    ['hr', 'cmd', 'admin'].includes((employee.emp_designation || '').toLowerCase())
                  ).length
                }
              </strong>
            </div>
          </div>
          <div className="table-card">
            {filteredEmployees.length ? (
              <div className="table-scroll">
                <table className="dashboard-table employee-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Grade</th>
                      <th>Department</th>
                      <th>Contact</th>
                      <th>Manager</th>
                      <th className="employee-status-head">
                        <div className="employee-status-filter" ref={employeeStatusMenuRef}>
                          <span>Status</span>
                          <button
                            className={`employee-status-filter-trigger ${employeeStatusMenuOpen ? 'open' : ''}`}
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={employeeStatusMenuOpen}
                            onClick={() => setEmployeeStatusMenuOpen((current) => !current)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 6h16M7 12h10m-7 6h4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          {employeeStatusMenuOpen ? (
                            <div className="employee-status-menu" role="menu">
                              {[
                                { id: 'all', label: 'All employees' },
                                { id: 'active', label: 'Active only' },
                                { id: 'inactive', label: 'Inactive only' }
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  className={`employee-status-menu-item ${employeeStatusFilter === option.id ? 'active' : ''}`}
                                  type="button"
                                  onClick={() => {
                                    setEmployeeStatusFilter(option.id as 'all' | 'active' | 'inactive')
                                    setEmployeeStatusMenuOpen(false)
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.emp_code} className="employee-row">
                        <td>
                          <strong>{employee.emp_full_name || employee.emp_code}</strong>
                          <span className="table-meta">{employee.emp_code}</span>
                        </td>
                        <td>{employee.emp_designation || employee.role || '--'}</td>
                        <td>{formatEmployeeGrade(employee.emp_grade)}</td>
                        <td>{employee.emp_department || '--'}</td>
                        <td>
                          <strong className="employee-email">{employee.emp_email || '--'}</strong>
                          <span className="table-meta">{employee.emp_contact || 'Contact unavailable'}</span>
                        </td>
                        <td>
                          <strong>{employee.manager_name || employee.emp_manager || '--'}</strong>
                          <span className="table-meta">{employee.manager_email || employee.manager_code || 'Manager'}</span>
                        </td>
                        <td>
                          <span className={`table-pill ${employee.is_active ? 'active' : 'inactive'}`}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                           {canWriteAdminData ? (
                             <div className="table-actions">
                               <button className="action-btn icon-btn edit-btn" onClick={() => handleEditEmployee(employee)} title="Edit employee" type="button">
                                 <svg viewBox="0 0 24 24" aria-hidden="true">
                                   <path
                                     d="M4 20h4l10.5-10.5a2.12 2.12 0 1 0-3-3L5 17v3Z"
                                     fill="none"
                                     stroke="currentColor"
                                     strokeWidth="1.8"
                                     strokeLinecap="round"
                                     strokeLinejoin="round"
                                   />
                                 </svg>
                               </button>
                               <button className="action-btn icon-btn delete-btn" onClick={() => requestDeleteEmployee(employee)} title="Delete employee" type="button">
                                 <svg viewBox="0 0 24 24" aria-hidden="true">
                                   <path
                                     d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5"
                                     fill="none"
                                     stroke="currentColor"
                                     strokeWidth="1.8"
                                     strokeLinecap="round"
                                     strokeLinejoin="round"
                                   />
                                 </svg>
                               </button>
                             </div>
                           ) : (
                             <span className="table-meta">Read only</span>
                           )}
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No employees match this search.</div>
            )}
          </div>
        </>
      )
    }

    if (activePanel === 'attendance') {
      const attendanceTabCount = attendancePageRows.length

      const lateArrivalCount = selectedDateLateArrivals.length
      const earlyLeaveCount = selectedDateEarlyLeaves.length
      const leaveCount = selectedDateLeaves.length
      const missedLoginCount = missedLoginEmployees.length
      const exceptionRows =
        attendanceView === 'late-arrivals'
          ? selectedDateLateArrivals
          : attendanceView === 'early-leaves'
            ? selectedDateEarlyLeaves
            : []

      return (
        <>
          <div className="dashboard-section-head attendance-section-head">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Todays Activity</h2>
              <div className="attendance-tabs">
                <button
                  className={`attendance-tab ${attendanceView === 'attendance' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('attendance')}
                >
                  First Clock-Ins
                  <span>{attendanceTabCount}</span>
                </button>
                <button
                  className={`attendance-tab ${attendanceView === 'late-arrivals' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('late-arrivals')}
                >
                  Late Arrivals
                  <span>{lateArrivalCount}</span>
                </button>
                <button
                  className={`attendance-tab ${attendanceView === 'early-leaves' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('early-leaves')}
                >
                  Early Leaves
                  <span>{earlyLeaveCount}</span>
                </button>
                <button
                  className={`attendance-tab ${attendanceView === 'leaves' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('leaves')}
                >
                  Leaves
                  <span>{leaveCount}</span>
                </button>
                <button
                  className={`attendance-tab ${attendanceView === 'missed-logins' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('missed-logins')}
                >
                  Missed Logins
                  <span>{missedLoginCount}</span>
                </button>
              </div>
            </div>
            {attendanceView === 'attendance' ? (
              <div className="attendance-head-actions">
                <div className="attendance-controls attendance-controls-inline">
                  <div className="attendance-filter attendance-filter-date">
                    <label htmlFor="attendance-date">Date</label>
                    <div
                      className={`attendance-date-picker ${attendanceDatePickerOpen ? 'open' : ''}`}
                      ref={attendanceDatePickerRef}
                    >
                      <button
                        className="attendance-input-shell attendance-date-shell attendance-date-trigger"
                        id="attendance-date"
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={attendanceDatePickerOpen}
                        onClick={() => setAttendanceDatePickerOpen((current) => !current)}
                      >
                        <span className="attendance-input-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path
                              d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="attendance-date-value">{formatAttendanceDateLabel(attendanceDateFilter)}</span>
                        <span className="attendance-date-chevron" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path
                              d="m8 10 4 4 4-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                      {attendanceDatePickerOpen ? (
                        <div className="attendance-date-popover" role="dialog" aria-label="Choose date">
                          <div className="attendance-date-popover-head">
                            <button
                              className="attendance-date-nav"
                              type="button"
                              aria-label="Previous month"
                              onClick={() =>
                                setAttendanceDatePickerMonth(
                                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                                )
                              }
                            >
                              <svg viewBox="0 0 24 24">
                                <path
                                  d="m14 7-5 5 5 5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <strong>{attendanceCalendarMonthLabel}</strong>
                            <button
                              className="attendance-date-nav"
                              type="button"
                              aria-label="Next month"
                              onClick={() =>
                                setAttendanceDatePickerMonth(
                                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                                )
                              }
                            >
                              <svg viewBox="0 0 24 24">
                                <path
                                  d="m10 7 5 5-5 5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="attendance-date-weekdays">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                              <span key={day}>{day}</span>
                            ))}
                          </div>
                          <div className="attendance-date-grid">
                            {attendanceCalendarDays.map((day) => {
                              const dayValue = toDateInputValue(day)
                              const isSelected = dayValue === selectedAttendanceDate
                              const isToday = dayValue === todayDateValue
                              const isOutsideMonth = day.getMonth() !== attendanceDatePickerMonth.getMonth()

                              return (
                                <button
                                  key={dayValue}
                                  className={[
                                    'attendance-date-day',
                                    isSelected ? 'selected' : '',
                                    isToday ? 'today' : '',
                                    isOutsideMonth ? 'outside' : ''
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  type="button"
                                  onClick={() => {
                                    setAttendanceDateFilter(dayValue)
                                    setAttendanceDatePickerOpen(false)
                                  }}
                                >
                                  <span>{day.getDate()}</span>
                                </button>
                              )
                            })}
                          </div>
                          <div className="attendance-date-popover-footer">
                            <button
                              className="attendance-date-footer-link"
                              type="button"
                              onClick={() => {
                                setAttendanceDateFilter(todayDateValue)
                                setAttendanceDatePickerMonth(parseDateInputValue(todayDateValue))
                                setAttendanceDatePickerOpen(false)
                              }}
                            >
                              Today
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="attendance-filter attendance-filter-search">
                    <label htmlFor="attendance-search">Search</label>
                    <div className="attendance-input-shell attendance-search-shell">
                      <input
                        id="attendance-search"
                        type="text"
                        value={attendanceSearch}
                        onChange={(event) => setAttendanceSearch(event.target.value)}
                        placeholder="Search name, email, type, or location"
                      />
                    </div>
                  </div>
                  <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            )}
          </div>
          {attendanceView === 'attendance' ? (
          <div className="table-card">
            {filteredAttendanceRows.length ? (
              <div className="table-scroll">
                <table className="dashboard-table attendance-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Working Hours</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendanceRows.map((row, index) => (
                      <tr key={`${row.id || row.employee_email || index}`}>
                        <td>
                          <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                          <span className="table-meta">{row.emp_designation || row.employee_email || '--'}</span>
                        </td>
                        <td>
                          <strong>{formatDateTime(row.login_time)}</strong>
                          <span className="table-meta">{row.login_location || 'Login location unavailable'}</span>
                          <span className="table-meta">{row.login_address || 'Login address unavailable'}</span>
                        </td>
                        <td>
                          <strong>{formatDateTime(row.logout_time)}</strong>
                          <span className="table-meta">{row.logout_location || 'Logout location unavailable'}</span>
                          <span className="table-meta">{row.logout_address || 'Logout address unavailable'}</span>
                        </td>
                        <td>{formatWorkingHours(row.working_hours)}</td>
                        <td>{row.attendance_type || 'office'}</td>
                        <td>
                          <span className="table-pill accent">{row.status || 'Unknown'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                {attendanceSearch.trim()
                  ? 'No attendance records match this search.'
                  : 'No first clock-in records found for the selected date.'}
              </div>
            )}
          </div>
          ) : attendanceView === 'leaves' ? (
            <div className="table-card">
              {selectedDateLeaves.length ? (
                <div className="table-scroll">
                  <table className="dashboard-table leave-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Leave Type</th>
                        <th>Dates</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateLeaves.map((row, index) => (
                        <tr key={`${row.id || row.emp_code || index}`}>
                          <td>
                            <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                            <span className="table-meta">{row.emp_designation || formatLeaveTypeLabel(row) || 'Leave Request'}</span>
                          </td>
                          <td>{formatLeaveTypeLabel(row)}</td>
                          <td>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</td>
                          <td>
                            <span className="table-pill">{row.status || 'Unknown'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">No leaves found for the selected date.</div>
              )}
            </div>
          ) : attendanceView === 'missed-logins' ? (
            <div className="alert-side-card">
              <div className="chart-card-head">
                <div>
                  <strong>Missed Logins</strong>
                  <span>Employees who have not logged in and are not on leave for {selectedAttendanceDate}.</span>
                </div>
              </div>
              <div className="alert-side-count">
                <strong>{missedLoginEmployees.length}</strong>
                <span>{alertCandidatesLoading ? 'Refreshing alerts...' : 'Need attention'}</span>
              </div>
              <div className="missed-logins-toolbar">
                <button
                  className="ghost dashboard-button"
                  type="button"
                  onClick={() => {
                    setSelectedMissedLoginEmpCodes(missedLoginEmployeeCodes)
                    setAlertTriggerStatus('')
                  }}
                  disabled={!missedLoginEmployeeCodes.length || allMissedLoginsSelected}
                >
                  Select All
                </button>
                <button
                  className="ghost dashboard-button"
                  type="button"
                  onClick={() => {
                    setSelectedMissedLoginEmpCodes([])
                    setAlertTriggerStatus('')
                  }}
                  disabled={!selectedMissedLoginEmpCodes.length}
                >
                  Clear
                </button>
              </div>
              <div className="alert-side-list">
                {missedLoginEmployees.length ? (
                  missedLoginEmployees.map((employee) => (
                    <label key={employee.emp_code} className="alert-side-item missed-login-item">
                      <input
                        className="missed-login-checkbox"
                        type="checkbox"
                        checked={selectedMissedLoginEmpCodes.includes(employee.emp_code)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelectedMissedLoginEmpCodes((previousCodes) => {
                            if (checked) {
                              return previousCodes.includes(employee.emp_code)
                                ? previousCodes
                                : [...previousCodes, employee.emp_code]
                            }
                            return previousCodes.filter((empCode) => empCode !== employee.emp_code)
                          })
                        }}
                      />
                      <div className="missed-login-item-copy">
                        <strong>{employee.emp_full_name || employee.emp_code}</strong>
                        <span>{employee.emp_designation || employee.emp_department || employee.emp_email || '--'}</span>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="empty-state">No missed logins for this date.</div>
                )}
              </div>
              <div className="missed-logins-actions">
                <span className="missed-logins-selected">
                  Selected: {selectedMissedLoginCount}
                </span>
                <div className={`alert-trigger-wrap${showAlertComposer ? ' open' : ''}`}>
                  <button
                    className="cta dashboard-button alert-trigger-button"
                    type="button"
                    onClick={() => {
                      setShowAlertComposer((current) => !current)
                      setAlertTriggerStatus('')
                    }}
                    disabled={alertCandidatesLoading || !selectedMissedLoginEmpCodes.length}
                  >
                    {alertTriggerLoading ? 'Triggering...' : 'Trigger Alert'}
                  </button>
                  <div className={`alert-trigger-dropdown${showAlertComposer ? ' open' : ''}`}>
                    <div className="alert-trigger-dropdown-head">
                      <strong>Reminder options</strong>
                      <span>{selectedMissedLoginCount} employee{selectedMissedLoginCount === 1 ? '' : 's'} selected for {reminderTargetDate}</span>
                    </div>
                    <div className="alert-trigger-message">
                      <small>Message sending</small>
                      <strong>{reminderPreviewTitle}</strong>
                      <p>{reminderPreviewBody}</p>
                    </div>
                    <div className="alert-trigger-recipient-list">
                      {selectedMissedLoginEmpCodes
                        .map((empCode) => missedLoginEmployees.find((employee) => employee.emp_code === empCode))
                        .filter((employee): employee is EmployeeRow => Boolean(employee))
                        .slice(0, 4)
                        .map((employee) => (
                          <span key={employee.emp_code} className="alert-trigger-recipient-pill">
                            {employee.emp_full_name || employee.emp_code}
                          </span>
                        ))}
                      {selectedMissedLoginCount > 4 ? (
                        <span className="alert-trigger-recipient-pill">+{selectedMissedLoginCount - 4} more</span>
                      ) : null}
                    </div>
                    <div className="alert-trigger-dropdown-actions">
                      <button
                        className="ghost dashboard-button"
                        type="button"
                        onClick={() => setShowAlertComposer(false)}
                        disabled={alertTriggerLoading}
                      >
                        Cancel
                      </button>
                      <button
                        className="cta dashboard-button"
                        type="button"
                        onClick={() => void triggerAttendanceReminder()}
                        disabled={alertTriggerLoading || !selectedMissedLoginEmpCodes.length}
                      >
                        {alertTriggerLoading ? 'Sending...' : 'Send Reminder'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {alertTriggerStatus ? <span className="report-status">{alertTriggerStatus}</span> : null}
            </div>
          ) : (
            <div className="table-card">
              {exceptionRows.length ? (
                <div className="table-scroll">
                  <table className="dashboard-table exception-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>{attendanceView === 'late-arrivals' ? 'Late By' : 'Early By'}</th>
                        <th>{attendanceView === 'late-arrivals' ? 'Login Time' : 'Leave Time'}</th>
                        <th>{attendanceView === 'late-arrivals' ? 'Informed' : 'Status'}</th>
                        <th>Reason</th>
                        <th>Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionRows.map((row, index) => (
                        <tr key={`${row.id || row.emp_code || index}`}>
                          <td>
                            <strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong>
                          </td>
                          <td>
                            {attendanceView === 'late-arrivals'
                              ? `${row.late_by_minutes ?? '--'} min`
                              : `${row.early_by_minutes ?? '--'} min`}
                          </td>
                          <td>
                            {attendanceView === 'late-arrivals'
                              ? row.exception_time || row.actual_login_time || '--'
                              : row.planned_leave_time || row.actual_logout_time || '--'}
                          </td>
                          <td>
                            {attendanceView === 'late-arrivals' ? (
                              <span className={`table-pill ${(row.status || '').toLowerCase() === 'not_informed' ? '' : 'accent'}`}>
                                {(row.status || '').toLowerCase() === 'not_informed' ? 'Not informed' : 'Informed'}
                              </span>
                            ) : (
                              <span className="table-pill">{row.status || 'Pending'}</span>
                            )}
                          </td>
                          <td>{row.reason || 'No reason provided'}</td>
                          <td>{formatDateTime(row.requested_at || row.exception_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">No {attendanceView === 'late-arrivals' ? 'late arrival' : 'early leave'} requests found for the selected date.</div>
              )}
            </div>
          )}
        </>
      )
    }

    if (activePanel === 'reports') {
      return (
        <>
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">Insights</p>
              <h2>Reports & Analytics</h2>
            </div>
            <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
              Refresh
            </button>
          </div>

          <div className="reports-main">
              <div className="report-toolbar">
                <div className="attendance-filter attendance-filter-date">
                  <label htmlFor="reports-date">Reference Date</label>
                  <input
                    className="modern-date-input"
                    id="reports-date"
                    type="date"
                    value={attendanceDateFilter}
                    onChange={(event) => setAttendanceDateFilter(event.target.value)}
                  />
                </div>
                <div className="attendance-filter attendance-filter-compact">
                  <label htmlFor="attendance-month">Month</label>
                  <select
                    id="attendance-month"
                    value={attendanceReportMonth}
                    onChange={(event) => setAttendanceReportMonth(event.target.value)}
                  >
                    {[
                      '01',
                      '02',
                      '03',
                      '04',
                      '05',
                      '06',
                      '07',
                      '08',
                      '09',
                      '10',
                      '11',
                      '12'
                    ].map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="attendance-filter attendance-filter-compact">
                  <label htmlFor="attendance-year">Year</label>
                  <select
                    id="attendance-year"
                    value={attendanceReportYear}
                    onChange={(event) => setAttendanceReportYear(event.target.value)}
                  >
                    {Array.from({ length: 6 }, (_, index) => {
                      const year = new Date().getFullYear() - index
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="attendance-filter attendance-filter-compact">
                  <label htmlFor="attendance-format">Format</label>
                  <select
                    id="attendance-format"
                    value={attendanceReportFormat}
                    onChange={(event) => setAttendanceReportFormat(event.target.value as 'csv' | 'pdf' | 'xlsx')}
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                    <option value="xlsx">XLSX</option>
                  </select>
                </div>
              </div>

              <div className="report-actions-card">
                <div>
                  <strong>Download Reports</strong>
                  <span>Export employee lists and attendance reports from one place.</span>
                </div>
                <div className="report-actions">
                  <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('csv')}>
                    Employees CSV
                  </button>
                  <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('pdf')}>
                    Employees PDF
                  </button>
                  <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('xlsx')}>
                    Employees XLSX
                  </button>
                  <button className="cta dashboard-button" onClick={downloadAttendanceReport}>
                    Attendance Report
                  </button>
                </div>
                {attendanceReportStatus ? <span className="report-status attendance-report-status">{attendanceReportStatus}</span> : null}
              </div>

              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <strong>Weekly Attendance Trend</strong>
                    <span>Unique employee clock-ins across the last 7 days.</span>
                  </div>
                </div>
                <div className="line-chart-shell">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart">
                    <polyline
                      fill="none"
                      stroke="#1fa7a4"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={weeklyTrendPoints}
                    />
                    {weeklyAttendanceTrend.map((item, index) => {
                      const x = weeklyAttendanceTrend.length > 1 ? (index / (weeklyAttendanceTrend.length - 1)) * 100 : 50
                      const y = 100 - (item.count / maxWeeklyAttendance) * 100
                      return <circle key={item.dateKey} cx={x} cy={y} r="2.5" fill="#112c32" />
                    })}
                  </svg>
                  <div className="line-chart-labels">
                    {weeklyAttendanceTrend.map((item) => (
                      <div key={item.dateKey} className="chart-label-block">
                        <strong>{item.count}</strong>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <strong>Attendance Efficiency Score</strong>
                    <span>Employee presence score across the same 7-day window.</span>
                  </div>
                </div>
                <div className="efficiency-list">
                  {attendanceEfficiencyScores.length ? (
                    attendanceEfficiencyScores.map((item) => (
                      <div key={item.empCode || item.name} className="efficiency-row">
                        <div className="efficiency-meta">
                          <strong>{item.name}</strong>
                          <span>{item.presentDays} / 7 days present</span>
                        </div>
                        <div className="efficiency-bar-track">
                          <div className="efficiency-bar-fill" style={{ width: `${item.score}%` }} />
                        </div>
                        <strong className="efficiency-score">{item.score}%</strong>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No attendance data available for analytics yet.</div>
                  )}
                </div>
              </div>
          </div>
        </>
      )
    }

    if (activePanel === 'leaves') {
      return (
        <>
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">Approvals</p>
              <h2>Leaves</h2>
            </div>
            <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
              Refresh
            </button>
          </div>
          <div className="table-card">
            {leaveRows.length ? (
              <div className="table-scroll">
                <table className="dashboard-table leave-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Approver</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRows.map((row, index) => (
                      <tr key={`${row.id || row.emp_code || index}`}>
                        <td>
                          <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        </td>
                        <td>{formatLeaveTypeLabel(row)}</td>
                        <td>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</td>
                        <td>{getLeaveApproverLabel(row, employees)}</td>
                        <td>{getLeaveReasonLabel(row)}</td>
                        <td>
                          <span className="table-pill">{row.status || 'Unknown'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No leave requests found.</div>
            )}
          </div>
        </>
      )
    }

    if (activePanel === 'activities') {
      return (
        <>
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">Live Work</p>
              <h2>Activities</h2>
            </div>
            <div className="employee-actions">
              <button
                className="ghost dashboard-button"
                onClick={() => setShowTodayActivities((current) => !current)}
              >
                {showTodayActivities ? "Show All" : "Show Today"}
              </button>
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            </div>
          </div>
          <div className="table-card">
            {filteredActivities.length ? (
              <div className="table-scroll">
                <table className="dashboard-table activity-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Activity</th>
                      <th>Started</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((row, index) => (
                      <tr key={`${row.id || row.employee_email || index}`}>
                        <td>
                          <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                        </td>
                        <td>{row.activity_type || 'Activity'}</td>
                        <td>{formatDateTime(row.start_time)}</td>
                        <td>
                          <span className="table-pill accent">{row.status || 'Unknown'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                {showTodayActivities ? "No activities found for today." : "No activities found."}
              </div>
            )}
          </div>
        </>
      )
    }

    return (
      <>
        <div className="dashboard-section-head">
          <div>
            <p className="eyebrow">Movement</p>
            <h2>Field Visits</h2>
          </div>
          <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
            Refresh
          </button>
        </div>
        <div className="table-card">
          {fieldVisitRows.length ? (
            <div className="table-scroll">
                <table className="dashboard-table field-visit-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Visit Type</th>
                      <th>Destination Location</th>
                      <th>Destination Visited</th>
                      <th>Start Location</th>
                      <th>End Location</th>
                      <th>Distance</th>
                      <th>Status</th>
                      <th>Map</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldVisitRows.map((row) => {
                      const showRouteDetails = row.isCompleted
                      return (
                        <tr
                          key={row.activityId}
                          className="table-clickable-row"
                          onClick={() => void openFieldVisitPanel(row)}
                        >
                          <td>
                            <strong>{row.employee}</strong>
                          </td>
                          <td>{formatDateTime(row.visitDate)}</td>
                          <td>{row.visitType}</td>
                          <td>{row.destinationLocation || '--'}</td>
                          <td>
                            {row.destinationVisited === null ? (
                              '--'
                            ) : (
                              <span className={`table-pill ${row.destinationVisited ? 'approved' : 'warning'}`}>
                                {row.destinationVisited ? 'True' : 'False'}
                              </span>
                            )}
                          </td>
                          <td>
                            <strong>{row.startName || 'Start location unavailable'}</strong>
                            <span className="table-meta">{row.startAddress || row.location || '--'}</span>
                          </td>
                          <td>
                            <strong>{showRouteDetails ? row.endName || 'End location unavailable' : '--'}</strong>
                            <span className="table-meta">{showRouteDetails ? row.endAddress || '--' : 'Visit in progress'}</span>
                          </td>
                          <td>{showRouteDetails ? formatDistanceKm(row.distanceKm) : '--'}</td>
                          <td>
                            <span className="table-pill accent">{row.status}</span>
                          </td>
                          <td>
                            <button
                              className="map-button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void openMapForFieldVisit(row)
                              }}
                              aria-label="Open map"
                              title="Open map"
                              type="button"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 2c-3.6 0-6.5 2.9-6.5 6.5 0 4.7 6.5 12 6.5 12s6.5-7.3 6.5-12C18.5 4.9 15.6 2 12 2zm0 9.2c-1.5 0-2.7-1.2-2.7-2.7S10.5 5.8 12 5.8s2.7 1.2 2.7 2.7S13.5 11.2 12 11.2z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            </div>
          ) : (
            <div className="empty-state">No field visits found in the latest activity feed.</div>
          )}
        </div>
      </>
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

    return (
      <div className={`admin-shell${showAdminLogin ? ' admin-shell-login' : ''}`}>
        {!showAdminLogin ? (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img className="brand-mark-image" src={fawnixBg} alt="" aria-hidden="true" />
            <div>
              <div className="brand-name">Fawnix Admin</div>
              <div className="brand-tag">Operations control room</div>
            </div>
          </div>

          <div className="sidebar-user">
            <strong>{profile?.emp_full_name || 'Admin'}</strong>
            <span>{profile?.emp_designation || profile?.role || profile?.emp_code}</span>
          </div>

          <div className="sidebar-group">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activePanel === item.id ? 'active' : ''}`}
                onClick={() => setActivePanel(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button className="sidebar-link logout-link" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <div className="sidebar-foot">
            <div className="sidebar-note">
              <strong>Today</strong>
              <span>
                {attendanceRows.length} attendance rows, {leaveRows.length} leave entries,
                {' '}{activityRows.length} activities
              </span>
            </div>
            <button className="ghost sidebar-back" onClick={() => void loadDashboard(accessToken)}>
              Refresh Data
            </button>
            <button className="ghost sidebar-back" onClick={() => setShowDashboard(false)}>
              Back to Landing
            </button>
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
                  <span>{fieldVisitPanelRow.distanceKm ? formatDistanceKm(fieldVisitPanelRow.distanceKm) : '--'}</span>
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
            <section className={`login-stage login-stage-${loginSceneMode}`}>
              <div className="login-stage-wallpaper" aria-hidden="true">
                <div className="login-stage-grid" />
                <div className="login-stage-glow login-stage-glow-one" />
                <div className="login-stage-glow login-stage-glow-two" />
                <div className="login-stage-glow login-stage-glow-three" />
              </div>

              <div className="login-stage-topbar">
                <button
                  className="ghost login-stage-back"
                  onClick={() => setShowDashboard(false)}
                  type="button"
                  aria-label="Back to landing"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M14.75 5.75L8.5 12l6.25 6.25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="login-stage-meta">
                  <div className="login-stage-chip">
                    <span>Local time</span>
                    <strong>{loginTimeLabel}</strong>
                    <small>{loginDateLabel}</small>
                  </div>
                  <div className="login-stage-chip login-stage-chip-location">
                    <span>{formatTimeZoneLabel(loginTimeZone)}</span>
                    <strong>Device location</strong>
                    <small>{loginLocationDetails}</small>
                  </div>
                </div>
              </div>

              <div className="login-stage-center">
                <div className="login-stage-panel">
                  <div className="login-stage-panel-head">
                    <div className="login-stage-brand">
                      <img className="login-stage-brand-image" src={fawnixBg} alt="Fawnix" />
                      <div>
                        <p className="eyebrow">Fawnix Admin Login</p>
                        <h2>Secure Sign in</h2>
                      </div>
                    </div>
                    <p className="login-stage-support">
                      Access with Employee ID & OTP
                    </p>
                  </div>

                  <div className="login-card login-stage-card">
                    <label htmlFor="admin-emp-code">Employee ID</label>
                    <input
                      id="admin-emp-code"
                      type="text"
                      value={adminEmpCode}
                      onChange={(event) => setAdminEmpCode(event.target.value)}
                      placeholder="Enter employee code"
                    />
                    <label htmlFor="admin-otp">OTP</label>
                    <input
                      id="admin-otp"
                      type="text"
                      value={adminOtp}
                      onChange={(event) => setAdminOtp(event.target.value)}
                      placeholder="Enter OTP sent to your whatsapp"
                    />
                    <div className="login-actions">
                      <button className="ghost" onClick={handleAdminRequestOtp} disabled={authLoading}>
                        Request OTP
                      </button>
                      <button className="cta" onClick={handleAdminLogin} disabled={authLoading}>
                        Login
                      </button>
                    </div>
                    {authStatus ? <p className="delete-note">{authStatus}</p> : null}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
          <section className="dashboard-hero">
            <div>
              <p className="eyebrow">Admin dashboard</p>
              <h1>Keep teams visible, accountable, and moving.</h1>
              <p className="dashboard-copy">
                Live data from admin APIs for employees, attendance, leave approvals,
                activities, and field movement.
              </p>
              {refreshNotice ? <div className="refresh-toast">{refreshNotice}</div> : null}
            </div>
            <div className="dashboard-highlight">
              <span>Shift Compliance</span>
              <strong>{lateLogins + onTimeLogins}</strong>
              <p>{`Late logins: ${lateLogins} · On-time logins: ${onTimeLogins}`}</p>
            </div>
          </section>

          <section className="dashboard-panel">
            {renderDashboardPanel()}
          </section>
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
                  Admin dashboard now supports OTP login and live admin API data.
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

export default App
