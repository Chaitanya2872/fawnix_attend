import type { EmployeeRow, ShiftOption } from '../../../types/admin'
import ManagerSelect from './ManagerSelect'
import './EmployeeFormDrawer.css'

type NewEmployeeForm = {
  emp_code: string
  emp_full_name: string
  emp_email: string
  emp_contact: string
  emp_grade: string
  emp_designation: string
  emp_department: string
  emp_manager: string
  emp_shift_id: string
  emp_date_of_birth: string
  emp_blood_group: string
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
  shiftOptions: ShiftOption[]
  /** Directory used to pick a manager by name instead of typing a manager code. */
  employees: EmployeeRow[]
}

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 19.2c1.3-3.4 4.2-5.2 7.5-5.2s6.2 1.8 7.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
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
  onClose,
  shiftOptions,
  employees
}: EmployeeFormDrawerProps) {
  const isAdd = mode === 'add'

  return (
    <>
      <button className="side-panel-scrim" type="button" aria-label="Close employee panel" onClick={onClose} />
      <aside className="emp-form-panel" aria-label={isAdd ? 'Add employee' : 'Edit employee'}>
        <button className="emp-form-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>

        <div className="emp-form-header">
          <span className="emp-form-icon"><PersonIcon /></span>
          <h3>{isAdd ? 'Add Employee' : 'Edit Employee'}</h3>
          <p>
            {isAdd
              ? 'Complete the form below to add a new employee to the Fawnix directory.'
              : `Update ${editingEmployee?.emp_full_name || 'this employee'}’s details and save them back to the admin API.`}
          </p>
        </div>

        <div className="emp-form-body">
          {isAdd ? (
            <>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-name">Full name</label>
                <input
                  id="new-emp-name"
                  value={newEmployee.emp_full_name}
                  onChange={(event) => updateNewEmployee('emp_full_name', event.target.value)}
                  placeholder="Employee full name"
                />
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-email">Email</label>
                <input
                  id="new-emp-email"
                  type="email"
                  value={newEmployee.emp_email}
                  onChange={(event) => updateNewEmployee('emp_email', event.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-code">Employee ID</label>
                  <input
                    id="new-emp-code"
                    value={newEmployee.emp_code}
                    onChange={(event) => updateNewEmployee('emp_code', event.target.value)}
                    placeholder="e.g. 3051"
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-contact">Phone number</label>
                  <input
                    id="new-emp-contact"
                    value={newEmployee.emp_contact}
                    onChange={(event) => updateNewEmployee('emp_contact', event.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-designation">Designation</label>
                  <input
                    id="new-emp-designation"
                    value={newEmployee.emp_designation}
                    onChange={(event) => updateNewEmployee('emp_designation', event.target.value)}
                    placeholder="HR / Sales Executive / DevTester"
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-department">Department</label>
                  <input
                    id="new-emp-department"
                    value={newEmployee.emp_department}
                    onChange={(event) => updateNewEmployee('emp_department', event.target.value)}
                    placeholder="Department"
                  />
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-shift">Shift</label>
                  <select
                    id="new-emp-shift"
                    value={newEmployee.emp_shift_id}
                    onChange={(event) => updateNewEmployee('emp_shift_id', event.target.value)}
                  >
                    <option value="">Select shift</option>
                    {shiftOptions.map((shift) => (
                      <option key={shift.shift_id} value={shift.shift_id}>{shift.shift_name}</option>
                    ))}
                  </select>
                </div>
                <div className="emp-form-field">
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
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-dob">Date of birth</label>
                  <input
                    id="new-emp-dob"
                    type="date"
                    value={newEmployee.emp_date_of_birth}
                    onChange={(event) => updateNewEmployee('emp_date_of_birth', event.target.value)}
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-blood-group">Blood group</label>
                  <select
                    id="new-emp-blood-group"
                    value={newEmployee.emp_blood_group}
                    onChange={(event) => updateNewEmployee('emp_blood_group', event.target.value)}
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-manager">Manager</label>
                <ManagerSelect
                  id="new-emp-manager"
                  value={newEmployee.emp_manager}
                  onChange={(empCode) => updateNewEmployee('emp_manager', empCode)}
                  employees={employees}
                />
              </div>
            </>
          ) : (
            <>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-code">Employee ID</label>
                <input id="edit-emp-code" type="text" value={editingEmployee?.emp_code || ''} disabled placeholder="Cannot change" />
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-full-name">Full name</label>
                <input
                  id="edit-emp-full-name"
                  type="text"
                  value={editFormData.emp_full_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, emp_full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-email">Email</label>
                <input
                  id="edit-emp-email"
                  type="email"
                  value={editFormData.emp_email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, emp_email: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-contact">Phone number</label>
                  <input
                    id="edit-emp-contact"
                    type="text"
                    value={editFormData.emp_contact || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_contact: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-manager">Manager</label>
                  <ManagerSelect
                    id="edit-emp-manager"
                    value={editFormData.emp_manager || ''}
                    onChange={(empCode) => setEditFormData({ ...editFormData, emp_manager: empCode })}
                    employees={employees}
                    excludeEmpCode={editingEmployee?.emp_code}
                  />
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-designation">Designation</label>
                  <input
                    id="edit-emp-designation"
                    type="text"
                    value={editFormData.emp_designation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_designation: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-department">Department</label>
                  <input
                    id="edit-emp-department"
                    type="text"
                    value={editFormData.emp_department || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_department: e.target.value })}
                    placeholder="Department name"
                  />
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-shift">Shift</label>
                  <select
                    id="edit-emp-shift"
                    value={editFormData.emp_shift_id != null ? String(editFormData.emp_shift_id) : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_shift_id: e.target.value })}
                  >
                    <option value="">Select shift</option>
                    {shiftOptions.map((shift) => (
                      <option key={shift.shift_id} value={shift.shift_id}>{shift.shift_name}</option>
                    ))}
                  </select>
                </div>
                <div className="emp-form-field">
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
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-dob">Date of birth</label>
                  <input
                    id="edit-emp-dob"
                    type="date"
                    value={editFormData.emp_date_of_birth ? editFormData.emp_date_of_birth.slice(0, 10) : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_date_of_birth: e.target.value })}
                  />
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-blood-group">Blood group</label>
                  <select
                    id="edit-emp-blood-group"
                    value={editFormData.emp_blood_group || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, emp_blood_group: e.target.value })}
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="emp-form-footer">
          {isAdd ? (
            <>
              <button className="emp-form-btn emp-form-btn--ghost" onClick={resetNewEmployee} disabled={createEmployeeLoading} type="button">
                Reset
              </button>
              <button className="emp-form-btn emp-form-btn--primary" onClick={onCreateEmployee} disabled={createEmployeeLoading} type="button">
                {createEmployeeLoading ? 'Adding…' : 'Add Employee'}
              </button>
            </>
          ) : (
            <>
              <button className="emp-form-btn emp-form-btn--ghost" onClick={onClose} disabled={editLoading} type="button">
                Cancel
              </button>
              <button className="emp-form-btn emp-form-btn--primary" onClick={onSaveEmployee} disabled={editLoading} type="button">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
        {(isAdd ? createEmployeeStatus : editStatus) && (
          <p className="emp-form-status">{isAdd ? createEmployeeStatus : editStatus}</p>
        )}
      </aside>
    </>
  )
}
