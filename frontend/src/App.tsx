import { useEffect, useState } from 'react'
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
  employee_email?: string
  employee_name?: string
  emp_designation?: string
  login_time?: string
  logout_time?: string
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

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [fieldVisitRows, setFieldVisitRows] = useState<FieldVisitRow[]>([])
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')
  const [attendancePage, setAttendancePage] = useState(1)
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
  }, [accessToken, showDashboard, showAdminLogin])

  const apiRequest = async (path: string, options: RequestInit = {}, tokenOverride?: string) => {
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
      throw new Error(data?.message || 'Request failed')
    }

    return data
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
      const [employeesResponse, attendanceResponse, leavesResponse, activitiesResponse] = await Promise.all([
        apiRequest('/api/admin/employees', {}, token),
        apiRequest('/api/admin/attendance/history?limit=30', {}, token),
        apiRequest('/api/admin/leaves?limit=30', {}, token),
        apiRequest('/api/admin/activities?limit=30&include_tracking=false&include_activity_tracking=false', {}, token)
      ])

      const employeesData = Array.isArray(employeesResponse?.data) ? employeesResponse.data : []
      const attendanceData: AttendanceRow[] = Array.isArray(attendanceResponse?.data?.records)
        ? attendanceResponse.data.records
        : []
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
      setLeaveRows(leavesData)
      setActivityRows(activitiesData)

      const fieldVisits = activitiesData
        .filter((item: ActivityRow) => item.field_visit_id)
        .map((item: ActivityRow) => ({
          activityId: item.id || item.field_visit_id || '',
          employee: item.employee_name || item.employee_email || 'Unknown employee',
          visitType: item.field_visit_type || 'Field Visit',
          purpose: item.field_visit_purpose || item.activity_type || 'Visit',
          status: item.field_visit_status || item.status || 'Unknown',
          location: item.field_visit_start_address || item.field_visit_end_address || 'Location unavailable'
        }))

      setFieldVisitRows(fieldVisits)
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to load admin dashboard')
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
    return time.getHours() === 10 && time.getMinutes() === 0
  }

  // Calculate filtered attendance and login metrics for hero section
  const filteredAttendance = attendanceRows.filter((row) => {
    if (!attendanceDateFilter) {
      return true
    }
    const time = parseLoginTime(row.login_time)
    if (!time) {
      return false
    }
    const yyyyMmDd = time.toISOString().slice(0, 10)
    return yyyyMmDd === attendanceDateFilter
  })

  const lateLogins = filteredAttendance.filter((row) => isLateLogin(row.login_time)).length
  const onTimeLogins = filteredAttendance.filter((row) => isOnTimeLogin(row.login_time)).length

  const renderDashboardPanel = () => {
    const attendancePageCount = Math.max(1, Math.ceil(filteredAttendance.length / attendancePageSize))
    const safeAttendancePage = Math.min(attendancePage, attendancePageCount)
    const attendanceSliceStart = (safeAttendancePage - 1) * attendancePageSize
    const attendancePageRows = filteredAttendance.slice(
      attendanceSliceStart,
      attendanceSliceStart + attendancePageSize
    )

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
            <button className="ghost dashboard-button" onClick={() => void loadDashboard(accessToken)}>
              Refresh
            </button>
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
                  <strong>{employee.emp_email || '--'}</strong>
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
          </div>
          <div className="metric-row">
            <div className="metric-card">
              <span>Total Records</span>
              <strong>{filteredAttendance.length}</strong>
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
              <div key={`${row.id || row.employee_email || index}`} className="data-row">
                <div>
                  <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                  <span className="muted-email">{row.emp_designation || row.employee_email || '--'}</span>
                </div>
                <div>{formatDateTime(row.login_time)}</div>
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
                <div>{row.location}</div>
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
              <div className="sidebar-foot">
                {accessToken ? (
                  <button className="ghost sidebar-back" onClick={handleLogout}>
                    Logout
                  </button>
                ) : null}
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
                <button className="ghost sidebar-back" onClick={handleLogout}>
                  Logout
                </button>
                <button className="ghost sidebar-back" onClick={() => setShowDashboard(false)}>
                  Back to Landing
                </button>
              </div>
            </>
          )}
        </aside>

        <main className="dashboard-main">
          <section className="dashboard-hero">
            <div>
              <p className="eyebrow">Admin dashboard</p>
              <h1>Keep teams visible, accountable, and moving.</h1>
              <p className="dashboard-copy">
                Live data from admin APIs for employees, attendance, leave approvals,
                activities, and field movement.
              </p>
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
