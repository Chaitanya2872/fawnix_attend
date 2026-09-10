"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_LEAVE_FILTERS = exports.LEAVE_STATUS_FILTER_OPTIONS = exports.LEAVE_TYPE_FILTER_OPTIONS = exports.SIDEBAR_LIVE_ITEM_IDS = exports.sidebarItems = exports.sidebarSections = exports.API_TELEMETRY_EMP_CODE = void 0;
exports.findSidebarItem = findSidebarItem;
exports.API_TELEMETRY_EMP_CODE = '8888';
exports.sidebarSections = [
    {
        items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home' }]
    },
    {
        title: 'Activities',
        items: [
            { id: 'attendance', label: "Today's activity", icon: 'pulse' },
            { id: 'attendance-records', label: 'Attendance log', icon: 'list' },
            { id: 'attendance-exceptions', label: 'Exceptions', icon: 'alert' },
            { id: 'field-visits', label: 'Field visits', icon: 'pin' },
            { id: 'leaves', label: 'Leave requests', icon: 'leaf' },
            { id: 'overtime-records', label: 'Overtime log', icon: 'clock' }
        ]
    },
    {
        title: 'Administration',
        items: [
            { id: 'employees', label: 'Employee directory', icon: 'users' },
            {
                id: 'employee-master-working-units',
                label: 'Organization',
                icon: 'building',
                matchIds: [
                    'employee-master-payroll-units',
                    'employee-master-designations',
                    'employee-master-departments',
                ],
                hasAddAction: true,
            },
            { id: 'reports', label: 'Insights & reports', icon: 'chart' },
            { id: 'inbox', label: 'Inbox', icon: 'inbox' }
        ]
    }
];
/** Flat view of every nav item, derived so the two lists cannot drift apart. */
exports.sidebarItems = exports.sidebarSections.flatMap(function (section) { return section.items; });
/**
 * Resolves a panel to the nav entry that represents it, following `matchIds`
 * so the Organization entry answers for all of its tabs.
 */
function findSidebarItem(panel) {
    return exports.sidebarItems.find(function (item) { var _a; return item.id === panel || Boolean((_a = item.matchIds) === null || _a === void 0 ? void 0 : _a.includes(panel)); });
}
// Item ids that should show a live/pulsing status dot instead of a count badge.
exports.SIDEBAR_LIVE_ITEM_IDS = ['attendance'];
exports.LEAVE_TYPE_FILTER_OPTIONS = [
    { value: 'casual', label: 'Casual' },
    { value: 'sick', label: 'Sick' },
    { value: 'annual', label: 'Annual' },
    { value: 'monthly', label: 'Monthly' }
];
exports.LEAVE_STATUS_FILTER_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' }
];
exports.EMPTY_LEAVE_FILTERS = {
    employeeName: '',
    employeeId: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    status: ''
};
