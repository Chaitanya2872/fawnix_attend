/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import {
  toMonthKey,
  getPrevMonthKey,
  getPrevMonthLabel,
  getMonthAvgRate,
  getMonthExceptionCount,
  getWeekRangeLabel,
  getGreeting,
} from '../../utils/Utils'
import { DashboardTopbar } from '../../components/Dashboardtopbar'
import { KpiStrip } from '../../components/Kpistrip'
import { MainGrid } from '../../components/MainGrid'
import { DepartmentsPanel } from '../../components/Departmentspanel'
import { PendingApprovalsPanel } from '../../components/Pendingapprovalspanel'

type Props = any

export default function AdminOverviewPage({
  attendanceDateFilter,
  attendanceCountByDate = {},
  exceptionCountByDate = {},
  employees,
  fieldVisitRows,
  firstClockInRows,
  formatLeaveTypeLabel,
  leaveRows,
  loadDashboard,
  onAlertManager,
  selectedDateExceptions,
  selectedDateLeaves,
  weeklyAttendanceTrend,
}: Props) {
  // ── Derived counts ─────────────────────────────────
  const activeEmployees = employees.filter((e: any) => e.is_active !== false).length
  const totalEmployees = activeEmployees || employees.length
  const presentToday = firstClockInRows.length
  const pendingLeaveRows = leaveRows.filter(
    (r: any) => (r.status || '').trim().toLowerCase() === 'pending'
  )
  const lateExceptionsToday = selectedDateExceptions.filter((r: any) =>
    `${r?.type || ''} ${r?.reason || ''} ${r?.message || ''}`.toLowerCase().includes('late')
  ).length
  const fieldActive = fieldVisitRows.filter((r: any) => {
    const s = `${r?.status || r?.visitStatus || ''}`.toLowerCase()
    return s ? !s.includes('complete') && !s.includes('closed') : true
  }).length

  // ── Date / label helpers ───────────────────────────
  const weekLabel = getWeekRangeLabel(attendanceDateFilter)
  const monthlyLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
  const selectedDateLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString(
    'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short' }
  )
  const monthKey = toMonthKey(attendanceDateFilter)
  const prevMonthKey = getPrevMonthKey(monthKey)
  const prevMonthLabel = getPrevMonthLabel(monthKey)

  // ── KPI values ─────────────────────────────────────
  const monthlyLeaveApprovals = leaveRows.filter(
    (r: any) => toMonthKey(r.from_date || r.to_date || '') === monthKey
  ).length
  const weeklyExceptionCount = selectedDateExceptions.length
  const maxWeekly = Math.max(...weeklyAttendanceTrend.map((i: any) => i.count), 1)

  const averageWeeklyAttendance = weeklyAttendanceTrend.length
    ? Math.round(
        (weeklyAttendanceTrend.reduce((s: number, i: any) => s + i.count, 0) /
          weeklyAttendanceTrend.length /
          Math.max(totalEmployees, 1)) *
          100
      )
    : 0

  const punctualityRate = totalEmployees
    ? Math.max(
        0,
        Math.round(
          ((presentToday - lateExceptionsToday) /
            Math.max(presentToday || totalEmployees, 1)) *
            100
        )
      )
    : 0

  // ── Month-over-month deltas ────────────────────────
  const thisMonthAttRate = getMonthAvgRate(attendanceCountByDate, monthKey, totalEmployees)
  const prevMonthAttRate = getMonthAvgRate(attendanceCountByDate, prevMonthKey, totalEmployees)
  const attendanceDelta =
    thisMonthAttRate !== null && prevMonthAttRate !== null
      ? thisMonthAttRate - prevMonthAttRate
      : null

  const thisMonthExcCount = getMonthExceptionCount(exceptionCountByDate, monthKey)
  const prevMonthExcCount = getMonthExceptionCount(exceptionCountByDate, prevMonthKey)
  const thisMonthTotalAtt = Object.keys(attendanceCountByDate)
    .filter((d) => d.startsWith(monthKey))
    .reduce((s, d) => s + (attendanceCountByDate[d] || 0), 0)
  const prevMonthTotalAtt = Object.keys(attendanceCountByDate)
    .filter((d) => d.startsWith(prevMonthKey))
    .reduce((s, d) => s + (attendanceCountByDate[d] || 0), 0)

  const thisOnTimeRate =
    thisMonthTotalAtt > 0
      ? Math.round(((thisMonthTotalAtt - thisMonthExcCount) / thisMonthTotalAtt) * 100)
      : null
  const prevOnTimeRate =
    prevMonthTotalAtt > 0
      ? Math.round(((prevMonthTotalAtt - prevMonthExcCount) / prevMonthTotalAtt) * 100)
      : null
  const onTimeDelta =
    thisOnTimeRate !== null && prevOnTimeRate !== null ? thisOnTimeRate - prevOnTimeRate : null

  const prevMonthLeavesCount = leaveRows.filter(
    (r: any) => toMonthKey(r.from_date || r.to_date || '') === prevMonthKey
  ).length
  const leavesDelta =
    prevMonthLeavesCount > 0 || monthlyLeaveApprovals > 0
      ? monthlyLeaveApprovals - prevMonthLeavesCount
      : null

  const exceptionsDelta =
    thisMonthExcCount > 0 || prevMonthExcCount > 0
      ? thisMonthExcCount - prevMonthExcCount
      : null

  // ── Spark data (shared between attendance + on-time cards) ──
  const sparkData = weeklyAttendanceTrend.slice(-7).map((item: any) =>
    maxWeekly > 0 ? Math.max(Math.round((item.count / maxWeekly) * 100), 4) : 4
  )

  // ── Department entries ─────────────────────────────
  const deptEntries = useMemo(() => {
    const map: Record<string, { head: number; present: number }> = {}
    employees.forEach((e: any) => {
      const dept = (e.emp_department || 'Unassigned').trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].head += 1
    })
    firstClockInRows.forEach((r: any) => {
      const dept = (r.emp_department || r.emp_designation || 'Unassigned').trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].present += 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1].head - a[1].head)
      .slice(0, 6)
  }, [employees, firstClockInRows])

  const greeting = getGreeting()

  return (
    <div className="ov2-shell">
      <DashboardTopbar
        exceptionCount={weeklyExceptionCount}
        onRefresh={loadDashboard}
        syncDeps={[attendanceDateFilter, presentToday, weeklyExceptionCount, monthlyLeaveApprovals, fieldActive]}
      />

      <div className="ov2-content">
        {/* ── Page header ── */}
        <div className="ov2-page-header">
          <div>
            <h1 className="ov2-page-title">{greeting}, Admin</h1>
            <p className="ov2-page-sub">
              {presentToday} of {totalEmployees} present &middot; {weeklyExceptionCount} exceptions
              &middot; {fieldActive} in the field
            </p>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <KpiStrip
          averageWeeklyAttendance={averageWeeklyAttendance}
          presentToday={presentToday}
          totalEmployees={totalEmployees}
          weekLabel={weekLabel}
          attendanceDelta={attendanceDelta}
          sparkData={sparkData}
          punctualityRate={punctualityRate}
          lateExceptionsToday={lateExceptionsToday}
          selectedDateLabel={selectedDateLabel}
          onTimeDelta={onTimeDelta}
          monthlyLeaveApprovals={monthlyLeaveApprovals}
          pendingLeaveCount={pendingLeaveRows.length}
          monthlyLabel={monthlyLabel}
          leavesDelta={leavesDelta}
          weeklyExceptionCount={weeklyExceptionCount}
          selectedDateLeavesCount={selectedDateLeaves.length}
          fieldActive={fieldActive}
          exceptionsDelta={exceptionsDelta}
          exceptionMiniList={selectedDateExceptions
            .slice(0, 3)
            .map((r: any) => r.emp_full_name || r.emp_code || 'Unknown')}
          prevMonthLabel={prevMonthLabel}
        />

        {/* ── Main grid: chart + exceptions ── */}
        <MainGrid
          trend={weeklyAttendanceTrend}
          weekLabel={weekLabel}
          averageWeeklyAttendance={averageWeeklyAttendance}
          presentToday={presentToday}
          lateExceptionsToday={lateExceptionsToday}
          selectedDateLeavesCount={selectedDateLeaves.length}
          fieldVisitsCount={fieldVisitRows.length}
          fieldActive={fieldActive}
          totalEmployees={totalEmployees}
          exceptions={selectedDateExceptions}
          onAlertManager={onAlertManager}
        />

        {/* ── Lower grid: departments + approvals ── */}
        <div className="ov2-lower-grid">
          <DepartmentsPanel
            deptEntries={deptEntries}
            selectedDateLabel={selectedDateLabel}
          />
          <PendingApprovalsPanel
            pendingLeaveRows={pendingLeaveRows}
            onAlertManager={onAlertManager}
            formatLeaveTypeLabel={formatLeaveTypeLabel}
          />
        </div>
      </div>
    </div>
  )
}
