"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEmployeeGrade = formatEmployeeGrade;
exports.formatDistanceKm = formatDistanceKm;
exports.formatWorkingHours = formatWorkingHours;
exports.formatCoords = formatCoords;
exports.toTitleCase = toTitleCase;
exports.formatLeaveTypeLabel = formatLeaveTypeLabel;
exports.getLeaveApproverLabel = getLeaveApproverLabel;
exports.getLeaveReasonLabel = getLeaveReasonLabel;
exports.formatTimeZoneLabel = formatTimeZoneLabel;
function formatEmployeeGrade(value) {
    var raw = (value || '').trim();
    if (!raw) {
        return '--';
    }
    var normalized = raw.toUpperCase();
    var compact = normalized.replace(/[\s\-_]/g, '');
    if (normalized === 'NF' || compact === 'NONFLEXIBLE') {
        return 'NF';
    }
    if (normalized === 'F' || compact === 'FLEXIBLE') {
        return 'F';
    }
    if (normalized === 'M' || compact === 'MODERATE') {
        return 'M';
    }
    return raw;
}
function formatDistanceKm(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '--';
    }
    return "".concat(value.toFixed(2), " km");
}
function formatWorkingHours(value) {
    if (value === null || value === undefined || value === '') {
        return '--';
    }
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return '--';
    }
    return "".concat(numericValue.toFixed(2), " h");
}
function formatCoords(value) {
    if (!value) {
        return '--';
    }
    return "".concat(value.lat.toFixed(6), ", ").concat(value.lon.toFixed(6));
}
function toTitleCase(value) {
    return value.replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function formatLeaveTypeLabel(leave) {
    var rawType = (leave.leave_type || '').trim();
    var normalizedType = rawType.toLowerCase();
    if (!rawType) {
        return 'Leave';
    }
    var count = null;
    if (normalizedType === 'sick' || normalizedType === 'casual') {
        var duration = (leave.duration || '').trim().toLowerCase();
        if (duration === 'first_half' || duration === 'second_half') {
            count = 0.5;
        }
        else if (duration === 'full_day') {
            count = 1;
        }
        else if (leave.leave_count !== undefined && leave.leave_count !== null) {
            var numericCount = Number(leave.leave_count);
            if (Number.isFinite(numericCount)) {
                count = numericCount;
            }
        }
    }
    var display = toTitleCase(rawType.replace(/_/g, ' '));
    return count !== null ? "".concat(display, " (").concat(count, ")") : display;
}
function getLeaveApproverLabel(leave, employees) {
    var fallback = leave.reviewed_by || leave.manager_code || leave.manager_email || '--';
    var match = employees.find(function (employee) { return employee.emp_code && employee.emp_code === leave.reviewed_by; }) ||
        employees.find(function (employee) { return employee.emp_code && employee.emp_code === leave.manager_code; }) ||
        employees.find(function (employee) { return employee.emp_email && employee.emp_email === leave.manager_email; });
    return (match === null || match === void 0 ? void 0 : match.emp_full_name) || fallback;
}
function getLeaveReasonLabel(leave) {
    return leave.notes || leave.remarks || '--';
}
function formatTimeZoneLabel(timeZone) {
    if (!timeZone) {
        return 'Device Time';
    }
    var parts = timeZone.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
}
