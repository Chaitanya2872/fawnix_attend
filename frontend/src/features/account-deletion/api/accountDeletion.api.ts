type AccountDeletionPayload = {
  emp_code: string
  otp?: string
}

async function postJson(path: string, payload: AccountDeletionPayload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.')
  }

  return data
}

export function requestAccountDeletionOtp(empCode: string) {
  return postJson('/api/auth/request-otp', { emp_code: empCode })
}

export function submitAccountDeletion(empCode: string, otp: string) {
  return postJson('/api/auth/account/delete', { emp_code: empCode, otp })
}
