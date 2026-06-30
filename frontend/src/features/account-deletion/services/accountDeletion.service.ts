import { requestAccountDeletionOtp, submitAccountDeletion } from '../api/accountDeletion.api'

export async function sendAccountDeletionOtp(empCode: string) {
  const data = await requestAccountDeletionOtp(empCode)
  return data?.message || 'OTP sent. Please check your device and enter it below.'
}

export async function deleteAccountWithOtp(empCode: string, otp: string) {
  const data = await submitAccountDeletion(empCode, otp)
  return data?.message || 'Account deletion submitted successfully.'
}
