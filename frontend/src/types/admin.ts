export type PrivacySection = {
  title: string
  body: string[]
  bullets: string[]
}

export type SidebarId =
  | 'employees'
  | 'attendance'
  | 'exceptions'
  | 'reports'
  | 'leaves'
  | 'activities'
  | 'field-visits'

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
  status?: string
}

export type AttendanceExceptionRow = {
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
