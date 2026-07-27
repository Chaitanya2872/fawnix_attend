import { useEffect, useState } from 'react'
import {
  getCalendarDays,
  getCalendarMonthLabel,
  parseDateInputValue,
  toDateInputValue
} from '../../../utils/date/dateUtils'
import type { LeaveRow } from '../../../types/admin'

type UseCalendarPanelOptions = {
  attendanceDateFilter: string
  attendanceCountByDate: Record<string, number>
  leaveRows: LeaveRow[]
}

export function useCalendarPanel({ attendanceDateFilter, attendanceCountByDate, leaveRows }: UseCalendarPanelOptions) {
  const [calendarMonthView, setCalendarMonthView] = useState(() => parseDateInputValue(toDateInputValue(new Date())))

  useEffect(() => {
    // Deliberate: syncs from attendanceDateFilter on change, but the user can then browse
    // months independently (next/prev) without attendanceDateFilter changing again - a
    // genuine sync-then-diverge case, not a derivable value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalendarMonthView(parseDateInputValue(attendanceDateFilter || toDateInputValue(new Date())))
  }, [attendanceDateFilter])

  const calendarMonthLabel = getCalendarMonthLabel(calendarMonthView)
  const calendarDays = getCalendarDays(calendarMonthView)
  const maxCalendarAttendance = Math.max(...Object.values(attendanceCountByDate), 1)
  const leaveCountByDate = leaveRows.reduce<Record<string, number>>((accumulator, row) => {
    const fromDate = row.from_date ? new Date(row.from_date) : null
    const toDate = row.to_date ? new Date(row.to_date) : fromDate
    if (!fromDate || Number.isNaN(fromDate.getTime()) || !toDate || Number.isNaN(toDate.getTime())) {
      return accumulator
    }

    const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())

    while (cursor <= end) {
      const key = toDateInputValue(cursor)
      accumulator[key] = (accumulator[key] || 0) + 1
      cursor.setDate(cursor.getDate() + 1)
    }

    return accumulator
  }, {})

  return {
    calendarMonthView,
    setCalendarMonthView,
    calendarMonthLabel,
    calendarDays,
    maxCalendarAttendance,
    leaveCountByDate
  }
}
