import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../../app/config/routes'
import { SectionHeader } from '../../../components/common/SectionHeader'
import { SiteFooter } from '../../../components/layout/SiteFooter'
import { MarketingNav } from '../../../components/navigation/MarketingNav'
import { DeleteAccountCard } from '../components/DeleteAccountCard'
import { HeroSection } from '../components/HeroSection'
import { features, useCases, workflowSteps } from '../constants/publicContent'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <header className="hero" data-animate>
        <MarketingNav onRequestDemo={() => navigate(appRoutes.admin)} />
        <HeroSection onGetStarted={() => navigate(appRoutes.admin)} />
      </header>

      <section id="use-cases" className="section" data-animate>
        <SectionHeader
          eyebrow="Use cases"
          title="Designed for every operational role."
          description="Clear visibility for leaders, simple actions for employees."
        />
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
        <SectionHeader
          eyebrow="What you get"
          title="Every feature that keeps operations accountable."
          description="From attendance to approvals, nothing slips through."
        />
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
        <SectionHeader eyebrow="Workflow" title="One simple flow for every workday." />
        <div className="timeline">
          {workflowSteps.map((step, index) => (
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
        <SectionHeader
          eyebrow="Account control"
          title="Delete your account securely."
          description="Enter your Employee ID and OTP to permanently delete your account."
        />
        <DeleteAccountCard />
      </section>

      <SiteFooter />
    </div>
  )
}
