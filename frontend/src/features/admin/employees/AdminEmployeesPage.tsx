/* eslint-disable @typescript-eslint/no-explicit-any */
import './AdminEmployeesPage.css'
import { useRef, useState, useEffect } from 'react'
import { ClientPagination } from '../components/ClientPagination'

type Props = any

const AVATAR_ROLES = ['accent', 'success', 'pro', 'warning', 'danger'] as const
const JOIN_DATE_KEYS = [
  'emp_joined_date',
  'emp_joining_date',
  'joining_date',
  'joined_date',
  'date_of_joining',
  'join_date',
  'hire_date',
  'created_at'
] as const

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

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

function getJoinDate(employee: any): Date | null {
  const rawDate = JOIN_DATE_KEYS.map((key) => employee?.[key]).find(Boolean)
  const date = rawDate ? new Date(rawDate) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function formatJoinDate(employee: any) {
  const date = getJoinDate(employee)
  return date ? DATE_FORMATTER.format(date) : '--'
}

function getEmployeeStatus(employee: any) {
  const rawStatus = (
    employee.emp_status ||
    employee.employee_status ||
    employee.status ||
    ''
  ).toString().toLowerCase()

  if (rawStatus.includes('leave')) {
    return { label: 'On Leave', tone: 'leave' }
  }

  if (employee.is_active) {
    return { label: 'Active', tone: 'active' }
  }

  return { label: 'Inactive', tone: 'inactive' }
}

function formatTenure(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function getSelectionKey(employee: any) {
  return String(employee.emp_code || employee.emp_email || employee.emp_full_name || '')
}

// Dropdown Menu Component
function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="adm-dropdown-btn" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'inline-flex' }}>
        {trigger}
      </div>
      <div className={`adm-dropdown-menu${isOpen ? ' adm-dropdown-menu--open' : ''}`}>
        {children}
      </div>
    </div>
  )
}

export default function AdminEmployeesPage(props: Props) {
  const [selectedEmployeeKeys, setSelectedEmployeeKeys] = useState<Set<string>>(() => new Set())
  const [currentPage, setCurrentPage] = useState(1)
  
  const {
    canWriteAdminData,
    downloadEmployeesReport,
    employeeExportStatus,
    employeeSearch,
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
    openEmployeeImport,
    downloadEmployeesTemplate,
  } = props

  const employeeRows = employees as any[]
  const filteredRows = filteredEmployees as any[]
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visiblePage = Math.min(currentPage, totalPages)
  const pageRows = filteredRows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  const now = new Date()
  const activeCount = employeeRows.filter((employee) => employee.is_active).length
  const inactiveCount = employeeRows.length - activeCount
  const uniqueDepartmentNames = Array.from(
    new Set(
      employeeRows
        .map((employee) => (employee.emp_department || '').trim())
        .filter(Boolean)
    )
  )
  const joinDates = employeeRows.map(getJoinDate).filter(Boolean) as Date[]
  const newHiresThisMonth = joinDates.filter(
    (date) =>
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
  ).length
  const averageTenure =
    joinDates.length > 0
      ? joinDates.reduce((total, date) => {
          const tenureYears = Math.max(
            0,
            (now.getTime() - date.getTime()) / (365.2425 * 24 * 60 * 60 * 1000)
          )
          return total + tenureYears
        }, 0) / joinDates.length
      : 0
  const birthdays = employeeRows
    .map((employee) => {
      const raw =
        employee.emp_date_of_birth ||
        employee.date_of_birth ||
        employee.birth_date ||
        employee.birthday
      const date = raw ? new Date(raw) : null
      return date && !Number.isNaN(date.getTime()) ? { employee, date } : null
    })
    .filter(Boolean)
    .filter((item: any) => item.date.getMonth() === now.getMonth()) as {
    employee: any
    date: Date
  }[]

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'hr_admin', label: 'HR Admin' },
  ]

  if (birthdays.length > 0) {
    filterOptions.push({ id: 'birthdays', label: '🎂 Birthdays' })
  }

  const visibleEmployeeKeys = pageRows.map(getSelectionKey).filter(Boolean)
  const selectedVisibleCount = visibleEmployeeKeys.filter((key) => selectedEmployeeKeys.has(key)).length
  const allVisibleSelected = visibleEmployeeKeys.length > 0 && selectedVisibleCount === visibleEmployeeKeys.length
  const toggleAllVisibleEmployees = () => {
    setSelectedEmployeeKeys((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleEmployeeKeys.forEach((key) => next.delete(key))
      } else {
        visibleEmployeeKeys.forEach((key) => next.add(key))
      }
      return next
    })
  }
  const toggleEmployeeSelection = (employee: any) => {
    const key = getSelectionKey(employee)
    if (!key) return
    setSelectedEmployeeKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="adm-page admin-aligned-page admin-aligned-page--employees">
      <div className="adm-header dashboard-section-head">
        <div className="adm-header__title">
          <h1 className="adm-heading">Employee List</h1>
        </div>

        <div className="adm-header__actions">
          {canWriteAdminData && (
            <>
              <DropdownMenu
                trigger={
                  <button className="adm-btn adm-btn--ghost" type="button">
                    <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 17v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3M12 4v11m0-11 4 4m-4-4-4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Import / Export
                    <svg className="adm-icon" viewBox="0 0 24 24" style={{ width: '12px', height: '12px' }}>
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                }
              >
                <button onClick={() => openEmployeeImport()}>
                  <svg className="adm-icon" viewBox="0 0 24 24">
                    <path d="M12 3v11m0-11 4 4m-4-4-4 4M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Import Employees
                </button>
                <button onClick={downloadEmployeesTemplate}>
                  <svg className="adm-icon" viewBox="0 0 24 24">
                    <path d="M4 17v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3M12 4v11m0-11 4 4m-4-4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download Template
                </button>
                <div className="adm-dropdown-divider" />
                <div style={{ padding: '4px 14px', fontSize: '11px', color: 'var(--adm-text-soft)' }}>
                  Export as:
                </div>
                <button onClick={() => { setEmployeeExportFormat('csv'); downloadEmployeesReport(); }}>
                  CSV
                </button>
                <button onClick={() => { setEmployeeExportFormat('pdf'); downloadEmployeesReport(); }}>
                  PDF
                </button>
                <button onClick={() => { setEmployeeExportFormat('xlsx'); downloadEmployeesReport(); }}>
                  XLSX
                </button>
              </DropdownMenu>
            </>
          )}

          {canWriteAdminData && (
            <button className="adm-btn adm-btn--primary" onClick={openAddEmployeePanel} type="button">
              <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Add Employee
            </button>
          )}

          <button
            className="adm-btn adm-btn--icon"
            onClick={() => void loadDashboard()}
            type="button"
            aria-label="Refresh"
            title="Refresh"
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

      {/* KPI Cards */}
      <section className="adm-stats-strip" aria-label="Employee summary">
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 19v-7M10 19V5M16 19v-9M22 19H2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Total Employees</p>
            <strong className="adm-stat-value">{employeeRows.length}</strong>
            <span className="adm-stat-caption">{activeCount} active · {inactiveCount} inactive</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">New Hires</p>
            <strong className="adm-stat-value">{newHiresThisMonth}</strong>
            <span className="adm-stat-caption">this month</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Avg. Tenure</p>
            <strong className="adm-stat-value">{formatTenure(averageTenure)}</strong>
            <span className="adm-stat-caption">years</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20V8l8-4 8 4v12M9 20v-7h6v7M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Departments</p>
            <strong className="adm-stat-value">{uniqueDepartmentNames.length}</strong>
            <span className="adm-stat-caption">
              {uniqueDepartmentNames.slice(0, 2).join(', ') || '—'}
            </span>
          </div>
        </div>
      </section>

      {(employeeExportStatus || employeeImportStatus) && (
        <div className="adm-status-line" role="status">
          {employeeExportStatus || employeeImportStatus}
        </div>
      )}

      <div className="adm-table-card table-card">
        <div className="adm-table-toolbar">
          <div className="adm-table-title">
            <strong>{filteredRows.length} {filteredRows.length === 1 ? 'employee' : 'employees'}</strong>
            {filteredRows.length !== employeeRows.length && (
              <span>of {employeeRows.length}</span>
            )}
          </div>

          <div className="adm-table-controls">
            <div className="adm-search-wrap">
              <svg className="adm-search-wrap__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z" />
              </svg>
              <input
                id="employee-search"
                type="text"
                className="adm-search-wrap__input"
                value={employeeSearch}
                onChange={(e) => {
                  setCurrentPage(1)
                  setEmployeeSearch(e.target.value)
                }}
                placeholder="Search employees..."
              />
              {employeeSearch && (
                <button
                  className="adm-search-wrap__clear"
                  type="button"
                  onClick={() => {
                    setCurrentPage(1)
                    setEmployeeSearch('')
                  }}
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="adm-filter-chips" aria-label="Employee filters">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`adm-chip${employeeKpiFilter === opt.id ? ' adm-chip--on' : ''}`}
                  onClick={() => {
                    setCurrentPage(1)
                    applyEmployeeKpiFilter(opt.id)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedEmployeeKeys.size > 0 && (
          <div className="adm-selection-bar" role="status">
            <span>
              {selectedEmployeeKeys.size} employee{selectedEmployeeKeys.size === 1 ? '' : 's'} selected
            </span>
            <button type="button" onClick={() => setSelectedEmployeeKeys(new Set<string>())}>
              Clear selection
            </button>
          </div>
        )}

        {filteredRows.length > 0 ? (
          <div className="adm-table-scroll table-scroll">
            <table className="adm-table dashboard-table">
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '250px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '210px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: canWriteAdminData ? '120px' : '64px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="adm-select-cell">
                    <input
                      type="checkbox"
                      aria-label="Select all visible employees"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisibleEmployees}
                    />
                  </th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((employee) => {
                  const displayName =
                    employee.emp_full_name || employee.emp_code || ''
                  const selectionKey = getSelectionKey(employee)
                  const role = getAvatarRole(displayName)
                  const initials = getInitials(displayName)
                  const status = getEmployeeStatus(employee)

                  return (
                    <tr key={employee.emp_code} className="adm-row">
                      <td className="adm-select-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${displayName || 'employee'}`}
                          checked={selectionKey ? selectedEmployeeKeys.has(selectionKey) : false}
                          onChange={() => toggleEmployeeSelection(employee)}
                        />
                      </td>
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
                              {employee.emp_email || employee.emp_code || 'No email'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="adm-cell-primary">
                          {employee.emp_department || '—'}
                        </span>
                        <span className="adm-cell-meta">
                          {employee.manager_name || employee.emp_manager || 'No manager'}
                        </span>
                      </td>
                      <td>
                        <span className="adm-cell-primary">
                          {employee.emp_designation || employee.role || '—'}
                        </span>
                        <span className="adm-cell-meta">
                          Grade {formatEmployeeGrade(employee.emp_grade)}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-pill table-pill adm-pill--${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span className="adm-cell-secondary">
                          {formatJoinDate(employee)}
                        </span>
                      </td>
                      <td>
                        {canWriteAdminData ? (
                          <div className="adm-actions">
                            <button
                              className="adm-action-btn adm-action-btn--view"
                              onClick={() => openEmployeeView(employee)}
                              title="View employee"
                              type="button"
                              aria-label={`View ${displayName}`}
                            >
                              View
                            </button>
                            <button
                              className="adm-action-btn"
                              onClick={() => handleEditEmployee(employee)}
                              title="Edit employee"
                              type="button"
                              aria-label={`Edit ${displayName}`}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                                <path d="M4 20h4l10.5-10.5a2.12 2.12 0 1 0-3-3L5 17v3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              className="adm-action-btn adm-action-btn--delete"
                              onClick={() => requestDeleteEmployee(employee)}
                              title="Delete employee"
                              type="button"
                              aria-label={`Delete ${displayName}`}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                                <path d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            className="adm-action-btn adm-action-btn--view"
                            onClick={() => openEmployeeView(employee)}
                            type="button"
                          >
                            View
                          </button>
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>No employees found</strong>
            <span>Try adjusting your search or filter.</span>
          </div>
        )}
        <ClientPagination page={visiblePage} pageSize={pageSize} total={filteredRows.length} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}
