import { useMemo, useState } from 'react'
import { EMPLOYEE_MASTER_STATUS_OPTIONS } from './employeeMasterConfig'
import './AdminEmployeeMasterPage.css'
import type {
  EmployeeMasterFilterOptionEntry,
  EmployeeMasterFilterOptions,
  EmployeeMasterFilterState,
  EmployeeMasterPagination,
  EmployeeMasterRecord,
  EmployeeMasterResourceConfig,
} from '../../../types/admin'

type EmployeeMasterFormState = {
  mode: 'create' | 'edit'
  record: EmployeeMasterRecord | null
  values: Record<string, string>
  errors: Record<string, string>
}

type SelectOption = {
  value: string
  label: string
}

type AdminEmployeeMasterPageProps = {
  actionLoading: boolean
  actionStatus: string
  canWriteAdminData: boolean
  error: string
  filterOptions: EmployeeMasterFilterOptions
  filters: EmployeeMasterFilterState
  lastSyncedAt: Date | null
  loading: boolean
  pagination: EmployeeMasterPagination
  records: EmployeeMasterRecord[]
  resource: EmployeeMasterResourceConfig
  applyFilters: () => void
  changePage: (page: number) => void
  clearFilters: () => void
  createRecord: (payload: Record<string, string>) => Promise<void>
  deleteRecord: (recordId: string | number) => Promise<void>
  refresh: () => void
  updateFilter: <K extends keyof EmployeeMasterFilterState>(
    key: K,
    value: EmployeeMasterFilterState[K]
  ) => void
  updateRecord: (recordId: string | number, payload: Record<string, string>) => Promise<void>
}

function stringifyValue(value: unknown) {
  if (value == null) {
    return ''
  }

  return String(value)
}

function formatStatusLabel(value: string) {
  if (!value) {
    return 'Unknown'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getStatusTone(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'active' || normalized === 'enabled') {
    return 'active'
  }
  if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'archived') {
    return 'inactive'
  }
  return 'accent'
}

function getOptionValueAndLabel(option: EmployeeMasterFilterOptionEntry): SelectOption | null {
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option)
    return value ? { value, label: formatStatusLabel(value) } : null
  }

  const rawValue = option.value ?? option.code ?? option.id ?? option.name ?? option.label
  const value = stringifyValue(rawValue).trim()
  if (!value) {
    return null
  }

  return {
    value,
    label: stringifyValue(option.label ?? option.name ?? option.code ?? rawValue) || value,
  }
}

function uniqueOptions(options: Array<SelectOption | null>) {
  const seen = new Set<string>()
  const nextOptions: SelectOption[] = []

  options.forEach((option) => {
    if (!option || seen.has(option.value)) {
      return
    }
    seen.add(option.value)
    nextOptions.push(option)
  })

  return nextOptions
}

function getOptionsFromFilterData(
  optionKey: string,
  filterOptions: EmployeeMasterFilterOptions,
  records: EmployeeMasterRecord[],
  recordField?: string,
  leadingOptions: SelectOption[] = []
) {
  const backendOptions = filterOptions[optionKey] || []
  const rowOptions = recordField
    ? records.map((record) => {
        const value = stringifyValue(record[recordField]).trim()
        return value ? { value, label: value } : null
      })
    : []

  return uniqueOptions([
    ...leadingOptions,
    ...backendOptions.map(getOptionValueAndLabel),
    ...rowOptions,
  ])
}

function getRecordId(record: EmployeeMasterRecord, resource: EmployeeMasterResourceConfig): string | number | null {
  const value = record.id ?? record[resource.codeField]
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

function getDisplayName(record: EmployeeMasterRecord, resource: EmployeeMasterResourceConfig) {
  return stringifyValue(record[resource.nameField] || record[resource.codeField] || record.id || resource.singularLabel)
}

function buildFormValues(resource: EmployeeMasterResourceConfig, record?: EmployeeMasterRecord | null) {
  return resource.formFields.reduce<Record<string, string>>((values, field) => {
    const existingValue = record ? stringifyValue(record[field.key]) : ''
    values[field.key] = field.key === 'status' && !existingValue ? 'active' : existingValue
    return values
  }, {})
}

function buildPayload(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()])
  )
}

function validateForm(resource: EmployeeMasterResourceConfig, values: Record<string, string>) {
  const errors: Record<string, string> = {}
  resource.formFields.forEach((field) => {
    if (field.required && !values[field.key]?.trim()) {
      errors[field.key] = `${field.label} is required.`
    }
  })
  return errors
}

function truncate(value: unknown, maxLength = 64) {
  const text = stringifyValue(value).trim()
  if (!text) {
    return '--'
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text
}

function DataListInput({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  options: SelectOption[]
  placeholder?: string
  onChange: (value: string) => void
}) {
  const listId = `${id}-options`
  return (
    <>
      <input
        id={id}
        list={options.length ? listId : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {options.length ? (
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      ) : null}
    </>
  )
}

export default function AdminEmployeeMasterPage({
  actionLoading,
  actionStatus,
  canWriteAdminData,
  error,
  filterOptions,
  filters,
  lastSyncedAt,
  loading,
  pagination,
  records,
  resource,
  applyFilters,
  changePage,
  clearFilters,
  createRecord,
  deleteRecord,
  refresh,
  updateFilter,
  updateRecord,
}: AdminEmployeeMasterPageProps) {
  const [formPanel, setFormPanel] = useState<EmployeeMasterFormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeMasterRecord | null>(null)

  const activeOnPage = records.filter(
    (record) => stringifyValue(record.status).toLowerCase() === 'active'
  ).length
  const inactiveOnPage = records.filter(
    (record) => stringifyValue(record.status).toLowerCase() === 'inactive'
  ).length
  const rangeStart = records.length ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const rangeEnd = rangeStart ? rangeStart + records.length - 1 : 0
  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not synced'
  const statusOptions = useMemo(
    () =>
      getOptionsFromFilterData('statuses', filterOptions, records, 'status', EMPLOYEE_MASTER_STATUS_OPTIONS),
    [filterOptions, records]
  )

  const openCreatePanel = () => {
    setFormPanel({
      mode: 'create',
      record: null,
      values: buildFormValues(resource),
      errors: {},
    })
  }

  const openEditPanel = (record: EmployeeMasterRecord) => {
    setFormPanel({
      mode: 'edit',
      record,
      values: buildFormValues(resource, record),
      errors: {},
    })
  }

  const updateFormValue = (key: string, value: string) => {
    setFormPanel((current) =>
      current
        ? {
            ...current,
            values: { ...current.values, [key]: value },
            errors: { ...current.errors, [key]: '' },
          }
        : current
    )
  }

  const submitForm = async () => {
    if (!formPanel) {
      return
    }

    const errors = validateForm(resource, formPanel.values)
    if (Object.keys(errors).length) {
      setFormPanel({ ...formPanel, errors })
      return
    }

    const payload = buildPayload(formPanel.values)

    try {
      if (formPanel.mode === 'create') {
        await createRecord(payload)
      } else {
        const recordId = formPanel.record ? getRecordId(formPanel.record, resource) : null
        if (recordId == null) {
          setFormPanel({
            ...formPanel,
            errors: { _form: `${resource.singularLabel} id is unavailable.` },
          })
          return
        }
        await updateRecord(recordId, payload)
      }
      setFormPanel(null)
    } catch {
      // The hook owns the user-facing action status.
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    const recordId = getRecordId(deleteTarget, resource)
    if (recordId == null) {
      return
    }

    try {
      await deleteRecord(recordId)
      setDeleteTarget(null)
    } catch {
      // The hook owns the user-facing action status.
    }
  }

  return (
    <div className="admin-aligned-page admin-aligned-page--employee-master">
      <div className="em-header dashboard-section-head">
        <div className="em-header__copy">
          <p className="adm-eyebrow">Administration / Employee Master</p>
          <h1 className="adm-heading">{resource.title}</h1>
          <p className="em-subtitle">
            Maintain the reference records that organize employees, payroll, reporting lines, and departments.
          </p>
        </div>

        <div className="em-header__actions">
          {!canWriteAdminData ? <span className="em-readonly-pill">Read only</span> : null}
          {canWriteAdminData ? (
            <button className="adm-btn adm-btn--primary" type="button" onClick={openCreatePanel}>
              <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Add {resource.singularLabel}
            </button>
          ) : null}
          <button
            className="adm-btn adm-btn--icon"
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label={`Refresh ${resource.title}`}
          >
            <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4M4 8v4h4M16 12h4v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <section className="adm-stats-strip em-stats-strip" aria-label={`${resource.title} summary`}>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 19V7l8-4 8 4v12M4 11h16M9 19v-4h6v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Total Records</p>
            <strong className="adm-stat-value">{pagination.total_records.toLocaleString()}</strong>
            <span className="adm-stat-caption">{records.length.toLocaleString()} loaded on this page</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Active On Page</p>
            <strong className="adm-stat-value">{activeOnPage.toLocaleString()}</strong>
            <span className="adm-stat-caption">{inactiveOnPage.toLocaleString()} inactive on page</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Filters</p>
            <strong className="adm-stat-value">{resource.filters.length + 2}</strong>
            <span className="adm-stat-caption">Search, status, and resource filters</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Last Sync</p>
            <strong className="adm-stat-value em-sync-value">{syncedLabel}</strong>
            <span className="adm-stat-caption">{loading ? 'Refreshing now' : 'Using admin API'}</span>
          </div>
        </div>
      </section>

      {actionStatus ? <div className="adm-status-line em-status-line" role="status">{actionStatus}</div> : null}

      <form
        className="em-filter-bar"
        onSubmit={(event) => {
          event.preventDefault()
          applyFilters()
        }}
      >
        <label className="em-filter-field em-filter-field--search" htmlFor="employee-master-search">
          <span>Search</span>
          <input
            id="employee-master-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder={`Search ${resource.title.toLowerCase()}`}
          />
        </label>

        <label className="em-filter-field" htmlFor="employee-master-status-filter">
          <span>Status</span>
          <select
            id="employee-master-status-filter"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="em-filter-field" htmlFor="employee-master-page-size">
          <span>Rows</span>
          <select
            id="employee-master-page-size"
            value={filters.pageSize}
            onChange={(event) => updateFilter('pageSize', event.target.value)}
          >
            {['10', '15', '25', '50'].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>

        {resource.filters.map((filter) => {
          const options = getOptionsFromFilterData(
            filter.optionKey,
            filterOptions,
            records,
            filter.recordField
          )
          const fieldId = `employee-master-filter-${filter.stateKey}`
          return (
            <label className="em-filter-field" htmlFor={fieldId} key={filter.stateKey}>
              <span>{filter.label}</span>
              {options.length ? (
                <select
                  id={fieldId}
                  value={filters[filter.stateKey]}
                  onChange={(event) => updateFilter(filter.stateKey, event.target.value)}
                >
                  <option value="">All {filter.label.toLowerCase()}</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={fieldId}
                  value={filters[filter.stateKey]}
                  onChange={(event) => updateFilter(filter.stateKey, event.target.value)}
                  placeholder={`Filter ${filter.label.toLowerCase()}`}
                />
              )}
            </label>
          )
        })}

        <div className="em-filter-actions">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={loading}>
            Apply
          </button>
          <button className="adm-btn" type="button" onClick={clearFilters} disabled={loading}>
            Clear
          </button>
        </div>
      </form>

      <div className="adm-table-card table-card em-table-card">
        <div className="adm-table-toolbar em-table-toolbar">
          <div className="adm-table-title">
            <strong>{resource.title}</strong>
            <span>
              {records.length
                ? `Showing ${rangeStart.toLocaleString()}-${rangeEnd.toLocaleString()} of ${pagination.total_records.toLocaleString()}`
                : 'No rows loaded'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="adm-empty empty-state em-state">
            <span className="em-spinner" aria-hidden="true" />
            <strong>Loading {resource.title.toLowerCase()}</strong>
            <span>Fetching the latest master records.</span>
          </div>
        ) : error ? (
          <div className="adm-empty empty-state em-state">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
              <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>{resource.title} did not load.</strong>
            <span>{error}</span>
            <button className="adm-btn" type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : records.length ? (
          <>
            <div className="adm-table-scroll table-scroll em-table-scroll">
              <table className="adm-table dashboard-table em-table" aria-label={resource.title}>
                <thead>
                  <tr>
                    {resource.tableColumns.map((column) => (
                      <th key={column.key} style={column.minWidth ? { minWidth: column.minWidth } : undefined}>
                        {column.label}
                      </th>
                    ))}
                    {canWriteAdminData ? <th className="em-actions-th">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    const rowKey = stringifyValue(getRecordId(record, resource) ?? index)
                    const displayName = getDisplayName(record, resource)
                    return (
                      <tr className="adm-row em-row" key={rowKey}>
                        {resource.tableColumns.map((column) => {
                          const value = stringifyValue(record[column.key])

                          if (column.kind === 'primary') {
                            const code = stringifyValue(record[resource.codeField])
                            return (
                              <td key={column.key}>
                                <span className="adm-cell-primary">{value || '--'}</span>
                                <span className="adm-cell-meta">{code || 'Code unavailable'}</span>
                              </td>
                            )
                          }

                          if (column.kind === 'status') {
                            return (
                              <td key={column.key}>
                                <span className={`adm-pill table-pill adm-pill--${getStatusTone(value)}`}>
                                  {formatStatusLabel(value)}
                                </span>
                              </td>
                            )
                          }

                          if (column.kind === 'code') {
                            return (
                              <td key={column.key}>
                                <span className="adm-code em-code">{value || '--'}</span>
                              </td>
                            )
                          }

                          return (
                            <td key={column.key} title={value}>
                              <span className="adm-cell-secondary">{truncate(value)}</span>
                            </td>
                          )
                        })}
                        {canWriteAdminData ? (
                          <td>
                            <div className="adm-actions em-actions">
                              <button
                                className="adm-action-btn adm-action-btn--view"
                                type="button"
                                onClick={() => openEditPanel(record)}
                                disabled={actionLoading}
                                aria-label={`Edit ${displayName}`}
                              >
                                Edit
                              </button>
                              <button
                                className="adm-action-btn adm-action-btn--delete"
                                type="button"
                                onClick={() => setDeleteTarget(record)}
                                disabled={actionLoading}
                                aria-label={`Delete ${displayName}`}
                              >
                                <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="em-pagination">
              <strong>
                Page {pagination.page.toLocaleString()} of {Math.max(pagination.total_pages, 1).toLocaleString()}
              </strong>
              <div className="em-pagination__actions">
                <button
                  className="adm-btn"
                  type="button"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={!pagination.has_previous || loading}
                >
                  Previous
                </button>
                <button
                  className="adm-btn"
                  type="button"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="adm-empty empty-state em-state">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
              <path d="M4 19V7l8-4 8 4v12M4 11h16M9 19v-4h6v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>No {resource.title.toLowerCase()} found</strong>
            <span>Adjust filters or add a new {resource.singularLabel.toLowerCase()}.</span>
          </div>
        )}
      </div>

      {formPanel ? (
        <>
          <button
            className="side-panel-scrim"
            type="button"
            aria-label={`Close ${resource.singularLabel} panel`}
            onClick={() => setFormPanel(null)}
          />
          <aside
            className="field-visit-panel employee-form-panel em-form-panel"
            aria-label={`${formPanel.mode === 'create' ? 'Add' : 'Edit'} ${resource.singularLabel}`}
          >
            <div className="field-visit-panel-head employee-panel-head em-panel-head">
              <div>
                <span>Employee Master</span>
                <h3>{formPanel.mode === 'create' ? `Add ${resource.singularLabel}` : `Edit ${resource.singularLabel}`}</h3>
                <p className="employee-panel-copy">
                  Mandatory fields are marked before saving to the admin API.
                </p>
              </div>
              <button className="field-visit-panel-close" onClick={() => setFormPanel(null)} type="button">
                Close
              </button>
            </div>

            <form
              className="form-card employee-form-card em-form-card"
              onSubmit={(event) => {
                event.preventDefault()
                void submitForm()
              }}
            >
              <div className="form-grid employee-form-grid em-form-grid">
                {resource.formFields.map((field) => {
                  const fieldId = `em-${resource.key}-${field.key}`
                  const fieldOptions = field.optionKey
                    ? getOptionsFromFilterData(field.optionKey, filterOptions, records, field.key)
                    : []
                  const errorMessage = formPanel.errors[field.key]

                  return (
                    <div className={`em-field${errorMessage ? ' em-field--error' : ''}`} key={field.key}>
                      <label htmlFor={fieldId}>
                        {field.label}
                        {field.required ? <span className="em-required" aria-label="required">*</span> : null}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={fieldId}
                          value={formPanel.values[field.key] || ''}
                          onChange={(event) => updateFormValue(field.key, event.target.value)}
                        >
                          <option value="">Select {field.label.toLowerCase()}</option>
                          {(field.options || []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          id={fieldId}
                          value={formPanel.values[field.key] || ''}
                          onChange={(event) => updateFormValue(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          rows={4}
                        />
                      ) : (
                        <DataListInput
                          id={fieldId}
                          value={formPanel.values[field.key] || ''}
                          options={fieldOptions}
                          placeholder={field.placeholder}
                          onChange={(value) => updateFormValue(field.key, value)}
                        />
                      )}
                      {errorMessage ? <span className="em-field-error">{errorMessage}</span> : null}
                    </div>
                  )
                })}
              </div>
              {formPanel.errors._form ? <p className="form-note em-form-error">{formPanel.errors._form}</p> : null}
              {actionStatus ? <p className="form-note">{actionStatus}</p> : null}
              <div className="form-actions employee-panel-actions em-panel-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setFormPanel(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="cta" type="submit" disabled={actionLoading}>
                  {formPanel.mode === 'create' ? `Create ${resource.singularLabel}` : 'Save Changes'}
                </button>
              </div>
            </form>
          </aside>
        </>
      ) : null}

      {deleteTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="em-delete-title">
          <div className="modal-card delete-modal-card em-delete-modal">
            <div className="modal-header">
              <strong id="em-delete-title">Delete {resource.singularLabel}</strong>
              <button className="ghost" onClick={() => setDeleteTarget(null)} type="button">
                Close
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-modal-copy">
                Are you sure you want to delete {getDisplayName(deleteTarget, resource)}? This action cannot be undone.
              </p>
              <div className="delete-modal-summary">
                <strong>{stringifyValue(deleteTarget[resource.codeField]) || 'Code unavailable'}</strong>
                <span>{stringifyValue(deleteTarget[resource.nameField]) || resource.singularLabel}</span>
              </div>
              {actionStatus ? <p className="form-note">{actionStatus}</p> : null}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setDeleteTarget(null)} disabled={actionLoading} type="button">
                Cancel
              </button>
              <button className="danger" onClick={() => void confirmDelete()} disabled={actionLoading} type="button">
                Delete {resource.singularLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
