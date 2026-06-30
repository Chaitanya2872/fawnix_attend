import type { SidebarId } from '../../../types/admin'

export type SidebarIconName =
  | 'home'
  | 'users'
  | 'pulse'
  | 'alert'
  | 'calendar'
  | 'chart'
  | 'leaf'
  | 'activity'
  | 'pin'

export type SidebarItemDefinition = {
  id: SidebarId
  label: string
  icon: SidebarIconName
  badge?: string
}

export type LeaveFilterState = {
  employeeName: string
  employeeId: string
  leaveType: string
  fromDate: string
  toDate: string
  status: string
}
