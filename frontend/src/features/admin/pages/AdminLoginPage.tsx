import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import fawnixBg from "../../../assets/fawnix_bg.png";
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

/* Circumference of the dial arc (r = 46 in a 120x120 viewBox). Pre-computed so
   the render path stays arithmetic-free. */
const DIAL_C = 2 * Math.PI * 46;
/* How long each signal holds the dial before it rotates to the next one. */
const DIAL_DWELL = 4200;

const clampPercent = (value: number) => Math.min(100, Math.max(4, value));

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
  const peak = Math.max(...stats.rates, 1);

  /* ---- live operations dial ------------------------------------------ */
  const coreRef = useRef<HTMLDivElement | null>(null);
  const [focus, setFocus] = useState(0);
  const [held, setHeld] = useState(false);

  /* Three real signals, each mapped onto the same 0..100 dial so switching
     between them reads as one continuous instrument rather than three charts. */
  const dials = useMemo(() => {
    const roster = Math.max(stats.headcount, 1);
    const onShift = Math.max(stats.present, 1);
    return [
      {
        id: "attendance",
        label: "Attendance",
        value: stats.rateLabel,
        caption: `${stats.presentLabel} of ${stats.headcountLabel} people are checked in right now.`,
        percent: clampPercent(stats.attendanceRate),
      },
      {
        id: "approvals",
        label: "Approvals",
        value: stats.approvalsLabel,
        caption: `${stats.pendingLeaves} leave and ${stats.pendingExceptions} exception requests are waiting on a decision.`,
        /* Inverted: a short queue should read as a full, healthy ring. */
        percent: clampPercent(100 - (stats.pendingApprovals / roster) * 100),
      },
      {
        id: "field",
        label: "In the field",
        value: stats.inFieldLabel,
        caption: `${stats.inFieldLabel} teammates are on site, tracked live with distance and visit logs.`,
        percent: clampPercent((stats.inField / onShift) * 100),
      },
    ];
  }, [stats]);

  const active = dials[focus] ?? dials[0];

  /* The dial cycles on its own so the page always feels alive, and parks the
     moment a visitor takes over with a pointer or the keyboard. */
  useEffect(() => {
    if (held) return;
    const cycleId = window.setInterval(
      () => setFocus((current) => (current + 1) % dials.length),
      DIAL_DWELL,
    );
    return () => window.clearInterval(cycleId);
  }, [held, dials.length]);

  /* Feed the cursor position to CSS so the sheen can track the pointer without
     a re-render per mouse move. */
  const handleCorePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = coreRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    node.style.setProperty(
      "--mx",
      `${((event.clientX - box.left) / box.width) * 100}%`,
    );
    node.style.setProperty(
      "--my",
      `${((event.clientY - box.top) / box.height) * 100}%`,
    );
  };

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

            {/* Live operations core — an instrument, not a chart. The ring,
                readout and ribbon all track one selected signal; hovering,
                focusing or tabbing takes manual control of the rotation. */}
            <div
              className="login-v3-core"
              ref={coreRef}
              data-live={stats.isLive || undefined}
              data-signal={active.id}
              onPointerMove={handleCorePointer}
              onPointerEnter={() => setHeld(true)}
              onPointerLeave={() => setHeld(false)}
            >
              <span className="core-sheen" aria-hidden="true" />
              <span className="core-grid" aria-hidden="true" />

              <div className="core-head">
                <span className="core-tag">
                  <i aria-hidden="true" />
                  {stats.isLive ? "Live signal" : "Preview signal"}
                </span>
                <span className="core-clock">{loginTimeLabel}</span>
              </div>

              <div className="core-stage">
                <div className="core-dial">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle
                      className="core-dial-track"
                      cx="60"
                      cy="60"
                      r="46"
                    />
                    <circle
                      className="core-dial-arc"
                      cx="60"
                      cy="60"
                      r="46"
                      style={
                        {
                          strokeDasharray: DIAL_C,
                          strokeDashoffset:
                            DIAL_C - (DIAL_C * active.percent) / 100,
                        } as CSSProperties
                      }
                    />
                  </svg>
                  <span className="core-dial-sweep" aria-hidden="true" />
                  <div className="core-readout" key={active.id}>
                    <strong>{active.value}</strong>
                    <span>{active.label}</span>
                  </div>
                </div>

                <p className="core-caption" key={`${active.id}-caption`}>
                  {active.caption}
                </p>
              </div>

              <div
                className="core-switch"
                role="tablist"
                aria-label="Live signals"
              >
                {dials.map((dial, index) => (
                  <button
                    key={dial.id}
                    type="button"
                    role="tab"
                    aria-selected={index === focus}
                    className={index === focus ? "is-on" : undefined}
                    onClick={() => setFocus(index)}
                    onFocus={() => {
                      setHeld(true);
                      setFocus(index);
                    }}
                    onBlur={() => setHeld(false)}
                  >
                    {dial.label}
                    <em aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="core-ribbon" aria-hidden="true">
                {stats.rates.map((rate, index) => (
                  <span
                    key={index}
                    className={
                      index === stats.rates.length - 1 ? "is-today" : undefined
                    }
                    style={
                      {
                        "--h": `${Math.max(14, (rate / peak) * 100)}%`,
                        "--i": index,
                      } as CSSProperties
                    }
                    title={`${stats.days[index]} · ${rate}%`}
                  >
                    <i>{stats.days[index]}</i>
                  </span>
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
