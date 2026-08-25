import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import SidebarIcon from './navigation/SidebarIcon'
import { getAdminPanelPath } from '../config/adminPanelPaths'
import { API_TELEMETRY_EMP_CODE, SIDEBAR_LIVE_ITEM_IDS, sidebarSections } from '../config/sidebar'
import type { AdminProfile, SidebarId } from '../../../types/admin'
import './AdminSidebar.css'

type SidebarChromeIconName = 'search' | 'collapse' | 'chevron-right' | 'plus' | 'settings' | 'help' | 'logout'

type AdminSidebarProps = {
  profile: AdminProfile | null
  activePanel: SidebarId
  onSelectPanel: (id: SidebarId) => void
  onLogout: () => void
  /** Optional counts shown as a badge next to the matching nav item, e.g. open exception count. */
  badgeCounts?: Partial<Record<SidebarId, number>>
  /** Called when the search field is activated. Falls back to a no-op if omitted. */
  onSearchClick?: () => void
  /** Called when the "+" affordance next to "Organization units" is clicked. */
  onAddOrgUnit?: () => void
}

const COLLAPSE_STORAGE_KEY = 'admin-sidebar-collapsed'

function SidebarChromeIcon({ name }: { name: SidebarChromeIconName }) {
  const paths: Record<SidebarChromeIconName, ReactElement> = {
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
    collapse: (
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    'chevron-right': (
      <path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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
    logout: (
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
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

type SidebarNavItem = (typeof sidebarSections)[number]['items'][number]

function getInitials(name?: string | null) {
  const parts = (name || 'Admin').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function AdminSidebar({
  profile,
  activePanel,
  onSelectPanel,
  onLogout,
  badgeCounts,
  onSearchClick,
  onAddOrgUnit,
}: AdminSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  })
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false })

  const navRef = useRef<HTMLDivElement | null>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  const visibleSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.id !== 'api-telemetry' || profile?.emp_code === API_TELEMETRY_EMP_CODE
      )
    }))
    .filter((section) => section.items.length > 0)
  const visibleItems = visibleSections.flatMap((section) => section.items)
  /** An entry owns the active panel if it is that panel, or lists it in matchIds. */
  const ownsActivePanel = (item: SidebarNavItem) =>
    item.id === activePanel || Boolean(item.matchIds?.includes(activePanel))
  const activeItem = visibleItems.find(ownsActivePanel)
  const activeSection = visibleSections.find((section) => section.items.some(ownsActivePanel))



  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Glide the active-state rail to whichever nav button is currently active.
  useLayoutEffect(() => {
    const navEl = navRef.current
    const activeEl = activeItem ? linkRefs.current.get(activeItem.id) : undefined
    if (navEl && activeEl) {
      const navRect = navEl.getBoundingClientRect()
      const elRect = activeEl.getBoundingClientRect()
      setIndicator({
        top: elRect.top - navRect.top + navEl.scrollTop,
        height: elRect.height,
        visible: true,
      })
    } else {
      setIndicator((prev) => ({ ...prev, visible: false }))
    }
  }, [activePanel, activeItem, mobileMenuOpen, collapsed, visibleItems.length])


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
    <aside className={`sidebar${mobileMenuOpen ? ' sidebar--mobile-open' : ''}${collapsed ? ' sidebar--rail' : ''}`}>
      <div className="sidebar-mobile-bar">
        <div className="sidebar-mobile-brand">
          <div className="sidebar-logo" aria-hidden="true">HR</div>
          <div className="sidebar-brand-text">
            <div className="brand-name">Attendance Suite</div>
            <div className="brand-subtitle">Admin console</div>
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
              <div className="brand-subtitle">Admin console</div>
            </div>
          </div>
          <button
            className="sidebar-collapse-btn"
            type="button"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <SidebarChromeIcon name="collapse" />
          </button>
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

        <div className="sidebar-search-wrap">
          <button
            className="sidebar-search"
            type="button"
            aria-label="Search"
            data-tip="Search"
            onClick={onSearchClick}
          >
            <span className="sidebar-search-icon">
              <SidebarChromeIcon name="search" />
            </span>
            <span className="sidebar-search-placeholder">Search</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation" ref={navRef}>
          <div
            className="sidebar-active-rail"
            style={{
              transform: `translateY(${indicator.top}px)`,
              height: indicator.height,
              opacity: indicator.visible ? 1 : 0,
            }}
            aria-hidden="true"
          />
          {visibleSections.map((section, index) => (
            <div
              className={`sidebar-section${section.title ? '' : ' sidebar-section--primary'}`}
              key={section.title || `sidebar-section-${index}`}
            >
              {section.title ? <div className="sidebar-section-label">{section.title}</div> : null}
              <div className="sidebar-group">
                {section.items.map((item) => {
                  const isLive = SIDEBAR_LIVE_ITEM_IDS.includes(item.id)
                  const badgeCount = badgeCounts?.[item.id]
                  const showAddAction = Boolean(item.hasAddAction && onAddOrgUnit)

                  return (
                    // The row exists so the "+" can be a sibling button rather
                    // than nested inside the nav button -- interactive content
                    // inside a <button> is invalid and reads unpredictably to
                    // assistive tech.
                    <div
                      className={`sidebar-link-row${showAddAction ? ' sidebar-link-row--has-action' : ''}`}
                      key={item.id}
                    >
                      <a
                        href={getAdminPanelPath(item.id)}
                        className={`sidebar-link${ownsActivePanel(item) ? ' active' : ''}`}
                        data-tip={item.label}
                        aria-current={ownsActivePanel(item) ? 'page' : undefined}
                        onClick={(event) => {
                          // Let the browser handle new-tab/new-window intents;
                          // only take over for a plain left click.
                          if (
                            event.defaultPrevented ||
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          ) {
                            return
                          }
                          event.preventDefault()
                          handleSelectPanel(item.id)
                        }}
                        ref={(el) => {
                          if (el) linkRefs.current.set(item.id, el)
                          else linkRefs.current.delete(item.id)
                        }}
                      >
                        <span className="sidebar-link-main">
                          <span className="sidebar-link-icon">
                            <SidebarIcon name={item.icon} />
                          </span>
                          <span className="sidebar-link-label">{item.label}</span>
                        </span>
                        {isLive ? (
                          <span className="sidebar-live-dot" aria-label="Live" />
                        ) : badgeCount ? (
                          <span className="sidebar-link-badge">{badgeCount}</span>
                        ) : null}
                      </a>
                      {showAddAction ? (
                        <button
                          type="button"
                          className="sidebar-link-plus"
                          aria-label={`Add ${item.label.toLowerCase()} record`}
                          onClick={() => onAddOrgUnit?.()}
                        >
                          <SidebarChromeIcon name="plus" />
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-support" aria-label="Sidebar utilities">
          <button type="button" className="sidebar-link sidebar-link--utility" data-tip="Settings">
            <span className="sidebar-link-main">
              <span className="sidebar-link-icon">
                <SidebarChromeIcon name="settings" />
              </span>
              <span className="sidebar-link-label">Settings</span>
            </span>
          </button>
          <button type="button" className="sidebar-link sidebar-link--utility" data-tip="Help & support">
            <span className="sidebar-link-main">
              <span className="sidebar-link-icon">
                <SidebarChromeIcon name="help" />
              </span>
              <span className="sidebar-link-label">Help &amp; support</span>
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
            className="sidebar-logout-btn"
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            data-tip="Log out"
          >
            <SidebarChromeIcon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  )
}
