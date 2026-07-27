import SidebarIcon from './navigation/SidebarIcon'
import { API_TELEMETRY_EMP_CODE, sidebarItems } from '../config/sidebar'
import type { AdminProfile, SidebarId } from '../../../types/admin'

type AdminSidebarProps = {
  profile: AdminProfile | null
  activePanel: SidebarId
  onSelectPanel: (id: SidebarId) => void
  onLogout: () => void
}

export default function AdminSidebar({ profile, activePanel, onSelectPanel, onLogout }: AdminSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">F</div>
        <div className="sidebar-brand-text">
          <div className="brand-name">Fawnix</div>
          <div className="brand-admin-badge">ADMIN</div>
        </div>
      </div>

      <div className="sidebar-group">
        {sidebarItems
          .filter((item) => item.id !== 'api-telemetry' || profile?.emp_code === API_TELEMETRY_EMP_CODE)
          .map((item) => (
          <button
            key={item.id}
            className={`sidebar-link ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => onSelectPanel(item.id)}
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
          <button className="sidebar-foot-btn" onClick={onLogout} title="Logout">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
