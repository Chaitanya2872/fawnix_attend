/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import AttendanceHeatmap from './AttendanceHeatmap'
import AttendanceEfficiencyCard from './AttendanceEfficiencyCard'
import ReportDownloadMenu from './ReportDownloadMenu'
import WeeklyTrendChart from './WeeklyTrendChart'
import type { AttendanceTrendSeriesPoint } from './useReportsPanel'
import type { AttendanceHeatmapMatrix, AttendanceInsights, AttendanceStatusCode } from '../../../types/admin'
import './AdminReportsPage.css'

type Props = any

/** Strictly typed slice of the (still loosely typed) page props used by the analytics cards. */
type ReportsAnalyticsProps = {
  attendanceHeatmapData: AttendanceHeatmapMatrix | null
  attendanceHeatmapLoading: boolean
  attendanceHeatmapStatus: string
  attendanceHeatmapSavingCell: string | null
  fetchAttendanceHeatmapData: (month: number, year: number) => Promise<void>
  updateAttendanceCell: (employeeId: string, date: string, status: AttendanceStatusCode) => Promise<boolean>
  attendanceInsights: AttendanceInsights | null
  attendanceInsightsLoading: boolean
  attendanceInsightsStatus: string
  fetchAttendanceInsights: (endDate?: string, windowDays?: number) => Promise<void>
  attendanceTrendSeries: AttendanceTrendSeriesPoint[]
  isAttendanceTrendPercentage: boolean
  canWriteAdminData: boolean
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const TREND_WINDOW_DAYS = 7

/**
 * The window the summary cards describe. For the current month that is simply
 * "the last seven days"; for a past month it ends on the last day of the month
 * the user selected, so changing the period actually moves the numbers.
 */
function resolveInsightsEndDate(month: number, year: number) {
  const today = new Date()
  if (!Number.isFinite(month) || !Number.isFinite(year)) {
    return undefined
  }
  if (month === today.getMonth() + 1 && year === today.getFullYear()) {
    return undefined
  }
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export default function AdminReportsPage(props: Props) {
  const {
    attendanceEfficiencyScores,
    attendanceReportFormat,
    attendanceReportMonth,
    attendanceReportStatus,
    attendanceReportYear,
    reportDateMode,
    setReportDateMode,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    downloadRangeReport,
    loadDashboard,
    maxWeeklyAttendance,
    setAttendanceReportFormat,
    setAttendanceReportMonth,
    setAttendanceReportYear
  } = props

  const {
    attendanceHeatmapData,
    attendanceHeatmapLoading,
    attendanceHeatmapStatus,
    attendanceHeatmapSavingCell,
    fetchAttendanceHeatmapData,
    updateAttendanceCell,
    attendanceInsights,
    attendanceInsightsLoading,
    attendanceInsightsStatus,
    fetchAttendanceInsights,
    attendanceTrendSeries,
    isAttendanceTrendPercentage,
    canWriteAdminData
  }: ReportsAnalyticsProps = props

  const heatmapMonth = Number(attendanceReportMonth)
  const heatmapYear = Number(attendanceReportYear)
  const insightsEndDate = resolveInsightsEndDate(heatmapMonth, heatmapYear)

  useEffect(() => {
    void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear)
  }, [fetchAttendanceHeatmapData, heatmapMonth, heatmapYear])

  useEffect(() => {
    void fetchAttendanceInsights(insightsEndDate, TREND_WINDOW_DAYS)
  }, [fetchAttendanceInsights, insightsEndDate])

  const heatmapMonthLabel = `${MONTH_LABELS[heatmapMonth - 1] || ''} ${heatmapYear}`.trim()

  // Prefer the server scores — they exclude holidays, week offs and days before
  // an employee joined, which the locally derived ones count against everyone.
  const employeeScores: Array<{ key: string; name: string; detail: string; score: number | null }> =
    attendanceInsights?.employees.length
      ? attendanceInsights.employees.map((item) => ({
          key: item.empCode,
          name: item.name,
          detail: `${item.presentDays} / ${item.expectedDays} expected days present`,
          score: item.score
        }))
      : (attendanceEfficiencyScores as any[]).map((item) => ({
          key: item.empCode || item.name,
          name: item.name,
          detail: `${item.presentDays} / ${TREND_WINDOW_DAYS} days present`,
          score: item.score
        }))

  const refreshAll = () => {
    void loadDashboard()
    void fetchAttendanceInsights(insightsEndDate, TREND_WINDOW_DAYS)
    void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear)
  }

  return (
    <div className="admin-aligned-page admin-aligned-page--reports">
      <div className="dashboard-section-head rp-head">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Reports &amp; Analytics</h2>
          <p className="rp-head-sub">Attendance insights, trends, efficiency and employee reports</p>
        </div>
        <div className="rp-head-actions">
          <button className="ghost dashboard-button" onClick={refreshAll} type="button">Refresh</button>
          <ReportDownloadMenu
            reportDateMode={reportDateMode}
            setReportDateMode={setReportDateMode}
            attendanceReportMonth={attendanceReportMonth}
            setAttendanceReportMonth={setAttendanceReportMonth}
            attendanceReportYear={attendanceReportYear}
            setAttendanceReportYear={setAttendanceReportYear}
            reportStartDate={reportStartDate}
            setReportStartDate={setReportStartDate}
            reportEndDate={reportEndDate}
            setReportEndDate={setReportEndDate}
            attendanceReportFormat={attendanceReportFormat}
            setAttendanceReportFormat={setAttendanceReportFormat}
            onDownload={(reportType) => void downloadRangeReport(reportType)}
            statusMessage={attendanceReportStatus}
          />
        </div>
      </div>

      <div className="reports-main">
        <div className="rp-summary-grid">
          <AttendanceEfficiencyCard
            insights={attendanceInsights}
            loading={attendanceInsightsLoading}
            statusMessage={attendanceInsightsStatus}
          />

          <div className="chart-card rp-trend-card">
            <div className="chart-card-head">
              <div>
                <strong>Weekly Attendance Trend</strong>
                <span>
                  {isAttendanceTrendPercentage
                    ? 'Share of expected attendance met each day.'
                    : 'Unique employee clock-ins across the last 7 days.'}
                </span>
              </div>
            </div>
            <WeeklyTrendChart
              series={attendanceTrendSeries}
              isPercentage={isAttendanceTrendPercentage}
              maxValue={maxWeeklyAttendance}
              loading={attendanceInsightsLoading}
            />
          </div>
        </div>

        <div className="chart-card rp-heatmap-card">
          <div className="chart-card-head">
            <div>
              <strong>Attendance Heatmap</strong>
              <span>
                {`Daily status per employee for ${heatmapMonthLabel}.${canWriteAdminData ? ' Click a cell to correct it.' : ''}`}
              </span>
            </div>
          </div>
          <AttendanceHeatmap
            data={attendanceHeatmapData}
            efficiencyScores={employeeScores}
            loading={attendanceHeatmapLoading}
            statusMessage={attendanceHeatmapStatus}
            savingCellKey={attendanceHeatmapSavingCell}
            canEdit={canWriteAdminData}
            onCellEdit={(employeeId, date, newStatus) => void updateAttendanceCell(employeeId, date, newStatus)}
            onRefresh={() => void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear)}
          />
        </div>

      </div>
    </div>
  )
}
