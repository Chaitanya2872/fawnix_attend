/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = any

export default function AdminEmployeesPage(props: Props) {
  const {
    canWriteAdminData,
    downloadEmployeesReport,
    employeeExportFormat,
    employeeExportStatus,
    employeeSearch,
    employeeStatusFilter,
    employeeStatusMenuOpen,
    employeeStatusMenuRef,
    employees,
    filteredEmployees,
    formatEmployeeGrade,
    handleEditEmployee,
    loadDashboard,
    openAddEmployeePanel,
    requestDeleteEmployee,
    setEmployeeExportFormat,
    setEmployeeSearch,
    setEmployeeStatusFilter,
    setEmployeeStatusMenuOpen
  } = props

  return (
    <>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Employees List</h2>
        </div>
        <div className="employee-actions">
          {canWriteAdminData ? (
            <button className="ghost dashboard-button" onClick={openAddEmployeePanel} type="button">
              Add Employee
            </button>
          ) : null}
          <select
            className="employee-export-format"
            aria-label="Export format"
            value={employeeExportFormat}
            onChange={(event) => setEmployeeExportFormat(event.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="xlsx">XLSX</option>
          </select>
          <button className="cta dashboard-button" onClick={downloadEmployeesReport} type="button">
            Export
          </button>
          <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
            Refresh
          </button>
        </div>
        {employeeExportStatus ? <span className="report-status employee-export-status">{employeeExportStatus}</span> : null}
      </div>
      <div className="employee-search-card">
        <div className="employee-search-copy">
          <label htmlFor="employee-search">Search Employees</label>
          <span>
            {filteredEmployees.length} result{filteredEmployees.length === 1 ? '' : 's'} from {employees.length} employees
          </span>
        </div>
        <div className="employee-search-shell">
          <span className="employee-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z" />
            </svg>
          </span>
          <input
            id="employee-search"
            type="text"
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search by name, code, email, designation, department, or manager"
          />
          {employeeSearch ? (
            <button className="employee-search-clear" type="button" onClick={() => setEmployeeSearch('')}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="employee-toolbar-meta">
          <span className="employee-filter-chip">
            Status: {employeeStatusFilter === 'all' ? 'All' : employeeStatusFilter === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="metric-row">
        <div className="metric-card">
          <span>Total Employees</span>
          <strong>{employees.length}</strong>
        </div>
        <div className="metric-card">
          <span>HR / Admin</span>
          <strong>
            {filteredEmployees.filter((employee: any) =>
              ['hr', 'cmd', 'admin'].includes((employee.emp_designation || '').toLowerCase())
            ).length}
          </strong>
        </div>
      </div>
      <div className="table-card">
        {filteredEmployees.length ? (
          <div className="table-scroll">
            <table className="dashboard-table employee-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Grade</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Manager</th>
                  <th className="employee-status-head">
                    <div className="employee-status-filter" ref={employeeStatusMenuRef}>
                      <span>Status</span>
                      <button
                        className={`employee-status-filter-trigger ${employeeStatusMenuOpen ? 'open' : ''}`}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={employeeStatusMenuOpen}
                        onClick={() => setEmployeeStatusMenuOpen((current: boolean) => !current)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 6h16M7 12h10m-7 6h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {employeeStatusMenuOpen ? (
                        <div className="employee-status-menu" role="menu">
                          {[
                            { id: 'all', label: 'All employees' },
                            { id: 'active', label: 'Active only' },
                            { id: 'inactive', label: 'Inactive only' }
                          ].map((option) => (
                            <button
                              key={option.id}
                              className={`employee-status-menu-item ${employeeStatusFilter === option.id ? 'active' : ''}`}
                              type="button"
                              onClick={() => {
                                setEmployeeStatusFilter(option.id)
                                setEmployeeStatusMenuOpen(false)
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee: any) => (
                  <tr key={employee.emp_code} className="employee-row">
                    <td>
                      <strong>{employee.emp_full_name || employee.emp_code}</strong>
                      <span className="table-meta">{employee.emp_code}</span>
                    </td>
                    <td>{employee.emp_designation || employee.role || '--'}</td>
                    <td>{formatEmployeeGrade(employee.emp_grade)}</td>
                    <td>{employee.emp_department || '--'}</td>
                    <td>
                      <strong className="employee-email">{employee.emp_email || '--'}</strong>
                      <span className="table-meta">{employee.emp_contact || 'Contact unavailable'}</span>
                    </td>
                    <td>
                      <strong>{employee.manager_name || employee.emp_manager || '--'}</strong>
                      <span className="table-meta">{employee.manager_email || employee.manager_code || 'Manager'}</span>
                    </td>
                    <td>
                      <span className={`table-pill ${employee.is_active ? 'active' : 'inactive'}`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {canWriteAdminData ? (
                        <div className="table-actions">
                          <button className="action-btn icon-btn edit-btn" onClick={() => handleEditEmployee(employee)} title="Edit employee" type="button">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 20h4l10.5-10.5a2.12 2.12 0 1 0-3-3L5 17v3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button className="action-btn icon-btn delete-btn" onClick={() => requestDeleteEmployee(employee)} title="Delete employee" type="button">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="table-meta">Read only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No employees match this search.</div>
        )}
      </div>
    </>
  )
}
