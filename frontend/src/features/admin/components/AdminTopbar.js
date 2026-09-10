"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTopbar = AdminTopbar;
var react_1 = require("react");
require("./AdminTopbar.css");
var sidebar_1 = require("../config/sidebar");
function prettifyPanelId(id) {
    var words = id
        .replace(/^employee-master-/, "")
        .split("-")
        .filter(Boolean);
    if (!words.length)
        return "Dashboard";
    return words
        .map(function (word, index) {
        return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
        .join(" ");
}
function AdminTopbar(_a) {
    var _this = this;
    var _b, _c;
    var activePanel = _a.activePanel, onSelectPanel = _a.onSelectPanel, onRefresh = _a.onRefresh, syncDeps = _a.syncDeps;
    var _d = (0, react_1.useState)(""), query = _d[0], setQuery = _d[1];
    var _e = (0, react_1.useState)(false), open = _e[0], setOpen = _e[1];
    var _f = (0, react_1.useState)(0), highlight = _f[0], setHighlight = _f[1];
    var _g = (0, react_1.useState)(function () { return new Date(); }), now = _g[0], setNow = _g[1];
    var _h = (0, react_1.useState)("just now"), syncLabel = _h[0], setSyncLabel = _h[1];
    var _j = (0, react_1.useState)(false), refreshing = _j[0], setRefreshing = _j[1];
    var inputRef = (0, react_1.useRef)(null);
    // ── Section lookup so the breadcrumb can show "Activities / Exceptions" ──
    var sectionById = (0, react_1.useMemo)(function () {
        var map = new Map();
        sidebar_1.sidebarSections.forEach(function (section) {
            if (!section.title)
                return;
            section.items.forEach(function (item) {
                var _a;
                map.set(item.id, section.title);
                // Panels that share a nav entry share its section too.
                (_a = item.matchIds) === null || _a === void 0 ? void 0 : _a.forEach(function (id) { return map.set(id, section.title); });
            });
        });
        return map;
    }, []);
    var activeItem = (0, sidebar_1.findSidebarItem)(activePanel);
    var pageTitle = (_b = activeItem === null || activeItem === void 0 ? void 0 : activeItem.label) !== null && _b !== void 0 ? _b : prettifyPanelId(String(activePanel));
    var pageSection = (_c = sectionById.get(String(activePanel))) !== null && _c !== void 0 ? _c : "Workspace";
    var results = (0, react_1.useMemo)(function () {
        var term = query.trim().toLowerCase();
        if (!term)
            return sidebar_1.sidebarItems.slice(0, 6);
        return sidebar_1.sidebarItems
            .filter(function (item) {
            var _a, _b;
            var haystack = "".concat(item.label, " ").concat((_a = item.groupLabel) !== null && _a !== void 0 ? _a : "", " ").concat((_b = sectionById.get(item.id)) !== null && _b !== void 0 ? _b : "");
            return haystack.toLowerCase().includes(term);
        })
            .slice(0, 7);
    }, [query, sectionById]);
    (0, react_1.useEffect)(function () {
        var timer = window.setInterval(function () { return setNow(new Date()); }, 1000);
        return function () { return window.clearInterval(timer); };
    }, []);
    (0, react_1.useEffect)(function () {
        setSyncLabel("just now");
        var timer = window.setTimeout(function () { return setSyncLabel("moments ago"); }, 60000);
        return function () { return window.clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, syncDeps);
    // ── Ctrl/Cmd + K focuses the jump field ──
    (0, react_1.useEffect)(function () {
        var openJump = function () {
            var _a;
            (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            setOpen(true);
        };
        var onKeyDown = function (event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                openJump();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("fawnix:open-admin-jump", openJump);
        return function () {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("fawnix:open-admin-jump", openJump);
        };
    }, []);
    (0, react_1.useEffect)(function () {
        setHighlight(0);
    }, [query]);
    var timeLabel = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    var dateLabel = now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    var closeJump = function () {
        var _a;
        setOpen(false);
        setQuery("");
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.blur();
    };
    var selectResult = function (id) {
        onSelectPanel(id);
        closeJump();
    };
    var handleKeyDown = function (event) {
        var _a;
        if (event.key === "Escape") {
            closeJump();
            return;
        }
        if (!results.length)
            return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight(function (current) { return (current + 1) % results.length; });
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlight(function (current) { return (current - 1 + results.length) % results.length; });
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            var target = (_a = results[highlight]) !== null && _a !== void 0 ? _a : results[0];
            if (target)
                selectResult(target.id);
        }
    };
    var handleRefresh = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setRefreshing(true);
                    setSyncLabel("syncing…");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, onRefresh()];
                case 2:
                    _b.sent();
                    setSyncLabel("just now");
                    return [3 /*break*/, 5];
                case 3:
                    _a = _b.sent();
                    setSyncLabel("retry needed");
                    return [3 /*break*/, 5];
                case 4:
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<header className="shell-topbar">
      <div className="shell-topbar-crumb">
        <span className="shell-topbar-section">{pageSection}</span>
        <span className="shell-topbar-sep" aria-hidden="true"/>
        <h1 className="shell-topbar-title">{pageTitle}</h1>
      </div>

      <div className={"shell-jump".concat(open ? " is-open" : "")} onBlur={function (event) {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpen(false);
            }
        }}>
        <svg className="shell-jump-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M13.4 13.4L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input ref={inputRef} type="text" role="combobox" aria-expanded={open} aria-controls="shell-jump-list" aria-label="Jump to a section" placeholder="Jump to a section…" autoComplete="off" value={query} onChange={function (event) {
            setQuery(event.target.value);
            setOpen(true);
        }} onFocus={function () { return setOpen(true); }} onKeyDown={handleKeyDown}/>
        <kbd className="shell-jump-kbd" aria-hidden="true">
          ⌘K
        </kbd>

        {open ? (<div className="shell-jump-menu" id="shell-jump-list" role="listbox">
            {results.length ? (results.map(function (item, index) {
                var _a, _b;
                return (<button key={item.id} type="button" role="option" aria-selected={index === highlight} className={"shell-jump-option".concat(index === highlight ? " is-active" : "").concat(item.id === activePanel ? " is-current" : "")} onMouseEnter={function () { return setHighlight(index); }} onMouseDown={function (event) { return event.preventDefault(); }} onClick={function () { return selectResult(item.id); }}>
                  <span className="shell-jump-option-label">{item.label}</span>
                  <span className="shell-jump-option-meta">
                    {(_b = (_a = item.groupLabel) !== null && _a !== void 0 ? _a : sectionById.get(item.id)) !== null && _b !== void 0 ? _b : "Workspace"}
                  </span>
                </button>);
            })) : (<p className="shell-jump-empty">
                No section matches “{query.trim()}”
              </p>)}
          </div>) : null}
      </div>

      <div className="shell-topbar-right">
        <div className="shell-clock" title="Local time">
          <span className="shell-clock-dot" aria-hidden="true"/>
          <span className="shell-clock-time">{timeLabel}</span>
          <span className="shell-clock-date">{dateLabel}</span>
        </div>

        <span className="shell-sync">Synced {syncLabel}</span>

        <button type="button" className="shell-refresh" onClick={function () { return void handleRefresh(); }} disabled={refreshing} title="Refresh data">
          <svg className={refreshing ? "shell-refresh-spin" : undefined} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M17 10a7 7 0 1 1-1.5-4.33" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M15.5 3.5l1 2.5 2.5-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </header>);
}
exports.default = AdminTopbar;
