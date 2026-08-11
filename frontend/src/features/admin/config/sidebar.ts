import type { SidebarItemDefinition, SidebarSectionDefinition, LeaveFilterState } from '../types/sidebar'

export const API_TELEMETRY_EMP_CODE = '8888'

export const sidebarItems: SidebarItemDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'attendance', label: "Today's activity", icon: 'pulse' },
  { id: 'attendance-records', label: 'Attendance records', icon: 'list' },
  { id: 'attendance-exceptions', label: 'Attendance exceptions', icon: 'alert' },
  { id: 'leaves', label: 'Leaves', icon: 'leaf' },
  { id: 'overtime-records', label: 'Overtime records', icon: 'clock' },
  { id: 'employees', label: 'Employee master', icon: 'users' },
  {
    id: 'employee-master-working-units',
    label: 'Working units',
    icon: 'building',
    groupLabel: 'Organization Units',
  },
  {
    id: 'employee-master-payroll-units',
    label: 'Payroll units',
    icon: 'wallet',
    groupLabel: 'Organization Units',
  },
  {
    id: 'employee-master-designations',
    label: 'Designations',
    icon: 'badge',
    groupLabel: 'Profiles',
  },
  {
    id: 'employee-master-departments',
    label: 'Departments',
    icon: 'layers',
    groupLabel: 'Profiles',
  },
  { id: 'reports', label: 'Reports and analytics', icon: 'chart' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox' }
]

export const sidebarSections: SidebarSectionDefinition[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home' }]
  },
  {
    title: 'Activities',
    items: [
      { id: 'attendance', label: "Today's activity", icon: 'pulse' },
      { id: 'attendance-records', label: 'Attendance records', icon: 'list' },
      { id: 'attendance-exceptions', label: 'Attendance exceptions', icon: 'alert' },
      { id: 'leaves', label: 'Leaves', icon: 'leaf' },
      { id: 'overtime-records', label: 'Overtime records', icon: 'clock' }
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'employees', label: 'Employee master', icon: 'users' },
      {
        id: 'employee-master-working-units',
        label: 'Working units',
        icon: 'building',
        groupLabel: 'Organization Units',
      },
      {
        id: 'employee-master-payroll-units',
        label: 'Payroll units',
        icon: 'wallet',
        groupLabel: 'Organization Units',
      },
      {
        id: 'employee-master-designations',
        label: 'Designations',
        icon: 'badge',
        groupLabel: 'Profiles',
      },
      {
        id: 'employee-master-departments',
        label: 'Departments',
        icon: 'layers',
        groupLabel: 'Profiles',
      },
      { id: 'reports', label: 'Reports and analytics', icon: 'chart' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' }
    ]
  }
]

export const LEAVE_TYPE_FILTER_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' }
]

export const LEAVE_STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

export const EMPTY_LEAVE_FILTERS: LeaveFilterState = {
  employeeName: '',
  employeeId: '',
  leaveType: '',
  fromDate: '',
  toDate: '',
  status: ''
}
