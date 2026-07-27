import type { EmployeeRow } from '../../../types/admin'

type DeleteEmployeeModalProps = {
  target: EmployeeRow
  deleteLoading: boolean
  statusMessage: string
  onClose: () => void
  onConfirmDelete: () => void
}

export default function DeleteEmployeeModal({
  target,
  deleteLoading,
  statusMessage,
  onClose,
  onConfirmDelete
}: DeleteEmployeeModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card delete-modal-card">
        <div className="modal-header">
          <strong>Delete Employee</strong>
          <button className="ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="modal-body">
          <p className="delete-modal-copy">
            {`Are you sure you want to delete ${target.emp_full_name || target.emp_code}? This action cannot be undone.`}
          </p>
          <div className="delete-modal-summary">
            <strong>{target.emp_code}</strong>
            <span>{target.emp_email || 'Email unavailable'}</span>
          </div>
          {statusMessage ? <p className="form-note">{statusMessage}</p> : null}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} disabled={deleteLoading} type="button">
            Cancel
          </button>
          <button className="danger" onClick={onConfirmDelete} disabled={deleteLoading} type="button">
            Delete Employee
          </button>
        </div>
      </div>
    </div>
  )
}
