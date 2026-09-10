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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEmployeesPanel = useEmployeesPanel;
var react_1 = require("react");
var useClickOutside_1 = require("../../../hooks/useClickOutside");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var EMPTY_NEW_EMPLOYEE = {
    emp_code: '',
    emp_full_name: '',
    emp_email: '',
    emp_contact: '',
    emp_grade: '',
    emp_designation: '',
    emp_department: '',
    emp_manager: '',
    emp_shift_id: '',
    emp_date_of_birth: '',
    emp_blood_group: '',
    role: 'employee'
};
var hasHrAdminRole = function (employee) {
    var values = [employee.emp_designation, employee.role];
    return values.some(function (value) { return /\b(hr|cmd|admin)\b/i.test(value || ''); });
};
var hasBirthdayThisMonth = function (employee) {
    var record = employee;
    var rawDate = record.emp_date_of_birth || record.date_of_birth || record.birth_date || record.birthday;
    var date = rawDate ? new Date(rawDate) : null;
    return Boolean(date && !Number.isNaN(date.getTime()) && date.getMonth() === new Date().getMonth());
};
function useEmployeesPanel(_a) {
    var _this = this;
    var employees = _a.employees, canWriteAdminData = _a.canWriteAdminData, apiRequest = _a.apiRequest, accessToken = _a.accessToken, refreshAccessToken = _a.refreshAccessToken, loadDashboard = _a.loadDashboard, resolveDownloadFilename = _a.resolveDownloadFilename;
    var _b = (0, react_1.useState)(''), employeeSearch = _b[0], setEmployeeSearch = _b[1];
    var _c = (0, react_1.useState)('all'), employeeStatusFilter = _c[0], setEmployeeStatusFilter = _c[1];
    var _d = (0, react_1.useState)('all'), employeeKpiFilter = _d[0], setEmployeeKpiFilter = _d[1];
    var _e = (0, react_1.useState)(false), employeeStatusMenuOpen = _e[0], setEmployeeStatusMenuOpen = _e[1];
    var _f = (0, react_1.useState)('csv'), employeeExportFormat = _f[0], setEmployeeExportFormat = _f[1];
    var _g = (0, react_1.useState)(''), employeeExportStatus = _g[0], setEmployeeExportStatus = _g[1];
    var _h = (0, react_1.useState)(null), editingEmployee = _h[0], setEditingEmployee = _h[1];
    var _j = (0, react_1.useState)({}), editFormData = _j[0], setEditFormData = _j[1];
    var _k = (0, react_1.useState)(false), editLoading = _k[0], setEditLoading = _k[1];
    var _l = (0, react_1.useState)(''), editStatus = _l[0], setEditStatus = _l[1];
    var _m = (0, react_1.useState)(null), employeePanelMode = _m[0], setEmployeePanelMode = _m[1];
    var _o = (0, react_1.useState)(null), viewingEmployee = _o[0], setViewingEmployee = _o[1];
    var _p = (0, react_1.useState)(''), employeeImportStatus = _p[0], setEmployeeImportStatus = _p[1];
    var _q = (0, react_1.useState)(false), employeeImportOpen = _q[0], setEmployeeImportOpen = _q[1];
    var _r = (0, react_1.useState)(null), deleteEmployeeTarget = _r[0], setDeleteEmployeeTarget = _r[1];
    var _s = (0, react_1.useState)(false), deleteEmployeeLoading = _s[0], setDeleteEmployeeLoading = _s[1];
    var _t = (0, react_1.useState)(false), createEmployeeLoading = _t[0], setCreateEmployeeLoading = _t[1];
    var _u = (0, react_1.useState)(''), createEmployeeStatus = _u[0], setCreateEmployeeStatus = _u[1];
    var _v = (0, react_1.useState)(__assign({}, EMPTY_NEW_EMPLOYEE)), newEmployee = _v[0], setNewEmployee = _v[1];
    var _w = (0, react_1.useState)([]), shiftOptions = _w[0], setShiftOptions = _w[1];
    var employeeStatusMenuRef = (0, react_1.useRef)(null);
    var shiftsLoadedRef = (0, react_1.useRef)(false);
    (0, useClickOutside_1.useClickOutside)(employeeStatusMenuRef, employeeStatusMenuOpen, function () { return setEmployeeStatusMenuOpen(false); }, {
        closeOnEscape: false
    });
    (0, react_1.useEffect)(function () {
        if (shiftsLoadedRef.current)
            return;
        shiftsLoadedRef.current = true;
        apiRequest('/api/admin/shifts')
            .then(function (response) {
            if ((response === null || response === void 0 ? void 0 : response.success) && Array.isArray(response.data))
                setShiftOptions(response.data);
        })
            .catch(function () { });
    }, [apiRequest]);
    var normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
    var filteredEmployees = employees
        .filter(function (employee) {
        if (employeeKpiFilter === 'active') {
            return Boolean(employee.is_active);
        }
        if (employeeKpiFilter === 'inactive') {
            return !employee.is_active;
        }
        if (employeeKpiFilter === 'hr_admin')
            return hasHrAdminRole(employee);
        if (employeeKpiFilter === 'birthdays')
            return hasBirthdayThisMonth(employee);
        return true;
    })
        .filter(function (employee) {
        if (!normalizedEmployeeSearch) {
            return true;
        }
        var haystack = [
            employee.emp_full_name || '',
            employee.emp_code || '',
            employee.emp_email || '',
            employee.emp_designation || '',
            employee.emp_department || '',
            employee.manager_name || '',
            employee.emp_manager || ''
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedEmployeeSearch);
    })
        .sort(function (left, right) {
        var leftCode = (left.emp_code || '').trim();
        var rightCode = (right.emp_code || '').trim();
        if (!leftCode) {
            return rightCode ? 1 : 0;
        }
        if (!rightCode) {
            return -1;
        }
        return leftCode.localeCompare(rightCode, undefined, { numeric: true, sensitivity: 'base' });
    });
    var applyEmployeeKpiFilter = function (filter) {
        setEmployeeKpiFilter(filter);
        setEmployeeStatusFilter(filter === 'active' || filter === 'inactive' ? filter : 'all');
        setEmployeeSearch('');
    };
    var updateNewEmployee = function (field, value) {
        setNewEmployee(function (current) {
            var _a;
            return (__assign(__assign({}, current), (_a = {}, _a[field] = value, _a)));
        });
    };
    var resetNewEmployee = function () {
        setNewEmployee(__assign({}, EMPTY_NEW_EMPLOYEE));
    };
    var closeEmployeePanel = function () {
        setEmployeePanelMode(null);
        setEditingEmployee(null);
        setEditFormData({});
        setEditStatus('');
        setCreateEmployeeStatus('');
    };
    var openAddEmployeePanel = function () {
        resetNewEmployee();
        setCreateEmployeeStatus('');
        setEmployeePanelMode('add');
    };
    var handleCreateEmployee = function () { return __awaiter(_this, void 0, void 0, function () {
        var payload, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!canWriteAdminData) {
                        setCreateEmployeeStatus('Write permission is required to create employees.');
                        return [2 /*return*/];
                    }
                    if (!newEmployee.emp_code.trim() || !newEmployee.emp_full_name.trim() || !newEmployee.emp_email.trim()) {
                        setCreateEmployeeStatus('Employee ID, full name, and email are required.');
                        return [2 /*return*/];
                    }
                    setCreateEmployeeLoading(true);
                    setCreateEmployeeStatus('Creating employee...');
                    payload = Object.fromEntries(Object.entries(newEmployee)
                        .map(function (_a) {
                        var key = _a[0], value = _a[1];
                        return [key, typeof value === 'string' ? value.trim() : value];
                    })
                        .filter(function (_a) {
                        var value = _a[1];
                        return value !== '';
                    }));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest('/api/users', {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        })];
                case 2:
                    response = _a.sent();
                    setCreateEmployeeStatus((response === null || response === void 0 ? void 0 : response.message) || 'Employee created successfully.');
                    resetNewEmployee();
                    setEmployeePanelMode(null);
                    return [4 /*yield*/, loadDashboard(accessToken)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    setCreateEmployeeStatus(error_1 instanceof Error ? error_1.message : 'Failed to create employee');
                    return [3 /*break*/, 6];
                case 5:
                    setCreateEmployeeLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleEditEmployee = function (employee) {
        if (!canWriteAdminData) {
            setEditStatus('Write permission is required to edit employees.');
            return;
        }
        setEditingEmployee(employee);
        setEditFormData(__assign({}, employee));
        setEmployeePanelMode('edit');
        setEditStatus('');
    };
    var openEmployeeView = function (employee) { return setViewingEmployee(employee); };
    var closeEmployeeView = function () { return setViewingEmployee(null); };
    var downloadEmployeesTemplate = function () {
        // Human-readable headers: the import wizard auto-maps these onto API fields,
        // and they double as documentation of what each column should hold.
        var columns = [
            'Employee ID',
            'Employee Name',
            'Email',
            'Contact Number',
            'Designation',
            'Department',
            'Grade',
            'Manager (Employee ID)',
            'Joining Date',
            'Date of Birth',
            'Blood Group',
            'System Role'
        ];
        var sampleRows = [
            'EMP001,Jane Doe,jane@example.com,9876543210,HR Executive,Human Resources,F,EMP000,2024-04-01,1996-08-23,O+,employee',
            'EMP002,John Smith,john@example.com,9876500000,Sales Executive,Sales,E,EMP001,2023-11-15,1994-02-09,B+,employee'
        ];
        var blob = new Blob(["".concat(columns.join(','), "\n").concat(sampleRows.join('\n'), "\n")], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'fawnix_employees_template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };
    var openEmployeeImport = function () {
        if (!canWriteAdminData) {
            setEmployeeImportStatus('Write permission is required to import employees.');
            return;
        }
        setEmployeeImportStatus('');
        setEmployeeImportOpen(true);
    };
    var closeEmployeeImport = function () { return setEmployeeImportOpen(false); };
    /** Reloads the dashboard once the wizard has finished a confirmed import. */
    var refreshAfterEmployeeImport = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadDashboard(accessToken)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var handleSaveEmployee = function () { return __awaiter(_this, void 0, void 0, function () {
        var allowedFields_1, payload, updatePayload, response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!canWriteAdminData) {
                        setEditStatus('Write permission is required to edit employees.');
                        return [2 /*return*/];
                    }
                    if (!(editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_code)) {
                        setEditStatus('Employee code is required.');
                        return [2 /*return*/];
                    }
                    // The code doubles as the record's identity, so an empty box would silently
                    // clear it rather than rename it.
                    if (editFormData.emp_code !== undefined && !String(editFormData.emp_code).trim()) {
                        setEditStatus('Employee ID cannot be empty.');
                        return [2 /*return*/];
                    }
                    setEditLoading(true);
                    setEditStatus('Updating employee...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    allowedFields_1 = new Set([
                        'emp_code',
                        'emp_full_name',
                        'emp_contact',
                        'emp_email',
                        'emp_designation',
                        'emp_department',
                        'emp_manager',
                        'emp_grade',
                        'emp_shift_id',
                        'emp_joined_date',
                        'emp_date_of_birth',
                        'emp_blood_group'
                    ]);
                    payload = Object.fromEntries(Object.entries(editFormData).map(function (_a) {
                        var key = _a[0], value = _a[1];
                        return [
                            key,
                            typeof value === 'string' ? value.trim() : value
                        ];
                    }));
                    updatePayload = Object.fromEntries(Object.entries(payload).filter(function (_a) {
                        var key = _a[0], value = _a[1];
                        return allowedFields_1.has(key) && value !== undefined;
                    }));
                    return [4 /*yield*/, apiRequest("/api/users/".concat(editingEmployee.emp_code), {
                            method: 'PUT',
                            body: JSON.stringify(updatePayload)
                        })];
                case 2:
                    response = _a.sent();
                    setEditStatus((response === null || response === void 0 ? void 0 : response.message) || 'Employee updated successfully.');
                    closeEmployeePanel();
                    return [4 /*yield*/, loadDashboard(accessToken)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    setEditStatus(error_2 instanceof Error ? error_2.message : 'Failed to update employee');
                    return [3 /*break*/, 6];
                case 5:
                    setEditLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var requestDeleteEmployee = function (employee) {
        if (!canWriteAdminData) {
            setEditStatus('Write permission is required to delete employees.');
            return;
        }
        setDeleteEmployeeTarget(employee);
    };
    var handleDeleteEmployee = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!canWriteAdminData) {
                        setEditStatus('Write permission is required to delete employees.');
                        return [2 /*return*/];
                    }
                    if (!(deleteEmployeeTarget === null || deleteEmployeeTarget === void 0 ? void 0 : deleteEmployeeTarget.emp_code)) {
                        return [2 /*return*/];
                    }
                    setDeleteEmployeeLoading(true);
                    setEditStatus('Deleting employee...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest("/api/users/".concat(deleteEmployeeTarget.emp_code), {
                            method: 'DELETE'
                        })];
                case 2:
                    response = _a.sent();
                    setEditStatus((response === null || response === void 0 ? void 0 : response.message) || 'Employee deleted successfully.');
                    setDeleteEmployeeTarget(null);
                    if ((editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.emp_code) === deleteEmployeeTarget.emp_code) {
                        closeEmployeePanel();
                    }
                    return [4 /*yield*/, loadDashboard(accessToken)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    setEditStatus(error_3 instanceof Error ? error_3.message : 'Failed to delete employee');
                    return [3 /*break*/, 6];
                case 5:
                    setDeleteEmployeeLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var downloadEmployeesReport = function () { return __awaiter(_this, void 0, void 0, function () {
        var params_1, makeRequest, response, nextAccessToken, errorText, blob, url, link, error_4;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    setEmployeeExportStatus('Preparing export...');
                    params_1 = new URLSearchParams({ format: employeeExportFormat });
                    makeRequest = function (token) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, fetch("/api/admin/employees/report?".concat(params_1.toString()), {
                                    method: 'GET',
                                    headers: {
                                        Authorization: "Bearer ".concat(token)
                                    }
                                })];
                        });
                    }); };
                    return [4 /*yield*/, makeRequest(accessToken)];
                case 1:
                    response = _a.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 4];
                    return [4 /*yield*/, refreshAccessToken()];
                case 2:
                    nextAccessToken = _a.sent();
                    return [4 /*yield*/, makeRequest(nextAccessToken)];
                case 3:
                    response = _a.sent();
                    _a.label = 4;
                case 4:
                    if (!!response.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response.text()];
                case 5:
                    errorText = _a.sent();
                    throw new Error(errorText || 'Failed to export employees');
                case 6: return [4 /*yield*/, response.blob()];
                case 7:
                    blob = _a.sent();
                    url = window.URL.createObjectURL(blob);
                    link = document.createElement('a');
                    link.href = url;
                    link.download = resolveDownloadFilename(response, "employees_".concat((0, dateUtils_1.toDateInputValue)(new Date()), ".").concat(employeeExportFormat));
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    setEmployeeExportStatus('Employees exported.');
                    window.setTimeout(function () { return setEmployeeExportStatus(''); }, 2500);
                    return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    setEmployeeExportStatus(error_4 instanceof Error ? error_4.message : 'Failed to export employees');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    return {
        employeeSearch: employeeSearch,
        setEmployeeSearch: setEmployeeSearch,
        employeeStatusFilter: employeeStatusFilter,
        setEmployeeStatusFilter: setEmployeeStatusFilter,
        employeeKpiFilter: employeeKpiFilter,
        applyEmployeeKpiFilter: applyEmployeeKpiFilter,
        employeeStatusMenuOpen: employeeStatusMenuOpen,
        setEmployeeStatusMenuOpen: setEmployeeStatusMenuOpen,
        employeeExportFormat: employeeExportFormat,
        setEmployeeExportFormat: setEmployeeExportFormat,
        employeeExportStatus: employeeExportStatus,
        employeeStatusMenuRef: employeeStatusMenuRef,
        filteredEmployees: filteredEmployees,
        editingEmployee: editingEmployee,
        editFormData: editFormData,
        setEditFormData: setEditFormData,
        editLoading: editLoading,
        editStatus: editStatus,
        employeePanelMode: employeePanelMode,
        viewingEmployee: viewingEmployee,
        openEmployeeView: openEmployeeView,
        closeEmployeeView: closeEmployeeView,
        employeeImportStatus: employeeImportStatus,
        employeeImportOpen: employeeImportOpen,
        openEmployeeImport: openEmployeeImport,
        closeEmployeeImport: closeEmployeeImport,
        refreshAfterEmployeeImport: refreshAfterEmployeeImport,
        downloadEmployeesTemplate: downloadEmployeesTemplate,
        deleteEmployeeTarget: deleteEmployeeTarget,
        setDeleteEmployeeTarget: setDeleteEmployeeTarget,
        deleteEmployeeLoading: deleteEmployeeLoading,
        createEmployeeLoading: createEmployeeLoading,
        createEmployeeStatus: createEmployeeStatus,
        newEmployee: newEmployee,
        updateNewEmployee: updateNewEmployee,
        resetNewEmployee: resetNewEmployee,
        shiftOptions: shiftOptions,
        closeEmployeePanel: closeEmployeePanel,
        openAddEmployeePanel: openAddEmployeePanel,
        handleCreateEmployee: handleCreateEmployee,
        handleEditEmployee: handleEditEmployee,
        handleSaveEmployee: handleSaveEmployee,
        requestDeleteEmployee: requestDeleteEmployee,
        handleDeleteEmployee: handleDeleteEmployee,
        downloadEmployeesReport: downloadEmployeesReport
    };
}
