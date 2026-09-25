import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminProfile } from '../../../types/admin'
import {
  EMPTY_SERVICE_ACCOUNT_FORM,
  type IssuedServiceAccountKey,
  type ServiceAccount,
  type ServiceAccountAuditEvent,
  type ServiceAccountConfirmAction,
  type ServiceAccountForm,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

const ENDPOINT = '/api/admin/service-accounts'

type UseServiceAccountsPanelOptions = {
  isActive: boolean
  profile: AdminProfile | null
  apiRequest: ApiRequest
}

export function canManageServiceAccounts(profile: AdminProfile | null) {
  return (profile?.emp_designation || '').trim().toLowerCase() === 'devtester'
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formFromAccount(account: ServiceAccount): ServiceAccountForm {
  return {
    name: account.name,
    description: account.description || '',
    can_read: account.can_read,
    can_write: account.can_write,
    can_update: account.can_update,
    expires_at: account.expires_at ? account.expires_at.slice(0, 10) : '',
  }
}

function expiryPayload(value: string) {
  return value ? value : null
}

export function useServiceAccountsPanel({ isActive, profile, apiRequest }: UseServiceAccountsPanelOptions) {
  const canManage = canManageServiceAccounts(profile)
  // apiRequest is recreated on every render of the session hook; keep the latest one.
  const apiRequestRef = useRef(apiRequest)
  useEffect(() => {
    apiRequestRef.current = apiRequest
  })

  const [accounts, setAccounts] = useState<ServiceAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingAccount, setEditingAccount] = useState<ServiceAccount | null>(null)
  const [form, setForm] = useState<ServiceAccountForm>(EMPTY_SERVICE_ACCOUNT_FORM)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmAction, setConfirmAction] = useState<ServiceAccountConfirmAction | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const [issuedKey, setIssuedKey] = useState<IssuedServiceAccountKey | null>(null)

  const [activityAccount, setActivityAccount] = useState<ServiceAccount | null>(null)
  const [activityEvents, setActivityEvents] = useState<ServiceAccountAuditEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')

  const loadAccounts = useCallback(async () => {
    if (!canManage) return
    setLoading(true)
    setLoadError('')
    try {
      const response = await apiRequestRef.current(ENDPOINT)
      setAccounts(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      setLoadError(toErrorMessage(error, 'Failed to load service accounts'))
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => {
    if (isActive && canManage) {
      void loadAccounts()
    }
  }, [isActive, canManage, loadAccounts])

  const upsertAccount = (account: ServiceAccount) => {
    setAccounts((current) => {
      const exists = current.some((item) => item.id === account.id)
      return exists
        ? current.map((item) => (item.id === account.id ? account : item))
        : [account, ...current]
    })
  }

  const openCreate = () => {
    setEditingAccount(null)
    setForm(EMPTY_SERVICE_ACCOUNT_FORM)
    setFormError('')
    setFormMode('add')
  }

  const openEdit = (account: ServiceAccount) => {
    setEditingAccount(account)
    setForm(formFromAccount(account))
    setFormError('')
    setFormMode('edit')
  }

  const closeForm = () => {
    if (formSaving) return
    setFormMode(null)
    setEditingAccount(null)
    setFormError('')
  }

  const updateForm = <K extends keyof ServiceAccountForm>(field: K, value: ServiceAccountForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validateForm = () => {
    if (!form.name.trim()) return 'Name is required.'
    if (!form.can_read && !form.can_write && !form.can_update) {
      return 'Grant at least one of Read, Write or Update access.'
    }
    return ''
  }

  const submitForm = async () => {
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      can_read: form.can_read,
      can_write: form.can_write,
      can_update: form.can_update,
      expires_at: expiryPayload(form.expires_at),
    }

    setFormSaving(true)
    setFormError('')
    try {
      if (formMode === 'add') {
        const response = await apiRequest(ENDPOINT, { method: 'POST', body: JSON.stringify(body) })
        const account: ServiceAccount = response.data.service_account
        upsertAccount(account)
        setIssuedKey({ accountName: account.name, apiKey: response.data.api_key, reason: 'created' })
        setStatusMessage(`Service account "${account.name}" created.`)
      } else if (formMode === 'edit' && editingAccount) {
        // Only send the expiry when it was changed, so an untouched (possibly past) date isn't re-validated.
        const expiryChanged = form.expires_at !== formFromAccount(editingAccount).expires_at
        const updateBody: Partial<typeof body> = { ...body }
        if (!expiryChanged) delete updateBody.expires_at
        const response = await apiRequest(`${ENDPOINT}/${editingAccount.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateBody),
        })
        upsertAccount(response.data)
        setStatusMessage(`Service account "${response.data.name}" updated.`)
      }
      setFormMode(null)
      setEditingAccount(null)
    } catch (error) {
      setFormError(toErrorMessage(error, 'Failed to save service account'))
    } finally {
      setFormSaving(false)
    }
  }

  const requestConfirm = (kind: ServiceAccountConfirmAction['kind'], account: ServiceAccount) => {
    setConfirmError('')
    setConfirmAction({ kind, account })
  }

  const closeConfirm = () => {
    if (confirmLoading) return
    setConfirmAction(null)
    setConfirmError('')
  }

  const runConfirmAction = async (reason: string) => {
    if (!confirmAction) return
    const { kind, account } = confirmAction

    setConfirmLoading(true)
    setConfirmError('')
    try {
      if (kind === 'regenerate') {
        const response = await apiRequest(`${ENDPOINT}/${account.id}/regenerate-key`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
        upsertAccount(response.data.service_account)
        setIssuedKey({ accountName: account.name, apiKey: response.data.api_key, reason: 'regenerated' })
        setStatusMessage(`API key for "${account.name}" regenerated. The previous key no longer works.`)
      } else {
        const response = await apiRequest(`${ENDPOINT}/${account.id}/revoke`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        })
        upsertAccount(response.data)
        setStatusMessage(`Service account "${account.name}" revoked.`)
      }
      setConfirmAction(null)
    } catch (error) {
      setConfirmError(toErrorMessage(error, 'Action failed'))
    } finally {
      setConfirmLoading(false)
    }
  }

  const dismissIssuedKey = () => setIssuedKey(null)

  const openActivity = async (account: ServiceAccount) => {
    setActivityAccount(account)
    setActivityEvents([])
    setActivityError('')
    setActivityLoading(true)
    try {
      const response = await apiRequest(`${ENDPOINT}/${account.id}/audit-logs?limit=200`)
      setActivityEvents(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      setActivityError(toErrorMessage(error, 'Failed to load activity'))
    } finally {
      setActivityLoading(false)
    }
  }

  const closeActivity = () => {
    setActivityAccount(null)
    setActivityEvents([])
    setActivityError('')
  }

  return {
    canManage,
    accounts,
    loading,
    loadError,
    statusMessage,
    loadAccounts,
    formMode,
    editingAccount,
    form,
    formSaving,
    formError,
    openCreate,
    openEdit,
    closeForm,
    updateForm,
    submitForm,
    confirmAction,
    confirmLoading,
    confirmError,
    requestConfirm,
    closeConfirm,
    runConfirmAction,
    issuedKey,
    dismissIssuedKey,
    activityAccount,
    activityEvents,
    activityLoading,
    activityError,
    openActivity,
    closeActivity,
  }
}

export type ServiceAccountsPanel = ReturnType<typeof useServiceAccountsPanel>
