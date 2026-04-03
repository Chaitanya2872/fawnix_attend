import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

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
  { id: 'attendance', label: 'Attendance Records' },
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
  from_date?: string
  to_date?: string
  status?: string
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
}

type FieldVisitRow = {
  activityId: number | string
  fieldVisitId?: number
  employee: string
  visitType: string
  purpose: string
  status: string
  location: string
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
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [attendanceTotalCount, setAttendanceTotalCount] = useState(0)
  const [attendanceShiftMetrics, setAttendanceShiftMetrics] = useState({ lateLogins: 0, onTimeLogins: 0 })
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')
  const [attendancePage, setAttendancePage] = useState(1)
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
    emp_designation: '',
    emp_department: '',
    emp_manager: '',
    role: 'employee'
  })
  const attendancePageSize = 10

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
  }, [accessToken, showDashboard, showAdminLogin, attendanceDateFilter, attendancePage])

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
      attendanceParams.set('page', String(attendancePage))
      attendanceParams.set('page_size', String(attendancePageSize))
      if (attendanceDateFilter) {
        attendanceParams.set('date', attendanceDateFilter)
      }
      const attendancePath = `/api/admin/attendance/history?${attendanceParams.toString()}`

      const [employeesResponse, attendanceResponse, leavesResponse, activitiesResponse] = await Promise.all([
        apiRequest('/api/admin/employees', {}, token),
        apiRequest(attendancePath, {}, token),
        apiRequest('/api/admin/leaves?limit=30', {}, token),
        apiRequest('/api/admin/activities?limit=30&include_tracking=false&include_activity_tracking=false', {}, token)
      ])

      const employeesData = Array.isArray(employeesResponse?.data) ? employeesResponse.data : []
      const attendanceData: AttendanceRow[] = Array.isArray(attendanceResponse?.data?.records)
        ? attendanceResponse.data.records
        : []
      const attendanceCount =
        typeof attendanceResponse?.data?.total_records === 'number'
          ? attendanceResponse.data.total_records
          : attendanceData.length
      const nextShiftMetrics = attendanceResponse?.data?.shift_compliance || {}
      const leavesData = Array.isArray(leavesResponse?.data?.leaves) ? leavesResponse.data.leaves : []
      const activitiesData = Array.isArray(activitiesResponse?.data?.activities) ? activitiesResponse.data.activities : []

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
        onTimeLogins: Number(nextShiftMetrics.on_time_logins || 0)
      })
      setLeaveRows(leavesData)
      setActivityRows(activitiesData)

      const fieldVisits = activitiesData
        .filter((item: ActivityRow) => item.field_visit_id)
        .map((item: ActivityRow) => ({
          activityId: item.id || item.field_visit_id || '',
          fieldVisitId: item.field_visit_id ? Number(item.field_visit_id) : undefined,
          employee: item.employee_name || item.employee_email || 'Unknown employee',
          visitType: item.field_visit_type || 'Field Visit',
          purpose: item.field_visit_purpose || item.activity_type || 'Visit',
          status: item.field_visit_status || item.status || 'Unknown',
          location: item.field_visit_start_address || item.field_visit_end_address || 'Location unavailable'
        }))

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

  const openMapForLocation = async (location: string, fieldVisitId?: number) => {
    if (!location) {
      return
    }
    const trimmed = location.trim()
    const coordMatch = trimmed.match(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/)
    setMapDialogTitle('Field Visit Location')
    setMapDialogOpen(true)
    setMapDialogError('')
    setMapDialogLoading(true)
    setMapPoints([])
    setMapCenter(null)
    if (fieldVisitId) {
      try {
        const trackingResponse = await apiRequest(`/api/admin/field-visits/${fieldVisitId}/tracking`, {})
        const points = Array.isArray(trackingResponse?.data?.tracking_points)
          ? trackingResponse.data.tracking_points
          : []
        const mappedPoints = points
          .map((point: { latitude?: number | string; longitude?: number | string }) => ({
            lat: Number(point.latitude),
            lon: Number(point.longitude)
          }))
          .filter((point: { lat: number; lon: number }) => !Number.isNaN(point.lat) && !Number.isNaN(point.lon))
        setMapPoints(mappedPoints)
        if (mappedPoints.length) {
          setMapCenter(mappedPoints[0])
          setMapDialogLoading(false)
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

  // Helper functions for login time analysis
  const parseLoginTime = (value?: string) => {
    if (!value) {
      return null
    }
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
    const fallback = new Date(`1970-01-01T${value}`)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  const isLateLogin = (value?: string) => {
    const time = parseLoginTime(value)
    if (!time) {
      return false
    }
    const minutes = time.getHours() * 60 + time.getMinutes()
    return minutes > 10 * 60 + 15
  }

  const isOnTimeLogin = (value?: string) => {
    const time = parseLoginTime(value)
    if (!time) {
      return false
    }
    const minutes = time.getHours() * 60 + time.getMinutes()
    return minutes < 10 * 60 + 15
  }

  // Attendance data is already filtered + paginated server-side
  const filteredAttendance = attendanceRows

  const lateLogins =
    attendanceShiftMetrics.lateLogins || filteredAttendance.filter((row) => isLateLogin(row.login_time)).length
  const onTimeLogins =
    attendanceShiftMetrics.onTimeLogins || filteredAttendance.filter((row) => isOnTimeLogin(row.login_time)).length

  const renderDashboardPanel = () => {
    const attendancePageCount = Math.max(1, Math.ceil(attendanceTotalCount / attendancePageSize))
    const safeAttendancePage = Math.min(attendancePage, attendancePageCount)
    const attendancePageRows = filteredAttendance

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
              <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
                Refresh
              </button>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-card">
              <span>Total Employees</span>
              <strong>{employees.length}</strong>
            </div>
            <div className="metric-card">
              <span>Active Users</span>
              <strong>{employees.filter((employee) => employee.is_active).length}</strong>
            </div>
            <div className="metric-card">
              <span>HR / Admin</span>
              <strong>
                {
                  employees.filter((employee) =>
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
              </div>
            ))}
          </div>
        </>
      )
    }

    if (activePanel === 'attendance') {
      return (
        <>
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Attendance Records</h2>
            </div>
            <div className="attendance-controls">
              <div className="attendance-filter">
                <label htmlFor="attendance-date">Date</label>
                <input
                  id="attendance-date"
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(event) => {
                    setAttendanceDateFilter(event.target.value)
                    setAttendancePage(1)
                  }}
                />
              </div>
              <div className="attendance-filter">
                <label htmlFor="attendance-page">Page</label>
                <select
                  id="attendance-page"
                  value={safeAttendancePage}
                  onChange={(event) => setAttendancePage(Number(event.target.value))}
                >
                  {Array.from({ length: attendancePageCount }, (_, index) => {
                    const pageNumber = index + 1
                    return (
                      <option key={pageNumber} value={pageNumber}>
                        {pageNumber}
                      </option>
                    )
                  })}
                </select>
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
          </div>
          <div className="metric-row">
            <div className="metric-card">
              <span>Total Records</span>
              <strong>{attendanceTotalCount}</strong>
            </div>
            <div className="metric-card">
              <span>Logged Out</span>
              <strong>{filteredAttendance.filter((row) => row.status === 'logged_out').length}</strong>
            </div>
            <div className="metric-card">
              <span>Late / Exceptions</span>
              <strong>
                {
                  filteredAttendance.filter((row) =>
                    (row.status || '').toLowerCase().includes('late') ||
                    (row.status || '').toLowerCase().includes('pending')
                  ).length
                }
              </strong>
            </div>
          </div>
          <div className="data-card">
            {attendancePageRows.map((row, index) => (
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
            ))}
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
          <div className="data-card">
            {leaveRows.map((row, index) => (
              <div key={`${row.id || row.emp_code || index}`} className="data-row">
                <div>
                  <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                  <span>{row.leave_type || 'Leave Request'}</span>
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
            <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
              Refresh
            </button>
          </div>
          <div className="data-card">
            {activityRows.map((row, index) => (
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
            ))}
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
                  <span>{row.location}</span>
                  <button
                    className="map-button"
                    onClick={() => openMapForLocation(row.location, row.fieldVisitId)}
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
              </div>

              <div className="sidebar-logout">
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
                    <div ref={mapContainerRef} className="map-dialog-map" />
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
          <span>Privacy</span>
          <span>Terms</span>
          <span>Support</span>
        </div>
      </footer>
    </div>
  )
}

export default App
