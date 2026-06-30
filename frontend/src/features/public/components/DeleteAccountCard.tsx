import { useAccountDeletion } from '../../account-deletion/hooks/useAccountDeletion'

export function DeleteAccountCard() {
  const {
    empCode,
    otp,
    status,
    isLoading,
    setEmpCode,
    setOtp,
    requestOtp,
    deleteAccount
  } = useAccountDeletion()

  return (
    <div className="delete-card">
      <div>
        <label htmlFor="emp-code">Employee ID</label>
        <input
          id="emp-code"
          type="text"
          placeholder="e.g., 2872"
          value={empCode}
          onChange={(event) => setEmpCode(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="otp">OTP</label>
        <input
          id="otp"
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
        />
      </div>
      <div className="delete-actions">
        <button className="ghost" onClick={() => void requestOtp()} disabled={isLoading} type="button">
          Request OTP
        </button>
        <button className="danger" onClick={() => void deleteAccount()} disabled={isLoading} type="button">
          Delete Account
        </button>
      </div>
      {status ? <p className="delete-note">{status}</p> : null}
    </div>
  )
}
