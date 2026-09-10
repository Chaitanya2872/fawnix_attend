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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourScreenWall = TourScreenWall;
var react_1 = require("react");
var appScreens_1 = require("../constants/appScreens");
var useMotion_1 = require("../hooks/useMotion");
/* ─────────────────────────────────────────────────────────────────────────────
   Device wall — the real mobile app, presented as an orbiting carousel of
   phones. The active handset sits face-on while its neighbours recede in 3D,
   so ten screens read as one instrument instead of a contact sheet.

   Screenshots bind themselves: drop files into `src/assets/screens/` and they
   attach to the matching entry in `appScreens`. Screens without a file render
   an animated mock, so the wall is never broken and never empty.
   ───────────────────────────────────────────────────────────────────────────── */
/* Eager glob: paths are static, so Vite inlines the URLs at build time. An
   empty folder simply yields an empty object — no runtime cost, no 404s. */
var shotModules = import.meta.glob("../../../assets/screens/*.{png,jpg,jpeg,webp,avif}", { eager: true, import: "default" });
/** Pairs dropped files with screens by slug, then fills gaps in file order. */
function bindScreenshots() {
    var files = Object.entries(shotModules)
        .map(function (_a) {
        var _b;
        var path = _a[0], src = _a[1];
        return ({
            name: ((_b = path.split("/").pop()) !== null && _b !== void 0 ? _b : "").toLowerCase(),
            src: src,
        });
    })
        .sort(function (a, b) { return a.name.localeCompare(b.name, "en", { numeric: true }); });
    var taken = new Set();
    var bound = new Map();
    var _loop_1 = function (screen_1) {
        var hit = files.find(function (file) { return !taken.has(file.name) && file.name.includes(screen_1.slug); });
        if (hit) {
            taken.add(hit.name);
            bound.set(screen_1.id, hit.src);
        }
    };
    for (var _i = 0, appScreens_2 = appScreens_1.appScreens; _i < appScreens_2.length; _i++) {
        var screen_1 = appScreens_2[_i];
        _loop_1(screen_1);
    }
    var spare = files.filter(function (file) { return !taken.has(file.name); });
    var cursor = 0;
    for (var _a = 0, appScreens_3 = appScreens_1.appScreens; _a < appScreens_3.length; _a++) {
        var screen_2 = appScreens_3[_a];
        if (bound.has(screen_2.id) || cursor >= spare.length)
            continue;
        bound.set(screen_2.id, spare[cursor++].src);
    }
    return appScreens_1.appScreens.map(function (screen) {
        var _a;
        return (__assign(__assign({}, screen), { src: (_a = bound.get(screen.id)) !== null && _a !== void 0 ? _a : null }));
    });
}
var screens = bindScreenshots();
var COUNT = screens.length;
/** How long a handset holds centre stage before the wall rotates on. */
var DWELL = 4600;
/** Beyond this distance from centre a phone is parked to keep paint cheap. */
var VISIBLE_SPAN = 3;
var wrap = function (value) { return ((value % COUNT) + COUNT) % COUNT; };
/** Shortest signed distance from the active index, so the orbit wraps. */
var offsetFrom = function (index, focus) {
    var half = COUNT / 2;
    var offset = index - focus;
    if (offset > half)
        offset -= COUNT;
    if (offset < -half)
        offset += COUNT;
    return offset;
};
/* ── mock screen bodies (used until a real screenshot is dropped in) ──────── */
var MOCK_ROWS = {
    clockout: [
        { label: "Clock in", value: "09:02" },
        { label: "Break", value: "13:10" },
        { label: "Field visit", value: "15:45" },
    ],
    exceptions: [
        { label: "Late arrival", value: "Approved" },
        { label: "Early leave", value: "Pending" },
        { label: "Late arrival", value: "Approved" },
    ],
    compoff: [
        { label: "Overtime · 2h 15m", value: "Credited" },
        { label: "Overtime · 1h 40m", value: "Pending" },
        { label: "Comp off used", value: "1 day" },
    ],
    notifications: [
        { label: "Leave approved", value: "now" },
        { label: "Shift reminder", value: "2h" },
        { label: "Out of range", value: "6h" },
    ],
};
function ScreenMock(_a) {
    var _b;
    var screen = _a.screen;
    var rows = (_b = MOCK_ROWS[screen.id]) !== null && _b !== void 0 ? _b : MOCK_ROWS.clockout;
    return (<span className="tw-mock" data-kind={screen.kind} aria-hidden="true">
      <span className="tw-mock-status">
        <b>9:41</b>
        <em />
      </span>

      <span className="tw-mock-head">
        <i className="tw-mock-back"/>
        <b>{screen.label}</b>
        <i className="tw-mock-avatar"/>
      </span>

      {screen.kind === "rows" && (<>
          <span className="tw-mock-hero">
            <b>08:24</b>
            <em>Hours today</em>
            <i />
          </span>
          {rows.map(function (row, index) { return (<span className="tw-mock-row" key={row.label} style={{ "--i": index }}>
              <i />
              <b>{row.label}</b>
              <em>{row.value}</em>
            </span>); })}
        </>)}

      {screen.kind === "chat" && (<span className="tw-mock-chat">
          <span className="tw-bubble is-them">How many leaves do I have?</span>
          <span className="tw-bubble is-me">
            You have 8 casual and 4 sick days left this year.
          </span>
          <span className="tw-bubble is-them">Apply one for Friday</span>
          <span className="tw-typing">
            <i />
            <i />
            <i />
          </span>
        </span>)}

      {screen.kind === "grid" && (<span className="tw-mock-grid">
          {Array.from({ length: 21 }).map(function (_, index) { return (<i key={index} data-on={index % 7 === 5 || index === 9 ? "" : undefined} style={{ "--i": index }}/>); })}
        </span>)}

      {screen.kind === "menu" && (<span className="tw-mock-menu">
          {Array.from({ length: 6 }).map(function (_, index) { return (<span key={index} style={{ "--i": index }}>
              <i />
              <b />
              <em />
            </span>); })}
        </span>)}

      {screen.kind === "sheet" && (<span className="tw-mock-sheet">
          <b>Name this note</b>
          <span className="tw-mock-field">
            Weekly ops review
            <i />
          </span>
          <span className="tw-mock-wave">
            {Array.from({ length: 22 }).map(function (_, index) { return (<i key={index} style={{ "--i": index }}/>); })}
          </span>
          <span className="tw-mock-cta">Add audio</span>
        </span>)}

      {screen.kind === "ring" && (<>
          <span className="tw-mock-ring">
            <svg viewBox="0 0 72 72">
              <circle className="tw-ring-track" cx="36" cy="36" r="28"/>
              <circle className="tw-ring-arc" cx="36" cy="36" r="28"/>
            </svg>
            <b>12</b>
          </span>
          {["Casual · 8", "Sick · 4", "Earned · 6"].map(function (row, index) { return (<span className="tw-mock-row" key={row} style={{ "--i": index }}>
              <i />
              <b>{row}</b>
              <em>left</em>
            </span>); })}
        </>)}

      <span className="tw-mock-tabs">
        <i data-on=""/>
        <i />
        <i />
        <i />
      </span>
    </span>);
}
/* ── the wall ────────────────────────────────────────────────────────────── */
function TourScreenWall() {
    var _a;
    var _b = (0, useMotion_1.useReveal)(0.12), revealRef = _b.ref, visible = _b.visible;
    var reduced = (0, useMotion_1.usePrefersReducedMotion)();
    var _c = (0, react_1.useState)(0), focus = _c[0], setFocus = _c[1];
    var _d = (0, react_1.useState)(false), held = _d[0], setHeld = _d[1];
    /** Live drag distance expressed in orbit slots, so CSS can follow the hand. */
    var _e = (0, react_1.useState)(0), drag = _e[0], setDrag = _e[1];
    var stageRef = (0, react_1.useRef)(null);
    var dragState = (0, react_1.useRef)(null);
    /** Set once a drag passes the slop threshold, to swallow the trailing click. */
    var moved = (0, react_1.useRef)(false);
    var active = (_a = screens[focus]) !== null && _a !== void 0 ? _a : screens[0];
    var paused = held || drag !== 0;
    var goTo = (0, react_1.useCallback)(function (next) { return setFocus(wrap(next)); }, []);
    /* Autoplay keeps the wall alive, and parks the moment a visitor takes over. */
    (0, react_1.useEffect)(function () {
        if (reduced || paused || !visible || COUNT < 2)
            return;
        var id = window.setTimeout(function () { return setFocus(function (current) { return wrap(current + 1); }); }, DWELL);
        return function () { return window.clearTimeout(id); };
    }, [focus, paused, reduced, visible]);
    var onPointerDown = function (event) {
        var _a;
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        var box = (_a = stageRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        dragState.current = {
            id: event.pointerId,
            x: event.clientX,
            width: (box === null || box === void 0 ? void 0 : box.width) || 1,
        };
        moved.current = false;
    };
    var onPointerMove = function (event) {
        var state = dragState.current;
        if (!state || state.id !== event.pointerId)
            return;
        var delta = event.clientX - state.x;
        if (Math.abs(delta) > 6)
            moved.current = true;
        /* A third of the stage width equals one slot — heavy enough to feel
           physical, light enough to flick through several screens. */
        setDrag((delta / (state.width / 3)) * -1);
    };
    var endDrag = function (event) {
        var state = dragState.current;
        if (!state || state.id !== event.pointerId)
            return;
        dragState.current = null;
        var steps = Math.round(drag);
        setDrag(0);
        if (steps !== 0)
            goTo(focus + steps);
    };
    var onKeyDown = function (event) {
        if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(focus + 1);
        }
        else if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(focus - 1);
        }
    };
    var shotCount = (0, react_1.useMemo)(function () { return screens.filter(function (screen) { return screen.src; }).length; }, []);
    return (<div className="tw-wall" ref={revealRef} data-visible={visible || undefined} style={{ "--accent": active.accent }}>
      <div className="tw-head">
        <span className="tr-eyebrow">
          <i />
          {shotCount > 0 ? "Straight from the app" : "On the phone"}
        </span>
        <h3>The workspace in your pocket.</h3>
        <p>
          Ten screens people actually use every day. Drag the wall, tap a
          handset, or use the arrow keys.
        </p>
      </div>

      <div className="tw-stage" ref={stageRef} tabIndex={0} role="group" aria-label="Fawnix mobile app screens" data-dragging={drag !== 0 || undefined} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={function () { return setHeld(false); }} onPointerEnter={function () { return setHeld(true); }} onFocus={function () { return setHeld(true); }} onBlur={function () { return setHeld(false); }} onKeyDown={onKeyDown}>
        <span className="tw-stage-glow" aria-hidden="true"/>
        <span className="tw-stage-grid" aria-hidden="true"/>

        <div className="tw-orbit">
          {screens.map(function (screen, index) {
            var offset = offsetFrom(index, focus) + drag;
            var distance = Math.abs(offset);
            var isActive = distance < 0.5;
            return (<button type="button" className="tw-phone" key={screen.id} tabIndex={-1} aria-label={"Show ".concat(screen.label)} aria-current={isActive || undefined} data-active={isActive || undefined} data-far={distance > VISIBLE_SPAN || undefined} data-side={offset < 0 ? "left" : "right"} style={{
                    "--off": offset.toFixed(3),
                    "--abs": distance.toFixed(3),
                    "--depth": Math.min(distance, VISIBLE_SPAN + 1).toFixed(3),
                    "--accent": screen.accent,
                    zIndex: 100 - Math.round(distance * 10),
                }} onClick={function () {
                    if (moved.current)
                        return;
                    goTo(index);
                }}>
                <span className="tw-phone-body">
                  {screen.src ? (<img className="tw-phone-shot" src={screen.src} alt={"".concat(screen.label, " screen in the Fawnix mobile app")} loading={index < 3 ? "eager" : "lazy"} decoding="async" draggable={false}/>) : (<ScreenMock screen={screen}/>)}
                  {/* Real captures already contain the device status bar, so
                    drawing our own notch on top would double it up. */}
                  {!screen.src && (<span className="tw-phone-notch" aria-hidden="true"/>)}
                  <span className="tw-phone-sheen" aria-hidden="true"/>
                  <span className="tw-phone-scan" aria-hidden="true"/>
                </span>
                <span className="tw-phone-shadow" aria-hidden="true"/>
              </button>);
        })}
        </div>

        <span className="tw-hint" aria-hidden="true">
          drag · tap a screen
        </span>
      </div>

      <div className="tw-readout">
        <div className="tw-readout-copy" key={active.id}>
          <span className="tw-readout-meta">{active.meta}</span>
          <strong>{active.title}</strong>
          <p>{active.caption}</p>
        </div>

        <div className="tw-nav">
          <button type="button" onClick={function () { return goTo(focus - 1); }} aria-label="Previous screen">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5"/>
            </svg>
          </button>
          <span className="tw-count">
            <b>{String(focus + 1).padStart(2, "0")}</b>
            <i />
            {String(COUNT).padStart(2, "0")}
          </span>
          <button type="button" onClick={function () { return goTo(focus + 1); }} aria-label="Next screen">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </button>
          <span className="tw-dwell" key={"".concat(active.id, "-dwell")} data-hold={paused || reduced || undefined} aria-hidden="true"/>
        </div>
      </div>

      <div className="tw-rail" role="tablist" aria-label="App screens">
        {screens.map(function (screen, index) { return (<button key={screen.id} type="button" role="tab" aria-selected={index === focus} data-active={index === focus || undefined} style={{ "--accent": screen.accent }} onClick={function () { return goTo(index); }}>
            {screen.label}
          </button>); })}
      </div>
    </div>);
}
