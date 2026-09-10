"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateTime = formatDateTime;
exports.formatDate = formatDate;
exports.formatDateOnly = formatDateOnly;
exports.toDateInputValue = toDateInputValue;
exports.parseDateInputValue = parseDateInputValue;
exports.formatAttendanceDateLabel = formatAttendanceDateLabel;
exports.getCalendarMonthLabel = getCalendarMonthLabel;
exports.getCalendarDays = getCalendarDays;
exports.isSameDate = isSameDate;
function formatDateTime(value) {
    if (!value) {
        return '--';
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatDate(value) {
    if (!value) {
        return '--';
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
function formatDateOnly(value) {
    var rawValue = (value || '').trim();
    if (!rawValue) {
        return '--';
    }
    var dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        var year = dateMatch[1], month = dateMatch[2], day = dateMatch[3];
        var parsed = new Date(Number(year), Number(month) - 1, Number(day));
        return parsed.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    return formatDate(rawValue);
}
function toDateInputValue(value) {
    var offsetValue = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offsetValue).toISOString().slice(0, 10);
}
function parseDateInputValue(value) {
    var _a = value.split('-').map(function (item) { return Number(item); }), year = _a[0], month = _a[1], day = _a[2];
    if (!year || !month || !day) {
        return new Date();
    }
    return new Date(year, month - 1, day);
}
function formatAttendanceDateLabel(value) {
    if (!value) {
        return 'Pick a date';
    }
    var parsed = parseDateInputValue(value);
    return parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}
function getCalendarMonthLabel(value) {
    return value.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
}
function getCalendarDays(viewDate) {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    var firstOfMonth = new Date(year, month, 1);
    var startOffset = firstOfMonth.getDay();
    var gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, function (_, index) {
        var date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return date;
    });
}
function isSameDate(value, targetDate) {
    if (!value || !targetDate) {
        return false;
    }
    var dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|\s)/);
    if (dateOnlyMatch) {
        return dateOnlyMatch[1] === targetDate;
    }
    var parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return toDateInputValue(parsed) === targetDate;
    }
    return value.slice(0, 10) === targetDate;
}
