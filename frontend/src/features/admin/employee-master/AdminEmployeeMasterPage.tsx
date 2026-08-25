import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { EMPLOYEE_MASTER_STATUS_OPTIONS } from './employeeMasterConfig'
import LocationPicker from './LocationPicker'
import { useDialogFocus } from '../hooks/useDialogFocus'
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
  /** Filters the current rows were fetched with, for an accurate empty state. */
  appliedFilters: EmployeeMasterFilterState
  lastSyncedAt: Date | null
  loading: boolean
  pagination: EmployeeMasterPagination
  records: EmployeeMasterRecord[]
  resource: EmployeeMasterResourceConfig
  /** Every master list reachable from this page, rendered as tabs. */
  resources: EmployeeMasterResourceConfig[]
  onSelectResource: (sidebarId: EmployeeMasterResourceConfig['sidebarId']) => void
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
  createRequestId?: number
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
  type = 'text',
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string
  type?: 'text' | 'number' | 'date'
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
        type={type}
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
  appliedFilters,
  lastSyncedAt,
  loading,
  pagination,
  records,
  resource,
  resources,
  onSelectResource,
  applyFilters,
  changePage,
  clearFilters,
  createRecord,
  deleteRecord,
  refresh,
  updateFilter,
  updateRecord,
  createRequestId = 0,
}: AdminEmployeeMasterPageProps) {
  const [formPanel, setFormPanel] = useState<EmployeeMasterFormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeMasterRecord | null>(null)
  const handledCreateRequestId = useRef(0)
  const formPanelRef = useRef<HTMLElement | null>(null)

  useDialogFocus({
    containerRef: formPanelRef,
    open: Boolean(formPanel),
    onClose: () => setFormPanel(null),
  })

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

  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const narrowedByFilters =
    Boolean(appliedFilters.search.trim()) ||
    Boolean(appliedFilters.status) ||
    resource.filters.some((filter) => String(appliedFilters[filter.stateKey] || '').trim() !== '')
  const activeExtraFilterCount = resource.filters.filter(
    (filter) => String(filters[filter.stateKey] || '').trim() !== ''
  ).length

  // No reset needed when switching tabs: the page is keyed on resource.key in
  // FawnixApp, so each tab mounts fresh with the extra filters collapsed.

  const openCreatePanel = () => {
    setFormPanel({
      mode: 'create',
      record: null,
      values: buildFormValues(resource),
      errors: {},
    })
  }

  useEffect(() => {
    if (!createRequestId || handledCreateRequestId.current === createRequestId) {
      return
    }

    handledCreateRequestId.current = createRequestId
    if (!canWriteAdminData) {
      return
    }

    setFormPanel({
      mode: 'create',
      record: null,
      values: buildFormValues(resource),
      errors: {},
    })
  }, [canWriteAdminData, createRequestId, resource])

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

  const renderTableState = () => {
    // Only take the table over on a cold load. A refresh that already has rows
    // keeps them on screen -- swapping them for a spinner on every refetch is
    // what makes the page look like it is perpetually loading.
    if (loading && records.length === 0) {
      return (
            <div className="em-table-message">
              <span className="em-spinner" aria-hidden="true" />
              <strong>Loading {resource.title.toLowerCase()}</strong>
              <span>Fetching the latest master records.</span>
            </div>
      )
    }

    if (error) {
      return (
            <div className="em-table-message">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <strong>{resource.title} did not load.</strong>
              <span>{error}</span>
              <button className="adm-btn" type="button" onClick={refresh}>
                Try again
              </button>
            </div>
      )
    }

    if (!records.length) {
      return narrowedByFilters ? (
              <div className="em-table-message em-table-message--empty">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                  <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <strong>No {resource.tabLabel.toLowerCase()} match these filters</strong>
                <span>
                  {appliedFilters.search.trim()
                    ? `Nothing found for “${appliedFilters.search.trim()}”. Try a different term or clear the filters.`
                    : 'Every record was filtered out. Widen or clear the filters to see more.'}
                </span>
                <button className="adm-btn" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="em-table-message em-table-message--empty">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                  <path d="M4 20V8l8-4 8 4v12M4 20h16M9 20v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <strong>No {resource.tabLabel.toLowerCase()} yet</strong>
                <span>
                  {canWriteAdminData
                    ? `Add your first ${resource.singularLabel.toLowerCase()} to start organizing employees against it.`
                    : `No ${resource.tabLabel.toLowerCase()} have been set up yet. Ask an administrator to add one.`}
                </span>
                {canWriteAdminData ? (
                  <button className="adm-btn adm-btn--primary" type="button" onClick={openCreatePanel}>
                    Add {resource.singularLabel}
                  </button>
                ) : null}
              </div>
      )
    }

    return null
  }

  const renderRows = () => {
    return records.map((record, index) => {
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
    })
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

  const applyResolvedAddress = (parts: Record<string, string | undefined>) => {
    setFormPanel((current) => {
      if (!current) return current
      const values = { ...current.values }
      const keys: Record<string, string | undefined> = {
        city: parts.city,
        state: parts.state,
        country: parts.country,
        pincode: parts.pincode,
      }
      for (const [key, value] of Object.entries(keys)) {
        // Only fill gaps -- never overwrite something already typed.
        if (value && !String(values[key] || '').trim()) {
          values[key] = value
        }
      }
      return { ...current, values }
    })
  }

  const tableState = renderTableState()

  return (
    <div className="admin-aligned-page admin-aligned-page--employee-master">
      <div className="em-header dashboard-section-head">
        <div className="em-header__copy">
          <p className="adm-eyebrow">Administration</p>
          <h1 className="adm-heading">Organization</h1>
          <p className="em-subtitle">
            Maintain the reference records that organize employees, payroll, reporting lines, and departments.
          </p>
          <div className="adm-tabs" role="tablist" aria-label="Organization records">
            {resources.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={entry.key === resource.key}
                className={`adm-tab${entry.key === resource.key ? ' adm-tab--active' : ''}`}
                onClick={() => onSelectResource(entry.sidebarId)}
              >
                {entry.tabLabel}
              </button>
            ))}
          </div>
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

        {resource.filters.length > 0 ? (
        <button
          type="button"
          className={`em-filter-more${activeExtraFilterCount ? ' em-filter-more--active' : ''}`}
          onClick={() => setShowMoreFilters((current) => !current)}
          aria-expanded={showMoreFilters}
        >
          <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {showMoreFilters ? 'Fewer filters' : 'More filters'}
          {activeExtraFilterCount ? <em>{activeExtraFilterCount}</em> : null}
        </button>
        ) : null}

        <div className="em-filter-actions">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={loading}>
            Apply
          </button>
          <button className="adm-btn" type="button" onClick={clearFilters} disabled={loading}>
            Clear
          </button>
        </div>

        <div className={`em-filter-extra${showMoreFilters ? ' em-filter-extra--open' : ''}`}>
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
                  <option value="">Any {filter.label.toLowerCase()}</option>
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

        <div className="adm-table-scroll table-scroll em-table-scroll" hidden={Boolean(tableState)}>
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
            <tbody>{renderRows()}</tbody>
          </table>
        </div>

        {tableState ? <div className="em-table-state">{tableState}</div> : null}

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
            ref={formPanelRef}
            role="dialog"
            aria-modal="true"
            className="field-visit-panel employee-form-panel em-form-panel"
            aria-label={`${formPanel.mode === 'create' ? 'Add' : 'Edit'} ${resource.singularLabel}`}
          >
            <div className="field-visit-panel-head employee-panel-head em-panel-head">
              <div>
                <span>Organization</span>
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

                  const showPickerAfter =
                    resource.hasLocationPicker && field.key === 'geofence_radius'

                  return (
                    <Fragment key={field.key}>
                    <div className={`em-field${errorMessage ? ' em-field--error' : ''}`}>
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
                          type={field.inputType}
                          value={formPanel.values[field.key] || ''}
                          options={fieldOptions}
                          placeholder={field.placeholder}
                          onChange={(value) => updateFormValue(field.key, value)}
                        />
                      )}
                      {errorMessage ? <span className="em-field-error">{errorMessage}</span> : null}
                    </div>
                    {showPickerAfter ? (
                      <div className="em-field em-field--full">
                        <label>Pin the location</label>
                        <LocationPicker
                          latitude={formPanel.values.latitude || ''}
                          longitude={formPanel.values.longitude || ''}
                          geofenceRadius={formPanel.values.geofence_radius || ''}
                          addressHint={
                            [formPanel.values.address, formPanel.values.city, formPanel.values.state]
                              .filter((part) => String(part || '').trim())
                              .join(', ') || undefined
                          }
                          onChange={(next) => {
                            updateFormValue('latitude', next.latitude)
                            updateFormValue('longitude', next.longitude)
                          }}
                          onResolveAddress={applyResolvedAddress}
                        />
                      </div>
                    ) : null}
                    </Fragment>
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
