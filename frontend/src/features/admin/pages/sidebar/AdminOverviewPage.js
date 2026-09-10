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
exports.default = AdminOverviewPage;
/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
require("./AdminOverviewPage.css");
var Utils_1 = require("../../utils/Utils");
var Kpistrip_1 = require("../../components/Kpistrip");
var MainGrid_1 = require("../../components/MainGrid");
var Departmentspanel_1 = require("../../components/Departmentspanel");
var EmployeeAuditPanel_1 = require("../../components/EmployeeAuditPanel");
var LEAVE_SPARK_BUCKETS = 15;
function parseOverviewDate(value) {
    var rawValue = (value || "").trim();
    if (!rawValue) {
        return null;
    }
    var dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        var year = dateMatch[1], month = dateMatch[2], day = dateMatch[3];
        var parsed_1 = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed_1.getTime()) ? null : parsed_1;
    }
    var parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function getMonthBounds(monthKey) {
    var _a = monthKey.split("-").map(Number), year = _a[0], month = _a[1];
    if (!year || !month) {
        return null;
    }
    return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0),
    };
}
function getMonthKeyFromDate(date) {
    return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, "0"));
}
function getAnnualDateForYear(sourceDate, year) {
    var month = sourceDate.getMonth();
    var day = sourceDate.getDate();
    var next = new Date(year, month, day);
    if (next.getMonth() !== month) {
        return new Date(year, month + 1, 0);
    }
    return next;
}
function getNextAnnualDate(sourceDate, today) {
    var next = getAnnualDateForYear(sourceDate, today.getFullYear());
    if (next < today) {
        next = getAnnualDateForYear(sourceDate, today.getFullYear() + 1);
    }
    return next;
}
function getLeaveDateRange(row) {
    var fromDate = parseOverviewDate(row.from_date);
    var toDate = parseOverviewDate(row.to_date);
    var start = fromDate || toDate;
    var end = toDate || fromDate;
    if (!start || !end) {
        return null;
    }
    return start <= end ? { start: start, end: end } : { start: end, end: start };
}
function leaveOverlapsMonth(row, monthKey) {
    var range = getLeaveDateRange(row);
    var bounds = getMonthBounds(monthKey);
    if (!range || !bounds) {
        return false;
    }
    return range.start <= bounds.end && range.end >= bounds.start;
}
function countLeavesInMonth(rows, monthKey) {
    return rows.filter(function (row) { return leaveOverlapsMonth(row, monthKey); }).length;
}
function formatOverviewMonthLabel(monthKey) {
    var bounds = getMonthBounds(monthKey);
    if (!bounds) {
        return "Selected month";
    }
    return bounds.start.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
    });
}
function buildLeaveSparkData(rows, monthKey) {
    var bounds = getMonthBounds(monthKey);
    var buckets = Array.from({ length: LEAVE_SPARK_BUCKETS }, function () { return 0; });
    if (!bounds) {
        return buckets.map(function () { return 4; });
    }
    var daysInMonth = bounds.end.getDate();
    rows.forEach(function (row) {
        var range = getLeaveDateRange(row);
        if (!range || range.start > bounds.end || range.end < bounds.start) {
            return;
        }
        var markerTime = Math.max(bounds.start.getTime(), Math.min(range.start.getTime(), bounds.end.getTime()));
        var markerDate = new Date(markerTime);
        var bucketIndex = Math.min(buckets.length - 1, Math.floor(((markerDate.getDate() - 1) / daysInMonth) * buckets.length));
        buckets[bucketIndex] += 1;
    });
    var maxBucket = Math.max.apply(Math, __spreadArray(__spreadArray([], buckets, false), [0], false));
    if (!maxBucket) {
        return buckets.map(function () { return 4; });
    }
    return buckets.map(function (count) {
        return count ? Math.max(Math.round((count / maxBucket) * 100), 18) : 4;
    });
}
function AdminOverviewPage(_a) {
    var _b;
    var attendanceDateFilter = _a.attendanceDateFilter, _c = _a.attendanceCountByDate, attendanceCountByDate = _c === void 0 ? {} : _c, employees = _a.employees, employeeAuditLogs = _a.employeeAuditLogs, missedLoginLeader = _a.missedLoginLeader, fieldVisitRows = _a.fieldVisitRows, firstClockInRows = _a.firstClockInRows, leaveRows = _a.leaveRows, selectedDateLeaves = _a.selectedDateLeaves, weeklyAttendanceTrend = _a.weeklyAttendanceTrend;
    // ── Derived counts ─────────────────────────────────
    var activeEmployees = employees.filter(function (e) { return e.is_active !== false; }).length;
    var totalEmployees = activeEmployees || employees.length;
    var presentToday = firstClockInRows.length;
    var fieldActive = fieldVisitRows.filter(function (r) {
        var s = "".concat((r === null || r === void 0 ? void 0 : r.status) || (r === null || r === void 0 ? void 0 : r.visitStatus) || "").toLowerCase();
        return s ? !s.includes("complete") && !s.includes("closed") : true;
    }).length;
    var upcomingBirthdays = (0, react_1.useMemo)(function () {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return employees
            .map(function (employee) {
            var dob = parseOverviewDate(employee.emp_date_of_birth ||
                employee.date_of_birth ||
                employee.birth_date ||
                employee.birthday);
            if (!dob)
                return null;
            var next = getNextAnnualDate(dob, today);
            var daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
            return { employee: employee, date: next, daysUntil: daysUntil };
        })
            .filter(function (item) {
            return item !== null && item.daysUntil <= 30;
        })
            .sort(function (a, b) { return a.daysUntil - b.daysUntil; });
    }, [employees]);
    var upcomingWorkAnniversaries = (0, react_1.useMemo)(function () {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return employees
            .map(function (employee) {
            var joinedDate = parseOverviewDate(employee.emp_joined_date ||
                employee.emp_joining_date ||
                employee.joining_date ||
                employee.joined_date ||
                employee.date_of_joining);
            if (!joinedDate)
                return null;
            var next = getNextAnnualDate(joinedDate, today);
            var years = next.getFullYear() - joinedDate.getFullYear();
            if (years < 1)
                return null;
            var daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
            return { employee: employee, date: next, daysUntil: daysUntil, years: years };
        })
            .filter(function (item) {
            return item !== null && item.daysUntil <= 30;
        })
            .sort(function (a, b) {
            if (a.daysUntil !== b.daysUntil)
                return a.daysUntil - b.daysUntil;
            return (a.employee.emp_full_name || "").localeCompare(b.employee.emp_full_name || "");
        });
    }, [employees]);
    // ── Date / label helpers ───────────────────────────
    var weekLabel = (0, Utils_1.getWeekRangeLabel)(attendanceDateFilter);
    var selectedDateLabel = new Date("".concat(attendanceDateFilter, "T00:00:00")).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    var monthKey = (0, Utils_1.toMonthKey)(attendanceDateFilter);
    var prevMonthKey = (0, Utils_1.getPrevMonthKey)(monthKey);
    var prevMonthLabel = (0, Utils_1.getPrevMonthLabel)(monthKey);
    // ── KPI values ─────────────────────────────────────
    var leaveKpi = (0, react_1.useMemo)(function () {
        var selectedMonthHasLeaves = countLeavesInMonth(leaveRows, monthKey) > 0;
        var latestLeaveMonthKey = leaveRows.reduce(function (latestMonth, row) {
            var range = getLeaveDateRange(row);
            if (!range) {
                return latestMonth;
            }
            var rowMonthKey = getMonthKeyFromDate(range.end);
            return !latestMonth || rowMonthKey > latestMonth
                ? rowMonthKey
                : latestMonth;
        }, "");
        var activeMonthKey = selectedMonthHasLeaves
            ? monthKey
            : latestLeaveMonthKey || monthKey;
        var previousMonthKey = (0, Utils_1.getPrevMonthKey)(activeMonthKey);
        var currentCount = countLeavesInMonth(leaveRows, activeMonthKey);
        var previousCount = countLeavesInMonth(leaveRows, previousMonthKey);
        var delta = currentCount > 0 || previousCount > 0
            ? currentCount - previousCount
            : null;
        return {
            currentCount: currentCount,
            previousCount: previousCount,
            delta: delta,
            monthLabel: formatOverviewMonthLabel(activeMonthKey),
            previousMonthLabel: (0, Utils_1.getPrevMonthLabel)(activeMonthKey),
            sparkData: buildLeaveSparkData(leaveRows, activeMonthKey),
        };
    }, [leaveRows, monthKey]);
    var maxWeekly = Math.max.apply(Math, __spreadArray(__spreadArray([], weeklyAttendanceTrend.map(function (i) { return i.count; }), false), [1], false));
    var averageWeeklyAttendance = weeklyAttendanceTrend.length
        ? Math.round((weeklyAttendanceTrend.reduce(function (s, i) { return s + i.count; }, 0) /
            weeklyAttendanceTrend.length /
            Math.max(totalEmployees, 1)) *
            100)
        : 0;
    // ── Month-over-month deltas ────────────────────────
    var thisMonthAttRate = (0, Utils_1.getMonthAvgRate)(attendanceCountByDate, monthKey, totalEmployees);
    var prevMonthAttRate = (0, Utils_1.getMonthAvgRate)(attendanceCountByDate, prevMonthKey, totalEmployees);
    var attendanceDelta = thisMonthAttRate !== null && prevMonthAttRate !== null
        ? thisMonthAttRate - prevMonthAttRate
        : null;
    // ── Spark data (shared between attendance + on-time cards) ──
    var sparkData = weeklyAttendanceTrend
        .slice(-7)
        .map(function (item) {
        return maxWeekly > 0
            ? Math.max(Math.round((item.count / maxWeekly) * 100), 4)
            : 4;
    });
    // ── Department entries ─────────────────────────────
    var attendancePct = totalEmployees
        ? Math.round((presentToday / totalEmployees) * 100)
        : 0;
    var attendanceHealthLabel = attendancePct >= 90
        ? "Optimal"
        : attendancePct >= 72
            ? "Stable"
            : "Needs attention";
    var activeLeaveCount = selectedDateLeaves.length;
    var deptEntries = (0, react_1.useMemo)(function () {
        var map = {};
        var employeeByEmail = new Map(employees
            .filter(function (e) { return e.emp_email; })
            .map(function (e) { return [String(e.emp_email).toLowerCase(), e]; }));
        employees.forEach(function (e) {
            var dept = (e.emp_department || "Unassigned").trim();
            if (!map[dept])
                map[dept] = { head: 0, present: 0 };
            map[dept].head += 1;
        });
        firstClockInRows.forEach(function (r) {
            var employee = r.employee_email
                ? employeeByEmail.get(String(r.employee_email).toLowerCase())
                : undefined;
            var dept = (r.emp_department ||
                (employee === null || employee === void 0 ? void 0 : employee.emp_department) ||
                r.emp_designation ||
                (employee === null || employee === void 0 ? void 0 : employee.emp_designation) ||
                "Unassigned").trim();
            if (!map[dept])
                map[dept] = { head: 0, present: 0 };
            map[dept].present += 1;
        });
        return Object.entries(map)
            .sort(function (a, b) { return b[1].head - a[1].head; })
            .slice(0, 6);
    }, [employees, firstClockInRows]);
    var greeting = (0, Utils_1.getGreeting)();
    return (<div className="ov2-shell admin-aligned-page admin-aligned-page--overview">
      <div className="ov2-content">
        {/* ── Page header ── */}
        <div className="ov2-page-header">
          <div>
            <span className="ov2-page-kicker">
              <i aria-hidden="true"/>
              Live workspace
            </span>
            {/* The shell topbar owns the page-level <h1>, so this is an h2. */}
            <h2 className="ov2-page-title">{greeting}, Admin</h2>
            <p className="ov2-page-sub">
              {presentToday} of {totalEmployees} present &middot; {fieldActive}{" "}
              in the field &middot; {activeLeaveCount} leave signals
            </p>
          </div>
          <div className="ov2-header-metrics" aria-label="Dashboard summary">
            <span>
              <b>{attendancePct}%</b>
              attendance
            </span>
            <span>
              <b>{attendanceHealthLabel}</b>
              health
            </span>
            <span>
              <b>{weekLabel}</b>
              window
            </span>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <Kpistrip_1.KpiStrip averageWeeklyAttendance={averageWeeklyAttendance} presentToday={presentToday} totalEmployees={totalEmployees} weekLabel={weekLabel} attendanceDelta={attendanceDelta} sparkData={sparkData} missedLoginEmployeeName={String((missedLoginLeader === null || missedLoginLeader === void 0 ? void 0 : missedLoginLeader.emp_full_name) || "")} missedLoginCount={Number((missedLoginLeader === null || missedLoginLeader === void 0 ? void 0 : missedLoginLeader.missed_logins) || 0)} monthlyLeaveRequests={leaveKpi.currentCount} previousMonthLeaveRequests={leaveKpi.previousCount} monthlyLabel={leaveKpi.monthLabel} leavesDelta={leaveKpi.delta} leaveSparkData={leaveKpi.sparkData} leavePrevMonthLabel={leaveKpi.previousMonthLabel} upcomingBirthdayCount={upcomingBirthdays.length} nextBirthdayName={((_b = upcomingBirthdays[0]) === null || _b === void 0 ? void 0 : _b.employee.emp_full_name) || ""} prevMonthLabel={prevMonthLabel}/>

        {/* ── Main grid: chart + exceptions ── */}
        <MainGrid_1.MainGrid trend={weeklyAttendanceTrend} weekLabel={weekLabel} averageWeeklyAttendance={averageWeeklyAttendance} presentToday={presentToday} selectedDateLeavesCount={selectedDateLeaves.length} fieldVisitsCount={fieldVisitRows.length} fieldActive={fieldActive} totalEmployees={totalEmployees} birthdays={upcomingBirthdays} workAnniversaries={upcomingWorkAnniversaries}/>

        {/* ── Lower grid: departments + approvals ── */}
        <div className="ov2-lower-grid">
          <Departmentspanel_1.DepartmentsPanel deptEntries={deptEntries} selectedDateLabel={selectedDateLabel}/>
          <EmployeeAuditPanel_1.EmployeeAuditPanel logs={employeeAuditLogs}/>
        </div>
      </div>
    </div>);
}
