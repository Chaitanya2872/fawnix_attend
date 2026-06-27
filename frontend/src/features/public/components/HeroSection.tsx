type HeroSectionProps = {
  onGetStarted: () => void
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <div className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Modern attendance and field operations</p>
        <h1>Make every workday traceable, compliant, and effortless.</h1>
        <p className="lead">
          Fawnix unifies attendance, activities, approvals, and on-field tracking into a
          single mobile-first experience for teams that move.
        </p>
        <div className="hero-actions">
          <button className="cta" onClick={onGetStarted} type="button">
            Get Started
          </button>
          <button className="ghost" type="button">
            View Product Tour
          </button>
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
          </div>
        </div>
        <div className="panel-card subtle">
          <h4>Built for mobile teams</h4>
          <p>Works for sales, logistics, service crews, and retail operations.</p>
        </div>
      </div>
    </div>
  )
}
