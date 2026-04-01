import { useState } from 'react'
import './App.css'

const useCases = [
  {
    title: 'Field Teams',
    desc: 'Track visits, travel, and attendance with location-aware check-ins.'
  },
  {
    title: 'Retail & Branch Ops',
    desc: 'Ensure shift compliance, break discipline, and daily closure visibility.'
  },
  {
    title: 'Sales & Leads',
    desc: 'Tie activities to leads and keep a verified visit history.'
  },
  {
    title: 'HR & Admin',
    desc: 'One place for approvals, exceptions, and compliance auditing.'
  }
]

const features = [
  {
    title: 'Smart Attendance',
    desc: 'Clock-in/out with geo-tagging, auto shift hours, and late detection.'
  },
  {
    title: 'Activity Tracking',
    desc: 'Start/end activities, log visits, and capture route evidence.'
  },
  {
    title: 'Approvals & Exceptions',
    desc: 'Late arrivals and early leave requests with manager workflows.'
  },
  {
    title: 'Leave & Comp-off',
    desc: 'Apply leave, track status, and redeem comp-off automatically.'
  },
  {
    title: 'Distance Alerts',
    desc: 'Detect out-of-range movement to protect attendance integrity.'
  },
  {
    title: 'Auto Clock-out',
    desc: 'Prevents missing logs with configurable shift-end closure.'
  }
]

const steps = [
  {
    title: 'Start Day',
    desc: 'Employee clocks in with location and begins the shift.'
  },
  {
    title: 'Track Work',
    desc: 'Activities, visits, and breaks are recorded in real time.'
  },
  {
    title: 'Review & Approve',
    desc: 'Managers handle exceptions and approvals within the app.'
  },
  {
    title: 'Close Day',
    desc: 'Clock-out completes hours and comp-off calculations.'
  }
]

function App() {
  const [empCode, setEmpCode] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequestOtp = async () => {
    if (!empCode.trim()) {
      setStatus('Enter your Employee ID to request OTP.')
      return
    }
    setLoading(true)
    setStatus('Requesting OTP...')
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data?.message || 'Failed to request OTP.')
      } else {
        setStatus('OTP sent. Please check your device and enter it below.')
      }
    } catch {
      setStatus('Unable to reach server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!empCode.trim() || !otp.trim()) {
      setStatus('Employee ID and OTP are required.')
      return
    }
    setLoading(true)
    setStatus('Submitting delete request...')
    try {
      const res = await fetch('/api/auth/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_code: empCode.trim(), otp: otp.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data?.message || 'Delete request failed.')
      } else {
        setStatus('Account deletion submitted successfully.')
      }
    } catch {
      setStatus('Unable to reach server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero" data-animate>
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">Fawnix</div>
              <div className="brand-tag">Workforce Operations Suite</div>
            </div>
          </div>
          <div className="nav-links">
            <a href="#use-cases">Use cases</a>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#delete">Delete account</a>
          </div>
          <button className="cta">Request Demo</button>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Modern attendance and field operations</p>
            <h1>Make every workday traceable, compliant, and effortless.</h1>
            <p className="lead">
              Fawnix unifies attendance, activities, approvals, and on-field tracking into a
              single mobile-first experience for teams that move.
            </p>
            <div className="hero-actions">
              <button className="cta">Get Started</button>
              <button className="ghost">View Product Tour</button>
            </div>
            <div className="hero-stats">
              <div>
                <span>99.9%</span>
                <small>attendance integrity</small>
              </div>
              <div>
                <span>1 app</span>
                <small>for HR, managers, and teams</small>
              </div>
              <div>
                <span>Realtime</span>
                <small>location and activity logs</small>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-card">
              <div className="panel-header">
                <h3>Today at a glance</h3>
                <span className="status">Live</span>
              </div>
              <div className="panel-body">
                <div className="panel-row">
                  <div>
                    <strong>128</strong>
                    <span>checked in</span>
                  </div>
                  <div>
                    <strong>14</strong>
                    <span>late arrivals</span>
                  </div>
                  <div>
                    <strong>9</strong>
                    <span>pending approvals</span>
                  </div>
                </div>
                <div className="panel-activity">
                  <p>Field visits in progress</p>
                  <div className="chip-row">
                    <span className="chip">Branch visit · 08:45</span>
                    <span className="chip">Lead demo · 09:20</span>
                    <span className="chip">Break · 10:10</span>
                  </div>
                </div>
                <div className="panel-note">
                  Auto clock-out enabled for shift 18:30
                </div>
              </div>
            </div>
            <div className="panel-card subtle">
              <h4>Built for mobile teams</h4>
              <p>Works for sales, logistics, service crews, and retail operations.</p>
            </div>
          </div>
        </div>
      </header>

      <section id="use-cases" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Use cases</p>
          <h2>Designed for every operational role.</h2>
          <p>Clear visibility for leaders, simple actions for employees.</p>
        </div>
        <div className="grid">
          {useCases.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="section alt" data-animate>
        <div className="section-head">
          <p className="eyebrow">What you get</p>
          <h2>Every feature that keeps operations accountable.</h2>
          <p>From attendance to approvals, nothing slips through.</p>
        </div>
        <div className="grid features">
          {features.map((item) => (
            <article key={item.title} className="card feature">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Workflow</p>
          <h2>One simple flow for every workday.</h2>
        </div>
        <div className="timeline">
          {steps.map((step, index) => (
            <div key={step.title} className="timeline-step">
              <div className="step-index">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt" data-animate>
        <div className="split">
          <div>
            <p className="eyebrow">Security & compliance</p>
            <h2>Built for audit-ready operations.</h2>
            <ul className="list">
              <li>Location-stamped attendance logs</li>
              <li>Exception approvals with manager trails</li>
              <li>Automated reminders and auto clock-out</li>
              <li>Centralized reports for HR and leadership</li>
            </ul>
          </div>
          <div className="panel-card">
            <h3>Operational confidence</h3>
            <p>
              Fawnix keeps compliance simple by capturing the right data automatically and
              presenting it clearly for approvals.
            </p>
            <div className="chip-row">
              <span className="chip">Audit trail</span>
              <span className="chip">Shift rules</span>
              <span className="chip">Manager approvals</span>
            </div>
          </div>
        </div>
      </section>

      <section id="delete" className="section" data-animate>
        <div className="section-head">
          <p className="eyebrow">Account control</p>
          <h2>Delete your account securely.</h2>
          <p>Enter your Employee ID and OTP to permanently delete your account.</p>
        </div>
        <div className="delete-card">
          <div>
            <label htmlFor="emp-code">Employee ID</label>
            <input
              id="emp-code"
              type="text"
              placeholder="e.g., 2872"
              value={empCode}
              onChange={(event) => setEmpCode(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="otp">OTP</label>
            <input
              id="otp"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </div>
          <div className="delete-actions">
            <button className="ghost" onClick={handleRequestOtp} disabled={loading}>
              Request OTP
            </button>
            <button className="danger" onClick={handleDelete} disabled={loading}>
              Delete Account
            </button>
          </div>
          {status ? <p className="delete-note">{status}</p> : null}
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>Fawnix</strong>
          <p>Modern workforce operations for distributed teams.</p>
        </div>
        <div className="footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Support</span>
        </div>
      </footer>
    </div>
  )
}

export default App
