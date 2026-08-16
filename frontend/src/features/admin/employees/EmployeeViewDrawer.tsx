import type { EmployeeRow } from '../../../types/admin'
import type { ReactNode } from 'react'
import { formatDateOnly } from '../../../utils/date/dateUtils'
import './EmployeeViewDrawer.css'

type Props = { 
  employee: EmployeeRow; 
  onClose: () => void; 
  onEdit?: () => void;
  onDelete?: () => void;
}

// Icon components
const Icons = {
  user: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  email: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  blood: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 6 4 10 4 14c0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-4-8-8-12z" />
      <path d="M12 6c-2 2-3 4-3 6 0 1.657 1.343 3 3 3s3-1.343 3-3c0-2-1-4-3-6z" />
    </svg>
  ),
  briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="18" />
      <line x1="15" y1="22" x2="15" y2="18" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  ),
  badge: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v2l-3 3 2 2 7-7z" />
      <path d="M16 12l-4 4-2-2" />
      <path d="M20 12l-3 3-2-2" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  manager: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  status: {
    active: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    inactive: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="8" y2="16" />
      </svg>
    ),
  }
}

const fieldConfig: Record<string, { label: string; icon: () => ReactNode; color: string }> = {
  emp_code: { label: 'Employee Code', icon: Icons.badge, color: '#4f7bf7' },
  emp_email: { label: 'Email Address', icon: Icons.email, color: '#8b5cf6' },
  emp_contact: { label: 'Contact Number', icon: Icons.phone, color: '#10b981' },
  emp_date_of_birth: { label: 'Date of Birth', icon: Icons.calendar, color: '#f59e0b' },
  emp_blood_group: { label: 'Blood Group', icon: Icons.blood, color: '#ef4444' },
  emp_designation: { label: 'Designation', icon: Icons.briefcase, color: '#6366f1' },
  emp_grade: { label: 'Grade Level', icon: Icons.badge, color: '#8b5cf6' },
  emp_department: { label: 'Department', icon: Icons.building, color: '#06b6d4' },
  shift_name: { label: 'Shift', icon: Icons.clock, color: '#f59e0b' },
  manager_name: { label: 'Manager', icon: Icons.manager, color: '#10b981' },
  emp_manager: { label: 'Manager Code', icon: Icons.badge, color: '#6b7280' },
  emp_joining_date: { label: 'Joining Date', icon: Icons.calendar, color: '#f59e0b' },
}

const fields = [
  'emp_code', 'emp_email', 'emp_contact',
  'emp_date_of_birth', 'emp_blood_group',
  'emp_designation', 'emp_grade', 'emp_department',
  'shift_name', 'manager_name', 'emp_manager'
] as const

export default function EmployeeViewDrawer({ employee, onClose, onEdit, onDelete }: Props) {
  const record = employee as Record<string, unknown>
  const name = employee.emp_full_name || employee.emp_code || 'Employee'
  const isActive = employee.is_active

  const statusIcon = isActive ? Icons.status.active() : Icons.status.inactive()
  const statusLabel = isActive ? 'Active' : 'Inactive'

  return (
    <>
      <button className="employee-drawer-scrim" type="button" aria-label="Close employee details" onClick={onClose} />
      <aside className="employee-drawer employee-view-panel" aria-label={`${name} details`}>
        {/* Header */}
        <header className="employee-drawer-header">
          <div className="employee-drawer-header-content">
            <div className="employee-drawer-avatar">
              <span className="employee-drawer-avatar-text">
                {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className={`employee-drawer-status-dot ${isActive ? 'active' : 'inactive'}`} />
            </div>
            <div className="employee-drawer-title-group">
              <h3 className="employee-drawer-name">{name}</h3>
              <div className="employee-drawer-meta">
                <span className={`employee-drawer-status-badge ${isActive ? 'active' : 'inactive'}`}>
                  {statusIcon}
                  {statusLabel}
                </span>
                <span className="employee-drawer-code">{employee.emp_code || 'No code'}</span>
              </div>
            </div>
          </div>
          <button className="employee-drawer-close" type="button" onClick={onClose} aria-label="Close drawer">
            <Icons.close />
          </button>
        </header>

        {/* Body */}
        <section className="employee-drawer-body" aria-label="Employee details">
          <div className="employee-drawer-grid">
            {fields.map((field) => {
              const config = fieldConfig[field]
              const raw = record[field]
              
              let display: string
              if (field === 'emp_date_of_birth') {
                display = raw ? formatDateOnly(String(raw)) : '—'
              } else if (field === 'emp_code' && !raw) {
                display = '—'
              } else {
                display = String(raw || '—')
              }

              // Don't show empty fields
              if (display === '—' && field !== 'emp_code') return null

              return (
                <div className="employee-drawer-field" key={field}>
                  <div className="employee-drawer-field-icon" style={{ color: config.color, background: `${config.color}15` }}>
                    <config.icon />
                  </div>
                  <div className="employee-drawer-field-content">
                    <span className="employee-drawer-field-label">{config.label}</span>
                    <strong className="employee-drawer-field-value">{display}</strong>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Footer */}
        {(onEdit || onDelete) && (
          <footer className="employee-drawer-footer">
            {onDelete && (
              <button 
                className="employee-drawer-btn employee-drawer-btn-danger" 
                type="button" 
                onClick={onDelete}
              >
                <Icons.trash />
                Delete
              </button>
            )}
            {onEdit && (
              <button 
                className="employee-drawer-btn employee-drawer-btn-primary" 
                type="button" 
                onClick={onEdit}
              >
                <Icons.edit />
                Edit Employee
              </button>
            )}
          </footer>
        )}
      </aside>
    </>
  )
}