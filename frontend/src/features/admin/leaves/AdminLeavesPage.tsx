/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FormEvent, useMemo, useState } from 'react'
import './AdminLeavesPage.css'

type Props = any

function getOptionLabel(options: any[], value: string) {
  const normalizedValue = value.trim().toLowerCase()
  const matchedOption = options.find((option: any) => {
    const optionValue = String(option.value || '').trim().toLowerCase()
    const optionLabel = String(option.label || '').trim().toLowerCase()
    return optionValue === normalizedValue || optionLabel === normalizedValue
  })

  return matchedOption?.label || value
}

const REQUIRED_IMPORT_FIELDS = ['emp_code', 'from_date', 'to_date', 'leave_type']
const LEAVE_STATUS_IMPORT_OPTIONS = ['approved', 'pending', 'rejected', 'cancelled']
const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short'
})
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })

function parseLeaveDate(value?: string) {
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

function getLeaveDateKey(value?: string) {
  const parsed = parseLeaveDate(value)
  if (!parsed) {
    return ''
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-')
}

function formatCompactLeaveDate(value: string | undefined, formatDate: (nextValue?: string) => string) {
  const parsed = parseLeaveDate(value)
  return parsed ? COMPACT_DATE_FORMATTER.format(parsed) : formatDate(value)
}

function formatLeaveDateRange(row: any, formatDate: (nextValue?: string) => string) {
  const fromDate = row.from_date
  const toDate = row.to_date
  const fromKey = getLeaveDateKey(fromDate)
  const toKey = getLeaveDateKey(toDate)

  if (!fromDate && !toDate) {
    return '--'
  }

  if (!toDate || (fromKey && fromKey === toKey)) {
    return formatCompactLeaveDate(fromDate, formatDate)
  }

  if (!fromDate) {
    return formatCompactLeaveDate(toDate, formatDate)
  }

  return `${formatCompactLeaveDate(fromDate, formatDate)} - ${formatCompactLeaveDate(toDate, formatDate)}`
}

function formatLeaveWeekdayRange(row: any) {
  const fromDate = parseLeaveDate(row.from_date)
  const toDate = parseLeaveDate(row.to_date)
  const fromKey = getLeaveDateKey(row.from_date)
  const toKey = getLeaveDateKey(row.to_date)

  if (!fromDate && !toDate) {
    return ''
  }

  const fromWeekday = fromDate ? WEEKDAY_FORMATTER.format(fromDate) : ''
  const toWeekday = toDate ? WEEKDAY_FORMATTER.format(toDate) : ''

  if (!toWeekday || (fromKey && fromKey === toKey)) {
    return fromWeekday
  }

  if (!fromWeekday) {
    return toWeekday
  }

  return `${fromWeekday} - ${toWeekday}`
}

export default function AdminLeavesPage({
  clearLeaveFilters,
  downloadLeavesTemplate,
  employees,
  formatDate,
  formatDateOnly,
  formatLeaveTypeLabel,
  getLeaveApproverLabel,
  getLeaveReasonLabel,
  leaveEmployeeIdOptions,
  leaveEmployeeNameOptions,
  leaveFilterLoading,
  leaveFilters,
  leaveFilterStatus,
  leaveImportLoading,
  leaveImportStatus,
  leaveImportSummary,
  leaveRows,
  leaveStatusOptions,
  leaveTypeOptions,
  importLeaves,
  onAlertManager,
  refreshLeaves,
  updateLeaveFilter
}: Props) {
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [alertLoadingKey, setAlertLoadingKey] = useState('')
  const [alertStatus, setAlertStatus] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDefaultStatus, setImportDefaultStatus] = useState('approved')
  const [importStrictMode, setImportStrictMode] = useState(false)
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true)
  const normalizedLeaveStatus = (leaveFilters.status || '').trim().toLowerCase()

  const pendingLeaveRows = useMemo(
    () => leaveRows.filter((row: any) => (row.status || '').trim().toLowerCase() === 'pending'),
    [leaveRows]
  )
  const activeLeaveFilters = useMemo(() => {
    const filterRows = [
      { key: 'employeeName', label: 'Name', value: leaveFilters.employeeName },
      { key: 'employeeId', label: 'ID', value: leaveFilters.employeeId },
      {
        key: 'leaveType',
        label: 'Type',
        value: getOptionLabel(leaveTypeOptions, leaveFilters.leaveType || '')
      },
      { key: 'fromDate', label: 'From', value: leaveFilters.fromDate },
      { key: 'toDate', label: 'To', value: leaveFilters.toDate },
      {
        key: 'status',
        label: 'Status',
        value: getOptionLabel(leaveStatusOptions, leaveFilters.status || '')
      }
    ]

    return filterRows
      .map((filter) => ({ ...filter, value: String(filter.value || '').trim() }))
      .filter((filter) => filter.value)
  }, [leaveFilters, leaveStatusOptions, leaveTypeOptions])
  const activeLeaveFilterCount = activeLeaveFilters.length

  const handleAlertManager = async (row: any, fallbackKey: string) => {
    setAlertLoadingKey(fallbackKey)
    setAlertStatus('')
    try {
      const nextStatus = await onAlertManager(row)
      setAlertStatus(nextStatus)
    } catch (error) {
      setAlertStatus(error instanceof Error ? error.message : 'Failed to alert manager.')
    } finally {
      setAlertLoadingKey('')
    }
  }

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!importFile || leaveImportLoading) {
      return
    }

    await importLeaves(importFile, {
      defaultStatus: importDefaultStatus,
      strict: importStrictMode,
      skipDuplicates: importSkipDuplicates
    })
  }

  return (
    <div className="admin-aligned-page admin-aligned-page--leaves">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Leaves</h2>
        </div>
        <div className="leave-page-actions">
          <button
            className="ghost dashboard-button leave-import-trigger"
            onClick={() => setImportModalOpen(true)}
            disabled={leaveImportLoading}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3v11m0-11 4 4m-4-4-4 4M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            Import Leaves
          </button>
          <button
            className="ghost dashboard-button"
            onClick={() => void refreshLeaves(leaveFilters, true)}
            disabled={leaveFilterLoading}
            type="button"
          >
            {leaveFilterLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="chart-card pending-approvals-card leave-pending-card">
        <button
          className={`pending-approvals-toggle${pendingExpanded ? ' open' : ''}`}
          onClick={() => setPendingExpanded((current) => !current)}
          type="button"
        >
          <div>
            <strong>Pending Approvals</strong>
            <span>Collapsed/expanded manager queue for pending leave requests</span>
          </div>
          <span className="pending-approvals-pill">
            {pendingExpanded ? 'Collapse' : 'Expand'} · {pendingLeaveRows.length}
          </span>
        </button>

        {pendingExpanded ? (
          <div className="pending-approvals-list">
            {pendingLeaveRows.length ? (
              pendingLeaveRows.map((row: any, index: number) => {
                const rowKey = String(row.id || row.emp_code || index)
                return (
                  <div key={rowKey} className="pending-approval-row detailed">
                    <div className="pending-approval-copy">
                      <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                      <span>{formatLeaveTypeLabel(row)}</span>
                      <small className="leave-date-mini">
                        <span>{formatLeaveDateRange(row, formatDate)}</span>
                        {formatLeaveWeekdayRange(row) ? (
                          <span>{formatLeaveWeekdayRange(row)}</span>
                        ) : null}
                      </small>
                    </div>
                    <div className="pending-approval-meta">
                      <span>{getLeaveApproverLabel(row, employees)}</span>
                      <button
                        className="ghost dashboard-button"
                        onClick={() => void handleAlertManager(row, rowKey)}
                        disabled={alertLoadingKey === rowKey}
                        type="button"
                      >
                        {alertLoadingKey === rowKey ? 'Alerting...' : 'Alert Manager'}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">No pending leave approvals match the current filters.</div>
            )}
            {alertStatus ? <span className="report-status">{alertStatus}</span> : null}
          </div>
        ) : null}
      </div>

      <form
        className="leave-filter-card"
        onSubmit={(event) => {
          event.preventDefault()
          void refreshLeaves(leaveFilters, true)
        }}
      >
        <div className="leave-filter-head">
          <div>
            <strong>Search Leave Records</strong>
            <span>Filter by employee, leave details, date range, or status.</span>
            <div className="leave-active-filter-list" aria-live="polite">
              {activeLeaveFilters.length ? (
                activeLeaveFilters.map((filter) => (
                  <span key={filter.key} className="leave-active-filter-pill">
                    <strong>{filter.label}</strong>
                    {filter.value}
                  </span>
                ))
              ) : (
                <span className="leave-filter-muted">No filters selected</span>
              )}
            </div>
          </div>
          <div className="leave-filter-count-stack">
            <span className="leave-filter-count">{leaveRows.length} result{leaveRows.length === 1 ? '' : 's'}</span>
            {activeLeaveFilterCount ? (
              <span className="table-pill accent">
                {activeLeaveFilterCount} selected
              </span>
            ) : null}
          </div>
        </div>
        <div className="leave-status-chip-row" role="group" aria-label="Quick status filter">
          <span className="leave-status-chip-label">Quick status</span>
          <button
            className={`leave-status-chip${!normalizedLeaveStatus ? ' active' : ''}`}
            type="button"
            onClick={() => updateLeaveFilter('status', '')}
            disabled={leaveFilterLoading}
          >
            All
          </button>
          {leaveStatusOptions.map((option: any) => {
            const optionValue = String(option.value || '').trim()
            const optionLabel = String(option.label || option.value || '').trim()
            const optionActive =
              normalizedLeaveStatus === optionValue.toLowerCase() ||
              normalizedLeaveStatus === optionLabel.toLowerCase()

            return (
              <button
                key={optionValue || optionLabel}
                className={`leave-status-chip${optionActive ? ' active' : ''}`}
                type="button"
                onClick={() => updateLeaveFilter('status', optionValue)}
                disabled={leaveFilterLoading}
              >
                {optionLabel}
              </button>
            )
          })}
        </div>
        <div className="leave-filter-grid">
          <label className="leave-filter-field">
            <span>Employee Name</span>
            <input
              type="search"
              list="leave-employee-name-options"
              value={leaveFilters.employeeName}
              onChange={(event) => updateLeaveFilter('employeeName', event.target.value)}
              placeholder="Search employee name"
            />
            <datalist id="leave-employee-name-options">
              {leaveEmployeeNameOptions.map((name: any) => <option key={name} value={name} />)}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>Employee ID</span>
            <input
              type="search"
              list="leave-employee-id-options"
              value={leaveFilters.employeeId}
              onChange={(event) => updateLeaveFilter('employeeId', event.target.value)}
              placeholder="Search employee ID"
            />
            <datalist id="leave-employee-id-options">
              {leaveEmployeeIdOptions.map((employeeId: any) => <option key={employeeId} value={employeeId} />)}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>Leave Type</span>
            <input
              type="search"
              list="leave-type-options"
              value={leaveFilters.leaveType}
              onChange={(event) => updateLeaveFilter('leaveType', event.target.value)}
              placeholder="Search leave type"
            />
            <datalist id="leave-type-options">
              {leaveTypeOptions.map((option: any) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </label>
          <label className="leave-filter-field">
            <span>From Date</span>
            <input
              type="date"
              value={leaveFilters.fromDate}
              onChange={(event) => updateLeaveFilter('fromDate', event.target.value)}
            />
          </label>
          <label className="leave-filter-field">
            <span>To Date</span>
            <input
              type="date"
              value={leaveFilters.toDate}
              onChange={(event) => updateLeaveFilter('toDate', event.target.value)}
            />
          </label>
          <label className="leave-filter-field">
            <span>Leave Status</span>
            <input
              type="search"
              list="leave-status-options"
              value={leaveFilters.status}
              onChange={(event) => updateLeaveFilter('status', event.target.value)}
              placeholder="Search leave status"
            />
            <datalist id="leave-status-options">
              {leaveStatusOptions.map((option: any) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </label>
        </div>
        <div className="leave-filter-actions">
          {leaveFilterStatus ? (
            <span className="leave-filter-status">{leaveFilterStatus}</span>
          ) : (
            <span className="leave-filter-status">
              {activeLeaveFilterCount
                ? `${activeLeaveFilterCount} filter${activeLeaveFilterCount === 1 ? '' : 's'} ready to apply.`
                : 'No filter values selected.'}
            </span>
          )}
          <button className="ghost" type="button" onClick={() => void clearLeaveFilters()} disabled={leaveFilterLoading}>
            Clear Filters
          </button>
          <button className="cta" type="submit" disabled={leaveFilterLoading}>
            {leaveFilterLoading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </form>

      <div className="table-card">
        <div className="leave-table-head">
          <div>
            <strong>Leave Records</strong>
            <span>
              {leaveRows.length} record{leaveRows.length === 1 ? '' : 's'}
            </span>
          </div>
          {activeLeaveFilterCount ? <span className="table-pill accent">Filters ready</span> : null}
        </div>
        {leaveRows.length ? (
          <div className="table-scroll">
            <table className="dashboard-table leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Applied At</th>
                  <th>Approver</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager Alert</th>
                </tr>
              </thead>
              <tbody>
                {leaveRows.map((row: any, index: number) => {
                  const rowKey = String(row.id || row.emp_code || index)
                  const isPending = (row.status || '').trim().toLowerCase() === 'pending'
                  const dateRangeLabel = formatLeaveDateRange(row, formatDate)
                  const weekdayLabel = formatLeaveWeekdayRange(row)
                  return (
                    <tr key={`${row.id || row.emp_code || index}`}>
                      <td>
                        <strong>{row.emp_full_name || row.emp_code || 'Unknown employee'}</strong>
                        <span className="table-meta">{row.emp_code || 'Employee ID unavailable'}</span>
                      </td>
                      <td>{formatLeaveTypeLabel(row)}</td>
                      <td>
                        <span className="leave-date-range">{dateRangeLabel}</span>
                        {weekdayLabel ? <span className="leave-date-weekdays">{weekdayLabel}</span> : null}
                      </td>
                      <td>{formatDateOnly(row.applied_at)}</td>
                      <td>{getLeaveApproverLabel(row, employees)}</td>
                      <td>{getLeaveReasonLabel(row)}</td>
                      <td>
                        <span className="table-pill">{row.status || 'Unknown'}</span>
                      </td>
                      <td>
                        {isPending ? (
                          <button
                            className="ghost dashboard-button compact-action-button"
                            onClick={() => void handleAlertManager(row, rowKey)}
                            disabled={alertLoadingKey === rowKey}
                            type="button"
                          >
                            {alertLoadingKey === rowKey ? 'Alerting...' : 'Alert Manager'}
                          </button>
                        ) : (
                          <span className="table-meta">Resolved</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No leave requests match the current filters.</div>
        )}
      </div>

      {importModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leave-import-title">
          <form className="modal-card leave-import-modal" onSubmit={handleImportSubmit}>
            <div className="modal-header">
              <div>
                <strong id="leave-import-title">Import Leaves</strong>
                <span className="leave-import-subtitle">Upload CSV leave requests with the required fields below.</span>
              </div>
              <button
                className="ghost"
                onClick={() => setImportModalOpen(false)}
                disabled={leaveImportLoading}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="modal-body">
              <div className="leave-import-guide">
                <span>Required CSV columns</span>
                <div className="leave-import-required-grid">
                  {REQUIRED_IMPORT_FIELDS.map((field) => (
                    <code key={field}>{field}</code>
                  ))}
                </div>
                <small>
                  Date formats: <code>YYYY-MM-DD</code>, <code>DD-MM-YYYY</code>, <code>DD/MM/YYYY</code>, or{' '}
                  <code>YYYY/MM/DD</code>. Leave types: <code>casual</code>, <code>sick</code>,{' '}
                  <code>annual</code>, <code>monthly</code>.
                </small>
                <small>
                  Optional columns: <code>duration</code>, <code>status</code>, <code>leave_count</code>,{' '}
                  <code>applied_at</code>, <code>notes</code>.
                </small>
                <button className="ghost leave-template-button" onClick={downloadLeavesTemplate} type="button">
                  Download CSV Template
                </button>
              </div>

              <label className="form-group">
                <span>CSV file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  disabled={leaveImportLoading}
                />
              </label>

              {importFile ? (
                <div className="leave-import-file">
                  <span>Selected file</span>
                  <strong>{importFile.name}</strong>
                </div>
              ) : null}

              <div className="leave-import-options">
                <label className="form-group">
                  <span>Default status</span>
                  <select
                    value={importDefaultStatus}
                    onChange={(event) => setImportDefaultStatus(event.target.value)}
                    disabled={leaveImportLoading}
                  >
                    {LEAVE_STATUS_IMPORT_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="leave-import-check">
                  <input
                    type="checkbox"
                    checked={importSkipDuplicates}
                    onChange={(event) => setImportSkipDuplicates(event.target.checked)}
                    disabled={leaveImportLoading}
                  />
                  <span>Skip duplicates</span>
                </label>
                <label className="leave-import-check">
                  <input
                    type="checkbox"
                    checked={importStrictMode}
                    onChange={(event) => setImportStrictMode(event.target.checked)}
                    disabled={leaveImportLoading}
                  />
                  <span>Strict mode</span>
                </label>
              </div>

              {leaveImportSummary ? (
                <div className="leave-import-summary" role="status">
                  <span>
                    Total
                    <strong>{leaveImportSummary.total}</strong>
                  </span>
                  <span>
                    Inserted
                    <strong>{leaveImportSummary.inserted}</strong>
                  </span>
                  <span>
                    Skipped
                    <strong>{leaveImportSummary.skipped}</strong>
                  </span>
                  <span>
                    Failed
                    <strong>{leaveImportSummary.failed}</strong>
                  </span>
                </div>
              ) : null}

              {leaveImportSummary?.failures?.length ? (
                <div className="leave-import-errors">
                  {leaveImportSummary.failures.map((failure: string) => (
                    <span key={failure}>{failure}</span>
                  ))}
                </div>
              ) : null}

              {leaveImportStatus ? (
                <p className={`form-note${leaveImportSummary?.failed ? ' error' : ''}`}>
                  {leaveImportStatus}
                </p>
              ) : null}
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => setImportModalOpen(false)}
                disabled={leaveImportLoading}
                type="button"
              >
                Cancel
              </button>
              <button className="cta" disabled={!importFile || leaveImportLoading} type="submit">
                {leaveImportLoading ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
