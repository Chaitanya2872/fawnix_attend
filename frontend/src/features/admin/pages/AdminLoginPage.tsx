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

// Accent color per time-of-day scene
const SCENE: Record<string, [hex: string, rgb: string]> = {
  dawn:  ['#f5a34a', '245, 163, 74'],
  day:   ['#00d4ff', '0, 212, 255'],
  dusk:  ['#c084fc', '192, 132, 252'],
  night: ['#00d4ff', '0, 212, 255'],
}

// Deterministic particle positions (no Math.random → stable across renders)
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left:   `${((i * 479) % 94) + 3}%`,
  size:   `${2 + (i % 3)}px`,
  delay:  `${((i * 53) % 600) / 100}s`,
  dur:    `${5 + (i % 5)}s`,
  bottom: `${((i * 137) % 60) + 4}px`,
}))

const CSS = `
@keyframes fxGridMove {
  to { background-position: 0 60px; }
}
@keyframes fxOrbFloat {
  0%,100% { transform: scale(1) translate(0,0); opacity:0.38; }
  40%      { transform: scale(1.07) translate(14px,-10px); opacity:0.55; }
  70%      { transform: scale(0.95) translate(-10px,16px); opacity:0.32; }
}
@keyframes fxCardIn {
  from { opacity:0; transform:translateY(26px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fxGlowPulse {
  0%,100% { box-shadow: 0 0 0 1px rgba(var(--fa),0.22), 0 0 40px rgba(var(--fa),0.07); }
  50%      { box-shadow: 0 0 0 1px rgba(var(--fa),0.48), 0 0 80px rgba(var(--fa),0.18); }
}
@keyframes fxScan {
  0%   { top:-2px; opacity:0; }
  6%   { opacity:1; }
  92%  { opacity:0.6; }
  100% { top:100%; opacity:0; }
}
@keyframes fxFloatUp {
  0%   { opacity:0; transform:translateY(0) scale(0.5); }
  12%  { opacity:0.85; }
  88%  { opacity:0.4; }
  100% { opacity:0; transform:translateY(-220px) scale(1.1); }
}
@keyframes fxRingA { to { transform:rotate(360deg); } }
@keyframes fxRingB { to { transform:rotate(-360deg); } }
@keyframes fxLogoGlow {
  0%,100% { filter:drop-shadow(0 0 6px rgba(var(--fa),0.55)); }
  50%      { filter:drop-shadow(0 0 20px rgba(var(--fa),0.95)); }
}
@keyframes fxDotBlink {
  0%,100% { opacity:1; }
  50%      { opacity:0.12; }
}
@keyframes fxSpinner { to { transform:rotate(360deg); } }
@keyframes fxChipIn {
  from { opacity:0; transform:translateY(-10px); }
  to   { opacity:1; transform:none; }
}

/* grid */
.fxgrid {
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(var(--fa),0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(var(--fa),0.06) 1px, transparent 1px);
  background-size:60px 60px;
  transform:perspective(700px) rotateX(30deg) scale(1.25);
  transform-origin:50% 85%;
  animation:fxGridMove 10s linear infinite;
}

/* card */
.fxcard {
  position:relative; width:100%; max-width:460px;
  background:rgba(4,4,18,0.9);
  border:1px solid rgba(var(--fa),0.2);
  border-radius:22px; padding:44px 42px 38px;
  backdrop-filter:blur(36px); -webkit-backdrop-filter:blur(36px);
  overflow:hidden;
  animation:fxCardIn 0.55s cubic-bezier(.22,1,.36,1) both,
            fxGlowPulse 4s 0.7s ease-in-out infinite;
}

/* scan line */
.fxscan {
  position:absolute; left:0; right:0; height:1.5px; pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(var(--fa),0.55),transparent);
  animation:fxScan 7s 0.5s ease-in-out infinite;
}

/* corner brackets */
.fxb { position:absolute; width:22px; height:22px; pointer-events:none; }
.fxb-tl { top:-1px; left:-1px;  border-top:2px solid var(--fh); border-left:2px solid var(--fh);   border-radius:5px 0 0 0; }
.fxb-tr { top:-1px; right:-1px; border-top:2px solid var(--fh); border-right:2px solid var(--fh);  border-radius:0 5px 0 0; }
.fxb-bl { bottom:-1px; left:-1px;  border-bottom:2px solid var(--fh); border-left:2px solid var(--fh);  border-radius:0 0 0 5px; }
.fxb-br { bottom:-1px; right:-1px; border-bottom:2px solid var(--fh); border-right:2px solid var(--fh); border-radius:0 0 5px 0; }

/* rings */
.fxring-a { position:absolute; inset:0; width:100%; height:100%; animation:fxRingA 14s linear infinite; }
.fxring-b { position:absolute; inset:6px; width:calc(100% - 12px); height:calc(100% - 12px); animation:fxRingB 9s linear infinite; }

/* logo img */
.fxlogo { width:100%; height:100%; object-fit:cover; border-radius:50%; animation:fxLogoGlow 3s ease-in-out infinite; }

/* inputs */
.fxinput {
  display:block; width:100%; box-sizing:border-box;
  background:rgba(var(--fa),0.04);
  border:none; border-bottom:1.5px solid rgba(var(--fa),0.36);
  border-radius:0;
  color:#e2e8f0;
  font-family:'JetBrains Mono','Fira Code',ui-monospace,'Courier New',monospace;
  font-size:15px; font-weight:500; letter-spacing:0.06em;
  padding:12px 6px 10px; outline:none;
  transition:border-color .2s, background .2s;
}
.fxinput::placeholder { color:rgba(148,163,184,.34); font-style:italic; letter-spacing:.03em; }
.fxinput:focus {
  background:rgba(var(--fa),0.08);
  border-bottom-color:var(--fh);
  box-shadow:0 6px 24px rgba(var(--fa),0.1);
}

/* ghost btn */
.fxbg {
  background:transparent;
  border:1px solid rgba(var(--fa),0.42);
  color:var(--fh);
  font-family:inherit; font-size:11px; font-weight:700;
  letter-spacing:.15em; text-transform:uppercase;
  padding:12px 18px; border-radius:8px;
  cursor:pointer; white-space:nowrap;
  transition:background .2s, box-shadow .2s;
}
.fxbg:hover:not(:disabled) { background:rgba(var(--fa),0.1); box-shadow:0 0 22px rgba(var(--fa),0.22); }
.fxbg:disabled { opacity:.35; cursor:not-allowed; }

/* primary btn */
.fxbp {
  flex:1;
  background:linear-gradient(135deg,#0891b2 0%,#7c3aed 100%);
  border:none; color:#fff;
  font-family:inherit; font-size:13px; font-weight:700;
  letter-spacing:.13em; text-transform:uppercase;
  padding:14px 20px; border-radius:8px;
  cursor:pointer; position:relative; overflow:hidden;
  transition:transform .15s, box-shadow .2s;
  box-shadow:0 4px 24px rgba(8,145,178,.3);
}
.fxbp::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.14),transparent 55%);
  pointer-events:none;
}
.fxbp:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 32px rgba(8,145,178,.4); }
.fxbp:active:not(:disabled) { transform:scale(.985); }
.fxbp:disabled { opacity:.5; cursor:not-allowed; }

/* back btn */
.fxback {
  display:inline-flex; align-items:center; gap:7px;
  background:rgba(var(--fa),0.06); border:1px solid rgba(var(--fa),0.18);
  border-radius:8px; color:var(--fh);
  font-family:inherit; font-size:11px; font-weight:700;
  letter-spacing:.14em; text-transform:uppercase;
  padding:8px 16px; cursor:pointer;
  transition:background .18s;
}
.fxback:hover { background:rgba(var(--fa),0.12); }

/* status dot */
.fxdot { width:7px; height:7px; border-radius:50%; background:var(--fh); animation:fxDotBlink 1.6s ease-in-out infinite; flex-shrink:0; }

/* spinner */
.fxspinner {
  display:inline-block; width:13px; height:13px;
  border:2px solid rgba(255,255,255,.25); border-top-color:#fff;
  border-radius:50%; animation:fxSpinner .7s linear infinite;
  vertical-align:middle;
}

/* chips */
.fxchip {
  display:flex; flex-direction:column; align-items:flex-end;
  background:rgba(var(--fa),0.05); border:1px solid rgba(var(--fa),0.14);
  border-radius:10px; padding:8px 14px;
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  animation:fxChipIn .5s ease both;
}
`

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
  const [hex, rgb] = SCENE[loginSceneMode] ?? SCENE.night
  const isErr = authStatus && /error|invalid|fail|denied|unauthorized/i.test(authStatus)

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#020210',
        overflow: 'hidden',
        // CSS custom properties for accent colour
        ['--fh' as string]: hex,
        ['--fa' as string]: rgb,
      }}
    >
      <style>{CSS}</style>

      {/* ─── Background: grid + orbs + particles ─── */}
      <div className="fxgrid" />

      <div style={{ position: 'absolute', width: 650, height: 650, background: `radial-gradient(circle, rgba(${rgb},.11), transparent 68%)`, top: -260, left: -260, borderRadius: '50%', animation: 'fxOrbFloat 12s ease-in-out infinite', animationDelay: '0s', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 520, height: 520, background: 'radial-gradient(circle, rgba(109,40,217,.13), transparent 68%)', bottom: -220, right: -220, borderRadius: '50%', animation: 'fxOrbFloat 16s ease-in-out infinite', animationDelay: '-5s', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 340, height: 340, background: `radial-gradient(circle, rgba(${rgb},.07), transparent 68%)`, top: '38%', left: '62%', borderRadius: '50%', animation: 'fxOrbFloat 9s ease-in-out infinite', animationDelay: '-3s', pointerEvents: 'none' }} />

      {PARTICLES.map(p => (
        <div key={p.id} style={{ position: 'absolute', bottom: p.bottom, left: p.left, width: p.size, height: p.size, borderRadius: '50%', background: hex, opacity: 0, animation: `fxFloatUp ${p.dur} ${p.delay} ease-in infinite`, pointerEvents: 'none' }} />
      ))}

      {/* ─── Top bar ─── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
        <button type="button" className="fxback" onClick={onBack} aria-label="Back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <div className="fxchip" style={{ animationDelay: '0.1s' }}>
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,.65)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Local time</span>
            <strong style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>{loginTimeLabel}</strong>
            <small style={{ color: 'rgba(148,163,184,.55)', fontSize: 11 }}>{loginDateLabel}</small>
          </div>
          <div className="fxchip" style={{ animationDelay: '0.2s' }}>
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,.65)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{timeZoneLabel || loginTimeZone}</span>
            <strong style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>Device location</strong>
            <small style={{ color: 'rgba(148,163,184,.55)', fontSize: 11 }}>{loginLocationDetails}</small>
          </div>
        </div>
      </div>

      {/* ─── Centre: login card ─── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px 44px', position: 'relative', zIndex: 5 }}>
        <div className="fxcard">
          {/* scan line */}
          <div className="fxscan" />

          {/* corner brackets */}
          <div className="fxb fxb-tl" />
          <div className="fxb fxb-tr" />
          <div className="fxb fxb-bl" />
          <div className="fxb fxb-br" />

          {/* ── Logo + title ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            {/* Animated rings around logo */}
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
              <svg className="fxring-a" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="30" fill="none" stroke={hex} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="7 5" />
              </svg>
              <svg className="fxring-b" style={{ position: 'absolute', inset: 7, width: 'calc(100% - 14px)', height: 'calc(100% - 14px)' }} viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="23" fill="none" stroke={hex} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 6" />
              </svg>
              <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: `rgba(${rgb},.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img className="fxlogo" src={fawnixBg} alt="Fawnix" />
              </div>
            </div>

            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: hex, fontFamily: 'ui-monospace,monospace' }}>
                Fawnix System
              </p>
              <h2 style={{ margin: '5px 0 0', fontSize: 23, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-.025em', lineHeight: 1.2 }}>
                Secure Sign In
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(148,163,184,.65)', letterSpacing: '.04em' }}>
                Admin · Employee ID &amp; OTP
              </p>
            </div>
          </div>

          {/* ── Status indicator ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '9px 14px', background: `rgba(${rgb},.04)`, border: `1px solid rgba(${rgb},.1)`, borderRadius: 9 }}>
            <div className="fxdot" />
            <span style={{ fontSize: 11, color: 'rgba(148,163,184,.75)', letterSpacing: '.09em', textTransform: 'uppercase' }}>
              Secure channel established
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: `${hex}80`, fontFamily: 'monospace', letterSpacing: '.08em' }}>
              {loginSceneMode.toUpperCase()}
            </span>
          </div>

          {/* ── Employee ID ── */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="fx-emp" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: hex, marginBottom: 7, fontFamily: 'monospace' }}>
              Employee ID
            </label>
            <input
              id="fx-emp"
              className="fxinput"
              type="text"
              value={adminEmpCode}
              onChange={e => onAdminEmpCodeChange(e.target.value)}
              placeholder="Enter employee code"
              autoComplete="username"
            />
          </div>

          {/* ── OTP ── */}
          <div style={{ marginBottom: 26 }}>
            <label htmlFor="fx-otp" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: hex, marginBottom: 7, fontFamily: 'monospace' }}>
              One-Time Password
            </label>
            <input
              id="fx-otp"
              className="fxinput"
              type="text"
              inputMode="numeric"
              value={adminOtp}
              onChange={e => onAdminOtpChange(e.target.value)}
              placeholder="Enter OTP from WhatsApp"
              autoComplete="one-time-code"
            />
          </div>

          {/* ── Auth status message ── */}
          {authStatus ? (
            <div style={{
              marginBottom: 20,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${isErr ? 'rgba(239,68,68,.3)' : `rgba(${rgb},.28)`}`,
              background: isErr ? 'rgba(239,68,68,.06)' : `rgba(${rgb},.05)`,
              color: isErr ? '#fca5a5' : hex,
              fontSize: 13,
              letterSpacing: '.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{isErr ? '✕' : '›'}</span>
              {authStatus}
            </div>
          ) : null}

          {/* ── Buttons ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="fxbg"
              onClick={onRequestOtp}
              disabled={authLoading || !adminEmpCode.trim()}
            >
              {authLoading ? '…' : 'Request OTP'}
            </button>
            <button
              type="button"
              className="fxbp"
              onClick={onLogin}
              disabled={authLoading || !adminEmpCode.trim() || !adminOtp.trim()}
            >
              {authLoading
                ? <><span className="fxspinner" style={{ marginRight: 8 }} />Authenticating</>
                : 'Authenticate →'}
            </button>
          </div>

          {/* ── Footer note ── */}
          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 11, color: 'rgba(148,163,184,.35)', letterSpacing: '.08em' }}>
            All access attempts are logged and monitored
          </p>
        </div>
      </div>
    </section>
  )
}
