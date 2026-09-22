import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RangeReportType } from './useReportsPanel'
import type { EmployeeRow } from '../../../types/admin'

const MONTH_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const REPORT_TYPES: Array<{ value: RangeReportType; label: string; hint: string }> = [
  { value: 'attendance', label: 'Attendance Report', hint: 'Daily clock-in / clock-out per employee' },
  { value: 'exceptions', label: 'Exceptions Report', hint: 'Late arrivals, early leaves and missed logins' },
  { value: 'leaves', label: 'Leaves Report', hint: 'Applied, approved and rejected leave' },
  { value: 'overtime', label: 'Overtime Report', hint: 'Extra hours worked and the comp-off days earned' },
  { value: 'missed-logins', label: 'Missed Login Report', hint: 'Clock-ins after 10:05 AM or clock-outs before 6:00 PM' }
]

/** How many matches the employee search drops down at once. */
const EMPLOYEE_SUGGESTION_LIMIT = 8

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
  reportEmpCode: string
  setReportEmpCode: (value: string) => void
  employees: EmployeeRow[]
  attendanceReportFormat: 'csv' | 'pdf' | 'xlsx'
  setAttendanceReportFormat: (value: 'csv' | 'pdf' | 'xlsx') => void
  onDownload: (reportType: RangeReportType) => void
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
  reportEmpCode,
  setReportEmpCode,
  employees,
  attendanceReportFormat,
  setAttendanceReportFormat,
  onDownload,
  statusMessage
}: ReportDownloadMenuProps) {
  const [open, setOpen] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.emp_code === reportEmpCode) ?? null,
    [employees, reportEmpCode]
  )

  // Typing filters; an empty box means the scope is still whoever is selected,
  // so the list only appears once there is something to narrow by.
  const employeeMatches = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase()
    if (!needle) {
      return []
    }
    return employees
      .filter((employee) => {
        const haystack = [
          employee.emp_code,
          employee.emp_full_name,
          employee.emp_email,
          employee.emp_department
        ]
        return haystack.some((field) => (field || '').toLowerCase().includes(needle))
      })
      .slice(0, EMPLOYEE_SUGGESTION_LIMIT)
  }, [employees, employeeQuery])

  // Dismissing the popover also drops the half-typed search, so reopening it
  // starts from the employee that is actually in scope.
  const closeMenu = useCallback(() => {
    setOpen(false)
    setEmployeeQuery('')
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const clickHandler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', clickHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', clickHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [closeMenu, open])

  const selectEmployee = (empCode: string) => {
    setReportEmpCode(empCode)
    setEmployeeQuery('')
  }

  return (
    <div className="rp-download" ref={containerRef}>
      <button
        className="cta dashboard-button rp-download-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? closeMenu() : setOpen(true))}
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
            <span className="rp-download-legend">Employee</span>
            <div className="rp-download-employee">
              <div className="rp-download-scope">
                <span className="rp-download-scope-value">
                  {selectedEmployee
                    ? `${selectedEmployee.emp_full_name} (${selectedEmployee.emp_code})`
                    : reportEmpCode || 'All employees'}
                </span>
                {reportEmpCode ? (
                  <button
                    className="rp-download-scope-clear"
                    type="button"
                    onClick={() => selectEmployee('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <input
                className="rp-download-employee-search"
                id="report-employee-search"
                type="search"
                autoComplete="off"
                placeholder="Search name, ID, email or department"
                aria-label="Search for an employee to scope the report to"
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
              />
              {employeeQuery.trim() ? (
                <ul className="rp-download-employee-list">
                  {employeeMatches.length ? (
                    employeeMatches.map((employee) => (
                      <li key={employee.emp_code}>
                        <button type="button" onClick={() => selectEmployee(employee.emp_code)}>
                          <strong>{employee.emp_full_name || employee.emp_code}</strong>
                          <span>
                            {[employee.emp_code, employee.emp_department].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="rp-download-employee-empty">No matching employee.</li>
                  )}
                </ul>
              ) : null}
            </div>
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
