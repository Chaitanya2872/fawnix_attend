"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceDatePicker;
var react_1 = require("react");
var useClickOutside_1 = require("../../../hooks/useClickOutside");
var dateUtils_1 = require("../../../utils/date/dateUtils");
var WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
var TRIGGER_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});
function addDays(date, days) {
    var nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}
function getMondayCalendarDays(viewDate) {
    var firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    var mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    var firstDay = addDays(firstOfMonth, -mondayOffset);
    return Array.from({ length: 42 }, function (_, index) { return addDays(firstDay, index); });
}
function AttendanceDatePicker(_a) {
    var value = _a.value, onChange = _a.onChange;
    var _b = (0, react_1.useState)(false), isOpen = _b[0], setIsOpen = _b[1];
    var selectedDate = (0, dateUtils_1.parseDateInputValue)(value);
    var _c = (0, react_1.useState)(function () { return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); }), viewDate = _c[0], setViewDate = _c[1];
    var pickerRef = (0, react_1.useRef)(null);
    var triggerRef = (0, react_1.useRef)(null);
    var today = new Date();
    var todayValue = (0, dateUtils_1.toDateInputValue)(today);
    (0, useClickOutside_1.useClickOutside)(pickerRef, isOpen, function () { return setIsOpen(false); });
    var togglePicker = function () {
        if (!isOpen) {
            setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        }
        setIsOpen(function (open) { return !open; });
    };
    var selectDate = function (date) {
        onChange((0, dateUtils_1.toDateInputValue)(date));
        setIsOpen(false);
        requestAnimationFrame(function () { var _a; return (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus(); });
    };
    var selectShortcut = function (daysFromToday) { return selectDate(addDays(today, daysFromToday)); };
    return (<div className="attendance-date-picker" ref={pickerRef}>
      <button ref={triggerRef} type="button" className="attendance-date-trigger" aria-expanded={isOpen} aria-haspopup="dialog" aria-label={"Attendance date: ".concat((0, dateUtils_1.formatAttendanceDateLabel)(value))} onClick={togglePicker}>
        <svg className="attendance-date-trigger-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2"/>
          <path d="M16 3v4M8 3v4M3 10h18"/>
        </svg>
        <span className="attendance-date-trigger-label">
          {value ? TRIGGER_DATE_FORMATTER.format(selectedDate) : 'Pick a date'}
        </span>
        <svg className="attendance-date-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
      </button>

      {isOpen && (<section className="attendance-calendar-popover" aria-label="Choose attendance date" role="dialog">
          <div className="attendance-calendar-shortcuts" aria-label="Quick dates">
            <button type="button" onClick={function () { return selectShortcut(0); }}>Today</button>
            <button type="button" onClick={function () { return selectShortcut(1); }}>Tomorrow</button>
            <button type="button" onClick={function () { return selectShortcut(2); }}>In 2 days</button>
          </div>

          <div className="attendance-calendar-header">
            <button type="button" className="attendance-calendar-nav" aria-label="Previous month" onClick={function () { return setViewDate(function (date) { return new Date(date.getFullYear(), date.getMonth() - 1, 1); }); }}>
              <span aria-hidden="true">‹</span>
            </button>
            <strong>{(0, dateUtils_1.getCalendarMonthLabel)(viewDate)}</strong>
            <button type="button" className="attendance-calendar-nav" aria-label="Next month" onClick={function () { return setViewDate(function (date) { return new Date(date.getFullYear(), date.getMonth() + 1, 1); }); }}>
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div className="attendance-calendar-weekdays" aria-hidden="true">
            {WEEK_DAYS.map(function (day) { return <span key={day}>{day}</span>; })}
          </div>
          <div className="attendance-calendar-days">
            {getMondayCalendarDays(viewDate).map(function (date) {
                var dateValue = (0, dateUtils_1.toDateInputValue)(date);
                var isSelected = dateValue === value;
                var isToday = dateValue === todayValue;
                var outsideMonth = date.getMonth() !== viewDate.getMonth();
                return (<button key={dateValue} type="button" className={"attendance-calendar-day".concat(isSelected ? ' attendance-calendar-day--selected' : '').concat(isToday ? ' attendance-calendar-day--today' : '').concat(outsideMonth ? ' attendance-calendar-day--outside' : '')} aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} aria-pressed={isSelected} onClick={function () { return selectDate(date); }}>
                  {date.getDate()}
                </button>);
            })}
          </div>
        </section>)}
    </div>);
}
