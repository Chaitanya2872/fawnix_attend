import { useRef, useState } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import type { ServiceAccountConfirmAction } from './types'

type ConfirmServiceAccountActionModalProps = {
  action: ServiceAccountConfirmAction
  loading: boolean
  error: string
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function ConfirmServiceAccountActionModal({
  action,
  loading,
  error,
  onClose,
  onConfirm,
}: ConfirmServiceAccountActionModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [reason, setReason] = useState('')
  const isRevoke = action.kind === 'revoke'
  const { account } = action

  useDialogFocus({ containerRef, open: true, onClose })

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title">
      <div className="modal-card delete-modal-card" ref={containerRef}>
        <div className="modal-header">
          <strong id="sa-confirm-title">{isRevoke ? 'Revoke service account' : 'Regenerate API key'}</strong>
          <button className="ghost" onClick={onClose} disabled={loading} type="button">
            Close
          </button>
        </div>
        <div className="modal-body">
          <p className="delete-modal-copy">
            {isRevoke
              ? `Revoking "${account.name}" disables its API key immediately. Integrations using it will stop working. You can issue a new key later by regenerating it.`
              : `A new key will be issued for "${account.name}" and the current key will stop working immediately. Update every integration that uses it.`}
          </p>
          <div className="delete-modal-summary">
            <strong>{account.name}</strong>
            <span>{account.key_id ? `fxsa_${account.key_id}_…` : 'No active key'}</span>
          </div>
          {isRevoke ? (
            <div className="emp-form-field emp-form-field--full">
              <label htmlFor="sa-revoke-reason">Reason (optional)</label>
              <input
                id="sa-revoke-reason"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Integration retired"
              />
            </div>
          ) : null}
          {error ? <p className="form-note">{error}</p> : null}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} disabled={loading} type="button">
            Cancel
          </button>
          <button className="danger" onClick={() => onConfirm(reason)} disabled={loading} type="button">
            {loading ? 'Working…' : isRevoke ? 'Revoke' : 'Regenerate key'}
          </button>
        </div>
      </div>
    </div>
  )
}
