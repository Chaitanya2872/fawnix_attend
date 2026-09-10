import { AttendanceTrendChart } from './Attendancetrendchart'
import { UpcomingBirthdaysPanel } from './UpcomingBirthdaysPanel'
import type { UpcomingBirthday } from './UpcomingBirthdaysPanel'
import { WorkAnniversariesPanel } from './WorkAnniversariesPanel'
import type { UpcomingWorkAnniversary } from './WorkAnniversariesPanel'

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
  workAnniversaries: UpcomingWorkAnniversary[]
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
  workAnniversaries,
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
      <WorkAnniversariesPanel anniversaries={workAnniversaries} />
    </div>
  )
}
