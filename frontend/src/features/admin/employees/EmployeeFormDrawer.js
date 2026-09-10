"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmployeeFormDrawer;
var ManagerSelect_1 = require("./ManagerSelect");
require("./EmployeeFormDrawer.css");
var BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
function PersonIcon() {
    return (<svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4.5 19.2c1.3-3.4 4.2-5.2 7.5-5.2s6.2 1.8 7.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>);
}
function EmployeeFormDrawer(_a) {
    var _b, _c;
    var mode = _a.mode, newEmployee = _a.newEmployee, updateNewEmployee = _a.updateNewEmployee, resetNewEmployee = _a.resetNewEmployee, createEmployeeLoading = _a.createEmployeeLoading, createEmployeeStatus = _a.createEmployeeStatus, onCreateEmployee = _a.onCreateEmployee, editingEmployee = _a.editingEmployee, editFormData = _a.editFormData, setEditFormData = _a.setEditFormData, editLoading = _a.editLoading, editStatus = _a.editStatus, onSaveEmployee = _a.onSaveEmployee, onClose = _a.onClose, shiftOptions = _a.shiftOptions, employees = _a.employees;
    var isAdd = mode === 'add';
    return (<>
      <button className="side-panel-scrim" type="button" aria-label="Close employee panel" onClick={onClose}/>
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
            : "Update ".concat((editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_full_name) || 'this employee', "\u2019s details and save them back to the admin API.")}
          </p>
        </div>

        <div className="emp-form-body">
          {isAdd ? (<>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-name">Full name</label>
                <input id="new-emp-name" value={newEmployee.emp_full_name} onChange={function (event) { return updateNewEmployee('emp_full_name', event.target.value); }} placeholder="Employee full name"/>
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-email">Email</label>
                <input id="new-emp-email" type="email" value={newEmployee.emp_email} onChange={function (event) { return updateNewEmployee('emp_email', event.target.value); }} placeholder="name@example.com"/>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-code">Employee ID</label>
                  <input id="new-emp-code" value={newEmployee.emp_code} onChange={function (event) { return updateNewEmployee('emp_code', event.target.value); }} placeholder="e.g. 3051"/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-contact">Phone number</label>
                  <input id="new-emp-contact" value={newEmployee.emp_contact} onChange={function (event) { return updateNewEmployee('emp_contact', event.target.value); }} placeholder="Phone number"/>
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-designation">Designation</label>
                  <input id="new-emp-designation" value={newEmployee.emp_designation} onChange={function (event) { return updateNewEmployee('emp_designation', event.target.value); }} placeholder="HR / Sales Executive / DevTester"/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-department">Department</label>
                  <input id="new-emp-department" value={newEmployee.emp_department} onChange={function (event) { return updateNewEmployee('emp_department', event.target.value); }} placeholder="Department"/>
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="new-emp-shift">Shift</label>
                  <select id="new-emp-shift" value={newEmployee.emp_shift_id} onChange={function (event) { return updateNewEmployee('emp_shift_id', event.target.value); }}>
                    <option value="">Select shift</option>
                    {shiftOptions.map(function (shift) { return (<option key={shift.shift_id} value={shift.shift_id}>{shift.shift_name}</option>); })}
                  </select>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-grade">Grade</label>
                  <select id="new-emp-grade" value={newEmployee.emp_grade} onChange={function (event) { return updateNewEmployee('emp_grade', event.target.value); }}>
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
                  <input id="new-emp-dob" type="date" value={newEmployee.emp_date_of_birth} onChange={function (event) { return updateNewEmployee('emp_date_of_birth', event.target.value); }}/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="new-emp-blood-group">Blood group</label>
                  <select id="new-emp-blood-group" value={newEmployee.emp_blood_group} onChange={function (event) { return updateNewEmployee('emp_blood_group', event.target.value); }}>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUP_OPTIONS.map(function (group) { return (<option key={group} value={group}>{group}</option>); })}
                  </select>
                </div>
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="new-emp-manager">Manager</label>
                <ManagerSelect_1.default id="new-emp-manager" value={newEmployee.emp_manager} onChange={function (empCode) { return updateNewEmployee('emp_manager', empCode); }} employees={employees}/>
              </div>
            </>) : (<>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-code">Employee ID</label>
                <input id="edit-emp-code" type="text" value={(_c = (_b = editFormData.emp_code) !== null && _b !== void 0 ? _b : editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_code) !== null && _c !== void 0 ? _c : ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_code: e.target.value })); }} placeholder="e.g. 3051"/>
                {(editFormData.emp_code || '') !== ((editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_code) || '') ? (<p className="emp-form-hint emp-form-hint--warning">
                    Changing the Employee ID renames it everywhere it is referenced — attendance, leaves,
                    reporting lines and login. Letters, numbers, dots, dashes and underscores only.
                  </p>) : (<p className="emp-form-hint">Used for login and across all linked records.</p>)}
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-full-name">Full name</label>
                <input id="edit-emp-full-name" type="text" value={editFormData.emp_full_name || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_full_name: e.target.value })); }} placeholder="Full name"/>
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-email">Email</label>
                <input id="edit-emp-email" type="email" value={editFormData.emp_email || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_email: e.target.value })); }} placeholder="email@company.com"/>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-contact">Phone number</label>
                  <input id="edit-emp-contact" type="text" value={editFormData.emp_contact || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_contact: e.target.value })); }} placeholder="Phone number"/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-manager">Manager</label>
                  <ManagerSelect_1.default id="edit-emp-manager" value={editFormData.emp_manager || ''} onChange={function (empCode) { return setEditFormData(__assign(__assign({}, editFormData), { emp_manager: empCode })); }} employees={employees} excludeEmpCode={editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_code}/>
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-designation">Designation</label>
                  <input id="edit-emp-designation" type="text" value={editFormData.emp_designation || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_designation: e.target.value })); }} placeholder="Job title"/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-department">Department</label>
                  <input id="edit-emp-department" type="text" value={editFormData.emp_department || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_department: e.target.value })); }} placeholder="Department name"/>
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-shift">Shift</label>
                  <select id="edit-emp-shift" value={editFormData.emp_shift_id != null ? String(editFormData.emp_shift_id) : ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_shift_id: e.target.value })); }}>
                    <option value="">Select shift</option>
                    {shiftOptions.map(function (shift) { return (<option key={shift.shift_id} value={shift.shift_id}>{shift.shift_name}</option>); })}
                  </select>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-grade">Grade</label>
                  <select id="edit-emp-grade" value={editFormData.emp_grade || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_grade: e.target.value })); }}>
                    <option value="">Select grade</option>
                    <option value="F">Flexible (F)</option>
                    <option value="M">Moderate (M)</option>
                    <option value="NF">Non-Flexible (NF)</option>
                  </select>
                </div>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-joined">Joining date</label>
                  <input id="edit-emp-joined" type="date" value={editFormData.emp_joined_date ? editFormData.emp_joined_date.slice(0, 10) : ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_joined_date: e.target.value })); }}/>
                </div>
                <div className="emp-form-field">
                  <label htmlFor="edit-emp-dob">Date of birth</label>
                  <input id="edit-emp-dob" type="date" value={editFormData.emp_date_of_birth ? editFormData.emp_date_of_birth.slice(0, 10) : ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_date_of_birth: e.target.value })); }}/>
                </div>
              </div>
              <div className="emp-form-field emp-form-field--full">
                <label htmlFor="edit-emp-blood-group">Blood group</label>
                <select id="edit-emp-blood-group" value={editFormData.emp_blood_group || ''} onChange={function (e) { return setEditFormData(__assign(__assign({}, editFormData), { emp_blood_group: e.target.value })); }}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUP_OPTIONS.map(function (group) { return (<option key={group} value={group}>{group}</option>); })}
                </select>
              </div>
            </>)}
        </div>

        <div className="emp-form-footer">
          {isAdd ? (<>
              <button className="emp-form-btn emp-form-btn--ghost" onClick={resetNewEmployee} disabled={createEmployeeLoading} type="button">
                Reset
              </button>
              <button className="emp-form-btn emp-form-btn--primary" onClick={onCreateEmployee} disabled={createEmployeeLoading} type="button">
                {createEmployeeLoading ? 'Adding…' : 'Add Employee'}
              </button>
            </>) : (<>
              <button className="emp-form-btn emp-form-btn--ghost" onClick={onClose} disabled={editLoading} type="button">
                Cancel
              </button>
              <button className="emp-form-btn emp-form-btn--primary" onClick={onSaveEmployee} disabled={editLoading} type="button">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </>)}
        </div>
        {(isAdd ? createEmployeeStatus : editStatus) && (<p className="emp-form-status">{isAdd ? createEmployeeStatus : editStatus}</p>)}
      </aside>
    </>);
}
