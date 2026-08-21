import { useEffect, useRef, useState } from "react";
import fawnixBg from "../../../assets/fawnix_bg.png";

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
      <div className="login-v3-noise" />
      <div className="login-v3-orbit login-v3-orbit-one" />
      <div className="login-v3-orbit login-v3-orbit-two" />
      <header className="login-v3-topbar">
        <button className="login-v3-back" onClick={onBack} type="button">
          <span>←</span> Back to Fawnix
        </button>
        <div className="login-v3-time">
          <span className="login-v3-live-dot" />{" "}
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
            <span>ADMIN WORKSPACE</span>
            <h1>{sceneCopy[loginSceneMode]}</h1>
            <p>
              Attendance, people, approvals, and field work in one quiet command
              centre.
            </p>
          </div>
          <div className="login-v3-preview">
            <div className="preview-top">
              <span>Today at a glance</span>
              <b>
                <i /> Live
              </b>
            </div>
            <div className="preview-value">
              <strong>94.2%</strong>
              <small>attendance rhythm</small>
            </div>
            <div className="preview-line">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-footer">
              <span>
                <b>128</b> present
              </span>
              <span>
                <b>09</b> to review
              </span>
              <span>
                <b>04</b> in field
              </span>
            </div>
          </div>
        </aside>
        <main className="login-v3-panel">
          <div className="login-v3-card">
            <div className="login-v3-card-head">
              <div className="login-v3-icon">
                <img src={fawnixBg} alt="" />
              </div>
              <div>
                <span>Secure access</span>
                <h2>Welcome back.</h2>
              </div>
            </div>
            <p className="login-v3-intro">
              Sign in with your employee ID and a one-time password to open the
              workspace.
            </p>
            <div className="login-v3-field">
              <label htmlFor="v3-employee">Employee ID</label>
              <div className="login-v3-input-row">
                <input
                  id="v3-employee"
                  value={adminEmpCode}
                  onChange={(event) => onAdminEmpCodeChange(event.target.value)}
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
                <small>6 digits</small>
              </div>
              <div className="login-v3-otp-grid">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      digitRefs.current[index] = element;
                    }}
                    value={digit}
                    onChange={(event) => updateDigit(index, event.target.value)}
                    onKeyDown={(event) => handleDigitKey(index, event.key)}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            {authStatus ? (
              <div className={`login-v3-status${isErr ? " is-error" : ""}`}>
                <span>{isErr ? "!" : "✓"}</span>
                {authStatus}
              </div>
            ) : null}
            +{" "}
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
                  Open workspace <span>↗</span>
                </>
              )}
            </button>
            +{" "}
            <div className="login-v3-meta">
              <span>Encrypted session</span>
              <span>·</span>
              <span>{timeZoneLabel || loginTimeZone}</span>
            </div>
            + <p className="login-v3-location">{loginLocationDetails}</p>+{" "}
          </div>
          +{" "}
        </main>
        +{" "}
      </div>
      +{" "}
    </section>
  );
}
