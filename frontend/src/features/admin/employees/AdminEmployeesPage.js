"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminEmployeesPage;
/* eslint-disable @typescript-eslint/no-explicit-any */
require("./AdminEmployeesPage.css");
var react_1 = require("react");
var ClientPagination_1 = require("../components/ClientPagination");
var AVATAR_ROLES = ['accent', 'success', 'pro', 'warning', 'danger'];
var JOIN_DATE_KEYS = [
    'emp_joined_date',
    'emp_joining_date',
    'joining_date',
    'joined_date',
    'date_of_joining',
    'join_date',
    'hire_date',
    'created_at'
];
var DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});
function getInitials(name) {
    if (!name)
        return '?';
    return name
        .split(' ')
        .map(function (w) { return w[0]; })
        .join('')
        .slice(0, 2)
        .toUpperCase();
}
function getAvatarRole(name) {
    var code = (name || '').charCodeAt(0) || 0;
    return AVATAR_ROLES[code % AVATAR_ROLES.length];
}
function getJoinDate(employee) {
    var rawDate = JOIN_DATE_KEYS.map(function (key) { return employee === null || employee === void 0 ? void 0 : employee[key]; }).find(Boolean);
    var date = rawDate ? new Date(rawDate) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
}
function formatJoinDate(employee) {
    var date = getJoinDate(employee);
    return date ? DATE_FORMATTER.format(date) : '--';
}
function getEmployeeStatus(employee) {
    var rawStatus = (employee.emp_status ||
        employee.employee_status ||
        employee.status ||
        '').toString().toLowerCase();
    if (rawStatus.includes('leave')) {
        return { label: 'On Leave', tone: 'leave' };
    }
    if (employee.is_active) {
        return { label: 'Active', tone: 'active' };
    }
    return { label: 'Inactive', tone: 'inactive' };
}
function formatTenure(value) {
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}
function getSelectionKey(employee) {
    return String(employee.emp_code || employee.emp_email || employee.emp_full_name || '');
}
// Dropdown Menu Component
function DropdownMenu(_a) {
    var trigger = _a.trigger, children = _a.children;
    var _b = (0, react_1.useState)(false), isOpen = _b[0], setIsOpen = _b[1];
    var menuRef = (0, react_1.useRef)(null);
    var menuId = (0, react_1.useId)();
    (0, react_1.useEffect)(function () {
        if (!isOpen)
            return;
        var handleClickOutside = function (event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        var handleKeyDown = function (event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return function () {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);
    return (<div className="adm-dropdown-btn" ref={menuRef}>
      {trigger({ isOpen: isOpen, menuId: menuId, onToggle: function () { return setIsOpen(function (current) { return !current; }); } })}
      <div id={menuId} className={"adm-dropdown-menu".concat(isOpen ? ' adm-dropdown-menu--open' : '')} role="menu" aria-label="Employee import and export" onClick={function (event) {
            if (event.target.closest('button')) {
                setIsOpen(false);
            }
        }}>
        {children}
      </div>
    </div>);
}
function AdminEmployeesPage(props) {
    var _a = (0, react_1.useState)(function () { return new Set(); }), selectedEmployeeKeys = _a[0], setSelectedEmployeeKeys = _a[1];
    var _b = (0, react_1.useState)(1), currentPage = _b[0], setCurrentPage = _b[1];
    var canWriteAdminData = props.canWriteAdminData, downloadEmployeesReport = props.downloadEmployeesReport, employeeExportStatus = props.employeeExportStatus, employeeSearch = props.employeeSearch, employeeKpiFilter = props.employeeKpiFilter, employees = props.employees, filteredEmployees = props.filteredEmployees, formatEmployeeGrade = props.formatEmployeeGrade, handleEditEmployee = props.handleEditEmployee, loadDashboard = props.loadDashboard, openAddEmployeePanel = props.openAddEmployeePanel, requestDeleteEmployee = props.requestDeleteEmployee, setEmployeeExportFormat = props.setEmployeeExportFormat, setEmployeeSearch = props.setEmployeeSearch, applyEmployeeKpiFilter = props.applyEmployeeKpiFilter, openEmployeeView = props.openEmployeeView, employeeImportStatus = props.employeeImportStatus, openEmployeeImport = props.openEmployeeImport, downloadEmployeesTemplate = props.downloadEmployeesTemplate;
    var employeeRows = employees;
    var filteredRows = filteredEmployees;
    var pageSize = 10;
    var totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    var visiblePage = Math.min(currentPage, totalPages);
    var pageRows = filteredRows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
    var now = new Date();
    var activeCount = employeeRows.filter(function (employee) { return employee.is_active; }).length;
    var inactiveCount = employeeRows.length - activeCount;
    var uniqueDepartmentNames = Array.from(new Set(employeeRows
        .map(function (employee) { return (employee.emp_department || '').trim(); })
        .filter(Boolean)));
    var joinDates = employeeRows.map(getJoinDate).filter(Boolean);
    var newHiresThisMonth = joinDates.filter(function (date) {
        return date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth();
    }).length;
    var averageTenure = joinDates.length > 0
        ? joinDates.reduce(function (total, date) {
            var tenureYears = Math.max(0, (now.getTime() - date.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
            return total + tenureYears;
        }, 0) / joinDates.length
        : 0;
    var birthdays = employeeRows
        .map(function (employee) {
        var raw = employee.emp_date_of_birth ||
            employee.date_of_birth ||
            employee.birth_date ||
            employee.birthday;
        var date = raw ? new Date(raw) : null;
        return date && !Number.isNaN(date.getTime()) ? { employee: employee, date: date } : null;
    })
        .filter(Boolean)
        .filter(function (item) { return item.date.getMonth() === now.getMonth(); });
    var filterOptions = [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
        { id: 'inactive', label: 'Inactive' },
        { id: 'hr_admin', label: 'HR Admin' },
    ];
    if (birthdays.length > 0) {
        filterOptions.push({ id: 'birthdays', label: '🎂 Birthdays' });
    }
    var visibleEmployeeKeys = pageRows.map(getSelectionKey).filter(Boolean);
    var selectedVisibleCount = visibleEmployeeKeys.filter(function (key) { return selectedEmployeeKeys.has(key); }).length;
    var allVisibleSelected = visibleEmployeeKeys.length > 0 && selectedVisibleCount === visibleEmployeeKeys.length;
    var toggleAllVisibleEmployees = function () {
        setSelectedEmployeeKeys(function (current) {
            var next = new Set(current);
            if (allVisibleSelected) {
                visibleEmployeeKeys.forEach(function (key) { return next.delete(key); });
            }
            else {
                visibleEmployeeKeys.forEach(function (key) { return next.add(key); });
            }
            return next;
        });
    };
    var toggleEmployeeSelection = function (employee) {
        var key = getSelectionKey(employee);
        if (!key)
            return;
        setSelectedEmployeeKeys(function (current) {
            var next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            }
            else {
                next.add(key);
            }
            return next;
        });
    };
    return (<div className="adm-page admin-aligned-page admin-aligned-page--employees">
      <div className="adm-header dashboard-section-head">
        <div className="adm-header__title">
          <h1 className="adm-heading">Employee List</h1>
        </div>

        <div className="adm-header__actions">
          {canWriteAdminData && (<>
              <DropdownMenu trigger={function (_a) {
                var isOpen = _a.isOpen, menuId = _a.menuId, onToggle = _a.onToggle;
                return (<button className={"adm-btn adm-btn--ghost adm-dropdown-trigger".concat(isOpen ? ' is-open' : '')} type="button" onClick={onToggle} aria-haspopup="menu" aria-expanded={isOpen} aria-controls={menuId}>
                    <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 17v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3M12 4v11m0-11 4 4m-4-4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Import / Export
                    <svg className="adm-dropdown-caret" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>);
            }}>
                <div className="adm-dropdown-section">
                  <span className="adm-dropdown-section-label">Import</span>
                  <button type="button" role="menuitem" onClick={function () { return openEmployeeImport(); }}>
                    <span className="adm-dropdown-item-icon" aria-hidden="true">
                      <svg className="adm-icon" viewBox="0 0 24 24">
                        <path d="M12 3v11m0-11 4 4m-4-4-4 4M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span>Import Employees</span>
                  </button>
                  <button type="button" role="menuitem" onClick={downloadEmployeesTemplate}>
                    <span className="adm-dropdown-item-icon" aria-hidden="true">
                      <svg className="adm-icon" viewBox="0 0 24 24">
                        <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 17v1a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span>Download Template</span>
                  </button>
                </div>
                <div className="adm-dropdown-divider" role="separator"/>
                <div className="adm-dropdown-section">
                  <span className="adm-dropdown-section-label">Export format</span>
                  <div className="adm-dropdown-format-grid">
                    <button type="button" role="menuitem" onClick={function () { setEmployeeExportFormat('csv'); downloadEmployeesReport(); }}>
                      CSV
                    </button>
                    <button type="button" role="menuitem" onClick={function () { setEmployeeExportFormat('pdf'); downloadEmployeesReport(); }}>
                      PDF
                    </button>
                    <button type="button" role="menuitem" onClick={function () { setEmployeeExportFormat('xlsx'); downloadEmployeesReport(); }}>
                      XLSX
                    </button>
                  </div>
                </div>
              </DropdownMenu>
            </>)}

          {canWriteAdminData && (<button className="adm-btn adm-btn--primary" onClick={openAddEmployeePanel} type="button">
              <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Add Employee
            </button>)}

          <button className="adm-btn adm-btn--icon" onClick={function () { return void loadDashboard(); }} type="button" aria-label="Refresh" title="Refresh">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
              <path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4M4 8v4h4M16 12h4v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="adm-stats-strip" aria-label="Employee summary">
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 19v-7M10 19V5M16 19v-9M22 19H2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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
              <path d="M12 5v14M5 12h14M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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
              <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
              <path d="M4 20V8l8-4 8 4v12M9 20v-7h6v7M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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

      {(employeeExportStatus || employeeImportStatus) && (<div className="adm-status-line" role="status">
          {employeeExportStatus || employeeImportStatus}
        </div>)}

      <div className="adm-table-card table-card">
        <div className="adm-table-toolbar">
          <div className="adm-table-title">
            <strong>{filteredRows.length} {filteredRows.length === 1 ? 'employee' : 'employees'}</strong>
            {filteredRows.length !== employeeRows.length && (<span>of {employeeRows.length}</span>)}
          </div>

          <div className="adm-table-controls">
            <div className="adm-search-wrap">
              <svg className="adm-search-wrap__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z"/>
              </svg>
              <input id="employee-search" type="text" className="adm-search-wrap__input" value={employeeSearch} onChange={function (e) {
            setCurrentPage(1);
            setEmployeeSearch(e.target.value);
        }} placeholder="Search employees..."/>
              {employeeSearch && (<button className="adm-search-wrap__clear" type="button" onClick={function () {
                setCurrentPage(1);
                setEmployeeSearch('');
            }} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>)}
            </div>

            <div className="adm-filter-chips" aria-label="Employee filters">
              {filterOptions.map(function (opt) { return (<button key={opt.id} type="button" className={"adm-chip".concat(employeeKpiFilter === opt.id ? ' adm-chip--on' : '')} onClick={function () {
                setCurrentPage(1);
                applyEmployeeKpiFilter(opt.id);
            }}>
                  {opt.label}
                </button>); })}
            </div>
          </div>
        </div>

        {selectedEmployeeKeys.size > 0 && (<div className="adm-selection-bar" role="status">
            <span>
              {selectedEmployeeKeys.size} employee{selectedEmployeeKeys.size === 1 ? '' : 's'} selected
            </span>
            <button type="button" onClick={function () { return setSelectedEmployeeKeys(new Set()); }}>
              Clear selection
            </button>
          </div>)}

        {filteredRows.length > 0 ? (<div className="adm-table-scroll table-scroll">
            <table className="adm-table dashboard-table">
              <colgroup>
                <col style={{ width: '40px' }}/>
                <col style={{ width: '250px' }}/>
                <col style={{ width: '170px' }}/>
                <col style={{ width: '210px' }}/>
                <col style={{ width: '100px' }}/>
                <col style={{ width: '130px' }}/>
                <col style={{ width: canWriteAdminData ? '120px' : '64px' }}/>
              </colgroup>
              <thead>
                <tr>
                  <th className="adm-select-cell">
                    <input type="checkbox" aria-label="Select all visible employees" checked={allVisibleSelected} onChange={toggleAllVisibleEmployees}/>
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
                {pageRows.map(function (employee) {
                var displayName = employee.emp_full_name || employee.emp_code || '';
                var selectionKey = getSelectionKey(employee);
                var role = getAvatarRole(displayName);
                var initials = getInitials(displayName);
                var status = getEmployeeStatus(employee);
                return (<tr key={employee.emp_code} className="adm-row">
                      <td className="adm-select-cell">
                        <input type="checkbox" aria-label={"Select ".concat(displayName || 'employee')} checked={selectionKey ? selectedEmployeeKeys.has(selectionKey) : false} onChange={function () { return toggleEmployeeSelection(employee); }}/>
                      </td>
                      <td>
                        <div className="adm-employee-cell">
                          <div className={"adm-avatar adm-avatar--".concat(role)}>
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
                        <span className={"adm-pill table-pill adm-pill--".concat(status.tone)}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span className="adm-cell-secondary">
                          {formatJoinDate(employee)}
                        </span>
                      </td>
                      <td>
                        {canWriteAdminData ? (<div className="adm-actions">
                            <button className="adm-action-btn adm-action-btn--view" onClick={function () { return openEmployeeView(employee); }} title="View employee" type="button" aria-label={"View ".concat(displayName)}>
                              View
                            </button>
                            <button className="adm-action-btn" onClick={function () { return handleEditEmployee(employee); }} title="Edit employee" type="button" aria-label={"Edit ".concat(displayName)}>
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                                <path d="M4 20h4l10.5-10.5a2.12 2.12 0 1 0-3-3L5 17v3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button className="adm-action-btn adm-action-btn--delete" onClick={function () { return requestDeleteEmployee(employee); }} title="Delete employee" type="button" aria-label={"Delete ".concat(displayName)}>
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
                                <path d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>) : (<button className="adm-action-btn adm-action-btn--view" onClick={function () { return openEmployeeView(employee); }} type="button">
                            View
                          </button>)}
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>) : (<div className="adm-empty empty-state">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <strong>No employees found</strong>
            <span>Try adjusting your search or filter.</span>
          </div>)}
        <ClientPagination_1.ClientPagination page={visiblePage} pageSize={pageSize} total={filteredRows.length} onPageChange={setCurrentPage}/>
      </div>
    </div>);
}
