import type { AdminProfile } from '../../../types/admin'

export function isPrivilegedUser(profile: AdminProfile | null) {
  if (!profile) {
    return false
  }

  const designation = (profile.emp_designation || '').trim().toLowerCase()
  if (designation === 'devtester') {
    return true
  }

  const role = (profile.role || '').trim().toLowerCase()
  if (role !== 'admin') {
    return false
  }

  return Boolean(profile.can_read || profile.can_write)
}

export function hasWriteAccess(profile: AdminProfile | null) {
  if (!profile) {
    return false
  }

  const designation = (profile.emp_designation || '').trim().toLowerCase()
  if (designation === 'devtester') {
    return true
  }

  return (profile.role || '').trim().toLowerCase() === 'admin' && Boolean(profile.can_write)
}
