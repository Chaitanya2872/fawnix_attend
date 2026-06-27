import { useState } from 'react'
import { deleteAccountWithOtp, sendAccountDeletionOtp } from '../services/accountDeletion.service'

export function useAccountDeletion() {
  const [empCode, setEmpCode] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const requestOtp = async () => {
    if (!empCode.trim()) {
      setStatus('Enter your Employee ID to request OTP.')
      return
    }

    setIsLoading(true)
    setStatus('Requesting OTP...')

    try {
      setStatus(await sendAccountDeletionOtp(empCode.trim()))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to reach server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!empCode.trim() || !otp.trim()) {
      setStatus('Employee ID and OTP are required.')
      return
    }

    setIsLoading(true)
    setStatus('Submitting delete request...')

    try {
      setStatus(await deleteAccountWithOtp(empCode.trim(), otp.trim()))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to reach server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    empCode,
    otp,
    status,
    isLoading,
    setEmpCode,
    setOtp,
    requestOtp,
    deleteAccount
  }
}
