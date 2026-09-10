"use strict";
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
exports.default = AdminLoginPage;
var react_1 = require("react");
var fawnix_bg_png_1 = require("../../../assets/fawnix_bg.png");
var SidebarIcon_1 = require("../components/navigation/SidebarIcon");
var usePublicStats_1 = require("../../public/hooks/usePublicStats");
var OTP_LEN = 6;
var sceneCopy = {
    dawn: "A fresh start for the day ahead.",
    day: "Everything in motion, beautifully visible.",
    dusk: "Close the day with a clear picture.",
    night: "Your workspace is ready when you are.",
};
var FLOW_DWELL = 3600;
var flowSteps = [
    {
        id: "approach",
        label: "Arrive",
        title: "The workday walks in with them.",
        caption: "A team member approaches the workplace with Fawnix ready on mobile.",
    },
    {
        id: "check-in",
        label: "Check in",
        title: "One tap verifies their arrival.",
        caption: "Time, identity and the approved location become one attendance event.",
    },
    {
        id: "review",
        label: "Approve",
        title: "The scene moves to the admin.",
        caption: "The verified request arrives with enough context for a confident decision.",
    },
    {
        id: "record",
        label: "Record",
        title: "Approval becomes a trusted record.",
        caption: "The employee timeline, attendance register and operations view update together.",
    },
];
function AdminLoginPage(_a) {
    var _b;
    var adminEmpCode = _a.adminEmpCode, adminOtp = _a.adminOtp, authLoading = _a.authLoading, authStatus = _a.authStatus, loginDateLabel = _a.loginDateLabel, loginLocationDetails = _a.loginLocationDetails, loginSceneMode = _a.loginSceneMode, loginTimeLabel = _a.loginTimeLabel, loginTimeZone = _a.loginTimeZone, onAdminEmpCodeChange = _a.onAdminEmpCodeChange, onAdminOtpChange = _a.onAdminOtpChange, onBack = _a.onBack, onLogin = _a.onLogin, onRequestOtp = _a.onRequestOtp, timeZoneLabel = _a.timeZoneLabel;
    var _c = (0, react_1.useState)(Array(OTP_LEN).fill("")), digits = _c[0], setDigits = _c[1];
    var digitRefs = (0, react_1.useRef)([]);
    var isErr = /error|invalid|fail|denied|unauthorized/i.test(authStatus);
    var stats = (0, usePublicStats_1.usePublicStats)();
    var _d = (0, react_1.useState)(0), flowStep = _d[0], setFlowStep = _d[1];
    var activeFlow = (_b = flowSteps[flowStep]) !== null && _b !== void 0 ? _b : flowSteps[0];
    (0, react_1.useEffect)(function () {
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion)
            return;
        var cycleId = window.setInterval(function () { return setFlowStep(function (current) { return (current + 1) % flowSteps.length; }); }, FLOW_DWELL);
        return function () { return window.clearInterval(cycleId); };
    }, []);
    (0, react_1.useEffect)(function () {
        if (adminOtp)
            return;
        var resetTimerId = window.setTimeout(function () { return setDigits(Array(OTP_LEN).fill("")); }, 0);
        return function () { return window.clearTimeout(resetTimerId); };
    }, [adminOtp]);
    var updateDigit = function (index, value) {
        var _a;
        if (!/^\d*$/.test(value))
            return;
        var next = __spreadArray([], digits, true);
        next[index] = value.slice(-1);
        setDigits(next);
        onAdminOtpChange(next.join(""));
        if (value && index < OTP_LEN - 1)
            (_a = digitRefs.current[index + 1]) === null || _a === void 0 ? void 0 : _a.focus();
    };
    var handleDigitKey = function (index, key) {
        var _a;
        if (key === "Backspace" && !digits[index] && index > 0)
            (_a = digitRefs.current[index - 1]) === null || _a === void 0 ? void 0 : _a.focus();
    };
    var handleRequestOtp = function () {
        onRequestOtp();
        setDigits(Array(OTP_LEN).fill(""));
        window.setTimeout(function () { var _a; return (_a = digitRefs.current[0]) === null || _a === void 0 ? void 0 : _a.focus(); }, 250);
    };
    return (<section className="login-v3" data-scene={loginSceneMode}>
      <div className="login-v3-aurora" aria-hidden="true">
        <span className="login-v3-orbit login-v3-orbit-one"/>
        <span className="login-v3-orbit login-v3-orbit-two"/>
        <span className="login-v3-orbit login-v3-orbit-three"/>
      </div>
      <div className="login-v3-noise" aria-hidden="true"/>

      <div className="login-v3-frame">
        <header className="login-v3-topbar">
          <button className="login-v3-back" onClick={onBack} type="button">
            <span aria-hidden="true">←</span> Back to Fawnix
          </button>
          <div className="login-v3-time">
            <span className="login-v3-live-dot" aria-hidden="true"/>
            <strong>{loginTimeLabel}</strong>
            <small>{loginDateLabel}</small>
          </div>
        </header>

        <div className="login-v3-layout">
          <aside className="login-v3-story">
            <div className="login-v3-brand">
              <img src={fawnix_bg_png_1.default} alt="Fawnix"/>
              <div>
                <strong>Fawnix</strong>
                <span>Workforce Operations Suite</span>
              </div>
            </div>

            <div className="login-v3-message">
              <span>Admin workspace</span>
              <h1>{sceneCopy[loginSceneMode]}</h1>
              <p>
                Attendance, people, approvals and field work in one quiet
                command centre.
              </p>
            </div>

            <div className="login-flow-story" data-stage={activeFlow.id}>
              <div className="login-flow-head">
                <span>
                  <i aria-hidden="true"/>
                  One connected workday
                </span>
                <time>{loginTimeLabel}</time>
              </div>

              <div className="login-flow-cinema" aria-hidden="true">
                <div className="login-story-scene login-story-employee">
                  <span className="login-story-sun"/>
                  <div className="login-story-building">
                    <span>FAWNIX</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="login-story-ground"/>
                  <div className="login-story-worker">
                    <span className="worker-shadow"/>
                    <span className="worker-head"><i /></span>
                    <span className="worker-body"><i /></span>
                    <span className="worker-arm-back"/>
                    <span className="worker-arm-phone"><i /></span>
                    <span className="worker-leg worker-leg-back"/>
                    <span className="worker-leg worker-leg-front"/>
                  </div>
                  <div className="login-story-phone-card">
                    <span className="phone-card-top">
                      <i /> Fawnix Attend
                    </span>
                    <span className="phone-card-person">
                      <SidebarIcon_1.default name="users"/>
                    </span>
                    <strong>Good morning, Aarav</strong>
                    <small>Main office / 08:55</small>
                    <span className="phone-card-action">
                      <SidebarIcon_1.default name="clock"/> Check in
                    </span>
                    <i className="phone-card-tap"/>
                  </div>
                  <div className="login-story-verified">
                    <span><SidebarIcon_1.default name="pin"/></span>
                    <div><strong>Arrival verified</strong><small>Time and place matched</small></div>
                  </div>
                </div>

                <div className="login-story-scene login-story-admin">
                  <div className="admin-story-wall">
                    <span>Operations</span>
                    <i /><i /><i />
                  </div>
                  <div className="admin-story-person">
                    <span className="admin-head"><i /></span>
                    <span className="admin-body"/>
                    <span className="admin-arm"/>
                  </div>
                  <span className="admin-story-chair"/>
                  <span className="admin-story-desk"/>
                  <div className="admin-story-monitor">
                    <span className="admin-monitor-bar"><i /> Attendance inbox</span>
                    <div className="admin-request-card">
                      <span>AS</span>
                      <div><strong>Aarav Sharma</strong><small>08:55 / Main office / Verified</small></div>
                      <em>Pending</em>
                    </div>
                    <span className="admin-approve-button">Approve</span>
                    <span className="admin-approved-state">
                      <SidebarIcon_1.default name="badge"/> Approved
                    </span>
                    <i className="admin-story-cursor"/>
                  </div>
                  <span className="admin-monitor-stand"/>
                </div>

                <div className="login-story-scene login-story-record">
                  <div className="record-story-head">
                    <span><SidebarIcon_1.default name="activity"/></span>
                    <div><strong>Attendance timeline</strong><small>Aarav Sharma / Today</small></div>
                    <em>Complete</em>
                  </div>
                  <div className="record-story-line"><i /><i /><i /></div>
                  <div className="record-story-events">
                    <span><b>08:55</b><small>Mobile check-in</small></span>
                    <span><b>08:55</b><small>Location verified</small></span>
                    <span><b>08:56</b><small>Admin approved</small></span>
                  </div>
                  <div className="record-story-seal">
                    <SidebarIcon_1.default name="badge"/>
                    <strong>Recorded across Fawnix</strong>
                    <small>Employee / Attendance / Operations</small>
                  </div>
                </div>

                <span className="login-story-cut"/>
              </div>

              <div className="login-flow-copy" key={activeFlow.id}>
                <span>0{flowStep + 1}</span>
                <div>
                  <strong>{activeFlow.title}</strong>
                  <p>{activeFlow.caption}</p>
                </div>
              </div>

              <div className="login-flow-steps" role="tablist" aria-label="Workday story">
                {flowSteps.map(function (step, index) { return (<button type="button" role="tab" aria-selected={index === flowStep} className={index === flowStep ? "is-active" : undefined} key={step.id} onClick={function () { return setFlowStep(index); }}>
                    <span>{step.label}</span>
                    <i aria-hidden="true"/>
                  </button>); })}
              </div>
            </div>
          </aside>

          <main className="login-v3-panel">
            <div className="login-v3-card">
              <div className="login-v3-card-head">
                <div className="login-v3-icon">
                  <span aria-hidden="true">ID</span>
                </div>
                <div>
                  <span>Secure access</span>
                  <h2>Welcome back.</h2>
                </div>
              </div>

              <p className="login-v3-intro">
                Sign in with your employee ID and a one-time password to open
                the workspace.
              </p>

              <div className="login-v3-field">
                <label htmlFor="v3-employee">Employee ID</label>
                <div className="login-v3-input-row">
                  <input id="v3-employee" value={adminEmpCode} onChange={function (event) {
            return onAdminEmpCodeChange(event.target.value);
        }} placeholder="e.g. FX-1042" autoComplete="username"/>
                  <button onClick={handleRequestOtp} disabled={authLoading || !adminEmpCode.trim()} type="button">
                    {authLoading ? "Sending..." : "Get OTP"}
                  </button>
                </div>
              </div>

              <div className="login-v3-field login-v3-otp-field">
                <div className="login-v3-label-row">
                  <label>One-time password</label>
                  <small>{OTP_LEN} digits</small>
                </div>
                <div className="login-v3-otp-grid">
                  {digits.map(function (digit, index) { return (<input key={index} ref={function (element) {
                digitRefs.current[index] = element;
            }} value={digit} onChange={function (event) {
                return updateDigit(index, event.target.value);
            }} onKeyDown={function (event) { return handleDigitKey(index, event.key); }} inputMode="numeric" maxLength={1} aria-label={"OTP digit ".concat(index + 1)}/>); })}
                </div>
              </div>

              <div className={"login-v3-status".concat(isErr ? " is-error" : "")} data-shown={authStatus ? "true" : undefined} role="status">
                {authStatus ? (<>
                    <span>{isErr ? "!" : "✓"}</span>
                    {authStatus}
                  </>) : (<>
                    <span>·</span>
                    Codes expire in 5 minutes.
                  </>)}
              </div>

              <button className="login-v3-submit" onClick={onLogin} disabled={authLoading ||
            !adminEmpCode.trim() ||
            digits.join("").length < OTP_LEN} type="button">
                {authLoading ? (<>
                    <i className="login-v3-spinner"/> Verifying access
                  </>) : (<>
                    Open workspace <span aria-hidden="true">↗</span>
                  </>)}
              </button>

              <div className="login-v3-meta">
                <span>Encrypted session</span>
                <i aria-hidden="true"/>
                <span>{timeZoneLabel || loginTimeZone}</span>
              </div>
            </div>
          </main>
        </div>

        <footer className="login-v3-footline">
          <p className="login-v3-location">{loginLocationDetails}</p>
          <span>
            {stats.departments} departments · {stats.avgHoursLabel} avg. hours
          </span>
        </footer>
      </div>
    </section>);
}
