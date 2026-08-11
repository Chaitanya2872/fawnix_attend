export type PrivacySection = {
  title: string
  body: string[]
  bullets: string[]
}

export type SidebarId =
  | 'dashboard'
  | 'employees'
  | 'employee-master-working-units'
  | 'employee-master-payroll-units'
  | 'employee-master-designations'
  | 'employee-master-departments'
  | 'attendance'
  | 'attendance-records'
  | 'attendance-exceptions'
  | 'overtime-records'
  | 'inbox'
  | 'calendar'
  | 'reports'
  | 'leaves'
  | 'activities'
  | 'field-visits'
  | 'api-telemetry'

export type EmployeeMasterResourceKey =
  | 'workingUnits'
  | 'payrollUnits'
  | 'designations'
  | 'departments'

export type EmployeeMasterSidebarId =
  | 'employee-master-working-units'
  | 'employee-master-payroll-units'
  | 'employee-master-designations'
  | 'employee-master-departments'

export type EmployeeMasterRecord = Record<string, unknown> & {
  id?: number | string
  working_unit_code?: string
  working_unit_name?: string
  unit_head_manager?: string
  payroll_unit_code?: string
  payroll_unit_name?: string
  payroll_manager?: string
  pay_cycle?: string
  designation_code?: string
  designation_name?: string
  job_level_grade?: string
  department_code?: string
  department_name?: string
  department_head?: string
  department?: string
  working_unit?: string
  location?: string
  parent_department?: string
  status?: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export type EmployeeMasterFilterState = {
  search: string
  status: string
  pageSize: string
  location: string
  unitHeadManager: string
  payrollManager: string
  payCycle: string
  jobLevelGrade: string
  department: string
  workingUnit: string
  parentDepartment: string
}

export type EmployeeMasterPagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type EmployeeMasterFilterOptionEntry =
  | string
  | number
  | {
      value?: string | number
      label?: string
      code?: string | number
      name?: string
      id?: string | number
    }

export type EmployeeMasterFilterOptions = Record<
  string,
  EmployeeMasterFilterOptionEntry[] | undefined
>

export type EmployeeMasterFormFieldType = 'text' | 'select' | 'textarea'

export type EmployeeMasterFormFieldConfig = {
  key: string
  label: string
  required?: boolean
  type?: EmployeeMasterFormFieldType
  placeholder?: string
  optionKey?: string
  options?: Array<{ value: string; label: string }>
}

export type EmployeeMasterFilterConfig = {
  stateKey: keyof EmployeeMasterFilterState
  param: string
  label: string
  optionKey: string
  recordField: string
}

export type EmployeeMasterTableColumnConfig = {
  key: string
  label: string
  kind?: 'primary' | 'code' | 'status' | 'text'
  minWidth?: number
}

export type EmployeeMasterResourceConfig = {
  key: EmployeeMasterResourceKey
  sidebarId: EmployeeMasterSidebarId
  title: string
  tabLabel: string
  singularLabel: string
  endpoint: string
  codeField: string
  nameField: string
  tableColumns: EmployeeMasterTableColumnConfig[]
  formFields: EmployeeMasterFormFieldConfig[]
  filters: EmployeeMasterFilterConfig[]
}

export type AdminProfile = {
  emp_code: string
  emp_full_name: string
  emp_email: string
  emp_designation?: string
  emp_department?: string
  role?: string
  can_read?: boolean
  can_write?: boolean
}

export type EmployeeRow = {
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

export type AttendanceRow = {
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

export type LeaveRow = {
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
  applied_at?: string
  status?: string
}

export type AttendanceExceptionRow = {
  id?: number
  attendance_id?: number | null
  emp_code?: string
  emp_name?: string
  exception_type?: string
  exception_date?: string
  attendance_date?: string
  exception_time?: string
  planned_arrival_time?: string
  planned_leave_time?: string
  late_by_minutes?: number | null
  early_by_minutes?: number | null
  reason?: string | null
  status?: string
  requested_at?: string
  actual_login_time?: string
  actual_logout_time?: string
}

export type AttendanceExceptionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'resolved'

export type AdminAttendanceExceptionKpiTrendPoint = {
  date: string
  count: number
}

export type AdminAttendanceExceptionRepeatOffenders = {
  employee_count: number
  exception_count: number
}

export type AdminAttendanceExceptionTopShortHoursEntry = {
  employee_name: string | null
  employee_code: string | null
  department: string | null
  late_count: number
  early_count: number
  total_minutes: number
}

export type AdminAttendanceExceptionKpis = {
  total: number
  pending: number
  early_leave: number
  late_arrival: number
  approved: number
  rejected: number
  current_month_total: number
  previous_month_total: number
  oldest_pending_days: number | null
  daily_trend: AdminAttendanceExceptionKpiTrendPoint[]
  repeat_offenders: AdminAttendanceExceptionRepeatOffenders
  top_short_hours: AdminAttendanceExceptionTopShortHoursEntry[]
}

export type AdminAttendanceExceptionFilterOptions = {
  departments: string[]
}

export type AdminAttendanceExceptionFilterState = {
  search: string
  exceptionType: string
  status: string
  department: string
  fromDate: string
  toDate: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export type AdminAttendanceExceptionRecord = {
  id?: number
  attendance_id?: number | null
  emp_code?: string
  emp_name?: string
  emp_email?: string
  employee_name?: string
  employee_code?: string
  department?: string
  exception_type?: string
  exception_date?: string
  exception_time?: string
  attendance_date?: string
  login_time?: string
  logout_time?: string
  planned_arrival_time?: string
  planned_leave_time?: string
  late_by_minutes?: number | null
  early_by_minutes?: number | null
  reason?: string | null
  notes?: string | null
  status?: string
  manager_remarks?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  requested_at?: string
  created_at?: string
  updated_at?: string
  created_date?: string
  available_actions?: string[]
  working_hours?: number
  prior_exceptions_90d?: number
}

export type AdminAttendanceExceptionPagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type AdminOvertimeStatus =
  | 'eligible'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'utilized'

export type AdminOvertimeActivity = {
  id?: number
  activity_type?: string
  status?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number | string | null
  notes?: string | null
  field_visit_id?: number | string | null
}

export type AdminOvertimeRecord = {
  id?: number
  attendance_id?: number | null
  emp_code?: string
  employee_code?: string
  emp_email?: string
  emp_name?: string
  emp_full_name?: string
  employee_name?: string
  emp_designation?: string
  emp_department?: string
  department?: string
  work_date?: string
  day_of_week?: string
  clock_in_sequence?: number | string | null
  actual_hours?: number | string | null
  extra_hours?: number | string | null
  standard_hours?: number | string | null
  comp_off_days?: number | string | null
  status?: AdminOvertimeStatus | string
  recording_deadline?: string | null
  expires_at?: string | null
  expired_at?: string | null
  approval_completed_at?: string | null
  utilized_at?: string | null
  compoff_request_id?: number | string | null
  created_at?: string
  updated_at?: string
  clock_in_time?: string | null
  clock_out_time?: string | null
  activities?: AdminOvertimeActivity[]
}

export type AdminOvertimeDatePreset = '' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom'

export type AdminOvertimeFilterState = {
  search: string
  status: '' | AdminOvertimeStatus
  empCode: string
  department: string
  fromDate: string
  toDate: string
  datePreset: AdminOvertimeDatePreset
  pageSize: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export type AdminOvertimeKpis = {
  total_loaded: number
  total: number
  eligible: number
  eligible_comp_off_days: number
  total_extra_hours: number
  expiring_or_expired: number
  requested: number
  approved: number
  rejected: number
  expired: number
  utilized: number
  current_month_total: number
  previous_month_total: number
}

export type AdminOvertimeFilterOptions = {
  departments: string[]
  statuses: AdminOvertimeStatus[]
}

export type AdminOvertimePagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type AdminOvertimeMutationPayload = {
  attendance_id?: number | string | null
  emp_code?: string
  work_date?: string
  clock_in_sequence?: number | string | null
  actual_hours?: number | string | null
  extra_hours?: number | string | null
  standard_hours?: number | string | null
  comp_off_days?: number | string | null
  status?: '' | AdminOvertimeStatus
  recording_deadline?: string | null
  expires_at?: string | null
  expired_at?: string | null
  approval_completed_at?: string | null
  utilized_at?: string | null
  compoff_request_id?: number | string | null
}

export type AdminLeaveKpiTrendPoint = {
  date: string
  count: number
}

export type AdminLeaveAgeBuckets = {
  under_7: number
  d7_30: number
  d30_90: number
  over_90: number
}

export type AdminLeaveTopDaysEntry = {
  employee_name: string | null
  employee_code: string | null
  department: string | null
  casual_days: number
  sick_days: number
  total_days: number
}

export type AdminLeaveKpis = {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  current_month_total: number
  previous_month_total: number
  oldest_pending_days: number | null
  pending_employee_count: number
  daily_trend: AdminLeaveKpiTrendPoint[]
  age_buckets: AdminLeaveAgeBuckets
  top_leave_days: AdminLeaveTopDaysEntry[]
}

export type AdminLeaveFilterOptions = {
  departments: string[]
  managers: Array<{ code: string; name: string }>
}

export type AdminLeaveFilterState = {
  search: string
  leaveType: string
  status: string
  department: string
  manager: string
  fromDate: string
  toDate: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export type AdminLeaveRecord = {
  id?: number
  employee_code?: string
  employee_name?: string
  department?: string
  leave_type?: string
  duration?: string
  leave_count?: number
  from_date?: string
  to_date?: string
  applied_at?: string
  status?: string
  manager_code?: string
  manager_name?: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  remarks?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  prior_requests_90d?: number
}

export type AdminLeavePagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type AdminLeaveBalanceEntry = {
  max: number
  used: number
  remaining: number
}

export type AdminLeaveBalance = {
  casual?: AdminLeaveBalanceEntry
  sick?: AdminLeaveBalanceEntry
  annual?: AdminLeaveBalanceEntry
  monthly?: AdminLeaveBalanceEntry
}

export type AdminApiTelemetryEntry = {
  id: string
  startedAt: string
  completedAt?: string
  method: string
  path: string
  status: 'pending' | 'success' | 'error'
  httpStatus?: number
  durationMs?: number
  summary: string
  detail: string
  requestPayload?: unknown
  responsePayload?: unknown
}

export type AdminApiLogRecord = {
  id: number
  method: string
  path: string
  status_code?: number
  duration_ms?: number
  emp_code?: string
  remote_addr?: string
  request_payload?: unknown
  response_payload?: unknown
  created_at: string
}

export type AdminApiLogFilterState = {
  method: string
  status: string
  search: string
  fromDate: string
  toDate: string
}

export type AdminApiLogPagination = {
  page: number
  page_size: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type FieldVisitTrackingPoint = {
  latitude?: number | string
  longitude?: number | string
  tracked_at?: string
  tracking_type?: string
  address?: string
  location?: string
}

export type ActivityRow = {
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
  field_visit_start_time?: string
  field_visit_end_time?: string
  field_visit_duration_minutes?: number | string
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
  field_visit_tracking?: FieldVisitTrackingPoint[]
  activity_tracking?: FieldVisitTrackingPoint[]
}

export type FieldVisitRow = {
  activityId: number | string
  fieldVisitId?: number
  employee: string
  visitType: string
  purpose: string
  visitDate?: string
  visitStartTime?: string
  visitEndTime?: string
  durationMinutes?: number | null
  status: string
  isCompleted: boolean
  location: string
  startName?: string
  endName?: string
  startAddress?: string
  endAddress?: string
  destinationLocation?: string
  destinationVisited?: boolean | null
  destinationVisitFlag?: boolean | null
  destinationVisitedCount?: number
  destinationTotalCount?: number
  distanceKm?: number | null
  startCoords?: { lat: number; lon: number } | null
  endCoords?: { lat: number; lon: number } | null
  activityTracking?: FieldVisitTrackingPoint[]
  fieldTracking?: FieldVisitTrackingPoint[]
}

export type MapTrackingPoint = {
  lat: number
  lon: number
  trackedAt?: string
  trackingType?: string
}

export type FieldVisitTimelineItem = {
  id: string
  kind: 'start' | 'point' | 'end'
  title: string
  address: string
  coords?: { lat: number; lon: number } | null
  trackedAt?: string
  trackingType?: string
}
