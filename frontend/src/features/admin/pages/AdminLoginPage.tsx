import { useEffect, useRef, useState } from "react";
import fawnixBg from "../../../assets/fawnix_bg.png";
import SidebarIcon from "../components/navigation/SidebarIcon";
import { usePublicStats } from "../../public/hooks/usePublicStats";

type AdminLoginPageProps = {
  adminEmpCode: string;
  adminOtp: string;
  authLoading: boolean;
  authStatus: string;
  loginDateLabel: string;
  loginLocationDetails: string;
  loginSceneMode: "dawn" | "day" | "dusk" | "night";
  loginTimeLabel: string;
  loginTimeZone: string;
  onAdminEmpCodeChange: (value: string) => void;
  onAdminOtpChange: (value: string) => void;
  onBack: () => void;
  onLogin: () => void;
  onRequestOtp: () => void;
  timeZoneLabel: string;
};

const OTP_LEN = 6;
const sceneCopy = {
  dawn: "A fresh start for the day ahead.",
  day: "Everything in motion, beautifully visible.",
  dusk: "Close the day with a clear picture.",
  night: "Your workspace is ready when you are.",
};

const FLOW_DWELL = 3600;
const flowSteps = [
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
] as const;

export default function AdminLoginPage({
  adminEmpCode,
  adminOtp,
  authLoading,
  authStatus,
  loginDateLabel,
  loginLocationDetails,
  loginSceneMode,
  loginTimeLabel,
  loginTimeZone,
  onAdminEmpCodeChange,
  onAdminOtpChange,
  onBack,
  onLogin,
  onRequestOtp,
  timeZoneLabel,
}: AdminLoginPageProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isErr = /error|invalid|fail|denied|unauthorized/i.test(authStatus);
  const stats = usePublicStats();
  const [flowStep, setFlowStep] = useState(0);
  const activeFlow = flowSteps[flowStep] ?? flowSteps[0];

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;
    const cycleId = window.setInterval(
      () => setFlowStep((current) => (current + 1) % flowSteps.length),
      FLOW_DWELL,
    );
    return () => window.clearInterval(cycleId);
  }, []);

  useEffect(() => {
    if (adminOtp) return;
    const resetTimerId = window.setTimeout(
      () => setDigits(Array(OTP_LEN).fill("")),
      0,
    );
    return () => window.clearTimeout(resetTimerId);
  }, [adminOtp]);

  const updateDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    onAdminOtpChange(next.join(""));
    if (value && index < OTP_LEN - 1) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKey = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0)
      digitRefs.current[index - 1]?.focus();
  };

  const handleRequestOtp = () => {
    onRequestOtp();
    setDigits(Array(OTP_LEN).fill(""));
    window.setTimeout(() => digitRefs.current[0]?.focus(), 250);
  };

  return (
    <section className="login-v3" data-scene={loginSceneMode}>
      <div className="login-v3-aurora" aria-hidden="true">
        <span className="login-v3-orbit login-v3-orbit-one" />
        <span className="login-v3-orbit login-v3-orbit-two" />
        <span className="login-v3-orbit login-v3-orbit-three" />
      </div>
      <div className="login-v3-noise" aria-hidden="true" />

      <div className="login-v3-frame">
        <header className="login-v3-topbar">
          <button className="login-v3-back" onClick={onBack} type="button">
            <span aria-hidden="true">←</span> Back to Fawnix
          </button>
          <div className="login-v3-time">
            <span className="login-v3-live-dot" aria-hidden="true" />
            <strong>{loginTimeLabel}</strong>
            <small>{loginDateLabel}</small>
          </div>
        </header>

        <div className="login-v3-layout">
          <aside className="login-v3-story">
            <div className="login-v3-brand">
              <img src={fawnixBg} alt="Fawnix" />
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

            <div
              className="login-flow-story"
              data-stage={activeFlow.id}
            >
              <div className="login-flow-head">
                <span>
                  <i aria-hidden="true" />
                  One connected workday
                </span>
                <time>{loginTimeLabel}</time>
              </div>

              <div className="login-flow-cinema" aria-hidden="true">
                <div className="login-story-scene login-story-employee">
                  <span className="login-story-sun" />
                  <div className="login-story-building">
                    <span>FAWNIX</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="login-story-ground" />
                  <div className="login-story-worker">
                    <span className="worker-shadow" />
                    <span className="worker-head"><i /></span>
                    <span className="worker-body"><i /></span>
                    <span className="worker-arm-back" />
                    <span className="worker-arm-phone"><i /></span>
                    <span className="worker-leg worker-leg-back" />
                    <span className="worker-leg worker-leg-front" />
                  </div>
                  <div className="login-story-phone-card">
                    <span className="phone-card-top">
                      <i /> Fawnix Attend
                    </span>
                    <span className="phone-card-person">
                      <SidebarIcon name="users" />
                    </span>
                    <strong>Good morning, Aarav</strong>
                    <small>Main office / 08:55</small>
                    <span className="phone-card-action">
                      <SidebarIcon name="clock" /> Check in
                    </span>
                    <i className="phone-card-tap" />
                  </div>
                  <div className="login-story-verified">
                    <span><SidebarIcon name="pin" /></span>
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
                    <span className="admin-body" />
                    <span className="admin-arm" />
                  </div>
                  <span className="admin-story-chair" />
                  <span className="admin-story-desk" />
                  <div className="admin-story-monitor">
                    <span className="admin-monitor-bar"><i /> Attendance inbox</span>
                    <div className="admin-request-card">
                      <span>AS</span>
                      <div><strong>Aarav Sharma</strong><small>08:55 / Main office / Verified</small></div>
                      <em>Pending</em>
                    </div>
                    <span className="admin-approve-button">Approve</span>
                    <span className="admin-approved-state">
                      <SidebarIcon name="badge" /> Approved
                    </span>
                    <i className="admin-story-cursor" />
                  </div>
                  <span className="admin-monitor-stand" />
                </div>

                <div className="login-story-scene login-story-record">
                  <div className="record-story-head">
                    <span><SidebarIcon name="activity" /></span>
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
                    <SidebarIcon name="badge" />
                    <strong>Recorded across Fawnix</strong>
                    <small>Employee / Attendance / Operations</small>
                  </div>
                </div>

                <span className="login-story-cut" />
              </div>

              <div className="login-flow-copy" key={activeFlow.id}>
                <span>0{flowStep + 1}</span>
                <div>
                  <strong>{activeFlow.title}</strong>
                  <p>{activeFlow.caption}</p>
                </div>
              </div>

              <div
                className="login-flow-steps"
                role="tablist"
                aria-label="Workday story"
              >
                {flowSteps.map((step, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={index === flowStep}
                    className={index === flowStep ? "is-active" : undefined}
                    key={step.id}
                    onClick={() => setFlowStep(index)}
                  >
                    <span>{step.label}</span>
                    <i aria-hidden="true" />
                  </button>
                ))}
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
                  <input
                    id="v3-employee"
                    value={adminEmpCode}
                    onChange={(event) =>
                      onAdminEmpCodeChange(event.target.value)
                    }
                    placeholder="e.g. FX-1042"
                    autoComplete="username"
                  />
                  <button
                    onClick={handleRequestOtp}
                    disabled={authLoading || !adminEmpCode.trim()}
                    type="button"
                  >
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
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        digitRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) =>
                        updateDigit(index, event.target.value)
                      }
                      onKeyDown={(event) => handleDigitKey(index, event.key)}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div
                className={`login-v3-status${isErr ? " is-error" : ""}`}
                data-shown={authStatus ? "true" : undefined}
                role="status"
              >
                {authStatus ? (
                  <>
                    <span>{isErr ? "!" : "✓"}</span>
                    {authStatus}
                  </>
                ) : (
                  <>
                    <span>·</span>
                    Codes expire in 5 minutes.
                  </>
                )}
              </div>

              <button
                className="login-v3-submit"
                onClick={onLogin}
                disabled={
                  authLoading ||
                  !adminEmpCode.trim() ||
                  digits.join("").length < OTP_LEN
                }
                type="button"
              >
                {authLoading ? (
                  <>
                    <i className="login-v3-spinner" /> Verifying access
                  </>
                ) : (
                  <>
                    Open workspace <span aria-hidden="true">↗</span>
                  </>
                )}
              </button>

              <div className="login-v3-meta">
                <span>Encrypted session</span>
                <i aria-hidden="true" />
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
    </section>
  );
}
