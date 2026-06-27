import fawnixBg from '../../../assets/fawnix_bg.png'

type AdminLoginPageProps = {
  adminEmpCode: string
  adminOtp: string
  authLoading: boolean
  authStatus: string
  loginDateLabel: string
  loginLocationDetails: string
  loginSceneMode: 'dawn' | 'day' | 'dusk' | 'night'
  loginTimeLabel: string
  loginTimeZone: string
  onAdminEmpCodeChange: (value: string) => void
  onAdminOtpChange: (value: string) => void
  onBack: () => void
  onLogin: () => void
  onRequestOtp: () => void
  timeZoneLabel: string
}

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
  timeZoneLabel
}: AdminLoginPageProps) {
  return (
    <section className={`login-stage login-stage-${loginSceneMode}`}>
      <div className="login-stage-wallpaper" aria-hidden="true">
        <div className="login-stage-grid" />
        <div className="login-stage-glow login-stage-glow-one" />
        <div className="login-stage-glow login-stage-glow-two" />
        <div className="login-stage-glow login-stage-glow-three" />
      </div>

      <div className="login-stage-topbar">
        <button
          className="ghost login-stage-back"
          onClick={onBack}
          type="button"
          aria-label="Back to landing"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14.75 5.75L8.5 12l6.25 6.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="login-stage-meta">
          <div className="login-stage-chip">
            <span>Local time</span>
            <strong>{loginTimeLabel}</strong>
            <small>{loginDateLabel}</small>
          </div>
          <div className="login-stage-chip login-stage-chip-location">
            <span>{timeZoneLabel || loginTimeZone}</span>
            <strong>Device location</strong>
            <small>{loginLocationDetails}</small>
          </div>
        </div>
      </div>

      <div className="login-stage-center">
        <div className="login-stage-panel">
          <div className="login-stage-panel-head">
            <div className="login-stage-brand">
              <img className="login-stage-brand-image" src={fawnixBg} alt="Fawnix" />
              <div>
                <p className="eyebrow">Fawnix Admin Login</p>
                <h2>Secure Sign in</h2>
              </div>
            </div>
            <p className="login-stage-support">Access with Employee ID & OTP</p>
          </div>

          <div className="login-card login-stage-card">
            <label htmlFor="admin-emp-code">Employee ID</label>
            <input
              id="admin-emp-code"
              type="text"
              value={adminEmpCode}
              onChange={(event) => onAdminEmpCodeChange(event.target.value)}
              placeholder="Enter employee code"
            />
            <label htmlFor="admin-otp">OTP</label>
            <input
              id="admin-otp"
              type="text"
              value={adminOtp}
              onChange={(event) => onAdminOtpChange(event.target.value)}
              placeholder="Enter OTP sent to your whatsapp"
            />
            <div className="login-actions">
              <button className="ghost" onClick={onRequestOtp} disabled={authLoading} type="button">
                Request OTP
              </button>
              <button className="cta" onClick={onLogin} disabled={authLoading} type="button">
                Login
              </button>
            </div>
            {authStatus ? <p className="delete-note">{authStatus}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
