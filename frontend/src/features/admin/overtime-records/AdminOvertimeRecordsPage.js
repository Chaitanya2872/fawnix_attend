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
exports.default = AdminOvertimeRecordsPage;
var react_1 = require("react");
var ColumnVisibilitySelector_1 = require("../attendance-exceptions/components/ColumnVisibilitySelector");
require("./AdminOvertimeRecordsPage.css");
var ALL_COLUMNS = [
    { key: 'employee', label: 'Employee' },
    { key: 'work_date', label: 'Dates' },
    { key: 'day', label: 'Day' },
    { key: 'extra_hours', label: 'Extra Hours' },
    { key: 'comp_off_days', label: 'Comp-Off Days' },
    { key: 'status', label: 'Status' },
    { key: 'deadline', label: 'Deadline' },
    { key: 'details', label: 'Details' },
    { key: 'email', label: 'Email' },
    { key: 'designation', label: 'Designation' },
    { key: 'attendance_id', label: 'Attendance ID' },
    { key: 'clock_in', label: 'Clock In' },
    { key: 'clock_out', label: 'Clock Out' },
    { key: 'clock_in_sequence', label: 'Clock-In Sequence' },
    { key: 'actual_hours', label: 'Actual Hours' },
    { key: 'standard_hours', label: 'Standard Hours' },
    { key: 'compoff_request_id', label: 'Comp-Off Request ID' },
    { key: 'expires_at', label: 'Expires At' },
    { key: 'approved_at', label: 'Approved At' },
    { key: 'utilized_at', label: 'Utilized At' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
    { key: 'activities', label: 'Activities' },
];
var DEFAULT_VISIBLE = new Set([
    'employee',
    'work_date',
    'extra_hours',
    'comp_off_days',
    'status',
    'deadline',
    'details',
]);
var STORAGE_KEY = 'fawnix_overtime_columns_v2';
var OVERTIME_STATUS_OPTIONS = [
    'eligible',
    'requested',
    'approved',
    'rejected',
    'expired',
    'utilized',
];
function loadVisibleKeys() {
    try {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            var parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return new Set(parsed);
            }
        }
    }
    catch (_a) {
        // Local preference storage should not affect the records page.
    }
    return new Set(DEFAULT_VISIBLE);
}
function saveVisibleKeys(keys) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(__spreadArray([], keys, true)));
    }
    catch (_a) {
        // Ignore unavailable storage.
    }
}
function toNumber(value) {
    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}
function formatDecimal(value, suffix, digits) {
    if (digits === void 0) { digits = 2; }
    var numericValue = toNumber(value);
    if (numericValue === null) {
        return '--';
    }
    return "".concat(numericValue.toFixed(digits), " ").concat(suffix);
}
function formatCount(value) {
    var numericValue = toNumber(value);
    return numericValue === null ? '--' : numericValue.toLocaleString();
}
function normalizeOvertimeStatus(value) {
    var normalized = (value || '').toLowerCase();
    return OVERTIME_STATUS_OPTIONS.includes(normalized)
        ? normalized
        : 'eligible';
}
function formatStatus(value) {
    var raw = (value || '').trim();
    if (!raw) {
        return 'Unknown';
    }
    return raw
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function statusPillClass(value) {
    var normalized = (value || '').toLowerCase();
    if (normalized === 'approved')
        return 'active';
    if (normalized === 'eligible')
        return 'success';
    if (normalized === 'requested')
        return 'accent';
    if (normalized === 'rejected' || normalized === 'expired')
        return 'danger';
    if (normalized === 'utilized')
        return 'inactive';
    return 'inactive';
}
function parseDateValue(value) {
    var raw = (value || '').trim();
    if (!raw)
        return null;
    var dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (dateOnlyMatch) {
        var year = dateOnlyMatch[1], month = dateOnlyMatch[2], day = dateOnlyMatch[3];
        var parsed_1 = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed_1.getTime()) ? null : parsed_1;
    }
    var parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function toDateInputText(value) {
    var raw = (value || '').trim();
    if (!raw) {
        return '';
    }
    var match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (match) {
        return match[1];
    }
    var parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}
function toDateTimeInputText(value) {
    var raw = (value || '').trim();
    if (!raw) {
        return '';
    }
    var match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/.exec(raw);
    if (match) {
        return "".concat(match[1], "T").concat(match[2]);
    }
    var parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    var pad = function (part) { return String(part).padStart(2, '0'); };
    return [
        parsed.getFullYear(),
        '-',
        pad(parsed.getMonth() + 1),
        '-',
        pad(parsed.getDate()),
        'T',
        pad(parsed.getHours()),
        ':',
        pad(parsed.getMinutes()),
    ].join('');
}
function formatCompactDate(value) {
    var parsed = parseDateValue(value);
    if (!parsed) {
        return '--';
    }
    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
    });
}
function formatWorkDateRange(record) {
    var dateLabel = formatCompactDate(record.work_date);
    return "".concat(dateLabel, " - ").concat(dateLabel);
}
function getDayLabel(record) {
    var existing = (record.day_of_week || '').trim();
    if (existing) {
        return formatStatus(existing);
    }
    var parsed = parseDateValue(record.work_date);
    if (!parsed) {
        return '--';
    }
    return parsed.toLocaleDateString('en-IN', { weekday: 'long' });
}
function getEmployeeName(record) {
    return record.emp_full_name || record.emp_name || record.emp_code || 'Unknown employee';
}
function getEmployeeMeta(record) {
    var code = (record.emp_code || record.employee_code || '').trim();
    var department = (record.emp_department || record.department || '').trim();
    var meta = [code, department].filter(Boolean).join('.');
    return meta || record.emp_email || '--';
}
function getDeadlineValue(record) {
    return record.recording_deadline || record.expires_at || record.expired_at || '';
}
function getDeadlineState(record) {
    var status = (record.status || '').toLowerCase();
    if (status === 'expired' || record.expired_at) {
        return 'expired';
    }
    var parsed = parseDateValue(getDeadlineValue(record));
    if (!parsed) {
        return 'missing';
    }
    var today = new Date();
    var startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var soon = new Date(startToday);
    soon.setDate(startToday.getDate() + 7);
    var deadlineDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    if (deadlineDay < startToday) {
        return 'expired';
    }
    if (deadlineDay <= soon) {
        return 'soon';
    }
    return 'ok';
}
function formatDeadline(record, formatDateOnly) {
    var deadline = getDeadlineValue(record);
    return deadline ? formatDateOnly(deadline) : '--';
}
function formatActivityType(value) {
    return formatStatus(value || 'Activity');
}
function formatDurationMinutes(value) {
    var minutes = toNumber(value);
    if (minutes === null) {
        return '--';
    }
    if (minutes < 60) {
        return "".concat(Math.round(minutes), " min");
    }
    var hours = Math.floor(minutes / 60);
    var remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes ? "".concat(hours, "h ").concat(remainingMinutes, "m") : "".concat(hours, "h");
}
function getActivitiesSummary(record) {
    var activities = record.activities || [];
    if (!activities.length) {
        return 'No activities';
    }
    return activities
        .map(function (activity) {
        var parts = [
            formatActivityType(activity.activity_type),
            activity.status ? formatStatus(activity.status) : '',
            formatDurationMinutes(activity.duration_minutes),
        ].filter(Boolean);
        return parts.join(' - ');
    })
        .join('; ');
}
function csvEscape(value) {
    var text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) {
        return "\"".concat(text.replace(/"/g, '""'), "\"");
    }
    return text;
}
function getCsvValue(record, columnKey, formatDateOnly, formatDateTime) {
    var _a, _b, _c;
    switch (columnKey) {
        case 'employee':
            return getEmployeeName(record);
        case 'work_date':
            return "".concat(formatWorkDateRange(record), " ").concat(getDayLabel(record));
        case 'day':
            return getDayLabel(record);
        case 'extra_hours':
            return formatDecimal(record.extra_hours, 'h');
        case 'comp_off_days':
            return formatDecimal(record.comp_off_days, 'd');
        case 'status':
            return formatStatus(record.status);
        case 'deadline':
            return formatDeadline(record, formatDateOnly);
        case 'email':
            return record.emp_email || '';
        case 'designation':
            return record.emp_designation || '';
        case 'attendance_id':
            return (_a = record.attendance_id) !== null && _a !== void 0 ? _a : '';
        case 'clock_in':
            return record.clock_in_time ? formatDateTime(record.clock_in_time) : '';
        case 'clock_out':
            return record.clock_out_time ? formatDateTime(record.clock_out_time) : '';
        case 'clock_in_sequence':
            return (_b = record.clock_in_sequence) !== null && _b !== void 0 ? _b : '';
        case 'actual_hours':
            return formatDecimal(record.actual_hours, 'h');
        case 'standard_hours':
            return formatDecimal(record.standard_hours, 'h');
        case 'compoff_request_id':
            return (_c = record.compoff_request_id) !== null && _c !== void 0 ? _c : '';
        case 'expires_at':
            return record.expires_at ? formatDateOnly(record.expires_at) : '';
        case 'approved_at':
            return record.approval_completed_at ? formatDateTime(record.approval_completed_at) : '';
        case 'utilized_at':
            return record.utilized_at ? formatDateTime(record.utilized_at) : '';
        case 'created_at':
            return record.created_at ? formatDateTime(record.created_at) : '';
        case 'updated_at':
            return record.updated_at ? formatDateTime(record.updated_at) : '';
        case 'activities':
            return getActivitiesSummary(record);
        default:
            return '';
    }
}
function downloadRecordsAsCsv(records, visibleKeys, formatDateOnly, formatDateTime) {
    var exportColumns = ALL_COLUMNS.filter(function (column) { return column.key !== 'details' && visibleKeys.has(column.key); });
    var columns = exportColumns.length
        ? exportColumns
        : ALL_COLUMNS.filter(function (column) { return DEFAULT_VISIBLE.has(column.key) && column.key !== 'details'; });
    var header = columns.map(function (column) { return csvEscape(column.label); }).join(',');
    var lines = records.map(function (record) {
        return columns
            .map(function (column) { return csvEscape(getCsvValue(record, column.key, formatDateOnly, formatDateTime)); })
            .join(',');
    });
    var csv = __spreadArray([header], lines, true).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = "overtime-records-".concat(new Date().toISOString().slice(0, 10), ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
var EMPTY_FORM_VALUES = {
    attendance_id: '',
    emp_code: '',
    work_date: '',
    clock_in_sequence: '1',
    actual_hours: '',
    extra_hours: '',
    standard_hours: '',
    comp_off_days: '',
    status: 'eligible',
    recording_deadline: '',
    expires_at: '',
    expired_at: '',
    approval_completed_at: '',
    utilized_at: '',
    compoff_request_id: '',
};
function recordToFormValues(record) {
    if (!record) {
        return EMPTY_FORM_VALUES;
    }
    return {
        attendance_id: record.attendance_id == null ? '' : String(record.attendance_id),
        emp_code: record.emp_code || record.employee_code || '',
        work_date: toDateInputText(record.work_date),
        clock_in_sequence: record.clock_in_sequence == null ? '' : String(record.clock_in_sequence),
        actual_hours: record.actual_hours == null ? '' : String(record.actual_hours),
        extra_hours: record.extra_hours == null ? '' : String(record.extra_hours),
        standard_hours: record.standard_hours == null ? '' : String(record.standard_hours),
        comp_off_days: record.comp_off_days == null ? '' : String(record.comp_off_days),
        status: normalizeOvertimeStatus(record.status),
        recording_deadline: toDateInputText(record.recording_deadline),
        expires_at: toDateInputText(record.expires_at),
        expired_at: toDateTimeInputText(record.expired_at),
        approval_completed_at: toDateTimeInputText(record.approval_completed_at),
        utilized_at: toDateTimeInputText(record.utilized_at),
        compoff_request_id: record.compoff_request_id == null ? '' : String(record.compoff_request_id),
    };
}
function isNonNegativeNumber(value) {
    if (!value.trim()) {
        return true;
    }
    var numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0;
}
function isPositiveInteger(value) {
    if (!value.trim()) {
        return true;
    }
    var numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0;
}
function validateFormValues(values) {
    if (!values.emp_code.trim()) {
        return 'Employee code is required.';
    }
    if (!values.work_date) {
        return 'Work date is required.';
    }
    var numberFields = [
        ['actual hours', values.actual_hours],
        ['extra hours', values.extra_hours],
        ['standard hours', values.standard_hours],
        ['comp-off days', values.comp_off_days],
    ];
    var invalidNumber = numberFields.find(function (_a) {
        var value = _a[1];
        return !isNonNegativeNumber(value);
    });
    if (invalidNumber) {
        return "".concat(invalidNumber[0], " must be zero or greater.");
    }
    var integerFields = [
        ['attendance ID', values.attendance_id],
        ['clock-in sequence', values.clock_in_sequence],
        ['comp-off request ID', values.compoff_request_id],
    ];
    var invalidInteger = integerFields.find(function (_a) {
        var value = _a[1];
        return !isPositiveInteger(value);
    });
    if (invalidInteger) {
        return "".concat(invalidInteger[0], " must be a positive whole number.");
    }
    return '';
}
function buildMutationPayload(values, includeBlankNulls) {
    var optionalValue = function (value) {
        var trimmed = value.trim();
        return trimmed || (includeBlankNulls ? null : undefined);
    };
    var payload = {
        emp_code: values.emp_code.trim(),
        work_date: values.work_date,
        status: values.status,
    };
    var optionalFields = [
        'attendance_id',
        'clock_in_sequence',
        'actual_hours',
        'extra_hours',
        'standard_hours',
        'comp_off_days',
        'recording_deadline',
        'expires_at',
        'expired_at',
        'approval_completed_at',
        'utilized_at',
        'compoff_request_id',
    ];
    optionalFields.forEach(function (fieldName) {
        var value = optionalValue(values[fieldName]);
        if (value !== undefined) {
            ;
            payload[fieldName] = value;
        }
    });
    return payload;
}
function PlainTh(_a) {
    var columnKey = _a.columnKey, label = _a.label, visible = _a.visible, children = _a.children;
    if (!visible) {
        return null;
    }
    return <th className={"otr-th otr-col--".concat(columnKey)}>{children || label}</th>;
}
function ToolbarIcon(_a) {
    var name = _a.name;
    if (name === 'download') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11"/>
        <path d="m8 10 4 4 4-4"/>
        <path d="M5 18h14"/>
      </svg>);
    }
    if (name === 'clear') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12"/>
        <path d="M18 6 6 18"/>
      </svg>);
    }
    if (name === 'plus') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>);
    }
    if (name === 'edit') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>);
    }
    if (name === 'trash') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v5"/>
        <path d="M14 11v5"/>
      </svg>);
    }
    if (name === 'check') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 13 4 4L19 7"/>
      </svg>);
    }
    if (name === 'search') {
        return (<svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/>
        <path d="m20 20-4.5-4.5"/>
      </svg>);
    }
    return (<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5"/>
      <path d="M4 18v-5h5"/>
      <path d="M18.5 9A7 7 0 0 0 6.9 6.3L4 9"/>
      <path d="M5.5 15A7 7 0 0 0 17.1 17.7L20 15"/>
    </svg>);
}
function DetailFactList(_a) {
    var items = _a.items;
    return (<dl className="otr-drawer-facts">
      {items.map(function (item) { return (<div className="otr-drawer-fact" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || '--'}</dd>
        </div>); })}
    </dl>);
}
function OvertimeRecordFormDialog(_a) {
    var actionLoading = _a.actionLoading, error = _a.error, mode = _a.mode, onChange = _a.onChange, onClose = _a.onClose, onSubmit = _a.onSubmit, values = _a.values;
    if (!mode) {
        return null;
    }
    var title = mode === 'create' ? 'New Overtime Record' : 'Edit Overtime Record';
    var submitLabel = mode === 'create' ? 'Create Record' : 'Save Changes';
    return (<div className="otr-modal-shell" role="presentation">
      <button className="otr-modal-overlay" type="button" onClick={onClose} aria-label="Close overtime form"/>
      <form className="otr-modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={function (event) {
            event.preventDefault();
            onSubmit();
        }}>
        <header className="otr-modal-header">
          <div>
            <p className="otr-drawer-kicker">Overtime Records</p>
            <h3>{title}</h3>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close form">
            x
          </button>
        </header>

        <div className="otr-modal-body">
          <div className="otr-form-grid">
            <label className="otr-form-field">
              <span>Employee Code</span>
              <input value={values.emp_code} onChange={function (event) { return onChange('emp_code', event.target.value); }} placeholder="EMP001" required/>
            </label>
            <label className="otr-form-field">
              <span>Work Date</span>
              <input type="date" value={values.work_date} onChange={function (event) { return onChange('work_date', event.target.value); }} required/>
            </label>
            <label className="otr-form-field">
              <span>Status</span>
              <select value={values.status} onChange={function (event) { return onChange('status', event.target.value); }}>
                {OVERTIME_STATUS_OPTIONS.map(function (status) { return (<option key={status} value={status}>
                    {formatStatus(status)}
                  </option>); })}
              </select>
            </label>
            <label className="otr-form-field">
              <span>Attendance ID</span>
              <input type="number" min={1} step={1} value={values.attendance_id} onChange={function (event) { return onChange('attendance_id', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Clock-In Sequence</span>
              <input type="number" min={1} step={1} value={values.clock_in_sequence} onChange={function (event) { return onChange('clock_in_sequence', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Actual Hours</span>
              <input type="number" min={0} step="0.01" value={values.actual_hours} onChange={function (event) { return onChange('actual_hours', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Extra Hours</span>
              <input type="number" min={0} step="0.01" value={values.extra_hours} onChange={function (event) { return onChange('extra_hours', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Standard Hours</span>
              <input type="number" min={0} step="0.01" value={values.standard_hours} onChange={function (event) { return onChange('standard_hours', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Comp-Off Days</span>
              <input type="number" min={0} step="0.01" value={values.comp_off_days} onChange={function (event) { return onChange('comp_off_days', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Recording Deadline</span>
              <input type="date" value={values.recording_deadline} onChange={function (event) { return onChange('recording_deadline', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Expires At</span>
              <input type="date" value={values.expires_at} onChange={function (event) { return onChange('expires_at', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Comp-Off Request ID</span>
              <input type="number" min={1} step={1} value={values.compoff_request_id} onChange={function (event) { return onChange('compoff_request_id', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Approved At</span>
              <input type="datetime-local" value={values.approval_completed_at} onChange={function (event) { return onChange('approval_completed_at', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Expired At</span>
              <input type="datetime-local" value={values.expired_at} onChange={function (event) { return onChange('expired_at', event.target.value); }}/>
            </label>
            <label className="otr-form-field">
              <span>Utilized At</span>
              <input type="datetime-local" value={values.utilized_at} onChange={function (event) { return onChange('utilized_at', event.target.value); }}/>
            </label>
          </div>
          {error ? <p className="otr-filter-error">{error}</p> : null}
        </div>

        <footer className="otr-modal-footer">
          <button className="otr-btn" type="button" onClick={onClose} disabled={actionLoading}>
            Cancel
          </button>
          <button className="otr-btn otr-btn--primary" type="submit" disabled={actionLoading}>
            <ToolbarIcon name="check"/>
            {actionLoading ? 'Saving...' : submitLabel}
          </button>
        </footer>
      </form>
    </div>);
}
function DeleteOvertimeRecordDialog(_a) {
    var actionLoading = _a.actionLoading, forceDelete = _a.forceDelete, onChangeForce = _a.onChangeForce, onClose = _a.onClose, onConfirm = _a.onConfirm, record = _a.record;
    if (!record) {
        return null;
    }
    return (<div className="otr-modal-shell" role="presentation">
      <button className="otr-modal-overlay" type="button" onClick={onClose} aria-label="Close delete confirmation"/>
      <section className="otr-modal otr-modal--narrow" role="dialog" aria-modal="true" aria-label="Delete overtime record">
        <header className="otr-modal-header">
          <div>
            <p className="otr-drawer-kicker">Delete Record</p>
            <h3>{getEmployeeName(record)}</h3>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close delete confirmation">
            x
          </button>
        </header>
        <div className="otr-modal-body">
          <p className="otr-confirm-copy">
            This removes the overtime record for {formatStatus(record.status)} status on {toDateInputText(record.work_date) || 'the selected work date'}.
          </p>
          <label className="otr-checkbox-field">
            <input type="checkbox" checked={forceDelete} onChange={function (event) { return onChangeForce(event.target.checked); }}/>
            <span>Force delete linked or finalized records</span>
          </label>
        </div>
        <footer className="otr-modal-footer">
          <button className="otr-btn" type="button" onClick={onClose} disabled={actionLoading}>
            Cancel
          </button>
          <button className="otr-btn otr-btn--danger" type="button" onClick={onConfirm} disabled={actionLoading}>
            <ToolbarIcon name="trash"/>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </button>
        </footer>
      </section>
    </div>);
}
function DetailDrawer(_a) {
    var _b, _c, _d;
    var record = _a.record, open = _a.open, onClose = _a.onClose, actionLoading = _a.actionLoading, canWriteAdminData = _a.canWriteAdminData, formatDateOnly = _a.formatDateOnly, formatDateTime = _a.formatDateTime, onApprove = _a.onApprove, onDelete = _a.onDelete, onEdit = _a.onEdit, onRemarksChange = _a.onRemarksChange, onStatusValueChange = _a.onStatusValueChange, onUpdateStatus = _a.onUpdateStatus, remarks = _a.remarks, statusValue = _a.statusValue;
    (0, react_1.useEffect)(function () {
        if (!open) {
            return undefined;
        }
        var handleKeyDown = function (event) {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return function () { return document.removeEventListener('keydown', handleKeyDown); };
    }, [onClose, open]);
    if (!record) {
        return null;
    }
    var activities = record.activities || [];
    var employeeFacts = [
        { label: 'Employee Code', value: record.emp_code || '--' },
        { label: 'Email', value: record.emp_email || '--' },
        { label: 'Designation', value: record.emp_designation || '--' },
    ];
    var attendanceFacts = [
        { label: 'Attendance ID', value: (_b = record.attendance_id) !== null && _b !== void 0 ? _b : '--' },
        { label: 'Clock In', value: record.clock_in_time ? formatDateTime(record.clock_in_time) : '--' },
        { label: 'Clock Out', value: record.clock_out_time ? formatDateTime(record.clock_out_time) : '--' },
        { label: 'Clock-In Sequence', value: (_c = record.clock_in_sequence) !== null && _c !== void 0 ? _c : '--' },
        { label: 'Actual Hours', value: formatDecimal(record.actual_hours, 'h') },
        { label: 'Standard Hours', value: formatDecimal(record.standard_hours, 'h') },
        { label: 'Extra Hours', value: formatDecimal(record.extra_hours, 'h') },
        { label: 'Comp-Off Days', value: formatDecimal(record.comp_off_days, 'd') },
    ];
    var lifecycleFacts = [
        { label: 'Recording Deadline', value: record.recording_deadline ? formatDateOnly(record.recording_deadline) : '--' },
        { label: 'Expires At', value: record.expires_at ? formatDateOnly(record.expires_at) : '--' },
        { label: 'Expired At', value: record.expired_at ? formatDateTime(record.expired_at) : '--' },
        { label: 'Approved At', value: record.approval_completed_at ? formatDateTime(record.approval_completed_at) : '--' },
        { label: 'Utilized At', value: record.utilized_at ? formatDateTime(record.utilized_at) : '--' },
        { label: 'Comp-Off Request ID', value: (_d = record.compoff_request_id) !== null && _d !== void 0 ? _d : '--' },
        { label: 'Created At', value: record.created_at ? formatDateTime(record.created_at) : '--' },
        { label: 'Updated At', value: record.updated_at ? formatDateTime(record.updated_at) : '--' },
    ];
    return (<>
      <button type="button" className={"otr-drawer-overlay".concat(open ? ' otr-drawer-overlay--open' : '')} onClick={onClose} aria-label="Close overtime record details"/>
      <aside className={"otr-drawer".concat(open ? ' otr-drawer--open' : '')} role="dialog" aria-modal="true" aria-label="Overtime record details">
        <header className="otr-drawer-header">
          <div>
            <p className="otr-drawer-kicker">{formatDateOnly(record.work_date)} - {getDayLabel(record)}</p>
            <h3>{getEmployeeName(record)}</h3>
            <span className={"table-pill ".concat(statusPillClass(record.status))}>
              {formatStatus(record.status)}
            </span>
          </div>
          <button className="otr-drawer-close" type="button" onClick={onClose} aria-label="Close details">
            x
          </button>
        </header>

        <div className="otr-drawer-body">
          <section className="otr-drawer-summary" aria-label="Overtime summary">
            <div>
              <span>Extra hours</span>
              <strong>{formatDecimal(record.extra_hours, 'h')}</strong>
            </div>
            <div>
              <span>Comp-off</span>
              <strong>{formatDecimal(record.comp_off_days, 'd')}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>{formatDeadline(record, formatDateOnly)}</strong>
            </div>
          </section>

          {canWriteAdminData ? (<section className="otr-drawer-section otr-drawer-actions" aria-label="Record actions">
              <div className="otr-action-row">
                <button className="otr-btn" type="button" onClick={function () { return onEdit(record); }} disabled={actionLoading}>
                  <ToolbarIcon name="edit"/>
                  Edit
                </button>
                <button className="otr-btn otr-btn--danger-soft" type="button" onClick={function () { return onDelete(record); }} disabled={actionLoading}>
                  <ToolbarIcon name="trash"/>
                  Delete
                </button>
                <button className="otr-btn otr-btn--primary" type="button" onClick={function () { return onApprove(record, 'approved', remarks); }} disabled={actionLoading}>
                  Approve
                </button>
                <button className="otr-btn" type="button" onClick={function () { return onApprove(record, 'rejected', remarks); }} disabled={actionLoading}>
                  Reject
                </button>
              </div>
              <div className="otr-status-editor">
                <label className="otr-form-field">
                  <span>Status Update</span>
                  <select value={statusValue} onChange={function (event) { return onStatusValueChange(event.target.value); }} disabled={actionLoading}>
                    {OVERTIME_STATUS_OPTIONS.map(function (status) { return (<option key={status} value={status}>
                        {formatStatus(status)}
                      </option>); })}
                  </select>
                </label>
                <label className="otr-form-field otr-form-field--wide">
                  <span>Remarks</span>
                  <input value={remarks} onChange={function (event) { return onRemarksChange(event.target.value); }} placeholder="Optional note" disabled={actionLoading}/>
                </label>
                <button className="otr-btn" type="button" onClick={function () { return onUpdateStatus(record, statusValue, remarks); }} disabled={actionLoading}>
                  Save Status
                </button>
              </div>
            </section>) : null}

          <section className="otr-drawer-section">
            <h4>Employee</h4>
            <DetailFactList items={employeeFacts}/>
          </section>

          <section className="otr-drawer-section">
            <h4>Attendance Context</h4>
            <DetailFactList items={attendanceFacts}/>
          </section>

          <section className="otr-drawer-section">
            <h4>Record Lifecycle</h4>
            <DetailFactList items={lifecycleFacts}/>
          </section>

          <section className="otr-drawer-section">
            <h4>Activities</h4>
            {activities.length ? (<ol className="otr-activity-list">
                {activities.map(function (activity, index) { return (<li key={"".concat(activity.field_visit_id || activity.start_time || 'activity', "-").concat(index)}>
                    <div className="otr-activity-head">
                      <strong>{formatActivityType(activity.activity_type)}</strong>
                      <span>{activity.status ? formatStatus(activity.status) : 'Unknown'}</span>
                    </div>
                    <div className="otr-activity-meta">
                      <span>{activity.start_time ? formatDateTime(activity.start_time) : '--'}</span>
                      <span>{activity.end_time ? formatDateTime(activity.end_time) : '--'}</span>
                      <span>{formatDurationMinutes(activity.duration_minutes)}</span>
                    </div>
                    {activity.field_visit_id ? (<p className="otr-activity-note">Field visit ID {activity.field_visit_id}</p>) : null}
                    {activity.notes ? <p className="otr-activity-note">{activity.notes}</p> : null}
                  </li>); })}
              </ol>) : (<p className="otr-drawer-empty">No activities were attached to this attendance session.</p>)}
          </section>
        </div>
      </aside>
    </>);
}
function AdminOvertimeRecordsPage(_a) {
    var _this = this;
    var actionLoading = _a.actionLoading, actionStatus = _a.actionStatus, canWriteAdminData = _a.canWriteAdminData, error = _a.error, filterOptions = _a.filterOptions, filters = _a.filters, formatDateOnly = _a.formatDateOnly, formatDateTime = _a.formatDateTime, kpis = _a.kpis, lastSyncedAt = _a.lastSyncedAt, loading = _a.loading, pagination = _a.pagination, records = _a.records, validationError = _a.validationError, approveRecord = _a.approveRecord, createRecord = _a.createRecord, deleteRecord = _a.deleteRecord, onChangePage = _a.onChangePage, refresh = _a.refresh, updateRecord = _a.updateRecord, updateFilter = _a.updateFilter, updateStatus = _a.updateStatus;
    var _b = (0, react_1.useState)(loadVisibleKeys), visibleKeys = _b[0], setVisibleKeys = _b[1];
    var _c = (0, react_1.useState)(null), drawerRecord = _c[0], setDrawerRecord = _c[1];
    var _d = (0, react_1.useState)(false), drawerOpen = _d[0], setDrawerOpen = _d[1];
    var _e = (0, react_1.useState)('eligible'), drawerStatus = _e[0], setDrawerStatus = _e[1];
    var _f = (0, react_1.useState)(''), drawerRemarks = _f[0], setDrawerRemarks = _f[1];
    var _g = (0, react_1.useState)(null), formMode = _g[0], setFormMode = _g[1];
    var _h = (0, react_1.useState)(null), formRecord = _h[0], setFormRecord = _h[1];
    var _j = (0, react_1.useState)(EMPTY_FORM_VALUES), formValues = _j[0], setFormValues = _j[1];
    var _k = (0, react_1.useState)(''), formError = _k[0], setFormError = _k[1];
    var _l = (0, react_1.useState)(null), deleteTarget = _l[0], setDeleteTarget = _l[1];
    var _m = (0, react_1.useState)(false), forceDelete = _m[0], setForceDelete = _m[1];
    var _o = (0, react_1.useState)(''), mutationError = _o[0], setMutationError = _o[1];
    var toggleColumn = (0, react_1.useCallback)(function (key) {
        setVisibleKeys(function (previousKeys) {
            var nextKeys = new Set(previousKeys);
            if (nextKeys.has(key)) {
                nextKeys.delete(key);
            }
            else {
                nextKeys.add(key);
            }
            saveVisibleKeys(nextKeys);
            return nextKeys;
        });
    }, []);
    var resetColumns = (0, react_1.useCallback)(function () {
        var nextKeys = new Set(DEFAULT_VISIBLE);
        setVisibleKeys(nextKeys);
        saveVisibleKeys(nextKeys);
    }, []);
    var openDrawer = (0, react_1.useCallback)(function (record) {
        setDrawerRecord(record);
        setDrawerStatus(normalizeOvertimeStatus(record.status));
        setDrawerRemarks('');
        setDrawerOpen(true);
    }, []);
    var closeDrawer = (0, react_1.useCallback)(function () {
        setDrawerOpen(false);
    }, []);
    var openCreateForm = (0, react_1.useCallback)(function () {
        setFormMode('create');
        setFormRecord(null);
        setFormValues(EMPTY_FORM_VALUES);
        setFormError('');
        setMutationError('');
    }, []);
    var openEditForm = (0, react_1.useCallback)(function (record) {
        setFormMode('edit');
        setFormRecord(record);
        setFormValues(recordToFormValues(record));
        setFormError('');
        setMutationError('');
    }, []);
    var closeForm = (0, react_1.useCallback)(function () {
        if (actionLoading) {
            return;
        }
        setFormMode(null);
        setFormRecord(null);
        setFormError('');
    }, [actionLoading]);
    var updateFormValue = (0, react_1.useCallback)(function (key, value) {
        setFormValues(function (previousValues) {
            var _a;
            return (__assign(__assign({}, previousValues), (_a = {}, _a[key] = value, _a)));
        });
    }, []);
    var submitForm = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var nextFormError, payload, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    nextFormError = validateFormValues(formValues);
                    setFormError(nextFormError);
                    setMutationError('');
                    if (nextFormError) {
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    payload = buildMutationPayload(formValues, formMode === 'edit');
                    if (!(formMode === 'edit')) return [3 /*break*/, 3];
                    if (!(formRecord === null || formRecord === void 0 ? void 0 : formRecord.id)) {
                        setFormError('This record is missing an ID and cannot be updated.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, updateRecord(formRecord.id, payload)];
                case 2:
                    _a.sent();
                    setDrawerOpen(false);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, createRecord(payload)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    setFormMode(null);
                    setFormRecord(null);
                    setFormError('');
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    setFormError(err_1 instanceof Error ? err_1.message : 'Unable to save overtime record.');
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [createRecord, formMode, formRecord, formValues, updateRecord]);
    var openDeleteDialog = (0, react_1.useCallback)(function (record) {
        setDeleteTarget(record);
        setForceDelete(false);
        setMutationError('');
    }, []);
    var confirmDelete = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(deleteTarget === null || deleteTarget === void 0 ? void 0 : deleteTarget.id)) {
                        setMutationError('This record is missing an ID and cannot be deleted.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    setMutationError('');
                    return [4 /*yield*/, deleteRecord(deleteTarget.id, forceDelete)];
                case 2:
                    _a.sent();
                    setDeleteTarget(null);
                    setDrawerOpen(false);
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    setMutationError(err_2 instanceof Error ? err_2.message : 'Unable to delete overtime record.');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [deleteRecord, deleteTarget, forceDelete]);
    var handleStatusUpdate = (0, react_1.useCallback)(function (record, status, remarks) { return __awaiter(_this, void 0, void 0, function () {
        var err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!record.id) {
                        setMutationError('This record is missing an ID and cannot be updated.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    setMutationError('');
                    return [4 /*yield*/, updateStatus(record.id, status, remarks)];
                case 2:
                    _a.sent();
                    setDrawerStatus(status);
                    setDrawerRemarks('');
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    setMutationError(err_3 instanceof Error ? err_3.message : 'Unable to update overtime status.');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [updateStatus]);
    var handleApproval = (0, react_1.useCallback)(function (record, action, remarks) { return __awaiter(_this, void 0, void 0, function () {
        var err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!record.id) {
                        setMutationError('This record is missing an ID and cannot be approved or rejected.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    setMutationError('');
                    return [4 /*yield*/, approveRecord(record.id, action, remarks)];
                case 2:
                    _a.sent();
                    setDrawerStatus(action);
                    setDrawerRemarks('');
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    setMutationError(err_4 instanceof Error ? err_4.message : 'Unable to update overtime approval.');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [approveRecord]);
    var vis = function (key) { return visibleKeys.has(key); };
    var hasOptionalColumns = ALL_COLUMNS.some(function (column) { return visibleKeys.has(column.key) && !DEFAULT_VISIBLE.has(column.key); });
    var tableClassName = "dashboard-table otr-table".concat(hasOptionalColumns ? ' otr-table--wide' : ' otr-table--default');
    var syncedLabel = lastSyncedAt
        ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    var headline = "".concat(formatDecimal(kpis.total_extra_hours, 'h'), " extra - ").concat(formatDecimal(kpis.eligible_comp_off_days, 'd'), " eligible comp-off");
    var loadingLabel = loading && records.length ? 'Refreshing...' : 'Refresh';
    var firstRecordIndex = pagination.total_records ? (pagination.page - 1) * pagination.page_size + 1 : 0;
    var lastRecordIndex = Math.min(pagination.page * pagination.page_size, pagination.total_records);
    var visibleLabel = pagination.total_records
        ? "Showing ".concat(firstRecordIndex.toLocaleString(), "-").concat(lastRecordIndex.toLocaleString(), " of ").concat(pagination.total_records.toLocaleString(), " records")
        : 'No overtime records loaded';
    var visibleFiltersActive = Boolean(filters.search.trim() ||
        filters.status ||
        filters.department.trim() ||
        filters.fromDate ||
        filters.toDate);
    var statusFilterOptions = filterOptions.statuses.length
        ? filterOptions.statuses
        : OVERTIME_STATUS_OPTIONS;
    var operationMessage = mutationError || actionStatus;
    var activeDrawerRecord = (drawerRecord === null || drawerRecord === void 0 ? void 0 : drawerRecord.id)
        ? records.find(function (record) { return record.id === drawerRecord.id; }) || drawerRecord
        : drawerRecord;
    return (<div className="admin-aligned-page admin-aligned-page--overtime-records">
      <div className="otr-page-head">
        <div>
          <p className="eyebrow">Attendance</p>
          <h1 className="otr-page-title">Overtime Records</h1>
          <p className="otr-page-sub">{headline}</p>
        </div>
        <div className="otr-header-actions">
          {syncedLabel ? <span className="otr-synced-label">synced {syncedLabel}</span> : null}
          <button className="otr-btn" onClick={refresh} disabled={loading} type="button" aria-label="Refresh overtime records">
            <ToolbarIcon name="refresh"/>
            {loadingLabel}
          </button>
          {canWriteAdminData ? (<button className="otr-btn otr-btn--primary" onClick={openCreateForm} disabled={actionLoading} type="button" aria-label="Create overtime record">
              <ToolbarIcon name="plus"/>
              New Record
            </button>) : null}
          <button className="otr-btn" onClick={function () { return downloadRecordsAsCsv(records, visibleKeys, formatDateOnly, formatDateTime); }} disabled={loading || records.length === 0} type="button" aria-label="Export visible overtime records">
            <ToolbarIcon name="download"/>
            Export
          </button>
        </div>
      </div>

      <div className="otr-kpi-grid" aria-label="Overtime summary">
        <article className="otr-kpi-card">
          <span>Total Records</span>
          <strong>{kpis.total.toLocaleString()}</strong>
          <small>{kpis.total_loaded.toLocaleString()} loaded on this page</small>
        </article>
        <article className="otr-kpi-card">
          <span>Extra Hours</span>
          <strong>{formatDecimal(kpis.total_extra_hours, 'h')}</strong>
          <small>Across matching records</small>
        </article>
        <article className="otr-kpi-card">
          <span>Eligible Comp-Off</span>
          <strong>{formatDecimal(kpis.eligible_comp_off_days, 'd')}</strong>
          <small>Status eligible only</small>
        </article>
        <article className="otr-kpi-card otr-kpi-card--watch">
          <span>Expiring / Expired</span>
          <strong>{kpis.expiring_or_expired.toLocaleString()}</strong>
          <small>Deadline within 7 days</small>
        </article>
        <article className="otr-kpi-card">
          <span>Requested / Approved</span>
          <strong>{kpis.requested.toLocaleString()} / {kpis.approved.toLocaleString()}</strong>
          <small>Comp-off pipeline</small>
        </article>
      </div>

      <section className="otr-filter-card" aria-label="Overtime filters">
        <div className="otr-filter-grid">
          <label className="otr-search-shell">
            <ToolbarIcon name="search"/>
            <span className="sr-only">Search overtime records</span>
            <input type="search" value={filters.search} onChange={function (event) { return updateFilter('search', event.target.value); }} placeholder="Search employee, code, email..." aria-label="Search overtime records"/>
          </label>

          <label className="otr-filter-field">
            <span>Status</span>
            <select value={filters.status} onChange={function (event) { return updateFilter('status', event.target.value); }} disabled={loading}>
              {__spreadArray([{ value: '', label: 'All statuses' }], statusFilterOptions.map(function (status) { return ({
            value: status,
            label: formatStatus(status),
        }); }), true).map(function (option) { return (<option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>); })}
            </select>
          </label>

          <label className="otr-filter-field">
            <span>Department</span>
            <select value={filters.department} onChange={function (event) { return updateFilter('department', event.target.value); }} disabled={loading}>
              <option value="">All departments</option>
              {filterOptions.departments.map(function (department) { return (<option key={department} value={department}>
                  {department}
                </option>); })}
            </select>
          </label>

          <label className="otr-filter-field otr-filter-field--date">
            <span>From</span>
            <input type="date" value={filters.fromDate} onChange={function (event) { return updateFilter('fromDate', event.target.value); }} disabled={loading}/>
          </label>

          <label className="otr-filter-field otr-filter-field--date">
            <span>To</span>
            <input type="date" value={filters.toDate} onChange={function (event) { return updateFilter('toDate', event.target.value); }} disabled={loading}/>
          </label>
        </div>

        {validationError ? <p className="otr-filter-error">{validationError}</p> : null}
        {operationMessage ? (<p className={"otr-action-message".concat(mutationError ? ' otr-action-message--error' : '')}>
            {operationMessage}
          </p>) : null}
      </section>

      <div className="table-card otr-table-card">
        <div className="otr-toolbar">
          <div>
            <strong>{loading && !records.length ? 'Loading records...' : visibleLabel}</strong>
            <span>Search, filters, sorting, and pagination are backed by the API.</span>
          </div>
          <div className="otr-toolbar__right">
            {visibleFiltersActive ? <span className="table-pill accent">Filtered</span> : null}
            <ColumnVisibilitySelector_1.default columns={ALL_COLUMNS} visibleKeys={visibleKeys} onToggle={toggleColumn} onReset={resetColumns}/>
          </div>
        </div>

        {loading && !records.length ? (<div className="empty-state otr-loading-state">
            <span className="otr-spinner" aria-hidden="true"/>
            Loading overtime records...
          </div>) : error && !records.length ? (<div className="empty-state otr-error-state">
            <strong>Unable to load overtime records</strong>
            <p>{error}</p>
            <button className="otr-btn" type="button" onClick={refresh}>
              <ToolbarIcon name="refresh"/>
              Retry
            </button>
          </div>) : records.length ? (<div className="table-scroll otr-table-scroll">
            <table className={tableClassName} aria-label="Overtime records">
              <thead>
                <tr>
                  <PlainTh columnKey="employee" label="Employee" visible={vis('employee')}/>
                  <PlainTh columnKey="work_date" label="Dates" visible={vis('work_date')}/>
                  <PlainTh columnKey="day" label="Day" visible={vis('day')}/>
                  <PlainTh columnKey="extra_hours" label="Extra Hours" visible={vis('extra_hours')}/>
                  <PlainTh columnKey="comp_off_days" label="Comp-Off Days" visible={vis('comp_off_days')}/>
                  <PlainTh columnKey="status" label="Status" visible={vis('status')}/>
                  <PlainTh columnKey="deadline" label="Deadline" visible={vis('deadline')}/>
                  <PlainTh columnKey="email" label="Email" visible={vis('email')}/>
                  <PlainTh columnKey="designation" label="Designation" visible={vis('designation')}/>
                  <PlainTh columnKey="attendance_id" label="Attendance ID" visible={vis('attendance_id')}/>
                  <PlainTh columnKey="clock_in" label="Clock In" visible={vis('clock_in')}/>
                  <PlainTh columnKey="clock_out" label="Clock Out" visible={vis('clock_out')}/>
                  <PlainTh columnKey="clock_in_sequence" label="Clock-In Sequence" visible={vis('clock_in_sequence')}/>
                  <PlainTh columnKey="actual_hours" label="Actual Hours" visible={vis('actual_hours')}/>
                  <PlainTh columnKey="standard_hours" label="Standard Hours" visible={vis('standard_hours')}/>
                  <PlainTh columnKey="compoff_request_id" label="Comp-Off Request ID" visible={vis('compoff_request_id')}/>
                  <PlainTh columnKey="expires_at" label="Expires At" visible={vis('expires_at')}/>
                  <PlainTh columnKey="approved_at" label="Approved At" visible={vis('approved_at')}/>
                  <PlainTh columnKey="utilized_at" label="Utilized At" visible={vis('utilized_at')}/>
                  <PlainTh columnKey="created_at" label="Created At" visible={vis('created_at')}/>
                  <PlainTh columnKey="updated_at" label="Updated At" visible={vis('updated_at')}/>
                  <PlainTh columnKey="activities" label="Activities" visible={vis('activities')}/>
                  <PlainTh columnKey="details" label="Details" visible={vis('details')}/>
                </tr>
              </thead>
              <tbody>
                {records.map(function (record, index) {
                var _a, _b, _c, _d, _e, _f, _g;
                var rowKey = "".concat((_c = (_b = (_a = record.id) !== null && _a !== void 0 ? _a : record.attendance_id) !== null && _b !== void 0 ? _b : record.emp_code) !== null && _c !== void 0 ? _c : 'overtime', "-").concat(record.work_date || index);
                var deadlineState = getDeadlineState(record);
                return (<tr key={rowKey} className="otr-row" onClick={function () { return openDrawer(record); }} tabIndex={0} onKeyDown={function (event) {
                        if (event.key === 'Enter') {
                            openDrawer(record);
                        }
                    }}>
                      {vis('employee') && (<td className="otr-td otr-td--employee otr-col--employee">
                          <div className="otr-employee-cell">
                            <span className={"otr-status-rail otr-status-rail--".concat(statusPillClass(record.status))} aria-hidden="true"/>
                            <div>
                              <strong>{getEmployeeName(record)}</strong>
                              <span>{getEmployeeMeta(record)}</span>
                            </div>
                          </div>
                        </td>)}
                      {vis('work_date') && (<td className="otr-td otr-td--date otr-col--work_date">
                          <span className="otr-date-range">{formatWorkDateRange(record)}</span>
                          <span className="otr-date-day">{getDayLabel(record)}</span>
                        </td>)}
                      {vis('day') && <td className="otr-td otr-col--day">{getDayLabel(record)}</td>}
                      {vis('extra_hours') && <td className="otr-td otr-td--num otr-col--extra_hours">{formatDecimal(record.extra_hours, 'h')}</td>}
                      {vis('comp_off_days') && <td className="otr-td otr-td--num otr-col--comp_off_days">{formatDecimal(record.comp_off_days, 'd')}</td>}
                      {vis('status') && (<td className="otr-td otr-col--status">
                          <span className={"table-pill ".concat(statusPillClass(record.status))}>
                            {formatStatus(record.status)}
                          </span>
                        </td>)}
                      {vis('deadline') && (<td className="otr-td otr-col--deadline">
                          <span className={"otr-deadline otr-deadline--".concat(deadlineState)}>
                            {formatDeadline(record, formatDateOnly)}
                          </span>
                        </td>)}
                      {vis('email') && <td className="otr-td otr-td--trunc otr-col--email" title={record.emp_email || ''}>{record.emp_email || '--'}</td>}
                      {vis('designation') && <td className="otr-td otr-td--trunc otr-col--designation" title={record.emp_designation || ''}>{record.emp_designation || '--'}</td>}
                      {vis('attendance_id') && <td className="otr-td otr-td--num otr-col--attendance_id">{(_d = record.attendance_id) !== null && _d !== void 0 ? _d : '--'}</td>}
                      {vis('clock_in') && <td className="otr-td otr-td--mono otr-col--clock_in">{record.clock_in_time ? formatDateTime(record.clock_in_time) : '--'}</td>}
                      {vis('clock_out') && <td className="otr-td otr-td--mono otr-col--clock_out">{record.clock_out_time ? formatDateTime(record.clock_out_time) : '--'}</td>}
                      {vis('clock_in_sequence') && <td className="otr-td otr-td--num otr-col--clock_in_sequence">{(_e = record.clock_in_sequence) !== null && _e !== void 0 ? _e : '--'}</td>}
                      {vis('actual_hours') && <td className="otr-td otr-td--num otr-col--actual_hours">{formatDecimal(record.actual_hours, 'h')}</td>}
                      {vis('standard_hours') && <td className="otr-td otr-td--num otr-col--standard_hours">{formatDecimal(record.standard_hours, 'h')}</td>}
                      {vis('compoff_request_id') && <td className="otr-td otr-td--num otr-col--compoff_request_id">{(_f = record.compoff_request_id) !== null && _f !== void 0 ? _f : '--'}</td>}
                      {vis('expires_at') && <td className="otr-td otr-col--expires_at">{record.expires_at ? formatDateOnly(record.expires_at) : '--'}</td>}
                      {vis('approved_at') && <td className="otr-td otr-col--approved_at">{record.approval_completed_at ? formatDateTime(record.approval_completed_at) : '--'}</td>}
                      {vis('utilized_at') && <td className="otr-td otr-col--utilized_at">{record.utilized_at ? formatDateTime(record.utilized_at) : '--'}</td>}
                      {vis('created_at') && <td className="otr-td otr-col--created_at">{record.created_at ? formatDateTime(record.created_at) : '--'}</td>}
                      {vis('updated_at') && <td className="otr-td otr-col--updated_at">{record.updated_at ? formatDateTime(record.updated_at) : '--'}</td>}
                      {vis('activities') && (<td className="otr-td otr-col--activities">
                          <span className="otr-activity-count">{formatCount(((_g = record.activities) === null || _g === void 0 ? void 0 : _g.length) || 0)}</span>
                        </td>)}
                      {vis('details') && (<td className="otr-td otr-td--action otr-col--details">
                          <button type="button" className="otr-action-btn" onClick={function (event) {
                            event.stopPropagation();
                            openDrawer(record);
                        }} aria-label={"View overtime record for ".concat(getEmployeeName(record))}>
                            View
                          </button>
                        </td>)}
                    </tr>);
            })}
              </tbody>
            </table>
          </div>) : (<div className="empty-state otr-empty-state">
            No overtime records found for the current filters.
          </div>)}

        <footer className="otr-pagination">
          <span>
            Page {pagination.total_pages ? pagination.page : 0} of {pagination.total_pages || 0}
          </span>
          <div>
            <button className="otr-btn" type="button" onClick={function () { return onChangePage(pagination.page - 1); }} disabled={loading || !pagination.has_previous}>
              Previous
            </button>
            <button className="otr-btn" type="button" onClick={function () { return onChangePage(pagination.page + 1); }} disabled={loading || !pagination.has_next}>
              Next
            </button>
          </div>
        </footer>
      </div>

      <DetailDrawer record={activeDrawerRecord} open={drawerOpen} onClose={closeDrawer} actionLoading={actionLoading} canWriteAdminData={canWriteAdminData} formatDateOnly={formatDateOnly} formatDateTime={formatDateTime} onApprove={handleApproval} onDelete={openDeleteDialog} onEdit={openEditForm} onRemarksChange={setDrawerRemarks} onStatusValueChange={setDrawerStatus} onUpdateStatus={handleStatusUpdate} remarks={drawerRemarks} statusValue={drawerStatus}/>

      <OvertimeRecordFormDialog actionLoading={actionLoading} error={formError} mode={formMode} onChange={updateFormValue} onClose={closeForm} onSubmit={submitForm} values={formValues}/>

      <DeleteOvertimeRecordDialog actionLoading={actionLoading} forceDelete={forceDelete} onChangeForce={setForceDelete} onClose={function () {
            if (!actionLoading) {
                setDeleteTarget(null);
            }
        }} onConfirm={confirmDelete} record={deleteTarget}/>
    </div>);
}
