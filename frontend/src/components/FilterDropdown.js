"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilterDropdown;
var react_1 = require("react");
require("./FilterDropdown.css");
/**
 * Reusable single-select popover filter used across attendance admin pages
 * (exceptions, records, overtime). Renders as a compact pill trigger with a
 * radio-style option list, so filter fields stay visually consistent without
 * consuming the horizontal space a full <select> row would need.
 */
function FilterDropdown(_a) {
    var id = _a.id, label = _a.label, value = _a.value, options = _a.options, onChange = _a.onChange, _b = _a.placeholder, placeholder = _b === void 0 ? 'All' : _b, _c = _a.compact, compact = _c === void 0 ? false : _c, _d = _a.menuAlign, menuAlign = _d === void 0 ? 'left' : _d;
    var _e = (0, react_1.useState)(false), open = _e[0], setOpen = _e[1];
    var ref = (0, react_1.useRef)(null);
    var active = options.find(function (option) { return option.value === value; });
    var isActive = Boolean(value);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handler = function (event) {
            if (ref.current && !ref.current.contains(event.target))
                setOpen(false);
        };
        var escHandler = function (event) {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return function () {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [open]);
    return (<div className={"filter-dropdown".concat(compact ? ' filter-dropdown--compact' : '')} ref={ref}>
      {!compact && <span className="filter-dropdown__label">{label}</span>}
      <button type="button" id={id} className={"filter-dropdown__trigger".concat(isActive ? ' filter-dropdown__trigger--active' : '').concat(compact ? ' filter-dropdown__trigger--compact' : '')} onClick={function () { return setOpen(function (prev) { return !prev; }); }} aria-haspopup="listbox" aria-expanded={open} title={compact ? label : undefined}>
        <span className="filter-dropdown__value">{compact ? label : active ? active.label : placeholder}</span>
        {isActive && compact && <span className="filter-dropdown__active-dot" aria-hidden="true"/>}
        <span className="filter-dropdown__arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (<div className={"filter-dropdown__menu".concat(menuAlign === 'right' ? ' filter-dropdown__menu--right' : '')} role="listbox" aria-labelledby={id}>
          {options.map(function (option) {
                var checked = option.value === value;
                return (<label key={option.value || 'all'} className={"filter-dropdown__item".concat(checked ? ' filter-dropdown__item--active' : '')}>
                <span className="filter-dropdown__dot" aria-hidden="true"/>
                <input type="radio" name={id} checked={checked} onChange={function () {
                        onChange(option.value);
                        setOpen(false);
                    }}/>
                {option.label}
              </label>);
            })}
        </div>)}
    </div>);
}
