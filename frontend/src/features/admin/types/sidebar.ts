import type { SidebarId } from '../../../types/admin'

export type SidebarIconName =
  | 'home'
  | 'users'
  | 'building'
  | 'wallet'
  | 'badge'
  | 'layers'
  | 'pulse'
  | 'list'
  | 'alert'
  | 'clock'
  | 'inbox'
  | 'calendar'
  | 'chart'
  | 'leaf'
  | 'activity'
  | 'pin'
  | 'bug'

export type SidebarItemDefinition = {
  id: SidebarId
  label: string
  icon: SidebarIconName
  badge?: string
  groupLabel?: string
}

export type SidebarSectionDefinition = {
  title?: string
  items: SidebarItemDefinition[]
}

export type LeaveFilterState = {
  employeeName: string
  employeeId: string
  leaveType: string
  fromDate: string
  toDate: string
  status: string
}
