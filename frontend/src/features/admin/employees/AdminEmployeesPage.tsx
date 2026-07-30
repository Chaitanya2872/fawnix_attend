/* eslint-disable @typescript-eslint/no-explicit-any */
import './AdminEmployeesPage.css'
import { useRef } from 'react'

type Props = any

const AVATAR_ROLES = ['accent', 'success', 'pro', 'warning', 'danger'] as const

function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarRole(name: string): string {
  const code = (name || '').charCodeAt(0) || 0
  return AVATAR_ROLES[code % AVATAR_ROLES.length]
}

export default function AdminEmployeesPage(props: Props) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const {
    canWriteAdminData,
    downloadEmployeesReport,
    employeeExportFormat,
    employeeExportStatus,
    employeeSearch,
    employeeStatusFilter,
    employeeKpiFilter,
    employees,
    filteredEmployees,
    formatEmployeeGrade,
    handleEditEmployee,
    loadDashboard,
    openAddEmployeePanel,
    requestDeleteEmployee,
    setEmployeeExportFormat,
    setEmployeeSearch,
    applyEmployeeKpiFilter,
    openEmployeeView,
    employeeImportStatus,
    employeeImportLoading,
    importEmployees,
    downloadEmployeesTemplate,
  } = props

  const activeCount = (employees as any[]).filter((e) => e.is_active).length
  const inactiveCount = employees.length - activeCount
  const hrCount = (employees as any[]).filter((e) =>
    ['hr', 'cmd', 'admin'].some((k) =>
      (e.emp_designation || '').toLowerCase().includes(k)
    )
  ).length
  const birthdays = (employees as any[]).map((employee) => {
    const raw = employee.emp_date_of_birth || employee.date_of_birth || employee.birth_date || employee.birthday
    const date = raw ? new Date(raw) : null
    return date && !Number.isNaN(date.getTime()) ? { employee, date } : null
  }).filter(Boolean).filter((item: any) => item.date.getMonth() === new Date().getMonth()) as { employee: any; date: Date }[]

  return (
    <div className="adm-page admin-aligned-page admin-aligned-page--employees">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="adm-header dashboard-section-head">
        <div className="adm-header__title">
          <p className="adm-eyebrow eyebrow">Directory</p>
          <h2 className="adm-heading">Employees</h2>
        </div>

        <div className="adm-header__actions">
          {canWriteAdminData && (
            <><button className="adm-btn adm-btn--ghost" onClick={() => importInputRef.current?.click()} type="button" disabled={employeeImportLoading}>Import employees</button>
            <button className="adm-btn adm-btn--ghost" onClick={downloadEmployeesTemplate} type="button">Download template</button>
            <input ref={importInputRef} className="adm-visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importEmployees(file); event.currentTarget.value = '' }} />
            <button className="adm-btn adm-btn--ghost" onClick={openAddEmployeePanel} type="button">
              <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Add employee
            </button></>
          )}

          <div className="adm-split-btn">
            <select
              className="adm-split-btn__select"
              aria-label="Export format"
              value={employeeExportFormat}
              onChange={(e) => setEmployeeExportFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
            </select>
            <button
              className="adm-split-btn__action"
              onClick={downloadEmployeesReport}
              type="button"
            >
              Export
            </button>
          </div>

          <button
            className="adm-btn adm-btn--icon"
            onClick={() => void loadDashboard()}
            type="button"
            aria-label="Refresh"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
              <path
                d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4M4 8v4h4M16 12h4v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Metrics ───────────────────────────────────────── */}
      <div className="adm-metrics kpi-cards">
        <button className={`adm-metric-card${employeeKpiFilter === 'all' ? ' adm-metric-card--selected' : ''}`} onClick={() => applyEmployeeKpiFilter('all')} type="button">
          <p className="adm-metric-card__label">Total employees</p>
          <p className="adm-metric-card__value">{employees.length}</p>
        </button>
        <button className={`adm-metric-card${employeeKpiFilter === 'active' ? ' adm-metric-card--selected' : ''}`} onClick={() => applyEmployeeKpiFilter('active')} type="button">
          <p className="adm-metric-card__label">Active</p>
          <p className="adm-metric-card__value adm-metric-card__value--success">
            {activeCount}
          </p>
        </button>
        <button className={`adm-metric-card${employeeKpiFilter === 'inactive' ? ' adm-metric-card--selected' : ''}`} onClick={() => applyEmployeeKpiFilter('inactive')} type="button">
          <p className="adm-metric-card__label">Inactive</p>
          <p className="adm-metric-card__value adm-metric-card__value--muted">
            {inactiveCount}
          </p>
        </button>
        <button className={`adm-metric-card${employeeKpiFilter === 'hr_admin' ? ' adm-metric-card--selected' : ''}`} onClick={() => applyEmployeeKpiFilter('hr_admin')} type="button">
          <p className="adm-metric-card__label">HR / Admin</p>
          <p className="adm-metric-card__value">{hrCount}</p>
        </button>
        {birthdays.length > 0 ? (
          <button
            type="button"
            className={`adm-birthday-card${employeeKpiFilter === 'birthdays' ? ' adm-birthday-card--selected' : ''}`}
            onClick={() => applyEmployeeKpiFilter('birthdays')}
            aria-pressed={employeeKpiFilter === 'birthdays'}
          >
            <span>Birthdays this month</span>
            <strong>{birthdays.length}</strong>
            <small>{birthdays.slice(0, 2).map(({ employee }) => employee.emp_full_name || employee.emp_code).join(' · ')}</small>
          </button>
        ) : null}
      </div>

      {/* ── Search & filter ───────────────────────────────── */}
      <div className="adm-search-card admin-filter-card">
        <div className="adm-search-card__top">
          <span className="adm-result-count">
            {filteredEmployees.length} result
            {filteredEmployees.length === 1 ? '' : 's'} of {employees.length}
          </span>
          <div className="adm-filter-chips">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`adm-chip${employeeStatusFilter === opt.id ? ' adm-chip--on' : ''}`}
                onClick={() => applyEmployeeKpiFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-search-wrap">
          <svg
            className="adm-search-wrap__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z" />
          </svg>
          <input
            id="employee-search"
            type="text"
            className="adm-search-wrap__input"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search by name, code, email, designation, department, or manager"
          />
          {employeeSearch && (
            <button
              className="adm-search-wrap__clear"
              type="button"
              onClick={() => setEmployeeSearch('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Export status ─────────────────────────────────── */}
      {employeeExportStatus && (
        <p className="adm-export-status">{employeeExportStatus}</p>
      )}
      {employeeImportStatus && <p className="adm-import-status" role="status">{employeeImportStatus}</p>}

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="adm-table-card table-card">
        {filteredEmployees.length > 0 ? (
          <div className="adm-table-scroll table-scroll">
            <table className="adm-table dashboard-table">
              <colgroup>
                <col style={{ width: '210px' }} />
                <col style={{ width: '165px' }} />
                <col style={{ width: '135px' }} />
                <col style={{ width: '185px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: canWriteAdminData ? '90px' : '80px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role / grade</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(filteredEmployees as any[]).map((employee) => {
                  const displayName =
                    employee.emp_full_name || employee.emp_code || ''
                  const role = getAvatarRole(displayName)
                  const initials = getInitials(displayName)

                  return (
                    <tr key={employee.emp_code} className="adm-row">

                      {/* Name */}
                      <td>
                        <div className="adm-employee-cell">
                          <div className={`adm-avatar adm-avatar--${role}`}>
                            {initials}
                          </div>
                          <div className="adm-employee-cell__info">
                            <span className="adm-employee-cell__name">
                              {displayName}
                            </span>
                            <span className="adm-code">
                              {employee.emp_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role / grade */}
                      <td>
                        <span className="adm-cell-primary">
                          {employee.emp_designation || employee.role || '—'}
                        </span>
                        <span className="adm-cell-meta">
                          Grade {formatEmployeeGrade(employee.emp_grade)}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="adm-cell-secondary">
                        {employee.emp_department || '—'}
                      </td>

                      {/* Contact */}
                      <td>
                        <span className="adm-cell-email">
                          {employee.emp_email || '—'}
                        </span>
                        <span className="adm-code">
                          {employee.emp_contact || 'Contact unavailable'}
                        </span>
                      </td>

                      {/* Manager */}
                      <td>
                        <span className="adm-cell-primary">
                          {employee.manager_name || employee.emp_manager || '—'}
                        </span>
                        <span className="adm-code">
                          {employee.manager_email ||
                            employee.manager_code ||
                            ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`adm-pill table-pill${employee.is_active ? ' active adm-pill--active' : ' inactive adm-pill--inactive'}`}
                        >
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        {canWriteAdminData ? (
                          <div className="adm-actions">
                            <button className="adm-action-btn adm-action-btn--view" onClick={() => openEmployeeView(employee)} title="View employee" type="button" aria-label={`View ${displayName}`}>View</button>
                            <button
                              className="adm-action-btn"
                              onClick={() => handleEditEmployee(employee)}
                              title="Edit employee"
                              type="button"
                              aria-label={`Edit ${displayName}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="adm-icon"
                              >
                                <path
                                  d="M4 20h4l10.5-10.5a2.12 2.12 0 1 0-3-3L5 17v3Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              className="adm-action-btn adm-action-btn--delete"
                              onClick={() => requestDeleteEmployee(employee)}
                              title="Delete employee"
                              type="button"
                              aria-label={`Delete ${displayName}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="adm-icon"
                              >
                                <path
                                  d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button className="adm-action-btn adm-action-btn--view" onClick={() => openEmployeeView(employee)} type="button">View</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty empty-state">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No employees match this search
          </div>
        )}
      </div>
    </div>
  )
}
