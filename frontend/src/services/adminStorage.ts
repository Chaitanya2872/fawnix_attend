import type { AdminProfile } from '../types/admin'

export const ACCESS_TOKEN_KEY = 'fawnix_admin_access_token'
export const REFRESH_TOKEN_KEY = 'fawnix_admin_refresh_token'
export const USER_KEY = 'fawnix_admin_user'

export type StoredAdminSession = {
  accessToken: string
  refreshToken: string
  profile: AdminProfile | null
}

export function readStoredAdminSession(): StoredAdminSession {
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY) || ''
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY) || ''
  const rawUser = window.localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return { accessToken, refreshToken, profile: null }
  }

  try {
    return {
      accessToken,
      refreshToken,
      profile: JSON.parse(rawUser) as AdminProfile
    }
  } catch {
    window.localStorage.removeItem(USER_KEY)
    return { accessToken, refreshToken, profile: null }
  }
}

export function persistAdminTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function persistAdminProfile(profile: AdminProfile) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(profile))
}

export function clearStoredAdminSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}
