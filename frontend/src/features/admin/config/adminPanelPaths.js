"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPanelPathMap = void 0;
exports.getAdminPanelPath = getAdminPanelPath;
exports.getAdminPanelFromPath = getAdminPanelFromPath;
var routes_1 = require("../../../app/config/routes");
/**
 * Panel <-> URL mapping, shared by the app shell and the sidebar.
 *
 * The sidebar renders real anchors from this, so nav items can be
 * middle-clicked, opened in a new tab and copied like any other link.
 */
exports.adminPanelPathMap = {
    dashboard: "",
    employees: "employees",
    "employee-master-working-units": "employee-master/working-units",
    "employee-master-payroll-units": "employee-master/payroll-units",
    "employee-master-designations": "employee-master/designations",
    "employee-master-departments": "employee-master/departments",
    attendance: "attendance",
    "attendance-records": "attendance-records",
    "attendance-exceptions": "attendance-exceptions",
    "overtime-records": "overtime-records",
    inbox: "inbox",
    calendar: "calendar",
    reports: "reports",
    leaves: "leaves",
    activities: "activities",
    "field-visits": "field-visits",
    "api-telemetry": "api-telemetry",
};
function getAdminPanelPath(panel) {
    var slug = exports.adminPanelPathMap[panel];
    return slug ? "".concat(routes_1.appRoutes.admin, "/").concat(slug) : routes_1.appRoutes.admin;
}
function getAdminPanelFromPath(pathname) {
    var normalizedPath = pathname.replace(/\/+$/, "");
    if (normalizedPath === routes_1.appRoutes.admin) {
        return "dashboard";
    }
    var prefix = "".concat(routes_1.appRoutes.admin, "/");
    if (!normalizedPath.startsWith(prefix)) {
        return "dashboard";
    }
    var slug = normalizedPath.slice(prefix.length);
    var matched = Object.entries(exports.adminPanelPathMap).find(function (_a) {
        var value = _a[1];
        return value === slug;
    });
    return (matched === null || matched === void 0 ? void 0 : matched[0]) || "dashboard";
}
