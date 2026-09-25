export type ServiceAccountStatus = 'active' | 'revoked'

export type ServiceAccount = {
  id: number
  name: string
  description: string | null
  key_id: string | null
  can_read: boolean
  can_write: boolean
  can_update: boolean
  status: ServiceAccountStatus
  expires_at: string | null
  created_by: string | null
  created_at: string | null
  updated_by: string | null
  updated_at: string | null
  key_rotated_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  revoke_reason: string | null
  last_used_at: string | null
  last_used_ip: string | null
}

export type ServiceAccountAuditEvent = {
  id: number
  service_account_id: number
  event: string
  actor: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type ServiceAccountForm = {
  name: string
  description: string
  can_read: boolean
  can_write: boolean
  can_update: boolean
  /** YYYY-MM-DD, or empty for a key that never expires. */
  expires_at: string
}

export type ServiceAccountConfirmAction = {
  kind: 'regenerate' | 'revoke'
  account: ServiceAccount
}

/** A freshly issued key. Held in memory only, and dropped as soon as the dialog closes. */
export type IssuedServiceAccountKey = {
  accountName: string
  apiKey: string
  reason: 'created' | 'regenerated'
}

export const EMPTY_SERVICE_ACCOUNT_FORM: ServiceAccountForm = {
  name: '',
  description: '',
  can_read: true,
  can_write: false,
  can_update: false,
  expires_at: '',
}
