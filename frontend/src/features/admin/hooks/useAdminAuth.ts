import { useEffect, useState } from 'react'
import { useAdminSession } from './useAdminSession'
import { isPrivilegedUser } from '../utils/permissions'
import type { AdminProfile } from '../../../types/admin'

type UseAdminAuthOptions = {
  onSessionCleared: () => void
}

export function useAdminAuth({ onSessionCleared }: UseAdminAuthOptions) {
  const [showAdminLogin, setShowAdminLogin] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState('')
  const [adminEmpCode, setAdminEmpCode] = useState('')
  const [adminOtp, setAdminOtp] = useState('')

  const {
    accessToken,
    hasStoredSession,
    refreshToken,
    profile,
    refreshNotice,
    telemetryEntries,
    clearTelemetryEntries,
    persistSession,
    clearSession,
    refreshAccessToken,
    apiRequest
  } = useAdminSession({
    onSessionCleared,
    onSessionExpired: (message) => {
      setShowAdminLogin(true)
      setAuthStatus(message)
    }
  })

  useEffect(() => {
    if (hasStoredSession) {
      setShowAdminLogin(false)
    }
  }, [hasStoredSession])

  const handleSessionExpired = () => {
    clearSession()
    setShowAdminLogin(true)
  }

  const handleAdminRequestOtp = async () => {
    if (!adminEmpCode.trim()) {
      setAuthStatus('Enter your Employee ID to request OTP.')
      return
    }

    setAuthLoading(true)
    setAuthStatus('Requesting admin OTP...')

    try {
      const data = await apiRequest('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ emp_code: adminEmpCode.trim() })
      })

      setAuthStatus(data?.message || 'OTP sent successfully.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'Failed to request OTP')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    if (!adminEmpCode.trim() || !adminOtp.trim()) {
      setAuthStatus('Employee ID and OTP are required.')
      return
    }

    setAuthLoading(true)
    setAuthStatus('Verifying admin login...')

    try {
      const loginData = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          emp_code: adminEmpCode.trim(),
          otp: adminOtp.trim(),
          device_info: {
            device_name: 'Fawnix Admin Web',
            os: navigator.platform || 'web',
            app_version: 'frontend-admin-dashboard'
          }
        })
      })

      const nextAccessToken = loginData?.access_token || ''
      const nextRefreshToken = loginData?.refresh_token || ''

      if (!nextAccessToken) {
        throw new Error('Access token missing from login response')
      }

      const profileResponse = await apiRequest('/api/auth/me', {}, nextAccessToken)
      const nextProfile = (profileResponse?.data || null) as AdminProfile | null

      if (!isPrivilegedUser(nextProfile)) {
        throw new Error('This dashboard currently requires DevTester or admin permissions access')
      }

      persistSession(nextAccessToken, nextRefreshToken, nextProfile as AdminProfile)
      setShowAdminLogin(false)
      setAuthStatus('Admin login successful.')
      setAdminOtp('')
    } catch (error) {
      clearSession()
      setAuthStatus(error instanceof Error ? error.message : 'Admin login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    const logoutAccessToken = accessToken
    const logoutRefreshToken = refreshToken

    // Local logout must never wait for a slow or unavailable API.
    clearSession()
    setShowAdminLogin(true)
    setAuthStatus('')

    if (logoutAccessToken && logoutRefreshToken) {
      void fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${logoutAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: logoutRefreshToken }),
        keepalive: true
      }).catch(() => undefined)
    }
  }

  return {
    accessToken,
    refreshToken,
    profile,
    refreshNotice,
    telemetryEntries,
    clearTelemetryEntries,
    refreshAccessToken,
    apiRequest,
    showAdminLogin,
    authLoading,
    authStatus,
    adminEmpCode,
    adminOtp,
    setAdminEmpCode,
    setAdminOtp,
    handleAdminRequestOtp,
    handleAdminLogin,
    handleLogout,
    handleSessionExpired
  }
}
