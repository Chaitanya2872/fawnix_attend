import { Fragment, useState } from 'react'
import SidebarIcon from './navigation/SidebarIcon'
import { API_TELEMETRY_EMP_CODE, sidebarSections } from '../config/sidebar'
import type { AdminProfile, SidebarId } from '../../../types/admin'

type SidebarChromeIconName = 'search' | 'selector' | 'plus' | 'settings' | 'help'

type AdminSidebarProps = {
  profile: AdminProfile | null
  activePanel: SidebarId
  onSelectPanel: (id: SidebarId) => void
  onLogout: () => void
}

function SidebarChromeIcon({ name }: { name: SidebarChromeIconName }) {
  const paths = {
    search: (
      <path
        d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    selector: (
      <path
        d="m8 9 4-4 4 4M16 15l-4 4-4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    plus: (
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
    settings: (
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .64l-.03.08a2 2 0 0 1-3.94 0L10 20a1.7 1.7 0 0 0-1-.64 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-.64-1l-.08-.03a2 2 0 0 1 0-3.94L4 10a1.7 1.7 0 0 0 .64-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-.64l.03-.08a2 2 0 0 1 3.94 0L14 4a1.7 1.7 0 0 0 1 .64 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.13.37.35.7.64 1l.08.03a2 2 0 0 1 0 3.94L20 14c-.29.3-.51.63-.64 1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    help: (
      <path
        d="M9.2 9a3 3 0 1 1 5.1 2.14c-.82.78-1.55 1.23-1.93 2.24M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function getInitials(name?: string | null) {
  const parts = (name || 'Admin').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
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
  const profileName = profile?.emp_full_name || 'Admin'
  const profileSubtext = profile?.emp_email || profile?.emp_designation || profile?.role || 'Administrator'

  return (
    <aside className={`sidebar${mobileMenuOpen ? ' sidebar--mobile-open' : ''}`}>
      <div className="sidebar-mobile-bar">
        <div className="sidebar-mobile-brand">
          <div className="sidebar-logo" aria-hidden="true">HR</div>
          <div className="sidebar-brand-text">
            <div className="brand-name">Attendance Suite</div>
            <div className="brand-subtitle">Admin portal</div>
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
            <div className="sidebar-logo" aria-hidden="true">HR</div>
            <div className="sidebar-brand-text">
              <div className="brand-name">Attendance Suite</div>
              <div className="brand-subtitle">Admin portal</div>
            </div>
          </div>
          <span className="sidebar-brand-selector" aria-hidden="true">
            <SidebarChromeIcon name="selector" />
          </span>
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

        <div className="sidebar-search" aria-label="Sidebar search">
          <span className="sidebar-search-icon">
            <SidebarChromeIcon name="search" />
          </span>
          <span className="sidebar-search-placeholder">Search</span>
          <kbd>Ctrl K</kbd>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {visibleSections.map((section, index) => (
            <div
              className={`sidebar-section${section.title ? '' : ' sidebar-section--primary'}`}
              key={section.title || `sidebar-section-${index}`}
            >
              {section.title ? <div className="sidebar-section-label">{section.title}</div> : null}
              <div className="sidebar-group">
                {section.items.map((item, itemIndex) => {
                  const showGroupLabel =
                    item.groupLabel && section.items[itemIndex - 1]?.groupLabel !== item.groupLabel
                  const linkClassName = [
                    'sidebar-link',
                    item.groupLabel ? 'sidebar-link--nested' : '',
                    activePanel === item.id ? 'active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <Fragment key={item.id}>
                      {showGroupLabel ? (
                        <div className="sidebar-subgroup-label">
                          <span>{item.groupLabel}</span>
                          {item.groupLabel === 'Organization Units' ? (
                            <span className="sidebar-subgroup-plus">
                              <SidebarChromeIcon name="plus" />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className={linkClassName}
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
                    </Fragment>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-support" aria-label="Sidebar utilities">
          <button type="button" className="sidebar-link sidebar-link--utility">
            <span className="sidebar-link-main">
              <span className="sidebar-link-icon">
                <SidebarChromeIcon name="settings" />
              </span>
              <span className="sidebar-link-label">Settings</span>
            </span>
          </button>
          <button type="button" className="sidebar-link sidebar-link--utility">
            <span className="sidebar-link-main">
              <span className="sidebar-link-icon">
                <SidebarChromeIcon name="help" />
              </span>
              <span className="sidebar-link-label">Help</span>
            </span>
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {getInitials(profileName)}
            </div>
            <div className="sidebar-profile-info">
              <strong>{profileName}</strong>
              <span>{profileSubtext}</span>
            </div>
          </div>
          <button
            className="sidebar-profile-menu"
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <SidebarChromeIcon name="selector" />
          </button>
        </div>
      </div>
    </aside>
  )
}
