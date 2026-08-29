import { useEffect, useRef, useState } from 'react'

const MONTH_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const REPORT_TYPES: Array<{ value: 'attendance' | 'exceptions' | 'leaves'; label: string; hint: string }> = [
  { value: 'attendance', label: 'Attendance Report', hint: 'Daily clock-in / clock-out per employee' },
  { value: 'exceptions', label: 'Exceptions Report', hint: 'Late arrivals, early leaves and missed logins' },
  { value: 'leaves', label: 'Leaves Report', hint: 'Applied, approved and rejected leave' }
]

type ReportDownloadMenuProps = {
  reportDateMode: 'month' | 'custom'
  setReportDateMode: (value: 'month' | 'custom') => void
  attendanceReportMonth: string
  setAttendanceReportMonth: (value: string) => void
  attendanceReportYear: string
  setAttendanceReportYear: (value: string) => void
  reportStartDate: string
  setReportStartDate: (value: string) => void
  reportEndDate: string
  setReportEndDate: (value: string) => void
  attendanceReportFormat: 'csv' | 'pdf' | 'xlsx'
  setAttendanceReportFormat: (value: 'csv' | 'pdf' | 'xlsx') => void
  onDownload: (reportType: 'attendance' | 'exceptions' | 'leaves') => void
  statusMessage: string
}

/**
 * Single entry point for every export on the Reports page. The period and
 * format pickers live inside the popover rather than on the page, so the
 * dashboard itself stays about the charts — you only meet the export controls
 * when you actually want a file.
 */
export default function ReportDownloadMenu({
  reportDateMode,
  setReportDateMode,
  attendanceReportMonth,
  setAttendanceReportMonth,
  attendanceReportYear,
  setAttendanceReportYear,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  attendanceReportFormat,
  setAttendanceReportFormat,
  onDownload,
  statusMessage
}: ReportDownloadMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const clickHandler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', clickHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', clickHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  return (
    <div className="rp-download" ref={containerRef}>
      <button
        className="cta dashboard-button rp-download-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        Download Report
        <span className={`rp-download-caret${open ? ' is-open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="rp-download-menu" role="dialog" aria-label="Download report">
          <div className="rp-download-section">
            <span className="rp-download-legend">Period</span>
            <div className="rp-download-segmented" role="group">
              <button
                type="button"
                className={reportDateMode === 'month' ? 'is-active' : ''}
                onClick={() => setReportDateMode('month')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={reportDateMode === 'custom' ? 'is-active' : ''}
                onClick={() => setReportDateMode('custom')}
              >
                Custom dates
              </button>
            </div>

            {reportDateMode === 'month' ? (
              <div className="rp-download-fields">
                <label htmlFor="attendance-month">
                  Month
                  <select
                    id="attendance-month"
                    value={attendanceReportMonth}
                    onChange={(event) => setAttendanceReportMonth(event.target.value)}
                  >
                    {MONTH_OPTIONS.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="attendance-year">
                  Year
                  <select
                    id="attendance-year"
                    value={attendanceReportYear}
                    onChange={(event) => setAttendanceReportYear(event.target.value)}
                  >
                    {Array.from({ length: 8 }, (_, index) => {
                      const year = new Date().getFullYear() - index
                      return <option key={year} value={year}>{year}</option>
                    })}
                  </select>
                </label>
              </div>
            ) : (
              <div className="rp-download-fields">
                <label htmlFor="report-start-date">
                  Start date
                  <input
                    className="modern-date-input"
                    id="report-start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(event) => setReportStartDate(event.target.value)}
                  />
                </label>
                <label htmlFor="report-end-date">
                  End date
                  <input
                    className="modern-date-input"
                    id="report-end-date"
                    type="date"
                    value={reportEndDate}
                    min={reportStartDate}
                    onChange={(event) => setReportEndDate(event.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rp-download-section">
            <span className="rp-download-legend">Format</span>
            <div className="rp-download-segmented" role="group">
              {(['csv', 'pdf', 'xlsx'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  className={attendanceReportFormat === format ? 'is-active' : ''}
                  onClick={() => setAttendanceReportFormat(format)}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="rp-download-section">
            <span className="rp-download-legend">Report</span>
            <div className="rp-download-list">
              {REPORT_TYPES.map((report) => (
                <button
                  key={report.value}
                  type="button"
                  className="rp-download-item"
                  onClick={() => onDownload(report.value)}
                >
                  <strong>{report.label}</strong>
                  <span>{report.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {statusMessage ? <p className="rp-download-status">{statusMessage}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
