"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKED_ATTENDANCE_STATUSES = exports.EDITABLE_ATTENDANCE_STATUSES = exports.ATTENDANCE_LEGEND_ORDER = exports.ATTENDANCE_STATUS_META = void 0;
exports.ATTENDANCE_STATUS_META = {
    P: { label: 'Present (Office)', glyph: 'P', className: 'is-present' },
    S: { label: 'Site', glyph: 'S', className: 'is-site' },
    WFH: { label: 'Work From Home', glyph: 'W', className: 'is-wfh' },
    A: { label: 'Absent', glyph: 'A', className: 'is-absent' },
    L: { label: 'Leave', glyph: 'L', className: 'is-leave' },
    H: { label: 'Holiday', glyph: 'H', className: 'is-holiday' },
    O: { label: 'Week Off', glyph: 'O', className: 'is-weekoff' }
};
/** Order used by the heatmap legend. */
exports.ATTENDANCE_LEGEND_ORDER = ['P', 'S', 'WFH', 'A', 'L', 'H', 'O'];
/** Statuses an admin may set by hand. Add 'S' here if site visits become manually assignable. */
exports.EDITABLE_ATTENDANCE_STATUSES = ['P', 'A', 'WFH', 'L', 'H', 'O'];
/** Statuses that count towards the per-employee "days worked" tally. */
exports.WORKED_ATTENDANCE_STATUSES = ['P', 'S', 'WFH'];
