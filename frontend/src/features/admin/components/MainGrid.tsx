import { AttendanceTrendChart } from './Attendancetrendchart'
import { UpcomingBirthdaysPanel } from './UpcomingBirthdaysPanel'
import type { UpcomingBirthday } from './UpcomingBirthdaysPanel'

type TrendItem = { label: string; count: number }
type MainGridProps = {
  // Chart
  trend: TrendItem[]
  weekLabel: string
  averageWeeklyAttendance: number
  presentToday: number
  selectedDateLeavesCount: number
  fieldVisitsCount: number
  fieldActive: number
  totalEmployees: number
  birthdays: UpcomingBirthday[]
}

export function MainGrid({
  trend,
  weekLabel,
  averageWeeklyAttendance,
  presentToday,
  selectedDateLeavesCount,
  fieldVisitsCount,
  fieldActive,
  totalEmployees,
  birthdays,
}: MainGridProps) {
  return (
    <div className="ov2-main-grid">
      <AttendanceTrendChart
        trend={trend}
        weekLabel={weekLabel}
        averageWeeklyAttendance={averageWeeklyAttendance}
        presentToday={presentToday}
        selectedDateLeavesCount={selectedDateLeavesCount}
        fieldVisitsCount={fieldVisitsCount}
        fieldActive={fieldActive}
        totalEmployees={totalEmployees}
      />
      <UpcomingBirthdaysPanel birthdays={birthdays} />
    </div>
  )
}
