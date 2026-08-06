import { useState } from 'react'
import SidebarIcon from './navigation/SidebarIcon'
import { API_TELEMETRY_EMP_CODE, sidebarSections } from '../config/sidebar'
import type { AdminProfile, SidebarId } from '../../../types/admin'

type AdminSidebarProps = {
  profile: AdminProfile | null
  activePanel: SidebarId
  onSelectPanel: (id: SidebarId) => void
  onLogout: () => void
}

export default function AdminSidebar({ profile, activePanel, onSelectPanel, onLogout }: AdminSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const visibleSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.id !== 'api-telemetry' || profile?.emp_code === API_TELEMETRY_EMP_CODE
      )
    }))
    .filter((section) => section.items.length > 0)
  const visibleItems = visibleSections.flatMap((section) => section.items)
  const activeItem = visibleItems.find((item) => item.id === activePanel)
  const activeSection = visibleSections.find((section) =>
    section.items.some((item) => item.id === activePanel)
  )
  const handleSelectPanel = (id: SidebarId) => {
    onSelectPanel(id)
    setMobileMenuOpen(false)
  }
  const handleLogout = () => {
    setMobileMenuOpen(false)
    onLogout()
  }

  return (
    <aside className={`sidebar${mobileMenuOpen ? ' sidebar--mobile-open' : ''}`}>
      <div className="sidebar-mobile-bar">
        <div className="sidebar-mobile-brand">
          <div className="sidebar-logo" aria-hidden="true">F</div>
          <div className="sidebar-brand-text">
            <div className="brand-name">Fawnix</div>
            <div className="brand-admin-badge">ADMIN</div>
          </div>
        </div>
        <div className="sidebar-mobile-active">
          <span>Viewing</span>
          <strong>
            {activeSection?.title ? `${activeSection.title} / ` : ''}
            {activeItem?.label || 'Dashboard'}
          </strong>
        </div>
        <button
          className="sidebar-mobile-toggle"
          type="button"
          aria-label="Open admin navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <button
        className="sidebar-mobile-scrim"
        type="button"
        aria-label="Close admin navigation"
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className="sidebar-panel">
        <div className="sidebar-panel-head">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">F</div>
            <div className="sidebar-brand-text">
              <div className="brand-name">Fawnix</div>
              <div className="brand-admin-badge">ADMIN</div>
            </div>
          </div>
          <button
            className="sidebar-panel-close"
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="sidebar-org-selector" aria-label="Organization">
          <span>Workspace</span>
          <strong>Fawnix Admin</strong>
          <small>{profile?.emp_department || 'Organization directory'}</small>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {visibleSections.map((section, index) => (
            <div className="sidebar-section" key={section.title || `sidebar-section-${index}`}>
              {section.title ? <div className="sidebar-section-label">{section.title}</div> : null}
              <div className="sidebar-group">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    className={`sidebar-link ${activePanel === item.id ? 'active' : ''}`}
                    onClick={() => handleSelectPanel(item.id)}
                  >
                    <span className="sidebar-link-main">
                      <span className="sidebar-link-icon">
                        <SidebarIcon name={item.icon} />
                      </span>
                      <span className="sidebar-link-label">{item.label}</span>
                    </span>
                    {item.badge ? <span className="sidebar-link-badge">{item.badge}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {(profile?.emp_full_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-info">
              <strong>{profile?.emp_full_name || 'Admin'}</strong>
              <span>{profile?.emp_designation || profile?.role || 'Administrator'}</span>
            </div>
          </div>
          <div className="sidebar-foot-actions">
            <button className="sidebar-foot-btn" onClick={handleLogout} title="Logout">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
