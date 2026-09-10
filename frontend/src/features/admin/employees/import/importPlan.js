"use strict";
/**
 * Turns a mapped spreadsheet into a reviewable change plan: what each row will
 * do to the database, and exactly which fields would be overwritten.
 *
 * Two rules drive everything here, per the import contract:
 *  1. Only mapped columns can change a value. Unmapped/absent fields keep
 *     whatever the database already holds.
 *  2. A blank uploaded cell never erases an existing value unless the operator
 *     explicitly turns on "replace with blank".
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.existingValue = existingValue;
exports.buildImportPlan = buildImportPlan;
exports.buildCreatePayload = buildCreatePayload;
exports.buildUpdatePayload = buildUpdatePayload;
var importFields_1 = require("./importFields");
/** Reads whichever column the API happens to expose for a field. */
function existingValue(employee, field) {
    var record = employee;
    var candidates = field === 'emp_joined_date'
        ? ['emp_joined_date', 'emp_joining_date', 'joining_date', 'joined_date', 'date_of_joining']
        : [field];
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        var value = record[candidate];
        if (value === null || value === undefined || value === '')
            continue;
        // Dates arrive as timestamps or ISO strings; compare on the date part only.
        var text = String(value);
        if (field === 'emp_joined_date' || field === 'emp_date_of_birth') {
            var match = text.match(/^\d{4}-\d{2}-\d{2}/);
            return match ? match[0] : text.trim();
        }
        return text.trim();
    }
    return '';
}
/** Field-aware equality so casing/format noise isn't reported as a change. */
function isSameValue(field, incoming, current) {
    if (field === 'emp_email')
        return incoming.toLowerCase() === current.toLowerCase();
    if (field === 'emp_shift_id')
        return Number(incoming) === Number(current);
    if (field === 'emp_contact')
        return incoming.replace(/\D/g, '') === current.replace(/\D/g, '');
    return incoming.trim().toLowerCase() === current.trim().toLowerCase();
}
var normalizeKey = function (value) { return value.trim().toLowerCase(); };
function buildImportPlan(rows, mapping, employees, options) {
    var mappedFields = importFields_1.IMPORT_FIELDS.map(function (field) { return field.key; }).filter(function (key) { return mapping.includes(key); });
    var byCode = new Map();
    var codeByEmail = new Map();
    for (var _i = 0, employees_1 = employees; _i < employees_1.length; _i++) {
        var employee = employees_1[_i];
        if (employee.emp_code)
            byCode.set(normalizeKey(employee.emp_code), employee);
        if (employee.emp_email)
            codeByEmail.set(normalizeKey(employee.emp_email), normalizeKey(employee.emp_code || ''));
    }
    var seenCodes = new Map();
    var seenEmails = new Map();
    var planned = [];
    rows.forEach(function (cells, index) {
        var sourceRow = index + 2; // +1 for zero-index, +1 for the header row
        var errors = [];
        var values = {};
        var raw = {};
        var blankFields = new Set();
        var invalidFields = new Set();
        mapping.forEach(function (field, columnIndex) {
            var _a, _b, _c;
            if (!field)
                return;
            var cell = ((_a = cells[columnIndex]) !== null && _a !== void 0 ? _a : '').trim();
            raw[field] = cell;
            if (!cell) {
                blankFields.add(field);
                return;
            }
            var normalize = (_b = importFields_1.FIELD_BY_KEY.get(field)) === null || _b === void 0 ? void 0 : _b.normalize;
            if (!normalize) {
                values[field] = cell;
                return;
            }
            var result = normalize(cell);
            if ('error' in result) {
                errors.push("".concat((_c = importFields_1.FIELD_BY_KEY.get(field)) === null || _c === void 0 ? void 0 : _c.label, ": ").concat(result.error));
                invalidFields.add(field);
                return;
            }
            if (result.value)
                values[field] = result.value;
        });
        var empCode = (values[importFields_1.KEY_FIELD] || '').trim();
        var codeKey = normalizeKey(empCode);
        if (!empCode) {
            errors.push('Employee ID is missing');
        }
        else if (seenCodes.has(codeKey)) {
            errors.push("Duplicate Employee ID \u2014 already used on row ".concat(seenCodes.get(codeKey)));
        }
        else {
            seenCodes.set(codeKey, sourceRow);
        }
        var existing = codeKey ? byCode.get(codeKey) : undefined;
        // Email must stay unique across employees, otherwise the API returns 409.
        var email = values.emp_email;
        if (email) {
            var emailKey = normalizeKey(email);
            var owner = codeByEmail.get(emailKey);
            if (owner && owner !== codeKey) {
                errors.push("Email is already used by employee ".concat(owner.toUpperCase()));
            }
            if (seenEmails.has(emailKey)) {
                errors.push("Duplicate email \u2014 already used on row ".concat(seenEmails.get(emailKey)));
            }
            else {
                seenEmails.set(emailKey, sourceRow);
            }
        }
        var name = values.emp_full_name || (existing === null || existing === void 0 ? void 0 : existing.emp_full_name) || '';
        var base = {
            sourceRow: sourceRow,
            empCode: empCode,
            name: name,
            values: values,
            raw: raw,
            errors: errors,
            existing: existing,
        };
        if (!existing) {
            // Creating: the API demands code, name and email on POST /api/users.
            for (var _i = 0, _a = importFields_1.IMPORT_FIELDS.filter(function (item) { return item.requiredForCreate; }); _i < _a.length; _i++) {
                var field = _a[_i];
                if (field.key === importFields_1.KEY_FIELD)
                    continue;
                // The value was supplied but rejected — that error is already reported.
                if (invalidFields.has(field.key))
                    continue;
                if (!values[field.key]) {
                    var wasMapped = mapping.includes(field.key);
                    errors.push(wasMapped
                        ? "".concat(field.label, " is required to create a new employee")
                        : "".concat(field.label, " is required to create a new employee (column not mapped)"));
                }
            }
            planned.push(__assign(__assign({}, base), { status: errors.length ? 'error' : 'new', changes: [] }));
            return;
        }
        // Updating: diff only the mapped fields.
        var changes = [];
        for (var _b = 0, mappedFields_1 = mappedFields; _b < mappedFields_1.length; _b++) {
            var field = mappedFields_1[_b];
            if (field === importFields_1.KEY_FIELD)
                continue;
            var meta = importFields_1.FIELD_BY_KEY.get(field);
            if (meta === null || meta === void 0 ? void 0 : meta.createOnly)
                continue; // e.g. role — the update API ignores it
            var current = existingValue(existing, field);
            var incoming = values[field];
            if (incoming === undefined) {
                // Blank cell: leave the stored value alone unless explicitly clearing.
                if (options.allowBlankOverwrite && blankFields.has(field) && current) {
                    changes.push({ field: field, label: (meta === null || meta === void 0 ? void 0 : meta.label) || field, from: current, to: '', clearing: true });
                }
                continue;
            }
            if (!isSameValue(field, incoming, current)) {
                changes.push({ field: field, label: (meta === null || meta === void 0 ? void 0 : meta.label) || field, from: current, to: incoming });
            }
        }
        var status = errors.length ? 'error' : changes.length ? 'update' : 'unchanged';
        planned.push(__assign(__assign({}, base), { status: status, changes: changes }));
    });
    var counts = { new: 0, update: 0, unchanged: 0, error: 0 };
    for (var _a = 0, planned_1 = planned; _a < planned_1.length; _a++) {
        var row = planned_1[_a];
        counts[row.status] += 1;
    }
    return { rows: planned, counts: counts, mappedFields: mappedFields };
}
/** Payload for POST /api/users — every mapped value, plus a default role. */
function buildCreatePayload(row) {
    var payload = {};
    for (var _i = 0, _a = Object.entries(row.values); _i < _a.length; _i++) {
        var _b = _a[_i], field = _b[0], value = _b[1];
        if (value)
            payload[field] = value;
    }
    if (!payload.role)
        payload.role = 'employee';
    return payload;
}
/**
 * Payload for PUT /api/users/{emp_code} — only the fields that actually differ.
 * emp_code is omitted deliberately: the API rejects it as a protected field.
 */
function buildUpdatePayload(row) {
    var payload = {};
    for (var _i = 0, _a = row.changes; _i < _a.length; _i++) {
        var change = _a[_i];
        if (change.field === importFields_1.KEY_FIELD)
            continue;
        payload[change.field] = change.to;
    }
    return payload;
}
