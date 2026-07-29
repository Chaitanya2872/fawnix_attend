import { useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import type { EmployeeRow } from '../../../types/admin'

type NewEmployeeForm = {
  emp_code: string
  emp_full_name: string
  emp_email: string
  emp_contact: string
  emp_grade: string
  emp_designation: string
  emp_department: string
  emp_manager: string
  role: string
}

const EMPTY_NEW_EMPLOYEE: NewEmployeeForm = {
  emp_code: '',
  emp_full_name: '',
  emp_email: '',
  emp_contact: '',
  emp_grade: '',
  emp_designation: '',
  emp_department: '',
  emp_manager: '',
  role: 'employee'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type UseEmployeesPanelOptions = {
  employees: EmployeeRow[]
  canWriteAdminData: boolean
  apiRequest: ApiRequest
  accessToken: string
  refreshAccessToken: () => Promise<string>
  loadDashboard: (token: string) => Promise<void>
  resolveDownloadFilename: (response: Response, fallbackFilename: string) => string
}

type EmployeeKpiFilter = 'all' | 'active' | 'inactive' | 'hr_admin' | 'birthdays'

const hasHrAdminRole = (employee: EmployeeRow) => {
  const values = [employee.emp_designation, (employee as EmployeeRow & { role?: string }).role]
  return values.some((value) => /\b(hr|cmd|admin)\b/i.test(value || ''))
}

const hasBirthdayThisMonth = (employee: EmployeeRow) => {
  const record = employee as EmployeeRow & { emp_date_of_birth?: string; date_of_birth?: string; birth_date?: string; birthday?: string }
  const rawDate = record.emp_date_of_birth || record.date_of_birth || record.birth_date || record.birthday
  const date = rawDate ? new Date(rawDate) : null
  return Boolean(date && !Number.isNaN(date.getTime()) && date.getMonth() === new Date().getMonth())
}

export function useEmployeesPanel({
  employees,
  canWriteAdminData,
  apiRequest,
  accessToken,
  refreshAccessToken,
  loadDashboard,
  resolveDownloadFilename
}: UseEmployeesPanelOptions) {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [employeeKpiFilter, setEmployeeKpiFilter] = useState<EmployeeKpiFilter>('all')
  const [employeeStatusMenuOpen, setEmployeeStatusMenuOpen] = useState(false)
  const [employeeExportFormat, setEmployeeExportFormat] = useState<'csv' | 'pdf' | 'xlsx'>('csv')
  const [employeeExportStatus, setEmployeeExportStatus] = useState('')
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<EmployeeRow>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [employeePanelMode, setEmployeePanelMode] = useState<'add' | 'edit' | null>(null)
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeRow | null>(null)
  const [employeeImportStatus, setEmployeeImportStatus] = useState('')
  const [employeeImportLoading, setEmployeeImportLoading] = useState(false)
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<EmployeeRow | null>(null)
  const [deleteEmployeeLoading, setDeleteEmployeeLoading] = useState(false)
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false)
  const [createEmployeeStatus, setCreateEmployeeStatus] = useState('')
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({ ...EMPTY_NEW_EMPLOYEE })
  const employeeStatusMenuRef = useRef<HTMLDivElement | null>(null)

  useClickOutside(employeeStatusMenuRef, employeeStatusMenuOpen, () => setEmployeeStatusMenuOpen(false), {
    closeOnEscape: false
  })

  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase()
  const filteredEmployees = employees
    .filter((employee) => {
      if (employeeKpiFilter === 'active') {
        return Boolean(employee.is_active)
      }
      if (employeeKpiFilter === 'inactive') {
        return !employee.is_active
      }
      if (employeeKpiFilter === 'hr_admin') return hasHrAdminRole(employee)
      if (employeeKpiFilter === 'birthdays') return hasBirthdayThisMonth(employee)
      return true
    })

    .filter((employee) => {
      if (!normalizedEmployeeSearch) {
        return true
      }

      const haystack = [
        employee.emp_full_name || '',
        employee.emp_code || '',
        employee.emp_email || '',
        employee.emp_designation || '',
        employee.emp_department || '',
        employee.manager_name || '',
        employee.emp_manager || ''
      ].join(' ').toLowerCase()
      return haystack.includes(normalizedEmployeeSearch)
    })
    .sort((left, right) => {
      const leftCode = (left.emp_code || '').trim()
      const rightCode = (right.emp_code || '').trim()
      if (!leftCode) {
        return rightCode ? 1 : 0
      }
      if (!rightCode) {
        return -1
      }
      return leftCode.localeCompare(rightCode, undefined, { numeric: true, sensitivity: 'base' })
    })

  const applyEmployeeKpiFilter = (filter: EmployeeKpiFilter) => {
    setEmployeeKpiFilter(filter)
    setEmployeeStatusFilter(filter === 'active' || filter === 'inactive' ? filter : 'all')
    setEmployeeSearch('')
  }

  const updateNewEmployee = (field: keyof NewEmployeeForm, value: string) => {
    setNewEmployee((current) => ({
      ...current,
      [field]: value
    }))
  }

  const resetNewEmployee = () => {
    setNewEmployee({ ...EMPTY_NEW_EMPLOYEE })
  }

  const closeEmployeePanel = () => {
    setEmployeePanelMode(null)
    setEditingEmployee(null)
    setEditFormData({})
    setEditStatus('')
    setCreateEmployeeStatus('')
  }

  const openAddEmployeePanel = () => {
    resetNewEmployee()
    setCreateEmployeeStatus('')
    setEmployeePanelMode('add')
  }

  const handleCreateEmployee = async () => {
    if (!canWriteAdminData) {
      setCreateEmployeeStatus('Write permission is required to create employees.')
      return
    }

    if (!newEmployee.emp_code.trim() || !newEmployee.emp_full_name.trim() || !newEmployee.emp_email.trim()) {
      setCreateEmployeeStatus('Employee ID, full name, and email are required.')
      return
    }

    setCreateEmployeeLoading(true)
    setCreateEmployeeStatus('Creating employee...')

    const payload = Object.fromEntries(
      Object.entries(newEmployee)
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        .filter(([, value]) => value !== '')
    )

    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setCreateEmployeeStatus(response?.message || 'Employee created successfully.')
      resetNewEmployee()
      setEmployeePanelMode(null)
      await loadDashboard(accessToken)
    } catch (error) {
      setCreateEmployeeStatus(error instanceof Error ? error.message : 'Failed to create employee')
    } finally {
      setCreateEmployeeLoading(false)
    }
  }

  const handleEditEmployee = (employee: EmployeeRow) => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to edit employees.')
      return
    }

    setEditingEmployee(employee)
    setEditFormData({ ...employee })
    setEmployeePanelMode('edit')
    setEditStatus('')
  }

  const openEmployeeView = (employee: EmployeeRow) => setViewingEmployee(employee)
  const closeEmployeeView = () => setViewingEmployee(null)

  const downloadEmployeesTemplate = () => {
    const columns = ['emp_code', 'emp_full_name', 'emp_email', 'emp_contact', 'emp_grade', 'emp_designation', 'emp_department', 'emp_manager', 'role']
    const blob = new Blob([`${columns.join(',')}\nEMP001,Jane Doe,jane@example.com,9876543210,F,HR Executive,Human Resources,EMP001,employee\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fawnix_employees_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importEmployees = async (file: File) => {
    if (!canWriteAdminData) return
    setEmployeeImportLoading(true)
    setEmployeeImportStatus('Importing employees…')
    try {
      const text = await file.text()
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
      if (lines.length < 2) throw new Error('The CSV needs a header and at least one employee row.')
      const parse = (line: string) => line.match(/(?:[^,"]+|"(?:[^"]|"")*")+/g)?.map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"')) || []
      const headers = parse(lines[0]).map((header) => header.trim())
      const required = ['emp_code', 'emp_full_name', 'emp_email']
      const missing = required.filter((field) => !headers.includes(field))
      if (missing.length) throw new Error(`Template is missing: ${missing.join(', ')}.`)
      let created = 0
      const failed: string[] = []
      for (const [index, line] of lines.slice(1).entries()) {
        const values = parse(line)
        const row = Object.fromEntries(headers.map((header, i) => [header, (values[i] || '').trim()])) as Record<string, string>
        if (!row.emp_code && !row.emp_full_name && !row.emp_email) continue
        if (required.some((field) => !row[field])) { failed.push(`row ${index + 2}`); continue }
        try {
          await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(Object.entries(row).filter(([, value]) => value))) })
          created += 1
        } catch { failed.push(`row ${index + 2}`) }
      }
      setEmployeeImportStatus(`Imported ${created} employee${created === 1 ? '' : 's'}${failed.length ? `; ${failed.length} row${failed.length === 1 ? '' : 's'} could not be imported.` : '.'}`)
      await loadDashboard(accessToken)
    } catch (error) {
      setEmployeeImportStatus(error instanceof Error ? error.message : 'Could not import this file.')
    } finally { setEmployeeImportLoading(false) }
  }

  const handleSaveEmployee = async () => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to edit employees.')
      return
    }

    if (!editingEmployee?.emp_code) {
      setEditStatus('Employee code is required.')
      return
    }

    setEditLoading(true)
    setEditStatus('Updating employee...')

    try {
      const allowedFields = new Set([
        'emp_full_name',
        'emp_contact',
        'emp_email',
        'emp_designation',
        'emp_department',
        'emp_manager',
        'emp_grade',
        'emp_shift_id',
        'emp_joined_date'
      ])

      const payload = Object.fromEntries(
        Object.entries(editFormData).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      )

      const updatePayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => allowedFields.has(key) && value !== undefined)
      )

      const response = await apiRequest(`/api/users/${editingEmployee.emp_code}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      })

      setEditStatus(response?.message || 'Employee updated successfully.')
      closeEmployeePanel()
      await loadDashboard(accessToken)
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setEditLoading(false)
    }
  }

  const requestDeleteEmployee = (employee: EmployeeRow) => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to delete employees.')
      return
    }

    setDeleteEmployeeTarget(employee)
  }

  const handleDeleteEmployee = async () => {
    if (!canWriteAdminData) {
      setEditStatus('Write permission is required to delete employees.')
      return
    }

    if (!deleteEmployeeTarget?.emp_code) {
      return
    }

    setDeleteEmployeeLoading(true)
    setEditStatus('Deleting employee...')

    try {
      const response = await apiRequest(`/api/users/${deleteEmployeeTarget.emp_code}`, {
        method: 'DELETE'
      })

      setEditStatus(response?.message || 'Employee deleted successfully.')
      setDeleteEmployeeTarget(null)
      if (editingEmployee?.emp_code === deleteEmployeeTarget.emp_code) {
        closeEmployeePanel()
      }
      await loadDashboard(accessToken)
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setDeleteEmployeeLoading(false)
    }
  }

  const downloadEmployeesReport = async () => {
    try {
      setEmployeeExportStatus('Preparing export...')
      const params = new URLSearchParams({ format: employeeExportFormat })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/employees/report?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to export employees')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(
        response,
        `employees_${toDateInputValue(new Date())}.${employeeExportFormat}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setEmployeeExportStatus('Employees exported.')
      window.setTimeout(() => setEmployeeExportStatus(''), 2500)
    } catch (error) {
      setEmployeeExportStatus(error instanceof Error ? error.message : 'Failed to export employees')
    }
  }

  return {
    employeeSearch,
    setEmployeeSearch,
    employeeStatusFilter,
    setEmployeeStatusFilter,
    employeeKpiFilter,
    applyEmployeeKpiFilter,
    employeeStatusMenuOpen,
    setEmployeeStatusMenuOpen,
    employeeExportFormat,
    setEmployeeExportFormat,
    employeeExportStatus,
    employeeStatusMenuRef,
    filteredEmployees,
    editingEmployee,
    editFormData,
    setEditFormData,
    editLoading,
    editStatus,
    employeePanelMode,
    viewingEmployee,
    openEmployeeView,
    closeEmployeeView,
    employeeImportStatus,
    employeeImportLoading,
    importEmployees,
    downloadEmployeesTemplate,
    deleteEmployeeTarget,
    setDeleteEmployeeTarget,
    deleteEmployeeLoading,
    createEmployeeLoading,
    createEmployeeStatus,
    newEmployee,
    updateNewEmployee,
    resetNewEmployee,
    closeEmployeePanel,
    openAddEmployeePanel,
    handleCreateEmployee,
    handleEditEmployee,
    handleSaveEmployee,
    requestDeleteEmployee,
    handleDeleteEmployee,
    downloadEmployeesReport
  }
}
