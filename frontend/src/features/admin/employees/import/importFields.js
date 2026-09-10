"use strict";
/**
 * The employee fields a spreadsheet column can be mapped onto, plus the
 * normalisation/validation each one needs before it is handed to the existing
 * /api/users endpoints. Field names match the API contract exactly so the
 * import reuses the same server-side validation as the Add/Edit drawer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEY_FIELD = exports.FIELD_BY_KEY = exports.IMPORT_FIELDS = exports.normalizeDate = exports.ROLES = exports.BLOOD_GROUPS = void 0;
exports.autoMapColumns = autoMapColumns;
exports.BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
exports.ROLES = ['employee', 'admin', 'user_manager'];
var normalizeEmail = function (value) {
    var email = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { error: "\"".concat(value, "\" is not a valid email address") };
    return { value: email };
};
var normalizeContact = function (value) {
    var contact = value.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{6,15}$/.test(contact))
        return { error: "\"".concat(value, "\" is not a valid phone number") };
    return { value: contact };
};
var normalizeInteger = function (value) {
    var trimmed = value.trim();
    if (!/^\d+$/.test(trimmed))
        return { error: "\"".concat(value, "\" must be a whole number") };
    return { value: trimmed };
};
var normalizeBloodGroup = function (value) {
    var group = value.trim().toUpperCase().replace(/\s+/g, '');
    var expanded = group
        .replace(/POSITIVE$/, '+')
        .replace(/NEGATIVE$/, '-')
        .replace(/POS$/, '+')
        .replace(/NEG$/, '-');
    if (!exports.BLOOD_GROUPS.includes(expanded))
        return { error: "\"".concat(value, "\" is not a known blood group") };
    return { value: expanded };
};
var normalizeRole = function (value) {
    var role = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!exports.ROLES.includes(role))
        return { error: "\"".concat(value, "\" is not a valid role (").concat(exports.ROLES.join(', '), ")") };
    return { value: role };
};
var MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
var pad = function (value) { return String(value).padStart(2, '0'); };
/**
 * Accepts the shapes HR spreadsheets actually contain — ISO, dd/mm/yyyy,
 * dd-mmm-yyyy and raw Excel serials — and emits yyyy-mm-dd for the API.
 * Ambiguous d/m vs m/d is resolved as day-first (the app formats dates en-IN).
 */
var normalizeDate = function (value) {
    var _a;
    var raw = value.trim();
    if (!raw)
        return { value: '' };
    var iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) {
        var year = iso[1], month = iso[2], day = iso[3];
        return validDate(Number(year), Number(month), Number(day), raw);
    }
    var dayFirst = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (dayFirst) {
        var first = dayFirst[1], second = dayFirst[2], yearPart = dayFirst[3];
        var day = Number(first);
        var month = Number(second);
        // Only flip when the first number cannot be a day.
        if (day > 12 && month <= 12) {
            // already day-first
        }
        else if (month > 12 && day <= 12) {
            ;
            _a = [month, day], day = _a[0], month = _a[1];
        }
        var year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
        return validDate(year, month, day, raw);
    }
    var named = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2}|\d{4})$/);
    if (named) {
        var day = named[1], monthName = named[2], yearPart = named[3];
        var month = MONTHS[monthName.slice(0, 3).toLowerCase()];
        if (!month)
            return { error: "\"".concat(value, "\" is not a recognised date") };
        var year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
        return validDate(year, month, Number(day), raw);
    }
    // Bare Excel serial (a numeric cell that was never styled as a date).
    if (/^\d{5}(\.\d+)?$/.test(raw)) {
        var date = new Date(Math.round((Number(raw) - 25569) * 86400 * 1000));
        if (!Number.isNaN(date.getTime()))
            return { value: date.toISOString().slice(0, 10) };
    }
    return { error: "\"".concat(value, "\" is not a recognised date (use YYYY-MM-DD or DD/MM/YYYY)") };
};
exports.normalizeDate = normalizeDate;
function validDate(year, month, day, raw) {
    var date = new Date(Date.UTC(year, month - 1, day));
    var roundTrips = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!roundTrips)
        return { error: "\"".concat(raw, "\" is not a real calendar date") };
    return { value: "".concat(year, "-").concat(pad(month), "-").concat(pad(day)) };
}
exports.IMPORT_FIELDS = [
    {
        key: 'emp_code',
        label: 'Employee ID',
        aliases: ['emp code', 'employee id', 'employee code', 'empid', 'emp id', 'employee no', 'employee number', 'staff id', 'code'],
        isKey: true,
        requiredForCreate: true,
        hint: 'Used to match existing employees',
    },
    {
        key: 'emp_first_name',
        label: 'First Name',
        aliases: ['first name', 'employee first name', 'given name'],
    },
    {
        key: 'emp_last_name',
        label: 'Last Name',
        aliases: ['last name', 'employee last name', 'surname', 'family name'],
    },
    {
        key: 'emp_full_name',
        label: 'Employee Name',
        aliases: ['employee name', 'full name', 'name', 'emp name', 'staff name', 'display name'],
        requiredForCreate: true,
    },
    {
        key: 'emp_email',
        label: 'Email',
        aliases: ['email', 'email id', 'email address', 'official email', 'work email', 'mail'],
        requiredForCreate: true,
        normalize: normalizeEmail,
    },
    {
        key: 'emp_contact',
        label: 'Contact Number',
        aliases: ['contact', 'contact number', 'mobile', 'mobile number', 'phone', 'phone number', 'cell'],
        normalize: normalizeContact,
    },
    {
        key: 'emp_designation',
        label: 'Designation',
        aliases: ['designation', 'job title', 'title', 'position', 'role title'],
    },
    {
        key: 'emp_department',
        label: 'Department',
        aliases: ['department', 'dept', 'division', 'function'],
    },
    {
        key: 'emp_branch_id',
        label: 'Branch ID',
        aliases: ['branch id', 'branch code', 'employee branch'],
        normalize: normalizeInteger,
    },
    {
        key: 'emp_work_timings',
        label: 'Work Timings',
        aliases: ['work timings', 'working hours', 'work hours', 'office timings'],
    },
    {
        key: 'emp_grade',
        label: 'Grade',
        aliases: ['grade', 'band', 'level', 'pay grade'],
    },
    {
        key: 'emp_manager',
        label: 'Manager (Employee ID)',
        aliases: ['manager', 'manager id', 'manager code', 'reporting manager', 'reports to', 'supervisor'],
        hint: 'Must be an Employee ID, not a name',
    },
    {
        key: 'emp_informing_manager',
        label: 'Informing Manager (Employee ID)',
        aliases: ['informing manager', 'informing manager id', 'secondary manager', 'alternate manager'],
        hint: 'Must be an Employee ID, not a name',
    },
    {
        key: 'emp_shift_id',
        label: 'Shift ID',
        aliases: ['shift', 'shift id', 'shift code'],
        normalize: normalizeInteger,
    },
    {
        key: 'emp_joined_date',
        label: 'Joining Date',
        aliases: ['joining date', 'date of joining', 'joined date', 'doj', 'hire date', 'start date', 'emp joining date'],
        normalize: exports.normalizeDate,
    },
    {
        key: 'emp_date_of_birth',
        label: 'Date of Birth',
        aliases: ['date of birth', 'dob', 'birth date', 'birthday'],
        normalize: exports.normalizeDate,
    },
    {
        key: 'emp_blood_group',
        label: 'Blood Group',
        aliases: ['blood group', 'blood', 'bloodgroup', 'blood type'],
        normalize: normalizeBloodGroup,
    },
    {
        key: 'role',
        label: 'System Role',
        aliases: ['role', 'system role', 'access role', 'user role', 'access level'],
        createOnly: true,
        hint: 'Applied to new employees only',
        normalize: normalizeRole,
    },
];
exports.FIELD_BY_KEY = new Map(exports.IMPORT_FIELDS.map(function (field) { return [field.key, field]; }));
exports.KEY_FIELD = 'emp_code';
var canonical = function (value) { return value.toLowerCase().replace(/[\s_\-.()/]+/g, ' ').trim(); };
/**
 * Best-effort column → field guess. Exact alias matches win over partial ones,
 * and each field is only claimed once so two similar headers can't collide.
 */
function autoMapColumns(headers) {
    var taken = new Set();
    var mapping = headers.map(function () { return null; });
    var claim = function (index, key) {
        mapping[index] = key;
        taken.add(key);
    };
    // Pass 1 — exact matches against the field key or a known alias.
    headers.forEach(function (header, index) {
        var name = canonical(header);
        if (!name)
            return;
        var match = exports.IMPORT_FIELDS.find(function (field) {
            return !taken.has(field.key) &&
                (canonical(field.key) === name || canonical(field.label) === name || field.aliases.some(function (alias) { return canonical(alias) === name; }));
        });
        if (match)
            claim(index, match.key);
    });
    // Pass 2 — substring matches for headers like "Employee Department (HR)".
    headers.forEach(function (header, index) {
        if (mapping[index])
            return;
        var name = canonical(header);
        if (!name)
            return;
        var match = exports.IMPORT_FIELDS.find(function (field) { return !taken.has(field.key) && field.aliases.some(function (alias) { return name.includes(canonical(alias)); }); });
        if (match)
            claim(index, match.key);
    });
    return mapping;
}
