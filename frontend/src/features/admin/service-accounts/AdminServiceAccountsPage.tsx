import '../employees/AdminEmployeesPage.css'
import './serviceAccounts.css'
import { createPortal } from 'react-dom'
import ApiKeySecretModal from './ApiKeySecretModal'
import ConfirmServiceAccountActionModal from './ConfirmServiceAccountActionModal'
import ServiceAccountActivityDrawer from './ServiceAccountActivityDrawer'
import ServiceAccountFormDrawer from './ServiceAccountFormDrawer'
import { formatServiceAccountDate, getServiceAccountStatus } from './format'
import type { ServiceAccountsPanel } from './useServiceAccountsPanel'

type AdminServiceAccountsPageProps = {
  panel: ServiceAccountsPanel
}

export default function AdminServiceAccountsPage({ panel }: AdminServiceAccountsPageProps) {
  const {
    accounts,
    loading,
    loadError,
    statusMessage,
    loadAccounts,
    formMode,
    editingAccount,
    form,
    formSaving,
    formError,
    openCreate,
    openEdit,
    closeForm,
    updateForm,
    submitForm,
    confirmAction,
    confirmLoading,
    confirmError,
    requestConfirm,
    closeConfirm,
    runConfirmAction,
    issuedKey,
    dismissIssuedKey,
    activityAccount,
    activityEvents,
    activityLoading,
    activityError,
    openActivity,
    closeActivity,
  } = panel

  const activeCount = accounts.filter((account) => getServiceAccountStatus(account).tone === 'active').length

  return (
    <div className="adm-page admin-aligned-page admin-aligned-page--employees admin-aligned-page--service-accounts">
      <div className="adm-header dashboard-section-head">
        <div className="adm-header__title">
          <h1 className="adm-heading">Service Accounts</h1>
          <p className="sa-subheading">
            API-only identities for external systems. They authenticate with an API key, never sign in to the
            console, and can’t delete data.
          </p>
        </div>

        <div className="adm-header__actions">
          <button className="adm-btn adm-btn--primary" onClick={openCreate} type="button">
            <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add Service Account
          </button>
          <button
            className="adm-btn adm-btn--icon"
            onClick={() => void loadAccounts()}
            type="button"
            aria-label="Refresh"
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-icon">
              <path
                d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4M4 8v4h4M16 12h4v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {(statusMessage || loadError) && (
        <div className="adm-status-line" role="status">
          {loadError || statusMessage}
        </div>
      )}

      <div className="adm-table-card table-card">
        <div className="adm-table-toolbar">
          <div className="adm-table-title">
            <strong>
              {accounts.length} {accounts.length === 1 ? 'service account' : 'service accounts'}
            </strong>
            <span>{activeCount} active</span>
          </div>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="adm-empty empty-state">
            <strong>Loading service accounts…</strong>
          </div>
        ) : accounts.length > 0 ? (
          <div className="adm-table-scroll table-scroll">
            <table className="adm-table dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Last used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const status = getServiceAccountStatus(account)
                  const isRevoked = account.status === 'revoked'
                  return (
                    <tr key={account.id} className="adm-row">
                      <td>
                        <span className="adm-cell-primary">{account.name}</span>
                        <span className="adm-cell-meta">
                          {account.description || `Created by ${account.created_by || '—'}`}
                        </span>
                      </td>
                      <td>
                        <code className="sa-key-id">
                          {account.key_id && !isRevoked ? `fxsa_${account.key_id}_…` : '—'}
                        </code>
                        <span className="adm-cell-meta">
                          Rotated {formatServiceAccountDate(account.key_rotated_at)}
                        </span>
                      </td>
                      <td>
                        <div className="sa-permission-chips">
                          {account.can_read ? <span className="sa-chip">Read</span> : null}
                          {account.can_write ? <span className="sa-chip">Write</span> : null}
                          {account.can_update ? <span className="sa-chip">Update</span> : null}
                        </div>
                      </td>
                      <td>
                        <span className={`adm-pill table-pill adm-pill--${status.tone}`}>{status.label}</span>
                      </td>
                      <td>
                        <span className="adm-cell-secondary">
                          {formatServiceAccountDate(account.expires_at, 'Never')}
                        </span>
                      </td>
                      <td>
                        <span className="adm-cell-secondary">
                          {formatServiceAccountDate(account.last_used_at, 'Never')}
                        </span>
                        {account.last_used_ip ? <span className="adm-cell-meta">{account.last_used_ip}</span> : null}
                      </td>
                      <td>
                        <div className="adm-actions sa-actions">
                          <button
                            className="adm-action-btn adm-action-btn--view"
                            onClick={() => void openActivity(account)}
                            type="button"
                          >
                            Activity
                          </button>
                          <button className="adm-action-btn" onClick={() => openEdit(account)} type="button">
                            Edit
                          </button>
                          <button
                            className="adm-action-btn"
                            onClick={() => requestConfirm('regenerate', account)}
                            type="button"
                          >
                            {isRevoked ? 'New key' : 'Regenerate'}
                          </button>
                          {!isRevoked ? (
                            <button
                              className="adm-action-btn adm-action-btn--delete"
                              onClick={() => requestConfirm('revoke', account)}
                              type="button"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty empty-state">
            <strong>No service accounts yet</strong>
            <span>Create one to give an external system API access.</span>
          </div>
        )}
      </div>

      {createPortal(
        <>
          {formMode ? (
            <ServiceAccountFormDrawer
              mode={formMode}
              account={editingAccount}
              form={form}
              saving={formSaving}
              error={formError}
              onChange={updateForm}
              onSubmit={() => void submitForm()}
              onClose={closeForm}
            />
          ) : null}
          {activityAccount ? (
            <ServiceAccountActivityDrawer
              account={activityAccount}
              events={activityEvents}
              loading={activityLoading}
              error={activityError}
              onClose={closeActivity}
            />
          ) : null}
          {confirmAction ? (
            <ConfirmServiceAccountActionModal
              action={confirmAction}
              loading={confirmLoading}
              error={confirmError}
              onClose={closeConfirm}
              onConfirm={(reason) => void runConfirmAction(reason)}
            />
          ) : null}
          {issuedKey ? <ApiKeySecretModal issuedKey={issuedKey} onClose={dismissIssuedKey} /> : null}
        </>,
        document.body,
      )}
    </div>
  )
}
