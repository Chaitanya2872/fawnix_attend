import type { SidebarItemDefinition, LeaveFilterState } from '../types/sidebar'

export const sidebarItems: SidebarItemDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'employees', label: 'Employees List', icon: 'users' },
  { id: 'attendance', label: "Today's Activities", icon: 'pulse' },
  { id: 'leaves', label: 'Leaves', icon: 'leaf' },
  { id: 'activities', label: 'Activities', icon: 'activity' },
  { id: 'field-visits', label: 'Field Visits', icon: 'pin' },
  { id: 'calendar', label: 'Calendar View', icon: 'calendar' },
  { id: 'exceptions', label: 'Exceptions', icon: 'alert' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'chart' }
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
