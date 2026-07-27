import type { EmployeeRow } from '../../../types/admin'

type NewEmployeeForm = {
  emp_code: string
  emp_full_name: string
  emp_email: string
  emp_contact: string
  emp_grade: string
  emp_designation: string
  emp_department: string
  emp_manager: string
  role: string
}

type EmployeeFormDrawerProps = {
  mode: 'add' | 'edit'
  newEmployee: NewEmployeeForm
  updateNewEmployee: (field: keyof NewEmployeeForm, value: string) => void
  resetNewEmployee: () => void
  createEmployeeLoading: boolean
  createEmployeeStatus: string
  onCreateEmployee: () => void
  editingEmployee: EmployeeRow | null
  editFormData: Partial<EmployeeRow>
  setEditFormData: (data: Partial<EmployeeRow>) => void
  editLoading: boolean
  editStatus: string
  onSaveEmployee: () => void
  onClose: () => void
}

export default function EmployeeFormDrawer({
  mode,
  newEmployee,
  updateNewEmployee,
  resetNewEmployee,
  createEmployeeLoading,
  createEmployeeStatus,
  onCreateEmployee,
  editingEmployee,
  editFormData,
  setEditFormData,
  editLoading,
  editStatus,
  onSaveEmployee,
  onClose
}: EmployeeFormDrawerProps) {
  return (
    <>
      <button className="side-panel-scrim" type="button" aria-label="Close employee panel" onClick={onClose} />
      <aside className="field-visit-panel employee-form-panel" aria-label={mode === 'add' ? 'Add employee' : 'Edit employee'}>
        <div className="field-visit-panel-head employee-panel-head">
          <div>
            <span>{mode === 'add' ? 'Directory' : 'Profile Editor'}</span>
            <h3>{mode === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
            <p className="employee-panel-copy">
              {mode === 'add'
                ? 'Create a new employee from the right-side panel without leaving the list.'
                : 'Update employee details in place and save them back to the admin API.'}
            </p>
          </div>
          <button className="field-visit-panel-close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="employee-panel-summary">
          <div className="field-visit-panel-card">
            <small>
              {mode === 'add'
                ? 'The current admin session is used to create the employee record.'
                : editingEmployee?.emp_email || 'Email unavailable'}
            </small>
          </div>
        </div>

        <div className="form-card employee-form-card">
          <div className="form-grid employee-form-grid">
            {mode === 'add' ? (
              <>
                <div>
                  <label htmlFor="new-emp-code">Employee ID</label>
                  <input
                    id="new-emp-code"
                    value={newEmployee.emp_code}
                    onChange={(event) => updateNewEmployee('emp_code', event.target.value)}
                    placeholder="e.g. 3051"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-name">Full Name</label>
                  <input
                    id="new-emp-name"
                    value={newEmployee.emp_full_name}
                    onChange={(event) => updateNewEmployee('emp_full_name', event.target.value)}
                    placeholder="Employee full name"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-email">Email</label>
                  <input
                    id="new-emp-email"
                    type="email"
                    value={newEmployee.emp_email}
                    onChange={(event) => updateNewEmployee('emp_email', event.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-contact">Contact</label>
                  <input
                    id="new-emp-contact"
                    value={newEmployee.emp_contact}
                    onChange={(event) => updateNewEmployee('emp_contact', event.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-designation">Designation</label>
                  <input
                    id="new-emp-designation"
                    value={newEmployee.emp_designation}
                    onChange={(event) => updateNewEmployee('emp_designation', event.target.value)}
                    placeholder="HR / Sales Executive / DevTester"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-grade">Grade</label>
                  <select
                    id="new-emp-grade"
                    value={newEmployee.emp_grade}
                    onChange={(event) => updateNewEmployee('emp_grade', event.target.value)}
                  >
                    <option value="">Select grade</option>
                    <option value="F">Flexible (F)</option>
                    <option value="M">Moderate (M)</option>
                    <option value="NF">Non-Flexible (NF)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-emp-department">Department</label>
                  <input
                    id="new-emp-department"
                    value={newEmployee.emp_department}
                    onChange={(event) => updateNewEmployee('emp_department', event.target.value)}
                    placeholder="Department"
                  />
                </div>
                <div>
                  <label htmlFor="new-emp-manager">Manager Code</label>
                  <input
                    id="new-emp-manager"
                    value={newEmployee.emp_manager}
                    onChange={(event) => updateNewEmployee('emp_manager', event.target.value)}
                    placeholder="e.g. 2981"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="edit-emp-code">Employee Code</label>
                  <input
                    id="edit-emp-code"
                    type="text"
                    value={editingEmployee?.emp_code || ''}
                    disabled
                    placeholder="Cannot change"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-full-name">Full Name</label>
                  <input
                    id="edit-emp-full-name"
                    type="text"
                    value={editFormData.emp_full_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_full_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-email">Email</label>
                  <input
                    id="edit-emp-email"
                    type="email"
                    value={editFormData.emp_email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-contact">Contact</label>
                  <input
                    id="edit-emp-contact"
                    type="text"
                    value={editFormData.emp_contact || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_contact: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-grade">Grade</label>
                  <select
                    id="edit-emp-grade"
                    value={editFormData.emp_grade || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_grade: e.target.value })}
                  >
                    <option value="">Select grade</option>
                    <option value="F">Flexible (F)</option>
                    <option value="M">Moderate (M)</option>
                    <option value="NF">Non-Flexible (NF)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-emp-designation">Designation</label>
                  <input
                    id="edit-emp-designation"
                    type="text"
                    value={editFormData.emp_designation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_designation: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-department">Department</label>
                  <input
                    id="edit-emp-department"
                    type="text"
                    value={editFormData.emp_department || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_department: e.target.value })}
                    placeholder="Department name"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-manager">Manager Code</label>
                  <input
                    id="edit-emp-manager"
                    type="text"
                    value={editFormData.emp_manager || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_manager: e.target.value })}
                    placeholder="e.g., EMP001"
                  />
                </div>
              </>
            )}
          </div>
          {mode === 'add' ? (
            <>
              <div className="form-actions employee-panel-actions">
                <button className="ghost" onClick={resetNewEmployee} disabled={createEmployeeLoading} type="button">
                  Reset
                </button>
                <button className="cta" onClick={onCreateEmployee} disabled={createEmployeeLoading} type="button">
                  Create Employee
                </button>
              </div>
              {createEmployeeStatus ? <p className="form-note">{createEmployeeStatus}</p> : null}
            </>
          ) : (
            <>
              <div className="form-actions employee-panel-actions">
                <button className="ghost" onClick={onClose} disabled={editLoading} type="button">
                  Cancel
                </button>
                <button className="cta" onClick={onSaveEmployee} disabled={editLoading} type="button">
                  Save Changes
                </button>
              </div>
              {editStatus ? <p className="form-note">{editStatus}</p> : null}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
