/* eslint-disable @typescript-eslint/no-explicit-any */
import { AttendanceTrendChart } from './Attendancetrendchart'
import { ExceptionsPanel } from './Exceptionspanel'

type TrendItem = { label: string; count: number }
type ExceptionRow = Record<string, any>

type MainGridProps = {
  // Chart
  trend: TrendItem[]
  weekLabel: string
  averageWeeklyAttendance: number
  presentToday: number
  lateExceptionsToday: number
  selectedDateLeavesCount: number
  fieldVisitsCount: number
  fieldActive: number
  totalEmployees: number
  // Exceptions
  exceptions: ExceptionRow[]
  onAlertManager: (row: ExceptionRow) => Promise<string>
}

export function MainGrid({
  trend,
  weekLabel,
  averageWeeklyAttendance,
  presentToday,
  lateExceptionsToday,
  selectedDateLeavesCount,
  fieldVisitsCount,
  fieldActive,
  totalEmployees,
  exceptions,
  onAlertManager,
}: MainGridProps) {
  return (
    <div className="ov2-main-grid">
      <AttendanceTrendChart
        trend={trend}
        weekLabel={weekLabel}
        averageWeeklyAttendance={averageWeeklyAttendance}
        presentToday={presentToday}
        lateExceptionsToday={lateExceptionsToday}
        selectedDateLeavesCount={selectedDateLeavesCount}
        fieldVisitsCount={fieldVisitsCount}
        fieldActive={fieldActive}
        totalEmployees={totalEmployees}
      />
      <ExceptionsPanel exceptions={exceptions} onAlertManager={onAlertManager} />
    </div>
  )
}