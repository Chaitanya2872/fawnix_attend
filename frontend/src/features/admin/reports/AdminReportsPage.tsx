/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import AttendanceHeatmap from './AttendanceHeatmap'
import type { AttendanceHeatmapMatrix, AttendanceStatusCode } from '../../../types/admin'

type Props = any

/** Strictly typed slice of the (still loosely typed) page props used by the heatmap. */
type ReportsHeatmapProps = {
  attendanceHeatmapData: AttendanceHeatmapMatrix | null
  attendanceHeatmapLoading: boolean
  attendanceHeatmapStatus: string
  attendanceHeatmapSavingCell: string | null
  fetchAttendanceHeatmapData: (month: number, year: number) => Promise<void>
  updateAttendanceCell: (employeeId: string, date: string, status: AttendanceStatusCode) => Promise<boolean>
  canWriteAdminData: boolean
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

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
    setAttendanceReportYear,
    weeklyAttendanceTrend,
    weeklyTrendPoints
  } = props

  const {
    attendanceHeatmapData,
    attendanceHeatmapLoading,
    attendanceHeatmapStatus,
    attendanceHeatmapSavingCell,
    fetchAttendanceHeatmapData,
    updateAttendanceCell,
    canWriteAdminData
  }: ReportsHeatmapProps = props

  const [primaryView, setPrimaryView] = useState<'heatmap' | 'trend'>('heatmap')
  const heatmapMonth = Number(attendanceReportMonth)
  const heatmapYear = Number(attendanceReportYear)

  useEffect(() => {
    void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear)
  }, [fetchAttendanceHeatmapData, heatmapMonth, heatmapYear])

  const heatmapMonthLabel = `${MONTH_LABELS[heatmapMonth - 1] || ''} ${heatmapYear}`.trim()

  return (
    <div className="admin-aligned-page admin-aligned-page--reports">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Reports & Analytics</h2>
        </div>
        <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">Refresh</button>
      </div>
      <div className="reports-main">
        <div className="report-toolbar attendance-controls-row">
          <div className="attendance-filter attendance-filter-compact">
            <label htmlFor="report-date-mode">Date Filter</label>
            <select id="report-date-mode" value={reportDateMode} onChange={(event) => setReportDateMode(event.target.value)}>
              <option value="month">Monthly</option>
              <option value="custom">Custom dates</option>
            </select>
          </div>
          {reportDateMode === 'month' ? (
            <>
              <div className="attendance-filter attendance-filter-compact">
                <label htmlFor="attendance-month">Month</label>
                <select id="attendance-month" value={attendanceReportMonth} onChange={(event) => setAttendanceReportMonth(event.target.value)}>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                </select>
              </div>
              <div className="attendance-filter attendance-filter-compact">
                <label htmlFor="attendance-year">Year</label>
                <select id="attendance-year" value={attendanceReportYear} onChange={(event) => setAttendanceReportYear(event.target.value)}>
                  {Array.from({ length: 8 }, (_, index) => {
                    const year = new Date().getFullYear() - index
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="attendance-filter attendance-filter-date">
                <label htmlFor="report-start-date">Start Date</label>
                <input className="modern-date-input" id="report-start-date" type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} />
              </div>
              <div className="attendance-filter attendance-filter-date">
                <label htmlFor="report-end-date">End Date</label>
                <input className="modern-date-input" id="report-end-date" type="date" value={reportEndDate} min={reportStartDate} onChange={(event) => setReportEndDate(event.target.value)} />
              </div>
            </>
          )}
          <div className="attendance-filter attendance-filter-compact">
            <label htmlFor="attendance-format">Format</label>
            <select id="attendance-format" value={attendanceReportFormat} onChange={(event) => setAttendanceReportFormat(event.target.value)}>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
            </select>
          </div>
        </div>
        <div className="report-actions-card">
          <div>
            <strong>Download Reports</strong>
            <span>Export attendance, exceptions, or leaves for the selected month or custom date range.</span>
          </div>
          <div className="report-actions">
            <button className="cta dashboard-button" onClick={() => void downloadRangeReport('attendance')} type="button">Attendance Report</button>
            <button className="ghost dashboard-button" onClick={() => void downloadRangeReport('exceptions')} type="button">Exceptions Report</button>
            <button className="ghost dashboard-button" onClick={() => void downloadRangeReport('leaves')} type="button">Leaves Report</button>
          </div>
          {attendanceReportStatus ? <span className="report-status attendance-report-status">{attendanceReportStatus}</span> : null}
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>{primaryView === 'heatmap' ? 'Attendance Heatmap' : 'Weekly Attendance Trend'}</strong>
              <span>
                {primaryView === 'heatmap'
                  ? `Daily status per employee for ${heatmapMonthLabel}.${canWriteAdminData ? ' Click a cell to correct it.' : ''}`
                  : 'Unique employee clock-ins across the last 7 days.'}
              </span>
            </div>
            <div className="report-actions chart-view-switch">
              <button
                className={`${primaryView === 'heatmap' ? 'cta' : 'ghost'} dashboard-button`}
                onClick={() => setPrimaryView('heatmap')}
                type="button"
              >
                Heatmap
              </button>
              <button
                className={`${primaryView === 'trend' ? 'cta' : 'ghost'} dashboard-button`}
                onClick={() => setPrimaryView('trend')}
                type="button"
              >
                Weekly Trend
              </button>
            </div>
          </div>
          {primaryView === 'heatmap' ? (
            <AttendanceHeatmap
              data={attendanceHeatmapData}
              loading={attendanceHeatmapLoading}
              statusMessage={attendanceHeatmapStatus}
              savingCellKey={attendanceHeatmapSavingCell}
              canEdit={canWriteAdminData}
              onCellEdit={(employeeId, date, newStatus) => void updateAttendanceCell(employeeId, date, newStatus)}
              onRefresh={() => void fetchAttendanceHeatmapData(heatmapMonth, heatmapYear)}
            />
          ) : (
            <div className="line-chart-shell">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart">
                <polyline fill="none" stroke="#1fa7a4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={weeklyTrendPoints} />
                {weeklyAttendanceTrend.map((item: any, index: number) => {
                  const x = weeklyAttendanceTrend.length > 1 ? (index / (weeklyAttendanceTrend.length - 1)) * 100 : 50
                  const y = 100 - (item.count / maxWeeklyAttendance) * 100
                  return <circle key={item.dateKey} cx={x} cy={y} r="2.5" fill="#112c32" />
                })}
              </svg>
              <div className="line-chart-labels">
                {weeklyAttendanceTrend.map((item: any) => (
                  <div key={item.dateKey} className="chart-label-block">
                    <strong>{item.count}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <strong>Attendance Efficiency Score</strong>
              <span>Employee presence score across the same 7-day window.</span>
            </div>
          </div>
          <div className="efficiency-list">
            {attendanceEfficiencyScores.length ? (
              attendanceEfficiencyScores.map((item: any) => (
                <div key={item.empCode || item.name} className="efficiency-row">
                  <div className="efficiency-meta">
                    <strong>{item.name}</strong>
                    <span>{item.presentDays} / 7 days present</span>
                  </div>
                  <div className="efficiency-bar-track">
                    <div className="efficiency-bar-fill" style={{ width: `${item.score}%` }} />
                  </div>
                  <strong className="efficiency-score">{item.score}%</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">No attendance data available for analytics yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
