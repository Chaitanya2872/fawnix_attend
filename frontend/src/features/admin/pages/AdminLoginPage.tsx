import { useState, useRef, useEffect, type CSSProperties } from 'react'
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

// Green accent palette per scene — (hex, rgb)
const SCENE: Record<string, [string, string]> = {
  dawn:  ['#4ade80', '74, 222, 128'],
  day:   ['#86efac', '134, 239, 172'],
  dusk:  ['#22c55e', '34, 197, 94'],
  night: ['#22c55e', '34, 197, 94'],
}

const OTP_LEN = 6

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left:   `${((i * 479) % 94) + 3}%`,
  size:   `${2 + (i % 3)}px`,
  delay:  `${((i * 53) % 600) / 100}s`,
  dur:    `${5 + (i % 5)}s`,
  bottom: `${((i * 137) % 60) + 4}px`,
}))

const CSS = `
@keyframes fxGrid  { to { background-position:0 60px; } }
@keyframes fxOrb   {
  0%,100% { transform:scale(1) translate(0,0); opacity:.38; }
  40%     { transform:scale(1.07) translate(14px,-10px); opacity:.55; }
  70%     { transform:scale(.95) translate(-10px,16px); opacity:.32; }
}
@keyframes fxIn    { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:none; } }
@keyframes fxPulse {
  0%,100% { box-shadow:0 0 0 1px rgba(var(--fa),.22),0 0 40px rgba(var(--fa),.07); }
  50%     { box-shadow:0 0 0 1px rgba(var(--fa),.48),0 0 80px rgba(var(--fa),.18); }
}
@keyframes fxScan  { 0%{top:-2px;opacity:0} 6%{opacity:1} 92%{opacity:.6} 100%{top:100%;opacity:0} }
@keyframes fxRise  {
  0%  { opacity:0; transform:translateY(0) scale(.5); }
  12% { opacity:.85; }
  88% { opacity:.4; }
  100%{ opacity:0; transform:translateY(-220px) scale(1.1); }
}
@keyframes fxRingA { to { transform:rotate(360deg); } }
@keyframes fxRingB { to { transform:rotate(-360deg); } }
@keyframes fxGlowImg {
  0%,100%{ filter:drop-shadow(0 0 6px rgba(var(--fa),.55)); }
  50%    { filter:drop-shadow(0 0 20px rgba(var(--fa),.95)); }
}
@keyframes fxBlink  { 0%,100%{ opacity:1; } 50%{ opacity:.12; } }
@keyframes fxSpin   { to { transform:rotate(360deg); } }
@keyframes fxChipIn { from{ opacity:0; transform:translateY(-10px); } to{ opacity:1; transform:none; } }

.fxgrid {
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(var(--fa),.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(var(--fa),.055) 1px, transparent 1px);
  background-size:60px 60px;
  transform:perspective(700px) rotateX(30deg) scale(1.25);
  transform-origin:50% 85%;
  animation:fxGrid 10s linear infinite;
}

.fxcard {
  position:relative; width:100%; max-width:500px;
  background:rgba(1,8,3,.93);
  border:1px solid rgba(var(--fa),.2); border-radius:22px;
  padding:44px 42px 38px;
  backdrop-filter:blur(36px); -webkit-backdrop-filter:blur(36px);
  overflow:hidden;
  animation:fxIn .55s cubic-bezier(.22,1,.36,1) both,
            fxPulse 4s .7s ease-in-out infinite;
}

.fxscan {
  position:absolute; left:0; right:0; height:1.5px; pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(var(--fa),.5),transparent);
  animation:fxScan 7s .5s ease-in-out infinite;
}

.fxb { position:absolute; width:22px; height:22px; pointer-events:none; }
.fxb-tl{ top:-1px; left:-1px;  border-top:2px solid var(--fh); border-left:2px solid var(--fh);   border-radius:5px 0 0 0; }
.fxb-tr{ top:-1px; right:-1px; border-top:2px solid var(--fh); border-right:2px solid var(--fh);  border-radius:0 5px 0 0; }
.fxb-bl{ bottom:-1px; left:-1px;  border-bottom:2px solid var(--fh); border-left:2px solid var(--fh);  border-radius:0 0 0 5px; }
.fxb-br{ bottom:-1px; right:-1px; border-bottom:2px solid var(--fh); border-right:2px solid var(--fh); border-radius:0 0 5px 0; }

.fxring-a { position:absolute; inset:0; width:100%; height:100%; animation:fxRingA 14s linear infinite; }
.fxring-b { position:absolute; inset:6px; width:calc(100% - 12px); height:calc(100% - 12px); animation:fxRingB 9s linear infinite; }
.fxlogo   { width:100%; height:100%; object-fit:cover; border-radius:50%; animation:fxGlowImg 3s ease-in-out infinite; }

/* Employee code field — input + inline button in one row */
.fxemp {
  display:flex; align-items:center;
  background:rgba(var(--fa),.04);
  border-bottom:1.5px solid rgba(var(--fa),.36);
  transition:border-color .2s, background .2s;
}
.fxemp:focus-within {
  background:rgba(var(--fa),.08);
  border-bottom-color:var(--fh);
}
.fxemp-in {
  flex:1; min-width:0; background:transparent; border:none; outline:none;
  color:#e2e8f0;
  font-family:'JetBrains Mono','Fira Code',ui-monospace,'Courier New',monospace;
  font-size:15px; font-weight:500; letter-spacing:.06em;
  padding:12px 8px 10px 6px;
}
.fxemp-in::placeholder { color:rgba(148,163,184,.34); font-style:italic; letter-spacing:.03em; }

.fxreq {
  flex-shrink:0;
  background:rgba(var(--fa),.14);
  border:1px solid rgba(var(--fa),.4);
  color:var(--fh);
  font-family:inherit; font-size:10px; font-weight:700;
  letter-spacing:.12em; text-transform:uppercase;
  padding:6px 11px; border-radius:6px; margin-right:5px;
  cursor:pointer; white-space:nowrap;
  transition:background .2s, box-shadow .2s;
}
.fxreq:hover:not(:disabled) { background:rgba(var(--fa),.26); box-shadow:0 0 18px rgba(var(--fa),.22); }
.fxreq:disabled { opacity:.36; cursor:not-allowed; }

/* 6 circular OTP cells */
.fxotp-cell {
  width:52px; height:52px; border-radius:50%;
  border:2px solid rgba(var(--fa),.35);
  background:rgba(var(--fa),.05);
  color:#e2e8f0; text-align:center;
  font-size:20px; font-weight:700;
  font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;
  outline:none; padding:0;
  transition:border-color .18s, background .18s, box-shadow .18s;
  caret-color:transparent;
}
.fxotp-cell:focus {
  border-color:var(--fh);
  background:rgba(var(--fa),.13);
  box-shadow:0 0 0 3px rgba(var(--fa),.15),0 0 22px rgba(var(--fa),.22);
}

/* Primary authenticate button */
.fxbp {
  width:100%;
  background:linear-gradient(135deg,#14532d 0%,#166534 40%,#16a34a 80%,#22c55e 100%);
  border:none; color:#fff;
  font-family:inherit; font-size:13px; font-weight:700;
  letter-spacing:.13em; text-transform:uppercase;
  padding:15px 24px; border-radius:10px;
  cursor:pointer; position:relative; overflow:hidden;
  transition:transform .15s, box-shadow .2s;
  box-shadow:0 4px 28px rgba(34,197,94,.24);
}
.fxbp::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.13),transparent 55%);
  pointer-events:none;
}
.fxbp:hover:not(:disabled){ transform:translateY(-1px); box-shadow:0 8px 34px rgba(34,197,94,.36); }
.fxbp:active:not(:disabled){ transform:scale(.985); }
.fxbp:disabled{ opacity:.5; cursor:not-allowed; }

/* Back + chips */
.fxback {
  display:inline-flex; align-items:center; gap:7px;
  background:rgba(var(--fa),.06); border:1px solid rgba(var(--fa),.18);
  border-radius:8px; color:var(--fh);
  font-family:inherit; font-size:11px; font-weight:700;
  letter-spacing:.14em; text-transform:uppercase;
  padding:8px 16px; cursor:pointer; transition:background .18s;
}
.fxback:hover{ background:rgba(var(--fa),.12); }

.fxchip {
  display:flex; flex-direction:column; align-items:flex-end;
  background:rgba(var(--fa),.05); border:1px solid rgba(var(--fa),.14);
  border-radius:10px; padding:8px 14px;
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  animation:fxChipIn .5s ease both;
}

.fxdot{ width:7px; height:7px; border-radius:50%; background:var(--fh); animation:fxBlink 1.6s ease-in-out infinite; flex-shrink:0; }
.fxspinner{
  display:inline-block; width:13px; height:13px;
  border:2px solid rgba(255,255,255,.25); border-top-color:#fff;
  border-radius:50%; animation:fxSpin .7s linear infinite; vertical-align:middle;
}
.fxlabel{
  display:block; font-size:10px; font-weight:700;
  letter-spacing:.18em; text-transform:uppercase;
  color:var(--fh); margin-bottom:7px; font-family:ui-monospace,monospace;
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

  // Individual digit state for the 6 OTP circles
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''))
  const digitRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset digits when parent clears adminOtp (e.g. after failed verify)
  useEffect(() => {
    if (adminOtp) {
      return
    }

    const resetTimerId = window.setTimeout(() => setDigits(Array(OTP_LEN).fill('')), 0)
    return () => window.clearTimeout(resetTimerId)
  }, [adminOtp])

  const updateDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const d = value.slice(-1)
    const next = [...digits]
    next[index] = d
    setDigits(next)
    onAdminOtpChange(next.join(''))
    if (d && index < OTP_LEN - 1) digitRefs.current[index + 1]?.focus()
  }

  const handleDigitKey = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  const handleRequestOtp = () => {
    onRequestOtp()
    setDigits(Array(OTP_LEN).fill(''))
    setTimeout(() => digitRefs.current[0]?.focus(), 300)
  }

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#010802',
      overflow: 'hidden',
      '--fh': hex,
      '--fa': rgb,
    } as CSSProperties}>
      <style>{CSS}</style>

      {/* ── Background ── */}
      <div className="fxgrid" />
      <div style={{ position:'absolute', width:650, height:650, background:`radial-gradient(circle,rgba(${rgb},.1),transparent 68%)`, top:-260, left:-260, borderRadius:'50%', animation:'fxOrb 12s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:520, height:520, background:'radial-gradient(circle,rgba(20,83,45,.2),transparent 68%)',  bottom:-220, right:-220, borderRadius:'50%', animation:'fxOrb 16s ease-in-out infinite', animationDelay:'-5s', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:340, height:340, background:`radial-gradient(circle,rgba(${rgb},.06),transparent 68%)`, top:'38%', left:'62%', borderRadius:'50%', animation:'fxOrb 9s ease-in-out infinite', animationDelay:'-3s', pointerEvents:'none' }} />

      {PARTICLES.map(p => (
        <div key={p.id} style={{ position:'absolute', bottom:p.bottom, left:p.left, width:p.size, height:p.size, borderRadius:'50%', background:hex, opacity:0, animation:`fxRise ${p.dur} ${p.delay} ease-in infinite`, pointerEvents:'none' }} />
      ))}

      {/* ── Top bar ── */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px' }}>
        <button type="button" className="fxback" onClick={onBack} aria-label="Back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div style={{ display:'flex', gap:10 }}>
          <div className="fxchip" style={{ animationDelay:'.1s' }}>
            <span style={{ fontSize:10, color:'rgba(148,163,184,.65)', letterSpacing:'.1em', textTransform:'uppercase' }}>Local time</span>
            <strong style={{ color:'#f1f5f9', fontSize:15, fontWeight:700, lineHeight:1.3, fontVariantNumeric:'tabular-nums' }}>{loginTimeLabel}</strong>
            <small style={{ color:'rgba(148,163,184,.55)', fontSize:11 }}>{loginDateLabel}</small>
          </div>
          <div className="fxchip" style={{ animationDelay:'.2s' }}>
            <span style={{ fontSize:10, color:'rgba(148,163,184,.65)', letterSpacing:'.1em', textTransform:'uppercase' }}>{timeZoneLabel || loginTimeZone}</span>
            <strong style={{ color:'#f1f5f9', fontSize:13, fontWeight:600, lineHeight:1.3 }}>Device location</strong>
            <small style={{ color:'rgba(148,163,184,.55)', fontSize:11 }}>{loginLocationDetails}</small>
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px 44px', position:'relative', zIndex:5 }}>
        <div className="fxcard">
          <div className="fxscan" />
          <div className="fxb fxb-tl" /><div className="fxb fxb-tr" />
          <div className="fxb fxb-bl" /><div className="fxb fxb-br" />

          {/* Logo + title */}
          <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:30 }}>
            <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
              <svg className="fxring-a" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="30" fill="none" stroke={hex} strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="7 5" />
              </svg>
              <svg className="fxring-b" style={{ position:'absolute', inset:7, width:'calc(100% - 14px)', height:'calc(100% - 14px)' }} viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="23" fill="none" stroke={hex} strokeOpacity=".4" strokeWidth="1" strokeDasharray="3 6" />
              </svg>
              <div style={{ position:'absolute', inset:14, borderRadius:'50%', background:`rgba(${rgb},.08)`, overflow:'hidden' }}>
                <img className="fxlogo" src={fawnixBg} alt="Fawnix" />
              </div>
            </div>
            <div>
              <p style={{ margin:0, fontSize:10, fontWeight:700, letterSpacing:'.22em', textTransform:'uppercase', color:hex, fontFamily:'ui-monospace,monospace' }}>Fawnix System</p>
              <h2 style={{ margin:'5px 0 0', fontSize:23, fontWeight:700, color:'#f1f5f9', letterSpacing:'-.025em', lineHeight:1.2 }}>Secure Sign In</h2>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(148,163,184,.65)', letterSpacing:'.04em' }}>Admin · Employee ID &amp; OTP</p>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:28, padding:'9px 14px', background:`rgba(${rgb},.04)`, border:`1px solid rgba(${rgb},.1)`, borderRadius:9 }}>
            <div className="fxdot" />
            <span style={{ fontSize:11, color:'rgba(148,163,184,.75)', letterSpacing:'.09em', textTransform:'uppercase' }}>Secure channel established</span>
            <span style={{ marginLeft:'auto', fontSize:10, color:`${hex}80`, fontFamily:'monospace', letterSpacing:'.08em' }}>{loginSceneMode.toUpperCase()}</span>
          </div>

          {/* Employee ID — input with inline Request OTP button */}
          <div style={{ marginBottom:28 }}>
            <label className="fxlabel" htmlFor="fx-emp">Employee ID</label>
            <div className="fxemp">
              <input
                id="fx-emp"
                className="fxemp-in"
                type="text"
                value={adminEmpCode}
                onChange={e => onAdminEmpCodeChange(e.target.value)}
                placeholder="Enter employee code"
                autoComplete="username"
              />
              <button
                type="button"
                className="fxreq"
                onClick={handleRequestOtp}
                disabled={authLoading || !adminEmpCode.trim()}
              >
                {authLoading ? '…' : 'Request OTP'}
              </button>
            </div>
          </div>

          {/* OTP — 6 circular digit inputs */}
          <div style={{ marginBottom:28 }}>
            <label className="fxlabel" style={{ textAlign:'center' }}>One-Time Password</label>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el }}
                  className="fxotp-cell"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => updateDigit(i, e.target.value)}
                  onKeyDown={e => handleDigitKey(i, e.key)}
                  aria-label={`OTP digit ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Auth status message */}
          {authStatus ? (
            <div style={{
              marginBottom:20, padding:'10px 14px', borderRadius:8,
              border:`1px solid ${isErr ? 'rgba(239,68,68,.3)' : `rgba(${rgb},.28)`}`,
              background: isErr ? 'rgba(239,68,68,.06)' : `rgba(${rgb},.05)`,
              color: isErr ? '#fca5a5' : hex,
              fontSize:13, letterSpacing:'.02em',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ fontSize:16, lineHeight:1 }}>{isErr ? '✕' : '›'}</span>
              {authStatus}
            </div>
          ) : null}

          {/* Authenticate */}
          <button
            type="button"
            className="fxbp"
            onClick={onLogin}
            disabled={authLoading || !adminEmpCode.trim() || digits.join('').length < OTP_LEN}
          >
            {authLoading
              ? <><span className="fxspinner" style={{ marginRight:8 }} />Authenticating</>
              : 'Authenticate →'}
          </button>

          <p style={{ margin:'18px 0 0', textAlign:'center', fontSize:11, color:'rgba(148,163,184,.32)', letterSpacing:'.08em' }}>
            All access attempts are logged and monitored
          </p>
        </div>
      </div>
    </section>
  )
}
