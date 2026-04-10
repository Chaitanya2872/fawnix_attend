import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

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
}

type LeaveRow = {
  id?: number
  emp_code?: string
  emp_full_name?: string
  emp_designation?: string
  leave_type?: string
  duration?: string
  leave_count?: number | string
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
}

type FieldVisitRow = {
  activityId: number | string
  fieldVisitId?: number
  employee: string
  visitType: string
  purpose: string
  status: string
  location: string
  startAddress?: string
  endAddress?: string
  distanceKm?: number | null
  startCoords?: { lat: number; lon: number } | null
  endCoords?: { lat: number; lon: number } | null
}

type ScheduledNotificationLogRow = {
  id?: number
  notification_type?: string
  emp_code?: string
  title?: string
  body?: string
  scheduled_for?: string
  delivery_status?: string
  sent_at?: string
  failure_message?: string
  created_at?: string
}

const ACCESS_TOKEN_KEY = 'fawnix_admin_access_token'
const REFRESH_TOKEN_KEY = 'fawnix_admin_refresh_token'
const USER_KEY = 'fawnix_admin_user'

function isPrivilegedUser(profile: AdminProfile | null) {
  if (!profile) {
    return false
  }

  const designation = (profile.emp_designation || '').trim().toLowerCase()
  return ['hr', 'devtester'].includes(designation)
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

function parseCoords(lat?: number | string, lon?: number | string) {
  const latNum = Number(lat)
  const lonNum = Number(lon)
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
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

function toDateInputValue(value: Date) {
  const offsetValue = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offsetValue).toISOString().slice(0, 10)
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
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [refreshNotice, setRefreshNotice] = useState('')
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<EmployeeRow>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
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
  const [attendanceView, setAttendanceView] = useState<'attendance' | 'late-arrivals' | 'early-leaves' | 'leaves'>('attendance')
  const [, setAttendanceSummary] = useState({
    attendanceCount: 0,
    compOffDays: 0,
    efficiencyScore: 0
  })
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [scheduledNotificationLogs, setScheduledNotificationLogs] = useState<ScheduledNotificationLogRow[]>([])
  const [scheduledNotificationType, setScheduledNotificationType] = useState<'attendance_reminder' | 'lunch_reminder'>('attendance_reminder')
  const [scheduledNotificationDate, setScheduledNotificationDate] = useState(() => toDateInputValue(new Date()))
  const [scheduledNotificationLoading, setScheduledNotificationLoading] = useState(false)
  const [scheduledNotificationStatus, setScheduledNotificationStatus] = useState('')
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(() => toDateInputValue(new Date()))
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceReportMonth, setAttendanceReportMonth] = useState(() => String(new Date().getMonth() + 1))
  const [attendanceReportYear, setAttendanceReportYear] = useState(() => String(new Date().getFullYear()))
  const [attendanceReportFormat, setAttendanceReportFormat] = useState<'csv' | 'pdf'>('csv')
  const [attendanceReportStatus, setAttendanceReportStatus] = useState('')
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [mapDialogTitle, setMapDialogTitle] = useState('')
  const [mapDialogLoading, setMapDialogLoading] = useState(false)
  const [mapDialogError, setMapDialogError] = useState('')
  const [mapPoints, setMapPoints] = useState<Array<{ lat: number; lon: number }>>([])
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [mapSummary, setMapSummary] = useState<{
    startAddress?: string
    endAddress?: string
    startCoords?: { lat: number; lon: number } | null
    endCoords?: { lat: number; lon: number } | null
    distanceKm?: number | null
    pointsCount?: number
  } | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false)
  const [createEmployeeStatus, setCreateEmployeeStatus] = useState('')
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
    if (!accessToken || !showDashboard || showAdminLogin) {
      return
    }

    void loadDashboard(accessToken)
  }, [accessToken, showDashboard, showAdminLogin, attendanceDateFilter])

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
    setScheduledNotificationLogs([])
    setScheduledNotificationStatus('')
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
      if (attendanceDateFilter) {
        attendanceParams.set('date', attendanceDateFilter)
      }
      const attendancePath = `/api/admin/attendance/history?${attendanceParams.toString()}`

      const [employeesResponse, attendanceResponse, leavesResponse, activitiesResponse, scheduledLogsResponse] = await Promise.all([
        apiRequest('/api/admin/employees', {}, token),
        apiRequest(attendancePath, {}, token),
        apiRequest('/api/admin/leaves?limit=30', {}, token),
        apiRequest('/api/admin/activities?limit=30&include_tracking=false&include_activity_tracking=false', {}, token),
        apiRequest('/api/admin/scheduled-notifications/logs?limit=20', {}, token)
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
      const scheduledLogsData: ScheduledNotificationLogRow[] = Array.isArray(scheduledLogsResponse?.data)
        ? scheduledLogsResponse.data
        : []
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
      setAttendanceShiftMetrics(
        attendanceDateFilter
          ? {
              lateLogins: Number(nextShiftMetrics.late_logins || 0),
              onTimeLogins: Number(nextShiftMetrics.on_time_logins || 0),
              loggedOut: Number(nextShiftMetrics.logged_out || 0),
              lateExceptions: Number(nextShiftMetrics.late_exceptions || 0)
            }
          : {
              lateLogins: 0,
              onTimeLogins: 0,
              loggedOut: 0,
              lateExceptions: 0
            }
      )
      setAttendanceSummary(
        attendanceDateFilter
          ? {
              attendanceCount: Number(nextSummary.attendance_count || attendanceCount),
              compOffDays: Number(nextSummary.comp_off_days || 0),
              efficiencyScore: Number(nextSummary.efficiency_score || 0)
            }
          : {
              attendanceCount: 0,
              compOffDays: 0,
              efficiencyScore: 0
            }
      )
      setLeaveRows(leavesData)
      setActivityRows(activitiesData)
      setScheduledNotificationLogs(scheduledLogsData)
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
          const startAddress = item.field_visit_start_address || formatCoordsValue(startCoords)
          const endAddress = item.field_visit_end_address || formatCoordsValue(endCoords)
          const distanceKmValue =
            item.total_distance_km !== undefined
              ? Number(item.total_distance_km)
              : startCoords && endCoords
                ? calculateDistanceKm([startCoords, endCoords])
                : null

          return {
            activityId: item.id || item.field_visit_id || '',
            fieldVisitId: item.field_visit_id ? Number(item.field_visit_id) : undefined,
            employee: item.employee_name || item.employee_email || 'Unknown employee',
            visitType: item.field_visit_type || 'Field Visit',
            purpose: item.field_visit_purpose || item.activity_type || 'Visit',
            status: item.field_visit_status || item.status || 'Unknown',
            location: startAddress || endAddress || 'Location unavailable',
            startAddress: startAddress || undefined,
            endAddress: endAddress || undefined,
            distanceKm: Number.isFinite(distanceKmValue) ? distanceKmValue : null,
            startCoords,
            endCoords
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
        throw new Error('This dashboard currently requires HR or DevTester access')
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

  const openMapForFieldVisit = async (row: FieldVisitRow) => {
    if (!row.location) {
      return
    }
    const trimmed = row.location.trim()
    const coordMatch = trimmed.match(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/)
    setMapDialogTitle('Activity Route')
    setMapDialogOpen(true)
    setMapDialogError('')
    setMapDialogLoading(true)
    setMapPoints([])
    setMapCenter(null)
    setMapSummary({
      startAddress: row.startAddress,
      endAddress: row.endAddress,
      startCoords: row.startCoords,
      endCoords: row.endCoords,
      distanceKm: row.distanceKm,
      pointsCount: undefined
    })
    if (row.fieldVisitId) {
      try {
        const trackingResponse = await apiRequest(`/api/admin/field-visits/${row.fieldVisitId}/tracking`, {})
        const visit = trackingResponse?.data?.field_visit || {}
        const points = Array.isArray(trackingResponse?.data?.tracking_points)
          ? trackingResponse.data.tracking_points
          : []
        const mappedPoints = points
          .map((point: { latitude?: number | string; longitude?: number | string }) => ({
            lat: Number(point.latitude),
            lon: Number(point.longitude)
          }))
          .filter((point: { lat: number; lon: number }) => !Number.isNaN(point.lat) && !Number.isNaN(point.lon))
        const startCoordsFromVisit = parseCoords(visit.start_latitude, visit.start_longitude)
        const endCoordsFromVisit = parseCoords(visit.end_latitude, visit.end_longitude)
        const startCoords = mappedPoints.length ? mappedPoints[0] : startCoordsFromVisit
        const endCoords = mappedPoints.length ? mappedPoints[mappedPoints.length - 1] : endCoordsFromVisit
        const nextPoints =
          mappedPoints.length > 0
            ? mappedPoints
            : startCoords && endCoords
              ? [startCoords, endCoords]
              : []
        setMapPoints(nextPoints)
        if (nextPoints.length) {
          setMapCenter(nextPoints[0])
        }
        const totalDistanceValue = Number(trackingResponse?.data?.total_distance_km)
        const computedDistance = Number.isFinite(totalDistanceValue)
          ? totalDistanceValue
          : calculateDistanceKm(nextPoints)
        setMapSummary({
          startAddress: visit.start_address || row.startAddress,
          endAddress: visit.end_address || row.endAddress,
          startCoords,
          endCoords,
          distanceKm: computedDistance || row.distanceKm || null,
          pointsCount: nextPoints.length
        })
        setMapDialogLoading(false)
        if (nextPoints.length) {
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
      setMapCenter({ lat: latNum, lon: lonNum })
      setMapDialogLoading(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`
      )
      const results = await response.json()
      const match = Array.isArray(results) ? results[0] : null
      if (!match) {
        throw new Error('Unable to locate this address.')
      }
      const latNum = Number(match.lat)
      const lonNum = Number(match.lon)
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
      L.polyline(latlngs, { color: '#1fa7a4', weight: 4 }).addTo(map)
      L.marker(latlngs[0], { icon: defaultIcon }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: defaultIcon }).addTo(map)
      map.fitBounds(latlngs, { padding: [30, 30] })
    } else {
      map.setView([mapCenter.lat, mapCenter.lon], 14)
      L.marker([mapCenter.lat, mapCenter.lon], { icon: defaultIcon }).addTo(map)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapDialogOpen, mapCenter, mapPoints])

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

  const handleCreateEmployee = async () => {
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
      setShowAddEmployee(false)
      await loadDashboard(accessToken)
    } catch (error) {
      setCreateEmployeeStatus(error instanceof Error ? error.message : 'Failed to create employee')
    } finally {
      setCreateEmployeeLoading(false)
    }
  }

  const handleEditEmployee = (employee: EmployeeRow) => {
    setEditingEmployee(employee)
    setEditFormData({ ...employee })
    setEditModalOpen(true)
    setEditStatus('')
  }

  const handleSaveEmployee = async () => {
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
      setEditModalOpen(false)
      setEditingEmployee(null)
      setEditFormData({})
      await loadDashboard(accessToken)
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteEmployee = async (empCode: string, empName: string) => {
    if (!confirm(`Are you sure you want to delete ${empName}? This cannot be undone.`)) {
      return
    }

    setEditStatus('Deleting employee...')
    setEditLoading(true)

    try {
      const response = await apiRequest(`/api/users/${empCode}`, {
        method: 'DELETE'
      })

      setEditStatus(response?.message || 'Employee deleted successfully.')
      setEditModalOpen(false)
      setEditingEmployee(null)
      setEditFormData({})
      await loadDashboard(accessToken)
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setEditLoading(false)
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

  const loadScheduledNotificationLogs = async (token: string) => {
    const response = await apiRequest('/api/admin/scheduled-notifications/logs?limit=20', {}, token)
    const rows: ScheduledNotificationLogRow[] = Array.isArray(response?.data) ? response.data : []
    setScheduledNotificationLogs(rows)
  }

  const handleTriggerScheduledNotification = async () => {
    setScheduledNotificationLoading(true)
    setScheduledNotificationStatus('Triggering scheduled alert...')

    try {
      const response = await apiRequest('/api/admin/scheduled-notifications/trigger', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: scheduledNotificationType,
          target_date: scheduledNotificationDate
        })
      })

      const sentCount = Number(response?.sent_count || 0)
      const failedCount = Number(response?.failed_count || 0)
      setScheduledNotificationStatus(
        response?.message || `Triggered ${scheduledNotificationType}. Sent: ${sentCount}, Failed: ${failedCount}.`
      )
      await loadScheduledNotificationLogs(accessToken)
    } catch (error) {
      setScheduledNotificationStatus(error instanceof Error ? error.message : 'Failed to trigger scheduled alert')
    } finally {
      setScheduledNotificationLoading(false)
    }
  }

  const selectedAttendanceDate = attendanceDateFilter || toDateInputValue(new Date())
  const todayDateValue = toDateInputValue(new Date())

  const firstClockInRows = Array.from(
    attendanceRows.reduce((map, row) => {
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

  const selectedDateLateArrivals = attendanceExceptions.filter(
    (item) => item.exception_type === 'late_arrival' && isSameDate(getExceptionDateValue(item), selectedAttendanceDate)
  )
  const selectedDateEarlyLeaves = attendanceExceptions.filter(
    (item) => item.exception_type === 'early_leave' && isSameDate(getExceptionDateValue(item), selectedAttendanceDate)
  )
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
    const filteredEmployees = normalizedEmployeeSearch
      ? employees.filter((employee) => {
          const haystack = [
            employee.emp_code,
            employee.emp_full_name,
            employee.emp_email,
            employee.emp_contact,
            employee.emp_designation,
            employee.emp_department,
            employee.emp_grade,
            employee.emp_manager,
            employee.manager_name,
            employee.manager_email,
            employee.role
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(normalizedEmployeeSearch)
        })
      : employees
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
              <button className="ghost dashboard-button" onClick={() => setShowAddEmployee((current) => !current)}>
                {showAddEmployee ? 'Close Form' : 'Add Employee'}
              </button>
              <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('csv')}>
                Download CSV
              </button>
              <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('pdf')}>
                Download PDF
              </button>
              <button className="ghost dashboard-button" onClick={() => void downloadEmployeesReport('xlsx')}>
                Download XLSX
              </button>
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            </div>
          </div>
          <div className="dashboard-section-head">
            <div className="search-field">
              <label htmlFor="employee-search">Search employees</label>
              <input
                id="employee-search"
                type="text"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search by name, code, email, or department"
              />
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-card">
              <span>Total Employees</span>
              <strong>{filteredEmployees.length}</strong>
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
          {showAddEmployee ? (
            <div className="form-card">
              <div className="form-head">
                <div>
                  <strong>Add Employee</strong>
                  <span>Uses `POST /api/users` with the current admin session.</span>
                </div>
              </div>
              <div className="form-grid">
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
                <div>
                  <label htmlFor="new-emp-role">User Role</label>
                  <select
                    id="new-emp-role"
                    value={newEmployee.role}
                    onChange={(event) => updateNewEmployee('role', event.target.value)}
                  >
                    <option value="employee">employee</option>
                    <option value="user_manager">user_manager</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="ghost" onClick={resetNewEmployee} disabled={createEmployeeLoading}>
                  Reset
                </button>
                <button className="cta" onClick={() => void handleCreateEmployee()} disabled={createEmployeeLoading}>
                  Create Employee
                </button>
              </div>
              {createEmployeeStatus ? <p className="form-note">{createEmployeeStatus}</p> : null}
            </div>
          ) : null}
          <div className="data-card">
            {employees.map((employee) => (
              <div key={employee.emp_code} className="data-row employee-row">
                <div>
                  <strong>{employee.emp_full_name || employee.emp_code}</strong>
                  <span>{employee.emp_code}</span>
                </div>
                <div>
                  <strong>{employee.emp_designation || employee.role || '--'}</strong>
                  <span>Designation</span>
                </div>
                <div>
                  <strong>{formatEmployeeGrade(employee.emp_grade)}</strong>
                  <span>Grade</span>
                </div>
                <div>
                  <strong>{employee.emp_department || '--'}</strong>
                  <span>Department</span>
                </div>
                <div>
                  <strong className="employee-email">{employee.emp_email || '--'}</strong>
                  <span>{employee.emp_contact || 'Contact unavailable'}</span>
                </div>
                <div>
                  <strong>{employee.manager_name || employee.emp_manager || '--'}</strong>
                  <span>{employee.manager_email || employee.manager_code || 'Manager'}</span>
                </div>
                <div>
                  <span className="table-pill">{employee.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="employee-actions">
                  <button className="action-btn edit-btn" onClick={() => handleEditEmployee(employee)} title="Edit employee">
                    ✏️ Edit
                  </button>
                  <button className="action-btn delete-btn" onClick={() => handleDeleteEmployee(employee.emp_code, employee.emp_full_name || employee.emp_code)} title="Delete employee">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )
    }

    if (activePanel === 'attendance') {
      const attendanceTabCount = attendancePageRows.length

      const lateArrivalCount = selectedDateLateArrivals.length
      const earlyLeaveCount = selectedDateEarlyLeaves.length
      const leaveCount = selectedDateLeaves.length
      const exceptionRows =
        attendanceView === 'late-arrivals'
          ? selectedDateLateArrivals
          : attendanceView === 'early-leaves'
            ? selectedDateEarlyLeaves
            : []

      return (
        <>
          <div className="dashboard-section-head">
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
              </div>
            </div>
            {attendanceView === 'attendance' ? (
              <>
                <div className="attendance-controls">
                  <div className="attendance-filter">
                    <label htmlFor="attendance-date">Date</label>
                    <input
                      id="attendance-date"
                      type="date"
                      value={attendanceDateFilter}
                      onChange={(event) => setAttendanceDateFilter(event.target.value)}
                    />
                  </div>
                  <div className="attendance-filter">
                    <label htmlFor="attendance-search">Search</label>
                    <input
                      id="attendance-search"
                      type="text"
                      value={attendanceSearch}
                      onChange={(event) => setAttendanceSearch(event.target.value)}
                      placeholder="Search name, email, type, or location"
                    />
                  </div>
                  <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                    Refresh
                  </button>
                </div>
                <div className="attendance-controls">
                  <div className="attendance-filter">
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
                  <div className="attendance-filter">
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
                  <div className="attendance-filter">
                    <label htmlFor="attendance-format">Format</label>
                    <select
                      id="attendance-format"
                      value={attendanceReportFormat}
                      onChange={(event) => setAttendanceReportFormat(event.target.value as 'csv' | 'pdf')}
                    >
                      <option value="csv">CSV</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <button className="cta dashboard-button" onClick={downloadAttendanceReport}>
                    Download Report
                  </button>
                  {attendanceReportStatus ? <span className="report-status">{attendanceReportStatus}</span> : null}
                </div>
              </>
            ) : (
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            )}
          </div>
          <div className="metric-row">
                <button
                  className={`metric-card metric-button ${attendanceView === 'attendance' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('attendance')}
                >
                  <span>First Clock-Ins</span>
                  <strong>{attendanceTabCount}</strong>
                  <small>{selectedAttendanceDate}</small>
                </button>
                <button
                  className={`metric-card metric-button ${attendanceView === 'late-arrivals' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('late-arrivals')}
                >
                  <span>Late Arrivals Today</span>
                  <strong>{lateArrivalCount}</strong>
                  <small>Show request list</small>
                </button>
                <button
                  className={`metric-card metric-button ${attendanceView === 'early-leaves' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('early-leaves')}
                >
                  <span>Early Leaves Today</span>
                  <strong>{earlyLeaveCount}</strong>
                  <small>Show request list</small>
                </button>
                <button
                  className={`metric-card metric-button ${attendanceView === 'leaves' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setAttendanceView('leaves')}
                >
                  <span>Leaves Today</span>
                  <strong>{leaveCount}</strong>
                  <small>Employees on leave</small>
                </button>
          </div>
          <div className="form-card">
            <div className="form-head">
              <div>
                <strong>Scheduled Alerts</strong>
                <span>Manually trigger reminder pushes and review recent delivery logs.</span>
              </div>
            </div>
            <div className="form-grid scheduled-alert-grid">
              <div>
                <label htmlFor="scheduled-notification-type">Alert Type</label>
                <select
                  id="scheduled-notification-type"
                  value={scheduledNotificationType}
                  onChange={(event) =>
                    setScheduledNotificationType(
                      event.target.value as 'attendance_reminder' | 'lunch_reminder'
                    )
                  }
                >
                  <option value="attendance_reminder">Attendance reminder</option>
                  <option value="lunch_reminder">Lunch reminder</option>
                </select>
              </div>
              <div>
                <label htmlFor="scheduled-notification-date">Target Date</label>
                <input
                  id="scheduled-notification-date"
                  type="date"
                  value={scheduledNotificationDate}
                  onChange={(event) => setScheduledNotificationDate(event.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                className="cta"
                type="button"
                onClick={() => void handleTriggerScheduledNotification()}
                disabled={scheduledNotificationLoading}
              >
                {scheduledNotificationLoading ? 'Triggering...' : 'Trigger Alert'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => void loadScheduledNotificationLogs(accessToken)}
                disabled={scheduledNotificationLoading}
              >
                Refresh Logs
              </button>
            </div>
            {scheduledNotificationStatus ? <p className="form-note">{scheduledNotificationStatus}</p> : null}
            <div className="data-card compact-log-list">
              {scheduledNotificationLogs.length ? (
                scheduledNotificationLogs.map((log) => (
                  <div key={log.id || `${log.notification_type}-${log.created_at}-${log.emp_code}`} className="data-row scheduled-log-row">
                    <div>
                      <strong>{toTitleCase((log.notification_type || 'notification').replace(/_/g, ' '))}</strong>
                      <span>{log.title || '--'}</span>
                      <span>{log.body || '--'}</span>
                    </div>
                    <div>
                      <strong>{log.emp_code || '--'}</strong>
                      <span>Employee</span>
                      <span>{formatDateTime(log.scheduled_for || log.created_at)}</span>
                    </div>
                    <div>
                      <span className={`table-pill ${log.delivery_status === 'sent' ? 'accent' : ''}`}>
                        {log.delivery_status || 'unknown'}
                      </span>
                      <span>{formatDateTime(log.sent_at || log.created_at)}</span>
                      <span>{log.failure_message || 'No failure message'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No scheduled alert logs yet.</div>
              )}
            </div>
          </div>
          {attendanceView === 'attendance' ? (
          <div className="data-card">
            {filteredAttendanceRows.length ? (
              filteredAttendanceRows.map((row, index) => (
              <div key={`${row.id || row.employee_email || index}`} className="data-row attendance-row">
                <div>
                  <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                  <span className="muted-email">
                    {[row.emp_designation || row.employee_email || '--', row.attendance_type || 'office'].join(' • ')}
                  </span>
                </div>
                <div>
                  <strong>{formatDateTime(row.login_time)}</strong>
                  <span>{row.login_location || 'Login location unavailable'}</span>
                  <span>{row.login_address || 'Login address unavailable'}</span>
                </div>
                <div>
                  <strong>{formatDateTime(row.logout_time)}</strong>
                  <span>{row.logout_location || 'Logout location unavailable'}</span>
                  <span>{row.logout_address || 'Logout address unavailable'}</span>
                </div>
                <div>
                  <span className="table-pill accent">{row.status || 'Unknown'}</span>
                </div>
              </div>
              ))
            ) : (
              <div className="empty-state">
                {attendanceSearch.trim()
                  ? 'No attendance records match this search.'
                  : 'No first clock-in records found for the selected date.'}
              </div>
            )}
          </div>
          ) : attendanceView === 'leaves' ? (
            <div className="data-card">
              {selectedDateLeaves.length ? (
                selectedDateLeaves.map((row, index) => (
                  <div key={`${row.id || row.emp_code || index}`} className="data-row">
                    <div>
                      <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                      <span>{row.emp_designation || formatLeaveTypeLabel(row) || 'Leave Request'}</span>
                    </div>
                    <div>
                      <strong>{formatLeaveTypeLabel(row)}</strong>
                      <span>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</span>
                    </div>
                    <div>
                      <span className="table-pill">{row.status || 'Unknown'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No leaves found for the selected date.</div>
              )}
            </div>
          ) : (
            <div className="data-card">
              {exceptionRows.length ? (
                exceptionRows.map((row, index) => (
                  <div key={`${row.id || row.emp_code || index}`} className="data-row exception-row">
                    <div>
                      <strong>{row.emp_name || row.emp_code || 'Unknown employee'}</strong>
                      <span>
                        {attendanceView === 'late-arrivals'
                          ? `Late by ${row.late_by_minutes ?? '--'} min`
                          : `Early by ${row.early_by_minutes ?? '--'} min`}
                      </span>
                    </div>
                    <div>
                      <strong>
                        {attendanceView === 'late-arrivals'
                          ? row.exception_time || row.actual_login_time || '--'
                          : row.planned_leave_time || row.actual_logout_time || '--'}
                      </strong>
                      <span>{row.reason || 'No reason provided'}</span>
                    </div>
                    <div>
                      <span className="table-pill">{row.status || 'Pending'}</span>
                      <span>{formatDateTime(row.requested_at || row.exception_date)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No {attendanceView === 'late-arrivals' ? 'late arrival' : 'early leave'} requests found for the selected date.</div>
              )}
            </div>
          )}
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
          <div className="data-card">
            {leaveRows.map((row, index) => (
              <div key={`${row.id || row.emp_code || index}`} className="data-row">
                <div>
                  <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                  <span>{formatLeaveTypeLabel(row)}</span>
                </div>
                <div>{`${formatDate(row.from_date)} - ${formatDate(row.to_date)}`}</div>
                <div>
                  <span className="table-pill">{row.status || 'Unknown'}</span>
                </div>
              </div>
            ))}
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
          <div className="data-card">
            {filteredActivities.length ? (
              filteredActivities.map((row, index) => (
                <div key={`${row.id || row.employee_email || index}`} className="data-row">
                  <div>
                    <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                    <span>{row.activity_type || 'Activity'}</span>
                  </div>
                  <div>{formatDateTime(row.start_time)}</div>
                  <div>
                    <span className="table-pill accent">{row.status || 'Unknown'}</span>
                  </div>
                </div>
              ))
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
        <div className="data-card">
          {fieldVisitRows.length ? (
            fieldVisitRows.map((row) => (
              <div key={row.activityId} className="data-row">
                <div>
                  <strong>{row.employee}</strong>
                  <span>{row.visitType}</span>
                </div>
                <div className="location-cell">
                  <div className="location-details">
                    <div>
                      <span className="location-label">Start</span>
                      <span>{row.startAddress || row.location || 'Start location unavailable'}</span>
                    </div>
                    <div>
                      <span className="location-label">End</span>
                      <span>{row.endAddress || 'End location unavailable'}</span>
                    </div>
                    <div>
                      <span className="location-label">Distance</span>
                      <span>{formatDistanceKm(row.distanceKm)}</span>
                    </div>
                  </div>
                  <button
                    className="map-button"
                    onClick={() => openMapForFieldVisit(row)}
                    aria-label="Open map"
                    title="Open map"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 2c-3.6 0-6.5 2.9-6.5 6.5 0 4.7 6.5 12 6.5 12s6.5-7.3 6.5-12C18.5 4.9 15.6 2 12 2zm0 9.2c-1.5 0-2.7-1.2-2.7-2.7S10.5 5.8 12 5.8s2.7 1.2 2.7 2.7S13.5 11.2 12 11.2z" />
                    </svg>
                  </button>
                </div>
                <div>
                  <span className="table-pill accent">{row.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No field visits found in the latest activity feed.</div>
          )}
        </div>
      </>
    )
  }

  if (showDashboard) {
    return (
      <div className="admin-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">Fawnix Admin</div>
              <div className="brand-tag">Operations control room</div>
            </div>
          </div>

          {showAdminLogin ? (
            <>
              <div className="login-card sidebar-login">
                <h3>Admin Login</h3>
                <p>Use Employee ID and OTP to access admin endpoints.</p>
                <label htmlFor="admin-emp-code">Employee ID</label>
                <input
                  id="admin-emp-code"
                  type="text"
                  value={adminEmpCode}
                  onChange={(event) => setAdminEmpCode(event.target.value)}
                  placeholder="e.g. 2981"
                />
                <label htmlFor="admin-otp">OTP</label>
                <input
                  id="admin-otp"
                  type="text"
                  value={adminOtp}
                  onChange={(event) => setAdminOtp(event.target.value)}
                  placeholder="Enter OTP"
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
              <div className="sidebar-logout">
                <button className="sidebar-link logout-link" onClick={handleLogout}>
                  Logout
                </button>
              </div>
              <div className="sidebar-foot">
                <button className="ghost sidebar-back" onClick={() => setShowDashboard(false)}>
                  Back to Landing
                </button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </aside>

        <main className="dashboard-main">
          {mapDialogOpen ? (
            <div className="map-dialog-backdrop" role="dialog" aria-modal="true">
              <div className="map-dialog">
                <div className="map-dialog-header">
                  <div>
                    <strong>{mapDialogTitle}</strong>
                    <span>OpenStreetMap</span>
                  </div>
                  <button className="ghost" onClick={() => setMapDialogOpen(false)} type="button">
                    Close
                  </button>
                </div>
                <div className="map-dialog-body">
                  {mapDialogLoading ? (
                    <div className="map-dialog-state">Loading map...</div>
                  ) : mapDialogError ? (
                    <div className="map-dialog-state">{mapDialogError}</div>
                  ) : mapCenter ? (
                    <>
                      <div className="map-dialog-meta">
                        <div>
                          <span className="meta-label">Start</span>
                          <strong>{mapSummary?.startAddress || 'Start location unavailable'}</strong>
                          {mapSummary?.startCoords ? (
                            <span className="meta-coords">
                              {mapSummary.startCoords.lat.toFixed(6)}, {mapSummary.startCoords.lon.toFixed(6)}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <span className="meta-label">End</span>
                          <strong>{mapSummary?.endAddress || 'End location unavailable'}</strong>
                          {mapSummary?.endCoords ? (
                            <span className="meta-coords">
                              {mapSummary.endCoords.lat.toFixed(6)}, {mapSummary.endCoords.lon.toFixed(6)}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <span className="meta-label">Distance</span>
                          <strong>{formatDistanceKm(mapSummary?.distanceKm)}</strong>
                          <span className="meta-coords">
                            {mapSummary?.pointsCount ? `${mapSummary.pointsCount} points` : 'No points'}
                          </span>
                        </div>
                      </div>
                      <div ref={mapContainerRef} className="map-dialog-map" />
                    </>
                  ) : (
                    <div className="map-dialog-state">No location data available.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
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
              <p>
                {showAdminLogin
                  ? 'Authenticate to load admin endpoints.'
                  : `Late logins: ${lateLogins} · On-time logins: ${onTimeLogins}`}
              </p>
            </div>
          </section>

          <section className="dashboard-panel">
            {showAdminLogin ? (
              <div className="empty-state">
                <strong>Admin authentication required</strong>
                <p>Request OTP and log in from the sidebar to load protected admin APIs.</p>
              </div>
            ) : (
              renderDashboardPanel()
            )}
          </section>

          {editModalOpen && editingEmployee ? (
            <div className="modal-backdrop" role="dialog" aria-modal="true">
              <div className="modal-card">
                <div className="modal-header">
                  <strong>Edit Employee</strong>
                  <button className="ghost" onClick={() => setEditModalOpen(false)} type="button">
                    Close
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="edit-emp-code">Employee Code</label>
                    <input
                      id="edit-emp-code"
                      type="text"
                      value={editingEmployee.emp_code}
                      disabled
                      placeholder="Cannot change"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-emp-full-name">Full Name</label>
                    <input
                      id="edit-emp-full-name"
                      type="text"
                      value={editFormData.emp_full_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_full_name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-emp-email">Email</label>
                    <input
                      id="edit-emp-email"
                      type="email"
                      value={editFormData.emp_email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-emp-contact">Contact</label>
                    <input
                      id="edit-emp-contact"
                      type="text"
                      value={editFormData.emp_contact || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_contact: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="form-group">
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
                  <div className="form-group">
                    <label htmlFor="edit-emp-designation">Designation</label>
                    <input
                      id="edit-emp-designation"
                      type="text"
                      value={editFormData.emp_designation || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_designation: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-emp-department">Department</label>
                    <input
                      id="edit-emp-department"
                      type="text"
                      value={editFormData.emp_department || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_department: e.target.value })}
                      placeholder="Department name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-emp-manager">Manager Code</label>
                    <input
                      id="edit-emp-manager"
                      type="text"
                      value={editFormData.emp_manager || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emp_manager: e.target.value })}
                      placeholder="e.g., EMP001"
                    />
                  </div>
                  {editStatus ? <p className="form-note">{editStatus}</p> : null}
                </div>
                <div className="modal-actions">
                  <button className="ghost" onClick={() => setEditModalOpen(false)} disabled={editLoading}>
                    Cancel
                  </button>
                  <button className="cta" onClick={handleSaveEmployee} disabled={editLoading}>
                    Save Changes
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
