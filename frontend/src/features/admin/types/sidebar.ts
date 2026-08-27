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
  /** Panel opened when the item is clicked. */
  id: SidebarId
  label: string
  icon: SidebarIconName
  badge?: string
  groupLabel?: string
  /**
   * Extra panels this one item stands for. Used where several panels share a
   * single nav entry (the Organization page's tabs), so the entry stays
   * highlighted whichever tab is open.
   */
  matchIds?: SidebarId[]
  /** Shows an inline "+" on the row that triggers the panel's create action. */
  hasAddAction?: boolean
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
