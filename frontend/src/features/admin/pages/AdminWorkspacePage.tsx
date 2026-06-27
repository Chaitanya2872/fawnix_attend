import type { PropsWithChildren, ReactNode } from 'react'
import type { AdminProfile, SidebarId } from '../../../types/admin'

type SidebarItem = {
  id: SidebarId
  label: string
  icon: ReactNode
  badge?: string
}

type AdminWorkspacePageProps = PropsWithChildren<{
  activePanel: SidebarId
  heroContent: ReactNode
  overlayContent?: ReactNode
  profile: AdminProfile | null
  refreshNotice: string
  sidebarItems: SidebarItem[]
  onActivePanelChange: (panel: SidebarId) => void
  onLogout: () => void
  onRefresh: () => void
}>

export default function AdminWorkspacePage({
  activePanel,
  children,
  heroContent,
  overlayContent,
  profile,
  refreshNotice,
  sidebarItems,
  onActivePanelChange,
  onLogout,
  onRefresh
}: AdminWorkspacePageProps) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true">
            F
          </div>
          <div className="sidebar-brand-text">
            <div className="brand-name">Fawnix</div>
            <div className="brand-admin-badge">ADMIN</div>
          </div>
        </div>

        <div className="sidebar-group">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => onActivePanelChange(item.id)}
              type="button"
            >
              <span className="sidebar-link-main">
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </span>
              {item.badge ? <span className="sidebar-link-badge">{item.badge}</span> : null}
            </button>
          ))}
        </div>

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
            <button className="sidebar-foot-btn" onClick={onRefresh} title="Refresh data" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh
            </button>
            <button className="sidebar-foot-btn" onClick={onLogout} title="Logout" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
                <path
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {overlayContent}
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Admin dashboard</p>
            <h1>Keep teams visible, accountable, and moving.</h1>
            <p className="dashboard-copy">
              Live data from admin APIs for employees, attendance, leave approvals,
              activities, and field movement.
            </p>
            {refreshNotice ? <div className="refresh-toast">{refreshNotice}</div> : null}
          </div>
          {heroContent}
        </section>

        <section className="dashboard-panel">{children}</section>
      </main>
    </div>
  )
}
