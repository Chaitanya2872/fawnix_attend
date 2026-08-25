import type { SidebarItemDefinition, SidebarSectionDefinition, LeaveFilterState } from '../types/sidebar'
import type { SidebarId } from '../../../types/admin'

export const API_TELEMETRY_EMP_CODE = '8888'

export const sidebarSections: SidebarSectionDefinition[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home' }]
  },
  {
    title: 'Activities',
    items: [
      { id: 'attendance', label: "Today's activity", icon: 'pulse' },
      { id: 'attendance-records', label: 'Attendance log', icon: 'list' },
      { id: 'attendance-exceptions', label: 'Exceptions', icon: 'alert' },
      { id: 'field-visits', label: 'Field visits', icon: 'pin' },
      { id: 'leaves', label: 'Leave requests', icon: 'leaf' },
      { id: 'overtime-records', label: 'Overtime log', icon: 'clock' }
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'employees', label: 'Employee directory', icon: 'users' },
      {
        id: 'employee-master-working-units',
        label: 'Organization',
        icon: 'building',
        matchIds: [
          'employee-master-payroll-units',
          'employee-master-designations',
          'employee-master-departments',
        ],
        hasAddAction: true,
      },
      { id: 'reports', label: 'Insights & reports', icon: 'chart' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' }
    ]
  }
]

/** Flat view of every nav item, derived so the two lists cannot drift apart. */
export const sidebarItems: SidebarItemDefinition[] = sidebarSections.flatMap(
  (section) => section.items
)

/**
 * Resolves a panel to the nav entry that represents it, following `matchIds`
 * so the Organization entry answers for all of its tabs.
 */
export function findSidebarItem(panel: SidebarId): SidebarItemDefinition | undefined {
  return sidebarItems.find(
    (item) => item.id === panel || Boolean(item.matchIds?.includes(panel))
  )
}

// Item ids that should show a live/pulsing status dot instead of a count badge.
export const SIDEBAR_LIVE_ITEM_IDS = ['attendance']

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