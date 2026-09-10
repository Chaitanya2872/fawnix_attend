"use strict";
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
exports.useCalendarPanel = useCalendarPanel;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
function useCalendarPanel(_a) {
    var attendanceDateFilter = _a.attendanceDateFilter, attendanceCountByDate = _a.attendanceCountByDate, leaveRows = _a.leaveRows;
    var _b = (0, react_1.useState)(function () { return (0, dateUtils_1.parseDateInputValue)((0, dateUtils_1.toDateInputValue)(new Date())); }), calendarMonthView = _b[0], setCalendarMonthView = _b[1];
    (0, react_1.useEffect)(function () {
        // Deliberate: syncs from attendanceDateFilter on change, but the user can then browse
        // months independently (next/prev) without attendanceDateFilter changing again - a
        // genuine sync-then-diverge case, not a derivable value.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCalendarMonthView((0, dateUtils_1.parseDateInputValue)(attendanceDateFilter || (0, dateUtils_1.toDateInputValue)(new Date())));
    }, [attendanceDateFilter]);
    var calendarMonthLabel = (0, dateUtils_1.getCalendarMonthLabel)(calendarMonthView);
    var calendarDays = (0, dateUtils_1.getCalendarDays)(calendarMonthView);
    var maxCalendarAttendance = Math.max.apply(Math, __spreadArray(__spreadArray([], Object.values(attendanceCountByDate), false), [1], false));
    var leaveCountByDate = leaveRows.reduce(function (accumulator, row) {
        var fromDate = row.from_date ? new Date(row.from_date) : null;
        var toDate = row.to_date ? new Date(row.to_date) : fromDate;
        if (!fromDate || Number.isNaN(fromDate.getTime()) || !toDate || Number.isNaN(toDate.getTime())) {
            return accumulator;
        }
        var cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        var end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        while (cursor <= end) {
            var key = (0, dateUtils_1.toDateInputValue)(cursor);
            accumulator[key] = (accumulator[key] || 0) + 1;
            cursor.setDate(cursor.getDate() + 1);
        }
        return accumulator;
    }, {});
    return {
        calendarMonthView: calendarMonthView,
        setCalendarMonthView: setCalendarMonthView,
        calendarMonthLabel: calendarMonthLabel,
        calendarDays: calendarDays,
        maxCalendarAttendance: maxCalendarAttendance,
        leaveCountByDate: leaveCountByDate
    };
}
