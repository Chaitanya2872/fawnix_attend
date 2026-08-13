/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import './AdminOverviewPage.css'
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

const LEAVE_SPARK_BUCKETS = 15

function parseOverviewDate(value?: string) {
  const rawValue = (value || '').trim()
  if (!rawValue) {
    return null
  }

  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(rawValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getMonthBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) {
    return null
  }

  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0)
  }
}

function getMonthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLeaveDateRange(row: any) {
  const fromDate = parseOverviewDate(row.from_date)
  const toDate = parseOverviewDate(row.to_date)
  const start = fromDate || toDate
  const end = toDate || fromDate

  if (!start || !end) {
    return null
  }

  return start <= end ? { start, end } : { start: end, end: start }
}

function leaveOverlapsMonth(row: any, monthKey: string) {
  const range = getLeaveDateRange(row)
  const bounds = getMonthBounds(monthKey)

  if (!range || !bounds) {
    return false
  }

  return range.start <= bounds.end && range.end >= bounds.start
}

function countLeavesInMonth(rows: any[], monthKey: string) {
  return rows.filter((row) => leaveOverlapsMonth(row, monthKey)).length
}

function formatOverviewMonthLabel(monthKey: string) {
  const bounds = getMonthBounds(monthKey)
  if (!bounds) {
    return 'Selected month'
  }

  return bounds.start.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function buildLeaveSparkData(rows: any[], monthKey: string) {
  const bounds = getMonthBounds(monthKey)
  const buckets = Array.from({ length: LEAVE_SPARK_BUCKETS }, () => 0)
  if (!bounds) {
    return buckets.map(() => 4)
  }

  const daysInMonth = bounds.end.getDate()
  rows.forEach((row) => {
    const range = getLeaveDateRange(row)
    if (!range || range.start > bounds.end || range.end < bounds.start) {
      return
    }

    const markerTime = Math.max(bounds.start.getTime(), Math.min(range.start.getTime(), bounds.end.getTime()))
    const markerDate = new Date(markerTime)
    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.floor(((markerDate.getDate() - 1) / daysInMonth) * buckets.length)
    )
    buckets[bucketIndex] += 1
  })

  const maxBucket = Math.max(...buckets, 0)
  if (!maxBucket) {
    return buckets.map(() => 4)
  }

  return buckets.map((count) => (count ? Math.max(Math.round((count / maxBucket) * 100), 18) : 4))
}

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
  const selectedDateLabel = new Date(`${attendanceDateFilter}T00:00:00`).toLocaleDateString(
    'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short' }
  )
  const monthKey = toMonthKey(attendanceDateFilter)
  const prevMonthKey = getPrevMonthKey(monthKey)
  const prevMonthLabel = getPrevMonthLabel(monthKey)

  // ── KPI values ─────────────────────────────────────
  const leaveKpi = useMemo(() => {
    const selectedMonthHasLeaves = countLeavesInMonth(leaveRows, monthKey) > 0
    const latestLeaveMonthKey = leaveRows.reduce((latestMonth: string, row: any) => {
      const range = getLeaveDateRange(row)
      if (!range) {
        return latestMonth
      }

      const rowMonthKey = getMonthKeyFromDate(range.end)
      return !latestMonth || rowMonthKey > latestMonth ? rowMonthKey : latestMonth
    }, '')
    const activeMonthKey = selectedMonthHasLeaves ? monthKey : latestLeaveMonthKey || monthKey
    const previousMonthKey = getPrevMonthKey(activeMonthKey)
    const currentCount = countLeavesInMonth(leaveRows, activeMonthKey)
    const previousCount = countLeavesInMonth(leaveRows, previousMonthKey)
    const delta = currentCount > 0 || previousCount > 0 ? currentCount - previousCount : null

    return {
      currentCount,
      previousCount,
      delta,
      monthLabel: formatOverviewMonthLabel(activeMonthKey),
      previousMonthLabel: getPrevMonthLabel(activeMonthKey),
      sparkData: buildLeaveSparkData(leaveRows, activeMonthKey)
    }
  }, [leaveRows, monthKey])
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
    const employeeByEmail = new Map<string, any>(
      employees
        .filter((e: any) => e.emp_email)
        .map((e: any) => [String(e.emp_email).toLowerCase(), e])
    )

    employees.forEach((e: any) => {
      const dept = (e.emp_department || 'Unassigned').trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].head += 1
    })

    firstClockInRows.forEach((r: any) => {
      const employee =
        r.employee_email ? employeeByEmail.get(String(r.employee_email).toLowerCase()) : undefined
      const dept = (
        r.emp_department ||
        employee?.emp_department ||
        r.emp_designation ||
        employee?.emp_designation ||
        'Unassigned'
      ).trim()
      if (!map[dept]) map[dept] = { head: 0, present: 0 }
      map[dept].present += 1
    })

    return Object.entries(map)
      .sort((a, b) => b[1].head - a[1].head)
      .slice(0, 6)
  }, [employees, firstClockInRows])

  const greeting = getGreeting()

  return (
    <div className="ov2-shell admin-aligned-page admin-aligned-page--overview">
      <DashboardTopbar
        exceptionCount={weeklyExceptionCount}
        onRefresh={loadDashboard}
        syncDeps={[attendanceDateFilter, presentToday, weeklyExceptionCount, leaveKpi.currentCount, fieldActive]}
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
          monthlyLeaveRequests={leaveKpi.currentCount}
          previousMonthLeaveRequests={leaveKpi.previousCount}
          monthlyLabel={leaveKpi.monthLabel}
          leavesDelta={leaveKpi.delta}
          leaveSparkData={leaveKpi.sparkData}
          leavePrevMonthLabel={leaveKpi.previousMonthLabel}
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
