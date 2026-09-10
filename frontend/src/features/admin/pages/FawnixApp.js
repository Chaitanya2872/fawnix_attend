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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var routes_1 = require("../../../app/config/routes");
require("../../../App.css");
var adminPanelPaths_1 = require("../config/adminPanelPaths");
var sidebar_1 = require("../config/sidebar");
var useAdminLoginExperience_1 = require("../hooks/useAdminLoginExperience");
var useAdminAuth_1 = require("../hooks/useAdminAuth");
var useDashboardData_1 = require("../hooks/useDashboardData");
var useEmployeesPanel_1 = require("../employees/useEmployeesPanel");
var useAttendancePanel_1 = require("../attendance/useAttendancePanel");
var useAttendanceExceptionsData_1 = require("../attendance-exceptions/useAttendanceExceptionsData");
var useOvertimeRecordsData_1 = require("../overtime-records/useOvertimeRecordsData");
var useLeavesPanel_1 = require("../leaves/useLeavesPanel");
var useAdminLeavesData_1 = require("../leaves/useAdminLeavesData");
var useActivitiesPanel_1 = require("../activities/useActivitiesPanel");
var useFieldVisitsPanel_1 = require("../field-visits/useFieldVisitsPanel");
var useCalendarPanel_1 = require("../calendar/useCalendarPanel");
var useReportsPanel_1 = require("../reports/useReportsPanel");
var useApiTelemetryPanel_1 = require("../api-telemetry/useApiTelemetryPanel");
var useEmployeeMasterResource_1 = require("../employee-master/useEmployeeMasterResource");
var AdminLoginPage_1 = require("./AdminLoginPage");
var AdminSidebar_1 = require("../components/AdminSidebar");
var AdminTopbar_1 = require("../components/AdminTopbar");
var DeleteEmployeeModal_1 = require("../employees/DeleteEmployeeModal");
var EmployeeFormDrawer_1 = require("../employees/EmployeeFormDrawer");
var EmployeeImportDrawer_1 = require("../employees/import/EmployeeImportDrawer");
var EmployeeViewDrawer_1 = require("../employees/EmployeeViewDrawer");
var FieldVisitDetailDrawer_1 = require("../field-visits/FieldVisitDetailDrawer");
var MapDialog_1 = require("../field-visits/MapDialog");
var AdminActivitiesPage_1 = require("../activities/AdminActivitiesPage");
var AdminApiTelemetryPage_1 = require("../api-telemetry/AdminApiTelemetryPage");
var AdminAttendancePage_1 = require("../attendance/AdminAttendancePage");
var AdminAttendanceRecordsPage_1 = require("../attendance/AdminAttendanceRecordsPage");
var AdminAttendanceExceptionsPage_1 = require("../attendance-exceptions/AdminAttendanceExceptionsPage");
var AdminCalendarPage_1 = require("../calendar/AdminCalendarPage");
var AdminEmployeesPage_1 = require("../employees/AdminEmployeesPage");
var AdminFieldVisitsPage_1 = require("../field-visits/AdminFieldVisitsPage");
var AdminLeavesPage_1 = require("../leaves/AdminLeavesPage");
var AdminOvertimeRecordsPage_1 = require("../overtime-records/AdminOvertimeRecordsPage");
var AdminEmployeeMasterPage_1 = require("../employee-master/AdminEmployeeMasterPage");
var AdminOverviewPage_1 = require("./sidebar/AdminOverviewPage");
var AdminReportsPage_1 = require("../reports/AdminReportsPage");
/* Unified internal-application theme. Imported last so it wins on source
   order as well as specificity, normalising every admin page onto one palette. */
require("../styles/admin-theme.css");
var employeeMasterConfig_1 = require("../employee-master/employeeMasterConfig");
var formatters_1 = require("../utils/formatters");
var fieldVisits_1 = require("../utils/fieldVisits");
var permissions_1 = require("../utils/permissions");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var SIDEBAR_COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";
function getExceptionDateValue(row) {
    return row.exception_date || row.attendance_date || row.requested_at;
}
function getSortTime(row) {
    var times = [
        row.actual_login_time,
        row.exception_time,
        row.requested_at,
    ].filter(Boolean);
    if (times.length === 0)
        return 0;
    var earliest = times
        .map(function (time) { return new Date(time).getTime(); })
        .reduce(function (a, b) { return Math.min(a, b); });
    return earliest;
}
function isDateWithinRange(targetDate, startDate, endDate) {
    if (!targetDate || !startDate || !endDate) {
        return false;
    }
    return (targetDate >= startDate.slice(0, 10) && targetDate <= endDate.slice(0, 10));
}
function buildWeeklyAttendanceTrend(rows, endDateValue) {
    var endDate = new Date("".concat(endDateValue, "T00:00:00"));
    if (Number.isNaN(endDate.getTime())) {
        return [];
    }
    var uniqueLogins = new Set();
    rows.forEach(function (row) {
        if (!row.login_time) {
            return;
        }
        var loginDate = new Date(row.login_time);
        if (Number.isNaN(loginDate.getTime())) {
            return;
        }
        var dateKey = (0, dateUtils_1.toDateInputValue)(loginDate);
        var employeeKey = (row.employee_email ||
            row.employee_name ||
            row.id ||
            "")
            .toString()
            .toLowerCase();
        uniqueLogins.add("".concat(dateKey, "-").concat(employeeKey));
    });
    return Array.from({ length: 7 }, function (_, index) {
        var currentDate = new Date(endDate);
        currentDate.setDate(endDate.getDate() - (6 - index));
        var dateKey = (0, dateUtils_1.toDateInputValue)(currentDate);
        var count = 0;
        uniqueLogins.forEach(function (entry) {
            if (entry.startsWith("".concat(dateKey, "-"))) {
                count += 1;
            }
        });
        return {
            dateKey: dateKey,
            count: count,
            label: currentDate.toLocaleDateString("en-IN", { weekday: "short" }),
        };
    });
}
function buildAttendanceEfficiencyScores(employees, rows, endDateValue) {
    var weeklyTrend = buildWeeklyAttendanceTrend(rows, endDateValue);
    var rangeDays = Math.max(weeklyTrend.length, 1);
    var allowedDates = new Set(weeklyTrend.map(function (item) { return item.dateKey; }));
    var attendanceByEmployee = new Map();
    rows.forEach(function (row) {
        if (!row.login_time) {
            return;
        }
        var loginDate = new Date(row.login_time);
        if (Number.isNaN(loginDate.getTime())) {
            return;
        }
        var dateKey = (0, dateUtils_1.toDateInputValue)(loginDate);
        if (!allowedDates.has(dateKey)) {
            return;
        }
        var employeeKey = (row.employee_email || "").toLowerCase();
        if (!employeeKey) {
            return;
        }
        if (!attendanceByEmployee.has(employeeKey)) {
            attendanceByEmployee.set(employeeKey, new Set());
        }
        attendanceByEmployee.get(employeeKey).add(dateKey);
    });
    return employees
        .map(function (employee) {
        var _a;
        var employeeKey = (employee.emp_email || "").toLowerCase();
        var presentDays = employeeKey
            ? ((_a = attendanceByEmployee.get(employeeKey)) === null || _a === void 0 ? void 0 : _a.size) || 0
            : 0;
        var score = Math.round((presentDays / rangeDays) * 100);
        return {
            empCode: employee.emp_code || "",
            name: employee.emp_full_name || employee.emp_code || "Unknown",
            score: score,
            presentDays: presentDays,
        };
    })
        .sort(function (left, right) {
        if (right.score !== left.score) {
            return right.score - left.score;
        }
        return left.name.localeCompare(right.name);
    });
}
function getLoginSceneMode(value) {
    var hour = value.getHours();
    if (hour >= 5 && hour < 10) {
        return "dawn";
    }
    if (hour >= 10 && hour < 17) {
        return "day";
    }
    if (hour >= 17 && hour < 20) {
        return "dusk";
    }
    return "night";
}
function formatTimeZoneLabel(timeZone) {
    if (!timeZone) {
        return "Device Time";
    }
    var parts = timeZone.split("/");
    return parts[parts.length - 1].replace(/_/g, " ");
}
function AdminEmptyPanel(_a) {
    var eyebrow = _a.eyebrow, title = _a.title, message = _a.message;
    return (<div className="admin-aligned-page">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="empty-state">
        <strong>{message}</strong>
      </div>
    </div>);
}
function FawnixApp() {
    var _this = this;
    var location = (0, react_router_dom_1.useLocation)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)(function () {
        return (0, adminPanelPaths_1.getAdminPanelFromPath)(window.location.pathname);
    }), activePanel = _a[0], setActivePanel = _a[1];
    var _b = (0, react_1.useState)(function () {
        return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "1";
    }), sidebarCollapsed = _b[0], setSidebarCollapsed = _b[1];
    var _c = (0, react_1.useState)(0), employeeMasterCreateRequestId = _c[0], setEmployeeMasterCreateRequestId = _c[1];
    var clearAdminData = function () {
        resetDashboardData();
        resetLeavesPanel();
        resetAttendanceExceptionsPanel();
        resetOvertimeRecordsPanel();
        resetApiTelemetryPanel();
        resetEmployeeMasterPanel();
        resetAttendancePanel();
    };
    var _d = (0, useAdminAuth_1.useAdminAuth)({
        onSessionCleared: clearAdminData,
    }), accessToken = _d.accessToken, profile = _d.profile, refreshNotice = _d.refreshNotice, telemetryEntries = _d.telemetryEntries, clearTelemetryEntries = _d.clearTelemetryEntries, refreshAccessToken = _d.refreshAccessToken, apiRequest = _d.apiRequest, showAdminLogin = _d.showAdminLogin, authLoading = _d.authLoading, authStatus = _d.authStatus, adminEmpCode = _d.adminEmpCode, adminOtp = _d.adminOtp, setAdminEmpCode = _d.setAdminEmpCode, setAdminOtp = _d.setAdminOtp, handleAdminRequestOtp = _d.handleAdminRequestOtp, handleAdminLogin = _d.handleAdminLogin, handleLogout = _d.handleLogout, handleSessionExpired = _d.handleSessionExpired;
    var handleSessionExpiredRef = (0, react_1.useRef)(handleSessionExpired);
    (0, react_1.useEffect)(function () {
        handleSessionExpiredRef.current = handleSessionExpired;
    }, [handleSessionExpired]);
    var _e = (0, useDashboardData_1.useDashboardData)(showAdminLogin ? "" : accessToken, apiRequest), employees = _e.employees, employeeAuditLogs = _e.employeeAuditLogs, missedLoginLeader = _e.missedLoginLeader, attendanceRows = _e.attendanceRows, leaveRows = _e.leaveRows, setLeaveRows = _e.setLeaveRows, activityRows = _e.activityRows, fieldVisitRows = _e.fieldVisitRows, attendanceExceptions = _e.attendanceExceptions, dashboardLoading = _e.dashboardLoading, dashboardError = _e.dashboardError, attendanceDateFilter = _e.attendanceDateFilter, setAttendanceDateFilter = _e.setAttendanceDateFilter, loadDashboard = _e.loadDashboard, resetDashboardData = _e.resetDashboardData;
    var _f = (0, useAdminLoginExperience_1.useAdminLoginExperience)(showAdminLogin), loginSceneTime = _f.loginSceneTime, loginLocationDetails = _f.loginLocationDetails;
    (0, react_1.useEffect)(function () {
        var nextPanel = (0, adminPanelPaths_1.getAdminPanelFromPath)(location.pathname);
        setActivePanel(function (currentPanel) {
            return currentPanel === nextPanel ? currentPanel : nextPanel;
        });
    }, [location.pathname]);
    (0, react_1.useEffect)(function () {
        if (dashboardError &&
            (dashboardError.toLowerCase().includes("expired") ||
                dashboardError.toLowerCase().includes("token"))) {
            handleSessionExpiredRef.current();
        }
    }, [dashboardError]);
    var resolveDownloadFilename = function (response, fallbackFilename) {
        var disposition = response.headers.get("Content-Disposition") || "";
        var filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (!(filenameMatch === null || filenameMatch === void 0 ? void 0 : filenameMatch[1])) {
            return fallbackFilename;
        }
        try {
            return decodeURIComponent(filenameMatch[1]);
        }
        catch (_a) {
            return filenameMatch[1];
        }
    };
    var canWriteAdminData = (0, permissions_1.hasWriteAccess)(profile);
    var employeeMasterResource = (0, employeeMasterConfig_1.getEmployeeMasterResourceByPanel)(activePanel) ||
        employeeMasterConfig_1.employeeMasterResourceConfigs.workingUnits;
    var employeeMasterIsActive = (0, employeeMasterConfig_1.isEmployeeMasterSidebarId)(activePanel);
    var _g = (0, useEmployeeMasterResource_1.useEmployeeMasterResource)({
        isActive: employeeMasterIsActive,
        accessToken: accessToken,
        apiRequest: apiRequest,
        resource: employeeMasterResource,
    }), employeeMasterFilters = _g.filters, employeeMasterAppliedFilters = _g.appliedFilters, employeeMasterRecords = _g.records, employeeMasterFilterOptions = _g.filterOptions, employeeMasterPagination = _g.pagination, employeeMasterLoading = _g.loading, employeeMasterError = _g.error, employeeMasterActionLoading = _g.actionLoading, employeeMasterActionStatus = _g.actionStatus, employeeMasterLastSyncedAt = _g.lastSyncedAt, updateEmployeeMasterFilter = _g.updateFilter, applyEmployeeMasterFilters = _g.applyFilters, clearEmployeeMasterFilters = _g.clearFilters, changeEmployeeMasterPage = _g.changePage, refreshEmployeeMaster = _g.refresh, createEmployeeMasterRecord = _g.createRecord, updateEmployeeMasterRecord = _g.updateRecord, deleteEmployeeMasterRecord = _g.deleteRecord, resetEmployeeMasterPanel = _g.reset;
    var handleAddOrgUnit = function () {
        var targetPanel = (0, employeeMasterConfig_1.isEmployeeMasterSidebarId)(activePanel)
            ? activePanel
            : "employee-master-working-units";
        setActivePanel(targetPanel);
        navigate((0, adminPanelPaths_1.getAdminPanelPath)(targetPanel));
        setEmployeeMasterCreateRequestId(function (current) { return current + 1; });
    };
    var _h = (0, useEmployeesPanel_1.useEmployeesPanel)({
        employees: employees,
        canWriteAdminData: canWriteAdminData,
        apiRequest: apiRequest,
        accessToken: accessToken,
        refreshAccessToken: refreshAccessToken,
        loadDashboard: loadDashboard,
        resolveDownloadFilename: resolveDownloadFilename,
    }), employeeSearch = _h.employeeSearch, setEmployeeSearch = _h.setEmployeeSearch, employeeStatusFilter = _h.employeeStatusFilter, setEmployeeStatusFilter = _h.setEmployeeStatusFilter, employeeKpiFilter = _h.employeeKpiFilter, applyEmployeeKpiFilter = _h.applyEmployeeKpiFilter, employeeStatusMenuOpen = _h.employeeStatusMenuOpen, setEmployeeStatusMenuOpen = _h.setEmployeeStatusMenuOpen, employeeExportFormat = _h.employeeExportFormat, setEmployeeExportFormat = _h.setEmployeeExportFormat, employeeExportStatus = _h.employeeExportStatus, employeeStatusMenuRef = _h.employeeStatusMenuRef, filteredEmployees = _h.filteredEmployees, editingEmployee = _h.editingEmployee, editFormData = _h.editFormData, setEditFormData = _h.setEditFormData, editLoading = _h.editLoading, editStatus = _h.editStatus, employeePanelMode = _h.employeePanelMode, viewingEmployee = _h.viewingEmployee, openEmployeeView = _h.openEmployeeView, closeEmployeeView = _h.closeEmployeeView, employeeImportStatus = _h.employeeImportStatus, employeeImportOpen = _h.employeeImportOpen, openEmployeeImport = _h.openEmployeeImport, closeEmployeeImport = _h.closeEmployeeImport, refreshAfterEmployeeImport = _h.refreshAfterEmployeeImport, downloadEmployeesTemplate = _h.downloadEmployeesTemplate, deleteEmployeeTarget = _h.deleteEmployeeTarget, setDeleteEmployeeTarget = _h.setDeleteEmployeeTarget, deleteEmployeeLoading = _h.deleteEmployeeLoading, createEmployeeLoading = _h.createEmployeeLoading, createEmployeeStatus = _h.createEmployeeStatus, newEmployee = _h.newEmployee, updateNewEmployee = _h.updateNewEmployee, resetNewEmployee = _h.resetNewEmployee, shiftOptions = _h.shiftOptions, closeEmployeePanel = _h.closeEmployeePanel, openAddEmployeePanel = _h.openAddEmployeePanel, handleCreateEmployee = _h.handleCreateEmployee, handleEditEmployee = _h.handleEditEmployee, handleSaveEmployee = _h.handleSaveEmployee, requestDeleteEmployee = _h.requestDeleteEmployee, handleDeleteEmployee = _h.handleDeleteEmployee, downloadEmployeesReport = _h.downloadEmployeesReport;
    var _j = (0, useApiTelemetryPanel_1.useApiTelemetryPanel)({
        isActive: activePanel === "api-telemetry",
        accessToken: accessToken,
        profile: profile,
        apiRequest: apiRequest,
    }), apiLogFilters = _j.apiLogFilters, apiLogRows = _j.apiLogRows, apiLogLoading = _j.apiLogLoading, apiLogError = _j.apiLogError, apiLogPagination = _j.apiLogPagination, setApiLogPage = _j.setApiLogPage, updateApiLogFilter = _j.updateApiLogFilter, applyApiLogFilters = _j.applyApiLogFilters, clearApiLogFilters = _j.clearApiLogFilters, loadApiLogs = _j.loadApiLogs, resetApiTelemetryPanel = _j.resetApiTelemetryPanel;
    var alertLeaveManager = function (leave) { return __awaiter(_this, void 0, void 0, function () {
        var matchedManager, managerEmail, managerName, employeeName, leaveType, leaveDateRange;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    matchedManager = employees.find(function (employee) {
                        return employee.emp_code && employee.emp_code === leave.manager_code;
                    }) ||
                        employees.find(function (employee) {
                            return employee.emp_email && employee.emp_email === leave.manager_email;
                        });
                    managerEmail = (leave.manager_email ||
                        (matchedManager === null || matchedManager === void 0 ? void 0 : matchedManager.emp_email) ||
                        "").trim();
                    managerName = (matchedManager === null || matchedManager === void 0 ? void 0 : matchedManager.emp_full_name) || (0, formatters_1.getLeaveApproverLabel)(leave, employees);
                    if (!managerEmail) {
                        throw new Error("Manager email is unavailable for this leave request.");
                    }
                    employeeName = leave.emp_full_name || leave.emp_code || "An employee";
                    leaveType = (0, formatters_1.formatLeaveTypeLabel)(leave);
                    leaveDateRange = "".concat((0, dateUtils_1.formatDate)(leave.from_date), " - ").concat((0, dateUtils_1.formatDate)(leave.to_date));
                    return [4 /*yield*/, apiRequest("/api/notifications/send", {
                            method: "POST",
                            body: JSON.stringify({
                                module: "admin_dashboard",
                                eventType: "leave_pending_manager_alert",
                                recipients: [
                                    {
                                        email: managerEmail,
                                        name: managerName,
                                    },
                                ],
                                channels: ["email"],
                                content: {
                                    title: "Pending leave approval reminder",
                                    bodyText: "".concat(employeeName, " has a pending ").concat(leaveType, " request for ").concat(leaveDateRange, ". Please review it from the admin dashboard."),
                                },
                                deeplinkUrl: "".concat(window.location.origin).concat(routes_1.appRoutes.admin),
                                priority: "normal",
                                idempotencyKey: "leave-manager-alert-".concat(leave.id || leave.emp_code || "request", "-").concat(Date.now()),
                            }),
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, "Alert sent to ".concat(managerName || managerEmail, ".")];
            }
        });
    }); };
    var selectedAttendanceDate = attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date());
    var selectedDateAttendanceRows = attendanceRows.filter(function (row) {
        return (0, dateUtils_1.isSameDate)(row.login_time || row.date, selectedAttendanceDate);
    });
    var firstClockInRows = Array.from(selectedDateAttendanceRows
        .reduce(function (map, row) {
        var employeeKey = (row.employee_email ||
            row.employee_name ||
            row.id ||
            "")
            .toString()
            .toLowerCase();
        var existingRow = map.get(employeeKey);
        var currentTime = row.login_time
            ? new Date(row.login_time).getTime()
            : Number.MAX_SAFE_INTEGER;
        var existingTime = (existingRow === null || existingRow === void 0 ? void 0 : existingRow.login_time)
            ? new Date(existingRow.login_time).getTime()
            : Number.MAX_SAFE_INTEGER;
        if (!existingRow || currentTime < existingTime) {
            map.set(employeeKey, row);
        }
        return map;
    }, new Map())
        .values()).sort(function (left, right) {
        var leftTime = left.login_time ? new Date(left.login_time).getTime() : 0;
        var rightTime = right.login_time
            ? new Date(right.login_time).getTime()
            : 0;
        return rightTime - leftTime;
    });
    var lateLoginCutoff = new Date("".concat(selectedAttendanceDate, "T10:00:00"));
    var employeeByEmail = new Map(employees
        .filter(function (employee) { return employee.emp_email; })
        .map(function (employee) { return [employee.emp_email.toLowerCase(), employee]; }));
    var employeeEmailByCode = new Map(employees
        .filter(function (employee) { return employee.emp_code && employee.emp_email; })
        .map(function (employee) { return [
        employee.emp_code,
        employee.emp_email.toLowerCase(),
    ]; }));
    var exceptionLateArrivals = attendanceExceptions.filter(function (item) {
        return item.exception_type === "late_arrival" &&
            (0, dateUtils_1.isSameDate)(getExceptionDateValue(item), selectedAttendanceDate);
    });
    var lateArrivalsFromAttendance = firstClockInRows
        .filter(function (row) {
        var _a, _b;
        if (((_a = row.late_arrival) === null || _a === void 0 ? void 0 : _a.is_late) || ((_b = row.late_arrival) === null || _b === void 0 ? void 0 : _b.informed)) {
            return true;
        }
        if (!row.login_time) {
            return false;
        }
        if (!(0, dateUtils_1.isSameDate)(row.login_time, selectedAttendanceDate)) {
            return false;
        }
        var loginDate = new Date(row.login_time);
        return !Number.isNaN(loginDate.getTime()) && loginDate > lateLoginCutoff;
    })
        .map(function (row) {
        var _a;
        var loginDate = new Date(row.login_time);
        var lateByMinutes = Math.max(Math.floor((loginDate.getTime() - lateLoginCutoff.getTime()) / 60000), 0);
        var employee = row.employee_email
            ? employeeByEmail.get(row.employee_email.toLowerCase())
            : undefined;
        var lateArrival = row.late_arrival;
        return {
            id: row.id,
            emp_code: employee === null || employee === void 0 ? void 0 : employee.emp_code,
            emp_name: row.employee_name || (employee === null || employee === void 0 ? void 0 : employee.emp_full_name) || row.employee_email,
            exception_type: "late_arrival",
            exception_date: selectedAttendanceDate,
            actual_login_time: (lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.actual_login_time) || row.login_time,
            exception_time: (lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.planned_arrival_time) || undefined,
            late_by_minutes: (_a = lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.late_by_minutes) !== null && _a !== void 0 ? _a : lateByMinutes,
            reason: (lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.reason) || undefined,
            status: (lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.status) || "not_informed",
            requested_at: (lateArrival === null || lateArrival === void 0 ? void 0 : lateArrival.requested_at) || row.login_time,
        };
    });
    var selectedDateLateArrivals = (function () {
        var merged = new Map();
        var getKey = function (row) {
            var emailFromCode = row.emp_code
                ? employeeEmailByCode.get(row.emp_code)
                : undefined;
            var rawKey = emailFromCode ||
                row.emp_code ||
                row.emp_name ||
                row.actual_login_time ||
                row.exception_time ||
                row.requested_at ||
                "";
            return rawKey.toString().toLowerCase();
        };
        exceptionLateArrivals.forEach(function (row) {
            var key = getKey(row);
            merged.set(key, row);
        });
        lateArrivalsFromAttendance.forEach(function (row) {
            var key = getKey(row);
            if (!merged.has(key)) {
                merged.set(key, row);
            }
        });
        return Array.from(merged.values()).sort(function (left, right) {
            var leftInformed = (left.status || "").toLowerCase() !== "not_informed";
            var rightInformed = (right.status || "").toLowerCase() !== "not_informed";
            if (leftInformed !== rightInformed) {
                return leftInformed ? -1 : 1;
            }
            var leftTime = getSortTime(left);
            var rightTime = getSortTime(right);
            return leftTime - rightTime;
        });
    })();
    var exceptionEarlyLeaves = attendanceExceptions.filter(function (item) {
        return item.exception_type === "early_leave" &&
            (0, dateUtils_1.isSameDate)(getExceptionDateValue(item), selectedAttendanceDate);
    });
    var earlyLeavesFromAttendance = selectedDateAttendanceRows
        .filter(function (row) {
        var _a, _b;
        return Boolean(((_a = row.early_leave) === null || _a === void 0 ? void 0 : _a.is_early_departure) || ((_b = row.early_leave) === null || _b === void 0 ? void 0 : _b.requested));
    })
        .map(function (row) {
        var _a;
        var employee = row.employee_email
            ? employeeByEmail.get(row.employee_email.toLowerCase())
            : undefined;
        var earlyLeave = row.early_leave;
        return {
            id: row.id,
            emp_code: employee === null || employee === void 0 ? void 0 : employee.emp_code,
            emp_name: row.employee_name || (employee === null || employee === void 0 ? void 0 : employee.emp_full_name) || row.employee_email,
            exception_type: "early_leave",
            exception_date: selectedAttendanceDate,
            planned_leave_time: (earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.planned_leave_time) || undefined,
            actual_logout_time: (earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.actual_logout_time) || row.logout_time,
            early_by_minutes: (_a = earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.early_by_minutes) !== null && _a !== void 0 ? _a : undefined,
            reason: (earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.reason) || undefined,
            status: (earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.status) ||
                ((earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.requested) ? "pending" : "not_requested"),
            requested_at: (earlyLeave === null || earlyLeave === void 0 ? void 0 : earlyLeave.requested_at) || row.logout_time,
        };
    });
    var selectedDateEarlyLeaves = (function () {
        var merged = new Map();
        var getKey = function (row) {
            var emailFromCode = row.emp_code
                ? employeeEmailByCode.get(row.emp_code)
                : undefined;
            var rawKey = emailFromCode ||
                row.emp_code ||
                row.emp_name ||
                row.actual_logout_time ||
                row.planned_leave_time ||
                row.requested_at ||
                "";
            return rawKey.toString().toLowerCase();
        };
        exceptionEarlyLeaves.forEach(function (row) {
            merged.set(getKey(row), row);
        });
        earlyLeavesFromAttendance.forEach(function (row) {
            var key = getKey(row);
            if (!merged.has(key)) {
                merged.set(key, row);
            }
        });
        return Array.from(merged.values()).sort(function (left, right) {
            var leftRequested = !["not_requested", ""].includes((left.status || "").toLowerCase());
            var rightRequested = !["not_requested", ""].includes((right.status || "").toLowerCase());
            if (leftRequested !== rightRequested) {
                return leftRequested ? -1 : 1;
            }
            var leftTime = new Date(left.requested_at ||
                left.actual_logout_time ||
                left.exception_date ||
                "").getTime() || 0;
            var rightTime = new Date(right.requested_at ||
                right.actual_logout_time ||
                right.exception_date ||
                "").getTime() || 0;
            return leftTime - rightTime;
        });
    })();
    var selectedDateExceptions = __spreadArray(__spreadArray([], selectedDateLateArrivals.map(function (row) { return (__assign(__assign({}, row), { exceptionKind: "late_arrival" })); }), true), selectedDateEarlyLeaves.map(function (row) { return (__assign(__assign({}, row), { exceptionKind: "early_leave" })); }), true).sort(function (left, right) { return getSortTime(right) - getSortTime(left); });
    var _k = (0, useAttendancePanel_1.useAttendancePanel)({
        isActive: activePanel === "attendance",
        accessToken: accessToken,
        apiRequest: apiRequest,
        attendanceDateFilter: attendanceDateFilter,
        employees: employees,
        firstClockInRows: firstClockInRows,
        selectedDateLateArrivals: selectedDateLateArrivals,
        selectedDateEarlyLeaves: selectedDateEarlyLeaves,
    }), attendanceView = _k.attendanceView, setAttendanceView = _k.setAttendanceView, attendanceSearch = _k.attendanceSearch, setAttendanceSearch = _k.setAttendanceSearch, missedLoginEmpCodes = _k.missedLoginEmpCodes, alertCandidatesLoading = _k.alertCandidatesLoading, alertTriggerLoading = _k.alertTriggerLoading, alertTriggerStatus = _k.alertTriggerStatus, setAlertTriggerStatus = _k.setAlertTriggerStatus, showAlertComposer = _k.showAlertComposer, setShowAlertComposer = _k.setShowAlertComposer, selectedMissedLoginEmpCodes = _k.selectedMissedLoginEmpCodes, setSelectedMissedLoginEmpCodes = _k.setSelectedMissedLoginEmpCodes, alertSentEmpCodes = _k.alertSentEmpCodes, alertSendCounts = _k.alertSendCounts, attendancePageRows = _k.attendancePageRows, filteredAttendanceRows = _k.filteredAttendanceRows, missedLoginEmployees = _k.missedLoginEmployees, actionableMissedLoginEmployeeCodes = _k.actionableMissedLoginEmployeeCodes, allMissedLoginsSelected = _k.allMissedLoginsSelected, selectedMissedLoginCount = _k.selectedMissedLoginCount, reminderPreviewBody = _k.reminderPreviewBody, reminderPreviewTitle = _k.reminderPreviewTitle, reminderTargetDate = _k.reminderTargetDate, exceptionRows = _k.exceptionRows, triggerAttendanceReminder = _k.triggerAttendanceReminder, resetAttendancePanel = _k.resetAttendancePanel;
    var _l = (0, useAttendanceExceptionsData_1.useAttendanceExceptionsData)({
        isActive: activePanel === "attendance-exceptions",
        accessToken: accessToken,
        apiRequest: apiRequest,
    }), attendanceExceptionFilters = _l.filters, attendanceExceptionRows = _l.rows, attendanceExceptionKpis = _l.kpis, attendanceExceptionFilterOptions = _l.filterOptions, attendanceExceptionLoading = _l.loading, attendanceExceptionError = _l.error, setAttendanceExceptionPage = _l.changePage, attendanceExceptionPagination = _l.pagination, attendanceExceptionLastSyncedAt = _l.lastSyncedAt, updateAttendanceExceptionFilter = _l.updateFilter, clearAttendanceExceptionFilters = _l.clearFilters, loadAttendanceExceptions = _l.refresh, setAttendanceExceptionSort = _l.setSort, presetAttendanceExceptionFilter = _l.applyPreset, resetAttendanceExceptionsPanel = _l.reset;
    var _m = (0, useOvertimeRecordsData_1.useOvertimeRecordsData)({
        isActive: activePanel === "overtime-records",
        accessToken: accessToken,
        apiRequest: apiRequest,
    }), overtimeRecordFilters = _m.filters, overtimeRecordRows = _m.records, overtimeRecordKpis = _m.kpis, overtimeRecordFilterOptions = _m.filterOptions, overtimeRecordPagination = _m.pagination, overtimeRecordLoading = _m.loading, overtimeRecordActionLoading = _m.actionLoading, overtimeRecordActionStatus = _m.actionStatus, overtimeRecordError = _m.error, overtimeRecordValidationError = _m.validationError, overtimeRecordLastSyncedAt = _m.lastSyncedAt, updateOvertimeRecordFilter = _m.updateFilter, changeOvertimeRecordPage = _m.changePage, refreshOvertimeRecords = _m.refresh, createOvertimeRecord = _m.createRecord, updateOvertimeRecord = _m.updateRecord, deleteOvertimeRecord = _m.deleteRecord, updateOvertimeRecordStatus = _m.updateStatus, approveOvertimeRecord = _m.approveRecord, resetOvertimeRecordsPanel = _m.reset;
    // Only resetLeavesPanel is consumed here (on logout) - the rest of this
    // hook's filter/refresh surface was exclusive to the legacy Leaves admin
    // page, now replaced by useAdminLeavesData below. leaveRows/setLeaveRows
    // themselves come from useDashboardData and back unrelated dashboard
    // panels, so that state is untouched.
    var resetLeavesPanel = (0, useLeavesPanel_1.useLeavesPanel)({
        employees: employees,
        apiRequest: apiRequest,
        accessToken: accessToken,
        refreshAccessToken: refreshAccessToken,
        setLeaveRows: setLeaveRows,
    }).resetLeavesPanel;
    var _o = (0, useAdminLeavesData_1.useAdminLeavesData)({
        isActive: activePanel === "leaves",
        accessToken: accessToken,
        apiRequest: apiRequest,
    }), adminLeaveFilters = _o.filters, adminLeaveRows = _o.rows, adminLeaveKpis = _o.kpis, adminLeaveFilterOptions = _o.filterOptions, adminLeaveLoading = _o.loading, adminLeaveError = _o.error, setAdminLeavePage = _o.changePage, adminLeavePagination = _o.pagination, adminLeaveLastSyncedAt = _o.lastSyncedAt, updateAdminLeaveFilter = _o.updateFilter, clearAdminLeaveFilters = _o.clearFilters, refreshAdminLeaves = _o.refresh, setAdminLeaveSort = _o.setSort, presetAdminLeaveFilter = _o.applyPreset;
    var _p = (0, useActivitiesPanel_1.useActivitiesPanel)({
        activityRows: activityRows,
    }), showTodayActivities = _p.showTodayActivities, setShowTodayActivities = _p.setShowTodayActivities, filteredActivities = _p.filteredActivities;
    var _q = (0, useFieldVisitsPanel_1.useFieldVisitsPanel)({
        showAdminLogin: showAdminLogin,
        fieldVisitRows: fieldVisitRows,
        apiRequest: apiRequest,
    }), fieldVisitDurationTick = _q.fieldVisitDurationTick, fieldVisitPanelOpen = _q.fieldVisitPanelOpen, setFieldVisitPanelOpen = _q.setFieldVisitPanelOpen, fieldVisitPanelRow = _q.fieldVisitPanelRow, fieldVisitPanelLoading = _q.fieldVisitPanelLoading, fieldVisitPanelError = _q.fieldVisitPanelError, fieldVisitTimelineItems = _q.fieldVisitTimelineItems, mapDialogOpen = _q.mapDialogOpen, setMapDialogOpen = _q.setMapDialogOpen, mapDialogTitle = _q.mapDialogTitle, mapDialogLoading = _q.mapDialogLoading, mapDialogError = _q.mapDialogError, mapTrackingPoints = _q.mapTrackingPoints, mapCenter = _q.mapCenter, mapSummary = _q.mapSummary, mapContainerRef = _q.mapContainerRef, openFieldVisitPanel = _q.openFieldVisitPanel, openMapForFieldVisit = _q.openMapForFieldVisit, fieldVisitPanelDurationMinutes = _q.fieldVisitPanelDurationMinutes, fieldPointCount = _q.fieldPointCount, activityPointCount = _q.activityPointCount, startPoint = _q.startPoint, endPoint = _q.endPoint;
    var attendanceCountByDate = attendanceRows.reduce(function (accumulator, row) {
        var _a;
        var key = row.login_time
            ? (0, dateUtils_1.toDateInputValue)(new Date(row.login_time))
            : (_a = row.date) === null || _a === void 0 ? void 0 : _a.slice(0, 10);
        if (key) {
            accumulator[key] = (accumulator[key] || 0) + 1;
        }
        return accumulator;
    }, {});
    var exceptionCountByDate = attendanceExceptions.reduce(function (accumulator, row) {
        var _a;
        var key = (_a = getExceptionDateValue(row)) === null || _a === void 0 ? void 0 : _a.slice(0, 10);
        if (key) {
            accumulator[key] = (accumulator[key] || 0) + 1;
        }
        return accumulator;
    }, {});
    var selectedDateLeaves = leaveRows
        .filter(function (row) {
        var status = (row.status || "").toLowerCase();
        return (!["rejected", "cancelled"].includes(status) &&
            isDateWithinRange(selectedAttendanceDate, row.from_date, row.to_date));
    })
        .sort(function (left, right) {
        return (left.emp_full_name || left.emp_code || "").localeCompare(right.emp_full_name || right.emp_code || "");
    });
    var weeklyAttendanceTrend = buildWeeklyAttendanceTrend(attendanceRows, selectedAttendanceDate);
    var attendanceEfficiencyScores = buildAttendanceEfficiencyScores(employees, attendanceRows, selectedAttendanceDate);
    var _r = (0, useCalendarPanel_1.useCalendarPanel)({
        attendanceDateFilter: attendanceDateFilter,
        attendanceCountByDate: attendanceCountByDate,
        leaveRows: leaveRows,
    }), calendarMonthView = _r.calendarMonthView, setCalendarMonthView = _r.setCalendarMonthView, calendarMonthLabel = _r.calendarMonthLabel, calendarDays = _r.calendarDays, maxCalendarAttendance = _r.maxCalendarAttendance, leaveCountByDate = _r.leaveCountByDate;
    var _s = (0, useReportsPanel_1.useReportsPanel)({
        accessToken: accessToken,
        refreshAccessToken: refreshAccessToken,
        attendanceDateFilter: attendanceDateFilter,
        weeklyAttendanceTrend: weeklyAttendanceTrend,
        resolveDownloadFilename: resolveDownloadFilename,
    }), attendanceReportMonth = _s.attendanceReportMonth, setAttendanceReportMonth = _s.setAttendanceReportMonth, attendanceReportYear = _s.attendanceReportYear, setAttendanceReportYear = _s.setAttendanceReportYear, attendanceReportFormat = _s.attendanceReportFormat, setAttendanceReportFormat = _s.setAttendanceReportFormat, attendanceReportStatus = _s.attendanceReportStatus, reportDateMode = _s.reportDateMode, setReportDateMode = _s.setReportDateMode, reportStartDate = _s.reportStartDate, setReportStartDate = _s.setReportStartDate, reportEndDate = _s.reportEndDate, setReportEndDate = _s.setReportEndDate, downloadRangeReport = _s.downloadRangeReport, downloadDailyAttendanceReport = _s.downloadDailyAttendanceReport, downloadMonthlyAttendanceReport = _s.downloadMonthlyAttendanceReport, attendanceHeatmapData = _s.attendanceHeatmapData, attendanceHeatmapLoading = _s.attendanceHeatmapLoading, attendanceHeatmapStatus = _s.attendanceHeatmapStatus, attendanceHeatmapSavingCell = _s.attendanceHeatmapSavingCell, fetchAttendanceHeatmapData = _s.fetchAttendanceHeatmapData, updateAttendanceCell = _s.updateAttendanceCell, attendanceInsights = _s.attendanceInsights, attendanceInsightsLoading = _s.attendanceInsightsLoading, attendanceInsightsStatus = _s.attendanceInsightsStatus, fetchAttendanceInsights = _s.fetchAttendanceInsights, attendanceTrendSeries = _s.attendanceTrendSeries, isAttendanceTrendPercentage = _s.isAttendanceTrendPercentage, maxWeeklyAttendance = _s.maxWeeklyAttendance, weeklyTrendPoints = _s.weeklyTrendPoints;
    var renderDashboardPanel = function () {
        if (dashboardLoading) {
            return <div className="empty-state">Loading admin data...</div>;
        }
        if (dashboardError) {
            return (<div className="empty-state">
          <strong>Unable to load dashboard</strong>
          <p>{dashboardError}</p>
          <button className="ghost dashboard-button" onClick={function () { return void loadDashboard(accessToken); }}>
            Retry
          </button>
        </div>);
        }
        if (activePanel === "dashboard") {
            return (<AdminOverviewPage_1.default attendanceDateFilter={attendanceDateFilter} attendanceCountByDate={attendanceCountByDate} exceptionCountByDate={exceptionCountByDate} employees={employees} employeeAuditLogs={employeeAuditLogs} missedLoginLeader={missedLoginLeader} fieldVisitRows={fieldVisitRows} firstClockInRows={firstClockInRows} formatLeaveTypeLabel={formatters_1.formatLeaveTypeLabel} leaveRows={leaveRows} loadDashboard={function () { return loadDashboard(accessToken); }} onAlertManager={alertLeaveManager} selectedDateExceptions={selectedDateExceptions} selectedDateLeaves={selectedDateLeaves} weeklyAttendanceTrend={weeklyAttendanceTrend}/>);
        }
        if (activePanel === "employees") {
            return (<AdminEmployeesPage_1.default canWriteAdminData={canWriteAdminData} downloadEmployeesReport={downloadEmployeesReport} employeeExportFormat={employeeExportFormat} employeeExportStatus={employeeExportStatus} employeeKpiFilter={employeeKpiFilter} employeeSearch={employeeSearch} employeeStatusFilter={employeeStatusFilter} employeeStatusMenuOpen={employeeStatusMenuOpen} employeeStatusMenuRef={employeeStatusMenuRef} employees={employees} filteredEmployees={filteredEmployees} formatEmployeeGrade={formatters_1.formatEmployeeGrade} handleEditEmployee={handleEditEmployee} openEmployeeView={openEmployeeView} employeeImportStatus={employeeImportStatus} openEmployeeImport={openEmployeeImport} downloadEmployeesTemplate={downloadEmployeesTemplate} loadDashboard={function () { return loadDashboard(accessToken); }} openAddEmployeePanel={openAddEmployeePanel} applyEmployeeKpiFilter={applyEmployeeKpiFilter} requestDeleteEmployee={requestDeleteEmployee} setEmployeeExportFormat={setEmployeeExportFormat} setEmployeeSearch={setEmployeeSearch} setEmployeeStatusFilter={setEmployeeStatusFilter} setEmployeeStatusMenuOpen={setEmployeeStatusMenuOpen}/>);
        }
        if (employeeMasterIsActive) {
            return (<AdminEmployeeMasterPage_1.default key={employeeMasterResource.key} actionLoading={employeeMasterActionLoading} actionStatus={employeeMasterActionStatus} canWriteAdminData={canWriteAdminData} error={employeeMasterError} filterOptions={employeeMasterFilterOptions} filters={employeeMasterFilters} appliedFilters={employeeMasterAppliedFilters} lastSyncedAt={employeeMasterLastSyncedAt} loading={employeeMasterLoading} pagination={employeeMasterPagination} records={employeeMasterRecords} resource={employeeMasterResource} resources={employeeMasterConfig_1.employeeMasterResources} onSelectResource={function (sidebarId) {
                    setActivePanel(sidebarId);
                    navigate((0, adminPanelPaths_1.getAdminPanelPath)(sidebarId));
                }} applyFilters={applyEmployeeMasterFilters} changePage={changeEmployeeMasterPage} clearFilters={clearEmployeeMasterFilters} createRecord={createEmployeeMasterRecord} deleteRecord={deleteEmployeeMasterRecord} refresh={refreshEmployeeMaster} updateFilter={updateEmployeeMasterFilter} updateRecord={updateEmployeeMasterRecord} createRequestId={employeeMasterCreateRequestId}/>);
        }
        if (activePanel === "attendance-exceptions") {
            return (<AdminAttendanceExceptionsPage_1.default error={attendanceExceptionError} filters={attendanceExceptionFilters} filterOptions={attendanceExceptionFilterOptions} formatDate={dateUtils_1.formatDate} formatDateTime={dateUtils_1.formatDateTime} kpis={attendanceExceptionKpis} loading={attendanceExceptionLoading} lastSyncedAt={attendanceExceptionLastSyncedAt} onChangePage={setAttendanceExceptionPage} onClearFilters={clearAttendanceExceptionFilters} onRefresh={loadAttendanceExceptions} onSort={setAttendanceExceptionSort} onPresetFilter={presetAttendanceExceptionFilter} pagination={attendanceExceptionPagination} records={attendanceExceptionRows} updateFilter={updateAttendanceExceptionFilter} apiRequest={apiRequest} accessToken={accessToken}/>);
        }
        if (activePanel === "attendance") {
            return (<AdminAttendancePage_1.default actionableMissedLoginEmployeeCodes={actionableMissedLoginEmployeeCodes} alertCandidatesLoading={alertCandidatesLoading} alertSentEmpCodes={alertSentEmpCodes} alertSendCounts={alertSendCounts} alertTriggerLoading={alertTriggerLoading} alertTriggerStatus={alertTriggerStatus} allMissedLoginsSelected={allMissedLoginsSelected} attendanceDateFilter={attendanceDateFilter} attendancePageRows={attendancePageRows} attendanceSearch={attendanceSearch} attendanceView={attendanceView} exceptionRows={exceptionRows} filteredAttendanceRows={filteredAttendanceRows} formatDate={dateUtils_1.formatDate} formatDateOnly={dateUtils_1.formatDateOnly} formatDateTime={dateUtils_1.formatDateTime} formatLeaveTypeLabel={formatters_1.formatLeaveTypeLabel} formatWorkingHours={formatters_1.formatWorkingHours} loadDashboard={function () { return loadDashboard(accessToken); }} missedLoginEmpCodes={missedLoginEmpCodes} missedLoginEmployees={missedLoginEmployees} reminderPreviewBody={reminderPreviewBody} reminderPreviewTitle={reminderPreviewTitle} reminderTargetDate={reminderTargetDate} selectedAttendanceDate={selectedAttendanceDate} selectedDateEarlyLeaves={selectedDateEarlyLeaves} selectedDateLateArrivals={selectedDateLateArrivals} selectedDateLeaves={selectedDateLeaves} selectedMissedLoginCount={selectedMissedLoginCount} selectedMissedLoginEmpCodes={selectedMissedLoginEmpCodes} setAlertTriggerStatus={setAlertTriggerStatus} setAttendanceDateFilter={setAttendanceDateFilter} setAttendanceSearch={setAttendanceSearch} setAttendanceView={setAttendanceView} setSelectedMissedLoginEmpCodes={setSelectedMissedLoginEmpCodes} setShowAlertComposer={setShowAlertComposer} showAlertComposer={showAlertComposer} triggerAttendanceReminder={triggerAttendanceReminder}/>);
        }
        if (activePanel === "attendance-records") {
            return (<AdminAttendanceRecordsPage_1.default attendanceDateFilter={attendanceDateFilter} attendanceRows={attendanceRows} formatDateOnly={dateUtils_1.formatDateOnly} formatDateTime={dateUtils_1.formatDateTime} formatWorkingHours={formatters_1.formatWorkingHours} loadDashboard={function () { return loadDashboard(accessToken); }} setAttendanceDateFilter={setAttendanceDateFilter}/>);
        }
        if (activePanel === "calendar") {
            return (<AdminCalendarPage_1.default attendanceCountByDate={attendanceCountByDate} calendarDays={calendarDays} calendarMonthLabel={calendarMonthLabel} calendarMonthView={calendarMonthView} exceptionCountByDate={exceptionCountByDate} leaveCountByDate={leaveCountByDate} maxCalendarAttendance={maxCalendarAttendance} setAttendanceDateFilter={setAttendanceDateFilter} setCalendarMonthView={setCalendarMonthView} toDateInputValue={dateUtils_1.toDateInputValue}/>);
        }
        if (activePanel === "reports") {
            return (<AdminReportsPage_1.default attendanceDateFilter={attendanceDateFilter} attendanceEfficiencyScores={attendanceEfficiencyScores} attendanceReportFormat={attendanceReportFormat} attendanceReportMonth={attendanceReportMonth} attendanceReportStatus={attendanceReportStatus} attendanceReportYear={attendanceReportYear} reportDateMode={reportDateMode} setReportDateMode={setReportDateMode} reportStartDate={reportStartDate} setReportStartDate={setReportStartDate} reportEndDate={reportEndDate} setReportEndDate={setReportEndDate} downloadRangeReport={downloadRangeReport} downloadDailyAttendanceReport={downloadDailyAttendanceReport} downloadMonthlyAttendanceReport={downloadMonthlyAttendanceReport} loadDashboard={function () { return loadDashboard(accessToken); }} maxWeeklyAttendance={maxWeeklyAttendance} setAttendanceDateFilter={setAttendanceDateFilter} setAttendanceReportFormat={setAttendanceReportFormat} setAttendanceReportMonth={setAttendanceReportMonth} setAttendanceReportYear={setAttendanceReportYear} weeklyAttendanceTrend={weeklyAttendanceTrend} weeklyTrendPoints={weeklyTrendPoints} attendanceHeatmapData={attendanceHeatmapData} attendanceHeatmapLoading={attendanceHeatmapLoading} attendanceHeatmapStatus={attendanceHeatmapStatus} attendanceHeatmapSavingCell={attendanceHeatmapSavingCell} fetchAttendanceHeatmapData={fetchAttendanceHeatmapData} updateAttendanceCell={updateAttendanceCell} attendanceInsights={attendanceInsights} attendanceInsightsLoading={attendanceInsightsLoading} attendanceInsightsStatus={attendanceInsightsStatus} fetchAttendanceInsights={fetchAttendanceInsights} attendanceTrendSeries={attendanceTrendSeries} isAttendanceTrendPercentage={isAttendanceTrendPercentage} canWriteAdminData={canWriteAdminData}/>);
        }
        if (activePanel === "leaves") {
            return (<AdminLeavesPage_1.default error={adminLeaveError} filters={adminLeaveFilters} filterOptions={adminLeaveFilterOptions} formatDate={dateUtils_1.formatDate} formatDateTime={dateUtils_1.formatDateTime} kpis={adminLeaveKpis} loading={adminLeaveLoading} lastSyncedAt={adminLeaveLastSyncedAt} onChangePage={setAdminLeavePage} onClearFilters={clearAdminLeaveFilters} onRefresh={refreshAdminLeaves} onSort={setAdminLeaveSort} onPresetFilter={presetAdminLeaveFilter} pagination={adminLeavePagination} records={adminLeaveRows} updateFilter={updateAdminLeaveFilter} onAlertManager={alertLeaveManager} apiRequest={apiRequest} accessToken={accessToken}/>);
        }
        if (activePanel === "overtime-records") {
            return (<AdminOvertimeRecordsPage_1.default actionLoading={overtimeRecordActionLoading} actionStatus={overtimeRecordActionStatus} canWriteAdminData={canWriteAdminData} error={overtimeRecordError} filterOptions={overtimeRecordFilterOptions} filters={overtimeRecordFilters} formatDateOnly={dateUtils_1.formatDateOnly} formatDateTime={dateUtils_1.formatDateTime} kpis={overtimeRecordKpis} lastSyncedAt={overtimeRecordLastSyncedAt} loading={overtimeRecordLoading} pagination={overtimeRecordPagination} records={overtimeRecordRows} validationError={overtimeRecordValidationError} approveRecord={approveOvertimeRecord} createRecord={createOvertimeRecord} deleteRecord={deleteOvertimeRecord} onChangePage={changeOvertimeRecordPage} refresh={refreshOvertimeRecords} updateRecord={updateOvertimeRecord} updateFilter={updateOvertimeRecordFilter} updateStatus={updateOvertimeRecordStatus}/>);
        }
        if (activePanel === "activities") {
            return (<AdminActivitiesPage_1.default filteredActivities={filteredActivities} formatDateTime={dateUtils_1.formatDateTime} loadDashboard={function () { return loadDashboard(accessToken); }} setShowTodayActivities={setShowTodayActivities} showTodayActivities={showTodayActivities}/>);
        }
        if (activePanel === "inbox") {
            return (<AdminEmptyPanel eyebrow="Administration" title="Inbox" message="Inbox is empty."/>);
        }
        if (activePanel === "api-telemetry" &&
            (profile === null || profile === void 0 ? void 0 : profile.emp_code) === sidebar_1.API_TELEMETRY_EMP_CODE) {
            return (<AdminApiTelemetryPage_1.default clientEntries={telemetryEntries} onClearClientEntries={clearTelemetryEntries} serverError={apiLogError} serverFilters={apiLogFilters} serverLoading={apiLogLoading} serverPagination={apiLogPagination} serverRecords={apiLogRows} onApplyServerFilters={applyApiLogFilters} onChangeServerPage={setApiLogPage} onClearServerFilters={clearApiLogFilters} onRefreshServerLogs={function () { return void loadApiLogs(accessToken); }} updateServerFilter={updateApiLogFilter}/>);
        }
        return (<AdminFieldVisitsPage_1.default fieldVisitDurationTick={fieldVisitDurationTick} fieldVisitRows={fieldVisitRows} formatDateTime={dateUtils_1.formatDateTime} formatDistanceKm={formatters_1.formatDistanceKm} formatVisitDuration={fieldVisits_1.formatVisitDuration} loadDashboard={function () { return loadDashboard(accessToken); }} openFieldVisitPanel={openFieldVisitPanel} openMapForFieldVisit={openMapForFieldVisit} resolveVisitDurationMinutes={fieldVisits_1.resolveVisitDurationMinutes}/>);
    };
    var loginTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Device Time";
    var loginTimeLabel = new Intl.DateTimeFormat([], {
        hour: "numeric",
        minute: "2-digit",
    }).format(loginSceneTime);
    var loginDateLabel = new Intl.DateTimeFormat([], {
        weekday: "long",
        month: "long",
        day: "numeric",
    }).format(loginSceneTime);
    var loginSceneMode = getLoginSceneMode(loginSceneTime);
    return (<div className={"admin-shell".concat(showAdminLogin ? " admin-shell-login" : "").concat(!showAdminLogin && sidebarCollapsed ? " admin-shell-sidebar-rail" : "")}>
      {!showAdminLogin ? (<AdminSidebar_1.default profile={profile} activePanel={activePanel} onSelectPanel={function (id) {
                setActivePanel(id);
                navigate((0, adminPanelPaths_1.getAdminPanelPath)(id));
            }} onAddOrgUnit={canWriteAdminData ? handleAddOrgUnit : undefined} onCollapsedChange={setSidebarCollapsed} onSearchClick={function () {
                return window.dispatchEvent(new Event("fawnix:open-admin-jump"));
            }} onLogout={handleLogout}/>) : null}

      <main className={"dashboard-main".concat(showAdminLogin ? " dashboard-main-login" : "")}>
        {fieldVisitPanelOpen && fieldVisitPanelRow ? (<FieldVisitDetailDrawer_1.default row={fieldVisitPanelRow} durationMinutes={fieldVisitPanelDurationMinutes} loading={fieldVisitPanelLoading} error={fieldVisitPanelError} timelineItems={fieldVisitTimelineItems} formatDateTime={dateUtils_1.formatDateTime} onClose={function () { return setFieldVisitPanelOpen(false); }}/>) : null}
        {mapDialogOpen ? (<MapDialog_1.default title={mapDialogTitle} loading={mapDialogLoading} error={mapDialogError} mapContainerRef={mapContainerRef} mapCenter={mapCenter} fieldPointCount={fieldPointCount} activityPointCount={activityPointCount} distanceKm={mapSummary === null || mapSummary === void 0 ? void 0 : mapSummary.distanceKm} startPoint={startPoint} endPoint={endPoint} mapTrackingPoints={mapTrackingPoints} onClose={function () { return setMapDialogOpen(false); }}/>) : null}
        {!showAdminLogin ? (<AdminTopbar_1.default activePanel={activePanel} onSelectPanel={function (id) {
                setActivePanel(id);
                navigate((0, adminPanelPaths_1.getAdminPanelPath)(id));
            }} onRefresh={function () { return loadDashboard(accessToken); }} syncDeps={[
                activePanel,
                attendanceDateFilter,
                employees.length,
                attendanceRows.length,
            ]}/>) : null}

        {showAdminLogin ? (<AdminLoginPage_1.default adminEmpCode={adminEmpCode} adminOtp={adminOtp} authLoading={authLoading} authStatus={authStatus} loginDateLabel={loginDateLabel} loginLocationDetails={loginLocationDetails} loginSceneMode={loginSceneMode} loginTimeLabel={loginTimeLabel} loginTimeZone={loginTimeZone} onAdminEmpCodeChange={setAdminEmpCode} onAdminOtpChange={setAdminOtp} onBack={function () { return navigate(routes_1.appRoutes.home); }} onLogin={function () { return void handleAdminLogin(); }} onRequestOtp={function () { return void handleAdminRequestOtp(); }} timeZoneLabel={formatTimeZoneLabel(loginTimeZone)}/>) : (<div className="dashboard-canvas">
            {refreshNotice ? (<div className="refresh-toast">{refreshNotice}</div>) : null}
            {renderDashboardPanel()}
          </div>)}

        {employeePanelMode ? (<EmployeeFormDrawer_1.default mode={employeePanelMode} newEmployee={newEmployee} updateNewEmployee={updateNewEmployee} resetNewEmployee={resetNewEmployee} createEmployeeLoading={createEmployeeLoading} createEmployeeStatus={createEmployeeStatus} onCreateEmployee={function () { return void handleCreateEmployee(); }} editingEmployee={editingEmployee} editFormData={editFormData} setEditFormData={setEditFormData} editLoading={editLoading} editStatus={editStatus} onSaveEmployee={handleSaveEmployee} onClose={closeEmployeePanel} shiftOptions={shiftOptions} employees={employees}/>) : null}
        {employeeImportOpen ? (<EmployeeImportDrawer_1.default employees={employees} apiRequest={apiRequest} onClose={closeEmployeeImport} onImported={refreshAfterEmployeeImport} onDownloadTemplate={downloadEmployeesTemplate}/>) : null}
        {viewingEmployee ? (<EmployeeViewDrawer_1.default employee={viewingEmployee} onClose={closeEmployeeView} onEdit={canWriteAdminData
                ? function () {
                    closeEmployeeView();
                    handleEditEmployee(viewingEmployee);
                }
                : undefined}/>) : null}
        {deleteEmployeeTarget ? (<DeleteEmployeeModal_1.default target={deleteEmployeeTarget} deleteLoading={deleteEmployeeLoading} statusMessage={editStatus} onClose={function () { return setDeleteEmployeeTarget(null); }} onConfirmDelete={function () { return void handleDeleteEmployee(); }}/>) : null}
      </main>
    </div>);
}
exports.default = FawnixApp;
