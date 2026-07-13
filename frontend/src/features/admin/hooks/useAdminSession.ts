import { useRef, useState } from 'react'
import {
  clearStoredAdminSession,
  persistAdminProfile,
  persistAdminTokens,
  readStoredAdminSession
} from '../../../services/storage/adminStorage'
import type { AdminApiTelemetryEntry, AdminProfile } from '../../../types/admin'

type UseAdminSessionOptions = {
  onSessionCleared?: () => void
  onSessionExpired: (message: string) => void
}

const TELEMETRY_MAX_ITEMS = 40

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactSensitiveValue(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase()
  if (
    normalizedKey.includes('authorization') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('password') ||
    normalizedKey.includes('otp') ||
    normalizedKey.includes('secret')
  ) {
    return '[redacted]'
  }

  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type || 'application/octet-stream'
    }
  }

  if (typeof value === 'string' && value.length > 600) {
    return `${value.slice(0, 600)}...`
  }

  return sanitizeTelemetryData(value)
}

function sanitizeTelemetryData(value: unknown): unknown {
  if (value == null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeTelemetryData(item))
  }

  if (value instanceof FormData) {
    return Array.from(value.entries()).map(([key, entryValue]) => ({
      key,
      value: redactSensitiveValue(key, entryValue)
    }))
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, entryValue]) => [key, redactSensitiveValue(key, entryValue)])
    )
  }

  return value
}

function parseTelemetryBody(body: BodyInit | null | undefined): unknown {
  if (!body) {
    return undefined
  }

  if (typeof body === 'string') {
    try {
      return sanitizeTelemetryData(JSON.parse(body))
    } catch {
      return body.length > 600 ? `${body.slice(0, 600)}...` : body
    }
  }

  if (body instanceof FormData) {
    return sanitizeTelemetryData(body)
  }

  return '[non-text body]'
}

function toFriendlyRequestSummary(method: string, path: string) {
  return `I called ${method.toUpperCase()} ${path}`
}

function toFriendlyRequestDetail(method: string, path: string, requestPayload: unknown) {
  if (requestPayload === undefined) {
    return `${method.toUpperCase()} ${path} was sent without a request payload.`
  }
  return `${method.toUpperCase()} ${path} was sent with the sanitized payload shown below.`
}

export function useAdminSession({ onSessionCleared, onSessionExpired }: UseAdminSessionOptions) {
  const initialSession = readStoredAdminSession()
  const [accessToken, setAccessToken] = useState(initialSession.accessToken)
  const [refreshToken, setRefreshToken] = useState(initialSession.refreshToken)
  const [profile, setProfile] = useState<AdminProfile | null>(initialSession.profile)
  const [refreshNotice, setRefreshNotice] = useState('')
  const [telemetryEntries, setTelemetryEntries] = useState<AdminApiTelemetryEntry[]>([])
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

  const appendTelemetryEntry = (entry: AdminApiTelemetryEntry) => {
    setTelemetryEntries((currentEntries) => [entry, ...currentEntries].slice(0, TELEMETRY_MAX_ITEMS))
  }

  const updateTelemetryEntry = (
    id: string,
    updater: (entry: AdminApiTelemetryEntry) => AdminApiTelemetryEntry
  ) => {
    setTelemetryEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.id === id ? updater(entry) : entry))
    )
  }

  const clearTelemetryEntries = () => {
    setTelemetryEntries([])
  }

  const updateTokens = (nextAccessToken: string, nextRefreshToken: string) => {
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    persistAdminTokens(nextAccessToken, nextRefreshToken)
  }

  const clearSession = () => {
    setAccessToken('')
    setRefreshToken('')
    setProfile(null)
    setTelemetryEntries([])
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
        const telemetryId = `telemetry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const startedAt = new Date().toISOString()
        const requestPayload = sanitizeTelemetryData({ refresh_token: '[redacted]' })
        appendTelemetryEntry({
          id: telemetryId,
          startedAt,
          method: 'POST',
          path: '/api/auth/refresh',
          status: 'pending',
          summary: 'I’m refreshing your admin session in the background.',
          detail: 'POST /api/auth/refresh was sent with a redacted refresh payload.',
          requestPayload
        })

        const startedTime = Date.now()
        let response: Response
        try {
          response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          })
        } catch (error) {
          updateTelemetryEntry(telemetryId, (entry) => ({
            ...entry,
            status: 'error',
            durationMs: Date.now() - startedTime,
            completedAt: new Date().toISOString(),
            summary: 'Session refresh could not reach the backend.',
            detail: error instanceof Error ? error.message : 'Network request failed before a response was received.'
          }))
          throw error
        }

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          updateTelemetryEntry(telemetryId, (entry) => ({
            ...entry,
            status: 'error',
            httpStatus: response.status,
            durationMs: Date.now() - startedTime,
            completedAt: new Date().toISOString(),
            summary: `Session refresh failed with ${response.status}.`,
            detail: `The refresh request was rejected and the current session may need a new login.`,
            responsePayload: sanitizeTelemetryData(data)
          }))
          throw new Error(data?.message || 'Unable to refresh session')
        }

        const nextAccessToken = data?.access_token || ''
        const nextRefreshToken = data?.refresh_token || ''

        if (!nextAccessToken || !nextRefreshToken) {
          updateTelemetryEntry(telemetryId, (entry) => ({
            ...entry,
            status: 'error',
            httpStatus: response.status,
            durationMs: Date.now() - startedTime,
            completedAt: new Date().toISOString(),
            summary: 'Session refresh response was incomplete.',
            detail: 'The refresh endpoint responded, but the token pair was missing.',
            responsePayload: sanitizeTelemetryData(data)
          }))
          throw new Error('Invalid refresh response')
        }

        updateTelemetryEntry(telemetryId, (entry) => ({
          ...entry,
          status: 'success',
          httpStatus: response.status,
          durationMs: Date.now() - startedTime,
          completedAt: new Date().toISOString(),
          summary: `Session refreshed successfully in ${Date.now() - startedTime}ms.`,
          detail: 'The admin session token was renewed automatically and the original request can continue.',
          responsePayload: sanitizeTelemetryData({ access_token: '[redacted]', refresh_token: '[redacted]' })
        }))
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
    const method = (options.method || 'GET').toUpperCase()
    const requestPayload = parseTelemetryBody(options.body)
    const telemetryId = `telemetry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = new Date().toISOString()
    const startedTime = Date.now()

    appendTelemetryEntry({
      id: telemetryId,
      startedAt,
      method,
      path,
      status: 'pending',
      summary: toFriendlyRequestSummary(method, path),
      detail: toFriendlyRequestDetail(method, path, requestPayload),
      requestPayload
    })

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    let response: Response
    try {
      response = await fetch(path, {
        ...options,
        headers
      })
    } catch (error) {
      updateTelemetryEntry(telemetryId, (entry) => ({
        ...entry,
        status: 'error',
        durationMs: Date.now() - startedTime,
        completedAt: new Date().toISOString(),
        summary: `${method} ${path} could not reach the backend.`,
        detail: error instanceof Error ? error.message : 'Network request failed before a response was received.'
      }))
      throw error
    }

    const data = await response.json().catch(() => ({}))
    const durationMs = Date.now() - startedTime

    if (!response.ok) {
      const message = data?.message || 'Request failed'
      const shouldRefresh =
        allowRetry &&
        (response.status === 401 ||
          message.toLowerCase().includes('token') ||
          message.toLowerCase().includes('expired'))

      if (shouldRefresh) {
        updateTelemetryEntry(telemetryId, (entry) => ({
          ...entry,
          status: 'error',
          httpStatus: response.status,
          durationMs,
          completedAt: new Date().toISOString(),
          summary: `${method} ${path} returned ${response.status}, so I’m trying a session refresh.`,
          detail: 'The request hit an auth problem and the frontend is attempting one automatic retry after refreshing the session.',
          responsePayload: sanitizeTelemetryData(data)
        }))
        try {
          const nextAccessToken = await refreshAccessToken()
          return apiRequest(path, options, nextAccessToken, false)
        } catch (refreshError) {
          clearSession()
          onSessionExpired('Session expired. Please log in again.')
          throw refreshError
        }
      }

      updateTelemetryEntry(telemetryId, (entry) => ({
        ...entry,
        status: 'error',
        httpStatus: response.status,
        durationMs,
        completedAt: new Date().toISOString(),
        summary: `${method} ${path} failed with ${response.status}.`,
        detail: typeof message === 'string' && message.trim()
          ? message.trim()
          : 'The request failed before the page could continue.',
        responsePayload: sanitizeTelemetryData(data)
      }))
      throw new Error(message)
    }

    updateTelemetryEntry(telemetryId, (entry) => ({
      ...entry,
      status: 'success',
      httpStatus: response.status,
      durationMs,
      completedAt: new Date().toISOString(),
      summary: `${method} ${path} completed with ${response.status} in ${durationMs}ms.`,
      detail: 'The backend responded successfully. You can inspect the sanitized request and response below.',
      responsePayload: sanitizeTelemetryData(data)
    }))

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
    telemetryEntries,
    clearTelemetryEntries,
    persistSession,
    clearSession,
    refreshAccessToken,
    apiRequest
  }
}
