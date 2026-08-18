import type { AttendanceStatusCode } from '../../../types/admin'

export type AttendanceStatusMeta = {
  label: string
  /** Single-character glyph drawn inside the cell so status never relies on colour alone. */
  glyph: string
  /** Matches the colour classes defined in AttendanceHeatmap.css. */
  className: string
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatusCode, AttendanceStatusMeta> = {
  P: { label: 'Present (Office)', glyph: 'P', className: 'is-present' },
  S: { label: 'Site', glyph: 'S', className: 'is-site' },
  WFH: { label: 'Work From Home', glyph: 'W', className: 'is-wfh' },
  A: { label: 'Absent', glyph: 'A', className: 'is-absent' },
  L: { label: 'Leave', glyph: 'L', className: 'is-leave' },
  H: { label: 'Holiday', glyph: 'H', className: 'is-holiday' },
  O: { label: 'Week Off', glyph: 'O', className: 'is-weekoff' }
}

/** Order used by the heatmap legend. */
export const ATTENDANCE_LEGEND_ORDER: AttendanceStatusCode[] = ['P', 'S', 'WFH', 'A', 'L', 'H', 'O']

/** Statuses an admin may set by hand. Add 'S' here if site visits become manually assignable. */
export const EDITABLE_ATTENDANCE_STATUSES: AttendanceStatusCode[] = ['P', 'A', 'WFH', 'L', 'H', 'O']

/** Statuses that count towards the per-employee "days worked" tally. */
export const WORKED_ATTENDANCE_STATUSES: AttendanceStatusCode[] = ['P', 'S', 'WFH']
