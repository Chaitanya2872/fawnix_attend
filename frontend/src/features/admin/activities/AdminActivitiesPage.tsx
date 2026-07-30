import { useMemo, useState } from 'react'
import type { ActivityRow } from '../../../types/admin'
import './AdminActivitiesPage.css'

const ALL_FILTER_VALUE = 'all'

type ActivityFilterOption = {
  label: string
  value: string
}

type Props = {
  filteredActivities: ActivityRow[]
  formatDateTime: (value?: string) => string
  loadDashboard: () => void | Promise<void>
  setShowTodayActivities: (value: boolean | ((current: boolean) => boolean)) => void
  showTodayActivities: boolean
}

function normalizeFilterValue(value?: string) {
  return (value || '').trim()
}

function getFilterKey(value?: string) {
  return normalizeFilterValue(value).toLowerCase()
}

function formatActivityText(value?: string) {
  const rawValue = normalizeFilterValue(value)
  if (!rawValue) {
    return 'Unknown'
  }

  return rawValue
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildActivityOptions(rows: ActivityRow[], getValue: (row: ActivityRow) => string | undefined) {
  const optionsByKey = new Map<string, ActivityFilterOption>()

  rows.forEach((row) => {
    const value = normalizeFilterValue(getValue(row))
    if (!value) {
      return
    }

    const key = getFilterKey(value)
    if (!optionsByKey.has(key)) {
      optionsByKey.set(key, {
        label: formatActivityText(value),
        value
      })
    }
  })

  return Array.from(optionsByKey.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
  )
}

function getActivitySearchText(row: ActivityRow, formatDateTime: (value?: string) => string) {
  return [
    row.employee_name,
    row.employee_email,
    row.activity_type,
    row.status,
    row.start_time,
    formatDateTime(row.start_time)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getActivityStatusPillClass(status?: string) {
  const normalizedStatus = getFilterKey(status)

  if (normalizedStatus.includes('complete') || normalizedStatus.includes('approved') || normalizedStatus === 'done') {
    return 'table-pill success'
  }

  if (normalizedStatus.includes('pending') || normalizedStatus.includes('progress') || normalizedStatus.includes('open')) {
    return 'table-pill warning'
  }

  if (normalizedStatus.includes('reject') || normalizedStatus.includes('cancel') || normalizedStatus.includes('fail')) {
    return 'table-pill danger'
  }

  return 'table-pill accent'
}

export default function AdminActivitiesPage({
  filteredActivities,
  formatDateTime,
  loadDashboard,
  setShowTodayActivities,
  showTodayActivities
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState(ALL_FILTER_VALUE)
  const [activityStatusFilter, setActivityStatusFilter] = useState(ALL_FILTER_VALUE)
  const normalizedSearch = searchQuery.trim().toLowerCase()

  const activityTypeOptions = useMemo(
    () => buildActivityOptions(filteredActivities, (row) => row.activity_type),
    [filteredActivities]
  )
  const activityStatusOptions = useMemo(
    () => buildActivityOptions(filteredActivities, (row) => row.status),
    [filteredActivities]
  )

  const visibleActivities = useMemo(
    () =>
      filteredActivities.filter((row) => {
        const matchesSearch = !normalizedSearch || getActivitySearchText(row, formatDateTime).includes(normalizedSearch)
        const matchesType =
          activityTypeFilter === ALL_FILTER_VALUE || getFilterKey(row.activity_type) === getFilterKey(activityTypeFilter)
        const matchesStatus =
          activityStatusFilter === ALL_FILTER_VALUE || getFilterKey(row.status) === getFilterKey(activityStatusFilter)

        return matchesSearch && matchesType && matchesStatus
      }),
    [activityStatusFilter, activityTypeFilter, filteredActivities, formatDateTime, normalizedSearch]
  )
  const filtersActive =
    Boolean(normalizedSearch) ||
    activityTypeFilter !== ALL_FILTER_VALUE ||
    activityStatusFilter !== ALL_FILTER_VALUE

  const clearActivityFilters = () => {
    setSearchQuery('')
    setActivityTypeFilter(ALL_FILTER_VALUE)
    setActivityStatusFilter(ALL_FILTER_VALUE)
  }

  const toggleActivityDateScope = () => {
    clearActivityFilters()
    setShowTodayActivities((current: boolean) => !current)
  }

  return (
    <div className="admin-aligned-page admin-aligned-page--activities">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Live Work</p>
          <h2>Activities</h2>
        </div>
        <div className="employee-actions">
          <button
            className="ghost dashboard-button"
            onClick={toggleActivityDateScope}
            type="button"
          >
            {showTodayActivities ? 'Show All' : 'Show Today'}
          </button>
          <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="leave-filter-card activity-filter-card">
        <div className="leave-filter-head">
          <div>
            <strong>Filter Activity Records</strong>
            <span>Search the current activity view by employee, email, activity, status, or start time.</span>
          </div>
          <div className="activity-filter-meta">
            <span className="leave-filter-count">
              {visibleActivities.length} of {filteredActivities.length} shown
            </span>
            {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
          </div>
        </div>

        <div className="activity-filter-grid">
          <label className="leave-filter-field activity-filter-search">
            <span>Search</span>
            <input
              aria-label="Search activities"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Employee, email, status, start time..."
            />
          </label>

          <label className="leave-filter-field">
            <span>Activity Type</span>
            <select
              aria-label="Filter activity type"
              value={activityTypeFilter}
              onChange={(event) => setActivityTypeFilter(event.target.value)}
            >
              <option value={ALL_FILTER_VALUE}>All types</option>
              {activityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="leave-filter-field">
            <span>Status</span>
            <select
              aria-label="Filter activity status"
              value={activityStatusFilter}
              onChange={(event) => setActivityStatusFilter(event.target.value)}
            >
              <option value={ALL_FILTER_VALUE}>All statuses</option>
              {activityStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="leave-filter-actions activity-filter-actions">
          <span className="leave-filter-status">
            {filtersActive ? 'Client-side filters are active for this view.' : 'Showing the current activity view.'}
          </span>
          <button
            className="ghost dashboard-button"
            type="button"
            onClick={clearActivityFilters}
            disabled={!filtersActive}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="activity-table-head">
          <div>
            <strong>Activity Log</strong>
            <span>
              {visibleActivities.length} record{visibleActivities.length === 1 ? '' : 's'} in{' '}
              {showTodayActivities ? "today's view" : 'all activity records'}
            </span>
          </div>
          {filtersActive ? <span className="table-pill accent">Filtered</span> : null}
        </div>

        {visibleActivities.length ? (
          <div className="table-scroll">
            <table className="dashboard-table activity-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Activity</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleActivities.map((row, index) => (
                  <tr key={`${row.id || row.employee_email || index}`}>
                    <td>
                      <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                      <span className="table-meta">{row.employee_email || 'Email unavailable'}</span>
                    </td>
                    <td>{formatActivityText(row.activity_type || 'Activity')}</td>
                    <td>{formatDateTime(row.start_time)}</td>
                    <td>
                      <span className={getActivityStatusPillClass(row.status)}>{formatActivityText(row.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            {filtersActive
              ? 'No activities match the current filters.'
              : showTodayActivities
                ? 'No activities found for today.'
                : 'No activities found.'}
          </div>
        )}
      </div>
    </div>
  )
}
