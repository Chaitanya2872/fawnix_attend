import type { ServiceAccount } from './types'

export function formatServiceAccountDate(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getServiceAccountStatus(account: ServiceAccount): { label: string; tone: 'active' | 'inactive' | 'leave' } {
  if (account.status === 'revoked') {
    return { label: 'Revoked', tone: 'inactive' }
  }
  if (account.expires_at && new Date(account.expires_at).getTime() <= Date.now()) {
    return { label: 'Expired', tone: 'leave' }
  }
  return { label: 'Active', tone: 'active' }
}
