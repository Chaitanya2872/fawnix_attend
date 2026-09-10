"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMonthKey = toMonthKey;
exports.getPrevMonthKey = getPrevMonthKey;
exports.getPrevMonthLabel = getPrevMonthLabel;
exports.getMonthAvgRate = getMonthAvgRate;
exports.getMonthExceptionCount = getMonthExceptionCount;
exports.getWeekRangeLabel = getWeekRangeLabel;
exports.getGreeting = getGreeting;
function toMonthKey(value) {
    return (value || '').slice(0, 7);
}
function getPrevMonthKey(mk) {
    var _a = mk.split('-').map(Number), y = _a[0], m = _a[1];
    return m === 1 ? "".concat(y - 1, "-12") : "".concat(y, "-").concat(String(m - 1).padStart(2, '0'));
}
function getPrevMonthLabel(mk) {
    var prev = getPrevMonthKey(mk);
    return new Date("".concat(prev, "-01T00:00:00")).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
    });
}
function getMonthAvgRate(countByDate, monthKey, totalEmployees) {
    var dates = Object.keys(countByDate).filter(function (d) { return d.startsWith(monthKey); });
    if (!dates.length)
        return null;
    var total = dates.reduce(function (sum, d) { return sum + (countByDate[d] || 0); }, 0);
    return Math.round((total / dates.length / Math.max(totalEmployees, 1)) * 100);
}
function getMonthExceptionCount(exceptionCountByDate, monthKey) {
    return Object.keys(exceptionCountByDate)
        .filter(function (d) { return d.startsWith(monthKey); })
        .reduce(function (sum, d) { return sum + (exceptionCountByDate[d] || 0); }, 0);
}
function getWeekRangeLabel(value) {
    var base = new Date("".concat(value, "T00:00:00"));
    if (Number.isNaN(base.getTime()))
        return 'This week';
    var start = new Date(base);
    start.setDate(start.getDate() - start.getDay());
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    return "".concat(start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), " \u2013 ").concat(end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
}
function getGreeting() {
    var hour = new Date().getHours();
    if (hour < 12)
        return 'Good morning';
    if (hour < 17)
        return 'Good afternoon';
    return 'Good evening';
}
