"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ManagerSelect;
var react_1 = require("react");
require("./ManagerSelect.css");
/**
 * Searchable, scrollable manager picker used by the Add/Edit Employee drawer.
 * Admins pick a manager by name instead of remembering the manager's employee
 * code; the code is still what gets stored and sent to the API.
 */
function ManagerSelect(_a) {
    var id = _a.id, value = _a.value, onChange = _a.onChange, employees = _a.employees, excludeEmpCode = _a.excludeEmpCode, _b = _a.placeholder, placeholder = _b === void 0 ? 'Search manager by name…' : _b, _c = _a.disabled, disabled = _c === void 0 ? false : _c;
    var _d = (0, react_1.useState)(false), open = _d[0], setOpen = _d[1];
    var _e = (0, react_1.useState)(''), query = _e[0], setQuery = _e[1];
    var _f = (0, react_1.useState)(0), highlight = _f[0], setHighlight = _f[1];
    var containerRef = (0, react_1.useRef)(null);
    var searchRef = (0, react_1.useRef)(null);
    var listRef = (0, react_1.useRef)(null);
    var candidates = (0, react_1.useMemo)(function () {
        return employees
            .filter(function (employee) { return employee.emp_code && employee.emp_code !== excludeEmpCode; })
            .sort(function (a, b) { return (a.emp_full_name || '').localeCompare(b.emp_full_name || ''); });
    }, [employees, excludeEmpCode]);
    var selected = candidates.find(function (employee) { return employee.emp_code === value; });
    var filtered = (0, react_1.useMemo)(function () {
        var term = query.trim().toLowerCase();
        if (!term)
            return candidates;
        return candidates.filter(function (employee) {
            return [employee.emp_full_name, employee.emp_code, employee.emp_email, employee.emp_designation, employee.emp_department]
                .filter(Boolean)
                .some(function (field) { return String(field).toLowerCase().includes(term); });
        });
    }, [candidates, query]);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var clickHandler = function (event) {
            if (containerRef.current && !containerRef.current.contains(event.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', clickHandler);
        return function () { return document.removeEventListener('mousedown', clickHandler); };
    }, [open]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!open) {
            setQuery('');
            return;
        }
        setHighlight(Math.max(0, filtered.findIndex(function (employee) { return employee.emp_code === value; })));
        (_a = searchRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        // Only re-run when the popover toggles — filtering handles its own highlight reset.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!open)
            return;
        var active = (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.querySelector('[data-highlighted="true"]');
        active === null || active === void 0 ? void 0 : active.scrollIntoView({ block: 'nearest' });
    }, [highlight, open]);
    var commit = function (empCode) {
        onChange(empCode);
        setOpen(false);
    };
    var handleKeyDown = function (event) {
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight(function (prev) { return Math.min(prev + 1, filtered.length - 1); });
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight(function (prev) { return Math.max(prev - 1, 0); });
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            var choice = filtered[highlight];
            if (choice === null || choice === void 0 ? void 0 : choice.emp_code)
                commit(choice.emp_code);
        }
    };
    var triggerLabel = selected
        ? selected.emp_full_name || selected.emp_code
        : value
            ? "Manager code ".concat(value)
            : 'No manager assigned';
    return (<div className={"manager-select".concat(disabled ? ' manager-select--disabled' : '')} ref={containerRef}>
      <button type="button" id={id} className={"manager-select__trigger".concat(value ? ' manager-select__trigger--filled' : '')} onClick={function () { return !disabled && setOpen(function (prev) { return !prev; }); }} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        <span className="manager-select__trigger-text">
          <span className="manager-select__trigger-name">{triggerLabel}</span>
          {(selected === null || selected === void 0 ? void 0 : selected.emp_code) && <span className="manager-select__trigger-meta">#{selected.emp_code}</span>}
        </span>
        <span className="manager-select__arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (<div className="manager-select__menu">
          <div className="manager-select__search">
            <input ref={searchRef} type="text" value={query} placeholder={placeholder} onChange={function (event) {
                setQuery(event.target.value);
                setHighlight(0);
            }} onKeyDown={handleKeyDown} aria-controls={"".concat(id, "-listbox")}/>
          </div>
          <div className="manager-select__list" id={"".concat(id, "-listbox")} role="listbox" ref={listRef}>
            <button type="button" className={"manager-select__option manager-select__option--clear".concat(value ? '' : ' manager-select__option--active')} onClick={function () { return commit(''); }}>
              No manager
            </button>
            {filtered.length === 0 ? (<p className="manager-select__empty">No manager matches “{query}”.</p>) : (filtered.map(function (employee, index) {
                var isActive = employee.emp_code === value;
                return (<button key={employee.emp_code} type="button" role="option" aria-selected={isActive} data-highlighted={index === highlight} className={"manager-select__option".concat(isActive ? ' manager-select__option--active' : '').concat(index === highlight ? ' manager-select__option--highlighted' : '')} onMouseEnter={function () { return setHighlight(index); }} onClick={function () { return commit(employee.emp_code); }}>
                    <span className="manager-select__option-name">{employee.emp_full_name || employee.emp_code}</span>
                    <span className="manager-select__option-meta">
                      #{employee.emp_code}
                      {employee.emp_designation ? " \u00B7 ".concat(employee.emp_designation) : ''}
                    </span>
                  </button>);
            }))}
          </div>
        </div>)}
    </div>);
}
