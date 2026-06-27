import { Link } from 'react-router-dom'
import { appRoutes } from '../../../app/config/routes'
import { SiteFooter } from '../../../components/layout/SiteFooter'
import { privacySections } from '../../public/constants/publicContent'

export default function PrivacyPolicyPage() {
  return (
    <div className="policy-page">
      <header className="policy-hero">
        <div className="policy-hero-inner">
          <Link className="policy-back" to={appRoutes.home}>
            Back to home
          </Link>
          <p className="eyebrow">Privacy Policy</p>
          <h1>Privacy Policy for Fawnix</h1>
          <p className="policy-lead">
            Effective date: April 5, 2026. This policy explains how Fawnix collects, uses,
            shares, retains, and protects personal information, including location data used
            for attendance and field operations.
          </p>
        </div>
      </header>

      <main className="policy-content">
        <section className="policy-card">
          <h2>Summary</h2>
          <p>
            Fawnix is a workforce operations platform used for attendance, activity tracking,
            field visits, approvals, reporting, and account management. Because these features
            rely on verified work-location events, the app collects location data when required
            for attendance and field workflows.
          </p>
        </section>

        {privacySections.map((section) => (
          <section key={section.title} className="policy-card">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets.length ? (
              <ul className="policy-list">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section className="policy-card">
          <h2>Children</h2>
          <p>Fawnix is intended for workforce and business use and is not directed to children.</p>
        </section>

        <section className="policy-card">
          <h2>Policy Updates</h2>
          <p>
            We may update this Privacy Policy from time to time. Material updates will be
            reflected on this page with a revised effective date.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
