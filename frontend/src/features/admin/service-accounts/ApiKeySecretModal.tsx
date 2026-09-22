import { useRef, useState } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import type { IssuedServiceAccountKey } from './types'

type ApiKeySecretModalProps = {
  issuedKey: IssuedServiceAccountKey
  onClose: () => void
}

function maskKey(apiKey: string) {
  const [prefix, keyId] = apiKey.split('_')
  return `${prefix}_${keyId}_${'•'.repeat(32)}`
}

/**
 * One-time reveal of a service account API key. The key only lives in this
 * dialog's props; closing it discards the key for good.
 */
export default function ApiKeySecretModal({ issuedKey, onClose }: ApiKeySecretModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')

  const closeIfAcknowledged = () => {
    if (acknowledged) onClose()
  }

  useDialogFocus({ containerRef, open: true, onClose: closeIfAcknowledged })

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(issuedKey.apiKey)
      setCopyStatus('Copied to clipboard.')
    } catch {
      setRevealed(true)
      setCopyStatus('Copy failed. Select the key and copy it manually.')
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sa-secret-title">
      <div className="modal-card sa-secret-card" ref={containerRef}>
        <div className="modal-header">
          <strong id="sa-secret-title">
            {issuedKey.reason === 'created' ? 'Service account created' : 'API key regenerated'}
          </strong>
        </div>
        <div className="modal-body">
          <p className="sa-secret-warning" role="alert">
            Copy the API key for <strong>{issuedKey.accountName}</strong> now. It will not be shown again. If you
            lose it, regenerate the key.
          </p>

          <label className="sa-secret-label" htmlFor="sa-secret-value">API key</label>
          <div className="sa-secret-field">
            <input
              id="sa-secret-value"
              className="sa-secret-input"
              readOnly
              spellCheck={false}
              autoComplete="off"
              value={revealed ? issuedKey.apiKey : maskKey(issuedKey.apiKey)}
              onFocus={(event) => revealed && event.currentTarget.select()}
            />
            <button className="ghost" type="button" onClick={() => setRevealed((value) => !value)}>
              {revealed ? 'Hide' : 'Show'}
            </button>
            <button className="sa-btn-primary" type="button" onClick={() => void copyKey()}>
              Copy
            </button>
          </div>
          {copyStatus ? <p className="form-note" role="status">{copyStatus}</p> : null}

          <div className="sa-secret-usage">
            <span>Send it on every request:</span>
            <code>Authorization: Bearer &lt;api key&gt;</code>
          </div>

          <label className="sa-secret-ack">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            I have stored this key somewhere safe
          </label>
        </div>
        <div className="modal-actions">
          <button className="sa-btn-primary" type="button" onClick={onClose} disabled={!acknowledged}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
