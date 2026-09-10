"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceDatePicker;
/**
 * A deliberately native control: attendance is filtered by a single date, so
 * the operating system's date picker is faster and more predictable than a
 * custom calendar dialog.
 */
function AttendanceDatePicker(_a) {
    var _b = _a.id, id = _b === void 0 ? 'attendance-date' : _b, _c = _a.label, label = _c === void 0 ? 'Date' : _c, value = _a.value, onChange = _a.onChange;
    return (<div className="attendance-filter attendance-filter-date">
      <label htmlFor={id}>{label}</label>
      <input className="attendance-native-date-input" id={id} type="date" value={value} onChange={function (event) { return onChange(event.target.value); }}/>
    </div>);
}
