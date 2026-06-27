import { useRef, useState } from 'react'
import {
  clearStoredAdminSession,
  persistAdminProfile,
  persistAdminTokens,
  readStoredAdminSession
} from '../../../services/storage/adminStorage'
import type { AdminProfile } from '../../../types/admin'

type UseAdminSessionOptions = {
  onSessionCleared?: () => void
  onSessionExpired: (message: string) => void
}

export function useAdminSession({ onSessionCleared, onSessionExpired }: UseAdminSessionOptions) {
  const initialSession = readStoredAdminSession()
  const [accessToken, setAccessToken] = useState(initialSession.accessToken)
  const [refreshToken, setRefreshToken] = useState(initialSession.refreshToken)
  const [profile, setProfile] = useState<AdminProfile | null>(initialSession.profile)
  const [refreshNotice, setRefreshNotice] = useState('')
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

  const updateTokens = (nextAccessToken: string, nextRefreshToken: string) => {
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    persistAdminTokens(nextAccessToken, nextRefreshToken)
  }

  const clearSession = () => {
    setAccessToken('')
    setRefreshToken('')
    setProfile(null)
    clearStoredAdminSession()
    onSessionCleared?.()
  }

  const persistSession = (
    nextAccessToken: string,
    nextRefreshToken: string,
    nextProfile: AdminProfile
  ) => {
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    setProfile(nextProfile)
    persistAdminTokens(nextAccessToken, nextRefreshToken)
    persistAdminProfile(nextProfile)
  }

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error('Refresh token missing')
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to refresh session')
        }

        const nextAccessToken = data?.access_token || ''
        const nextRefreshToken = data?.refresh_token || ''

        if (!nextAccessToken || !nextRefreshToken) {
          throw new Error('Invalid refresh response')
        }

        updateTokens(nextAccessToken, nextRefreshToken)
        setRefreshNotice('Session refreshed')
        window.setTimeout(() => setRefreshNotice(''), 2500)
        return nextAccessToken
      })().finally(() => {
        refreshPromiseRef.current = null
      })
    }

    return refreshPromiseRef.current
  }

  const apiRequest = async (
    path: string,
    options: RequestInit = {},
    tokenOverride?: string,
    allowRetry = true
  ) => {
    const token = tokenOverride || accessToken
    const headers = new Headers(options.headers || {})

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(path, {
      ...options,
      headers
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = data?.message || 'Request failed'
      const shouldRefresh =
        allowRetry &&
        (response.status === 401 ||
          message.toLowerCase().includes('token') ||
          message.toLowerCase().includes('expired'))

      if (shouldRefresh) {
        try {
          const nextAccessToken = await refreshAccessToken()
          return apiRequest(path, options, nextAccessToken, false)
        } catch (refreshError) {
          clearSession()
          onSessionExpired('Session expired. Please log in again.')
          throw refreshError
        }
      }

      throw new Error(message)
    }

    return data
  }

  return {
    accessToken,
    hasStoredSession: Boolean(initialSession.accessToken),
    refreshToken,
    profile,
    refreshNotice,
    setProfile,
    setRefreshNotice,
    persistSession,
    clearSession,
    refreshAccessToken,
    apiRequest
  }
}
