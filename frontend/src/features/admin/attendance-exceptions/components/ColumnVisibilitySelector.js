"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ColumnVisibilitySelector;
var react_1 = require("react");
require("./ColumnVisibilitySelector.css");
function ColumnVisibilitySelector(_a) {
    var columns = _a.columns, visibleKeys = _a.visibleKeys, onToggle = _a.onToggle, onReset = _a.onReset;
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    var ref = (0, react_1.useRef)(null);
    var hiddenCount = columns.filter(function (c) { return !visibleKeys.has(c.key); }).length;
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handler = function (e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, [open]);
    return (<div className="exc-col-selector" ref={ref}>
      <button type="button" className="exc-col-trigger ghost" onClick={function () { return setOpen(function (o) { return !o; }); }} aria-haspopup="listbox" aria-expanded={open} id="exc-col-btn">
        Columns
        {hiddenCount > 0 && (<span className="exc-col-badge" aria-label={"".concat(hiddenCount, " hidden")}>
            {hiddenCount}
          </span>)}
        <span className="exc-col-arrow" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (<div className="exc-col-dropdown" role="listbox" aria-multiselectable="true" aria-labelledby="exc-col-btn">
          <div className="exc-col-dropdown-head">
            <span>Show / Hide Columns</span>
            <button type="button" className="exc-col-reset" onClick={onReset}>
              Reset
            </button>
          </div>
          {columns.map(function (col) {
                var checked = visibleKeys.has(col.key);
                return (<label key={col.key} className="exc-col-item" role="option" aria-selected={checked}>
                <input type="checkbox" checked={checked} onChange={function () { return onToggle(col.key); }}/>
                <span>{col.label}</span>
              </label>);
            })}
        </div>)}
    </div>);
}
