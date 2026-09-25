import { useRef } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import '../employees/EmployeeFormDrawer.css'
import type { ServiceAccount, ServiceAccountForm } from './types'

type ServiceAccountFormDrawerProps = {
  mode: 'add' | 'edit'
  account: ServiceAccount | null
  form: ServiceAccountForm
  saving: boolean
  error: string
  onChange: <K extends keyof ServiceAccountForm>(field: K, value: ServiceAccountForm[K]) => void
  onSubmit: () => void
  onClose: () => void
}

const PERMISSIONS: { field: 'can_read' | 'can_write' | 'can_update'; label: string; hint: string }[] = [
  { field: 'can_read', label: 'Read', hint: 'GET requests' },
  { field: 'can_write', label: 'Write', hint: 'POST requests (create)' },
  { field: 'can_update', label: 'Update', hint: 'PUT / PATCH requests' },
]

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <path
        d="M15.5 8.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0Zm-2.2 2.6L7 17.4V20h2.6v-2h2v-2h2l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function ServiceAccountFormDrawer({
  mode,
  account,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: ServiceAccountFormDrawerProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const isAdd = mode === 'add'

  useDialogFocus({ containerRef, open: true, onClose })

  return (
    <>
      <button className="side-panel-scrim" type="button" aria-label="Close service account panel" onClick={onClose} />
      <aside
        className="emp-form-panel"
        aria-label={isAdd ? 'Add service account' : 'Edit service account'}
        ref={containerRef}
      >
        <button className="emp-form-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>

        <div className="emp-form-header">
          <span className="emp-form-icon"><KeyIcon /></span>
          <h3>{isAdd ? 'Add Service Account' : 'Edit Service Account'}</h3>
          <p>
            {isAdd
              ? 'Service accounts give external systems API-only access. They cannot sign in to the console and never use OTP.'
              : `Update ${account?.name || 'this service account'}. Changes to access apply to its very next request.`}
          </p>
        </div>

        <div className="emp-form-body">
          <div className="emp-form-field emp-form-field--full">
            <label htmlFor="sa-name">Name</label>
            <input
              id="sa-name"
              value={form.name}
              maxLength={100}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="e.g. Payroll export"
            />
          </div>
          <div className="emp-form-field emp-form-field--full">
            <label htmlFor="sa-description">Description</label>
            <input
              id="sa-description"
              value={form.description}
              maxLength={500}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="What system uses this account and why"
            />
          </div>

          <fieldset className="sa-permissions emp-form-field--full">
            <legend>Access</legend>
            {PERMISSIONS.map((permission) => (
              <label key={permission.field} className="sa-permission-option">
                <input
                  type="checkbox"
                  checked={form[permission.field]}
                  onChange={(event) => onChange(permission.field, event.target.checked)}
                />
                <span>
                  <strong>{permission.label}</strong>
                  <small>{permission.hint}</small>
                </span>
              </label>
            ))}
            <p className="sa-permissions-note">
              Delete is never allowed for service accounts. Login, user management and admin permission endpoints
              are also blocked.
            </p>
          </fieldset>

          <div className="emp-form-field emp-form-field--full">
            <label htmlFor="sa-expires">Key expiry (optional)</label>
            <input
              id="sa-expires"
              type="date"
              min={tomorrow()}
              value={form.expires_at}
              onChange={(event) => onChange('expires_at', event.target.value)}
            />
            <small className="sa-field-hint">Leave empty for a key that doesn’t expire. You can revoke it any time.</small>
          </div>
        </div>

        <div className="emp-form-footer">
          <button className="emp-form-btn emp-form-btn--ghost" onClick={onClose} disabled={saving} type="button">
            Cancel
          </button>
          <button className="emp-form-btn emp-form-btn--primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? 'Saving…' : isAdd ? 'Create & Generate Key' : 'Save Changes'}
          </button>
        </div>
        {error ? <p className="emp-form-status" role="alert">{error}</p> : null}
      </aside>
    </>
  )
}
