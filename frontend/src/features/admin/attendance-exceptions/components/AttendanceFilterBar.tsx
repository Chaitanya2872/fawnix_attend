import { useMemo, useState } from 'react'
import type { AdminAttendanceExceptionFilterState } from '../../../../types/admin'

type Props = {
  filters: AdminAttendanceExceptionFilterState
  departmentOptions: string[]
  loading: boolean
  onClear: () => void
  updateFilter: <K extends keyof AdminAttendanceExceptionFilterState>(
    key: K,
    value: AdminAttendanceExceptionFilterState[K]
  ) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

const RANGE_PRESETS = ['All time', 'Last 30 days', 'This week', 'Last 7 days', 'This month', 'Custom range'] as const

const SORT_OPTIONS: Array<{ label: string; sortBy: string; sortOrder: 'asc' | 'desc' }> = [
  { label: 'Newest first', sortBy: 'attendance_date', sortOrder: 'desc' },
  { label: 'Oldest first', sortBy: 'attendance_date', sortOrder: 'asc' },
  { label: 'Highest severity', sortBy: 'severity', sortOrder: 'desc' },
  { label: 'Employee A–Z', sortBy: 'employee_name', sortOrder: 'asc' },
]

function toDateInputValue(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function presetRange(preset: (typeof RANGE_PRESETS)[number]): { from: string; to: string } | null {
  const today = new Date()
  const to = toDateInputValue(today)
  if (preset === 'All time') return { from: '', to: '' }
  if (preset === 'Last 7 days') {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from: toDateInputValue(from), to }
  }
  if (preset === 'Last 30 days') {
    const from = new Date(today)
    from.setDate(from.getDate() - 29)
    return { from: toDateInputValue(from), to }
  }
  if (preset === 'This week') {
    const from = new Date(today)
    const dayOfWeek = (from.getDay() + 6) % 7 // Monday-start week
    from.setDate(from.getDate() - dayOfWeek)
    return { from: toDateInputValue(from), to }
  }
  if (preset === 'This month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toDateInputValue(from), to }
  }
  return null
}

export default function AttendanceFilterBar({
  filters,
  departmentOptions,
  loading,
  onClear,
  updateFilter,
  onSort,
}: Props) {
  const [rangePreset, setRangePreset] = useState<(typeof RANGE_PRESETS)[number]>(
    filters.fromDate || filters.toDate ? 'Custom range' : 'All time'
  )

  const isCustomRange = rangePreset === 'Custom range'

  const handleRangeChange = (value: string) => {
    const preset = value as (typeof RANGE_PRESETS)[number]
    setRangePreset(preset)
    const range = presetRange(preset)
    if (range) {
      updateFilter('fromDate', range.from)
      updateFilter('toDate', range.to)
    }
  }

  const activeSortLabel = useMemo(() => {
    const match = SORT_OPTIONS.find((o) => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder)
    return match ? match.label : SORT_OPTIONS[0].label
  }, [filters.sortBy, filters.sortOrder])

  const handleSortChange = (label: string) => {
    const match = SORT_OPTIONS.find((o) => o.label === label) || SORT_OPTIONS[0]
    onSort(match.sortBy, match.sortOrder)
  }

  const isFiltered = useMemo(
    () =>
      Boolean(
        filters.search.trim() ||
        filters.department.trim() ||
        filters.exceptionType ||
        filters.status ||
        filters.fromDate ||
        filters.toDate
      ),
    [filters]
  )

  const handleClear = () => {
    setRangePreset('All time')
    onClear()
  }

  return (
    <div className="exc-filter-bar" role="search" aria-label="Attendance exception filters">
      <input
        id="exc-search"
        className="exc-filter-search"
        type="search"
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder="Search name, code or reason"
        aria-label="Search name, code or reason"
      />

      <select
        className="exc-filter-select"
        value={filters.department}
        onChange={(event) => updateFilter('department', event.target.value)}
        disabled={loading}
        aria-label="Department"
      >
        <option value="">All departments</option>
        {departmentOptions.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>

      <select
        className="exc-filter-select"
        value={rangePreset}
        onChange={(event) => handleRangeChange(event.target.value)}
        disabled={loading}
        aria-label="Date range"
      >
        {RANGE_PRESETS.map((preset) => (
          <option key={preset} value={preset}>{preset}</option>
        ))}
      </select>

      {isCustomRange && (
        <div className="exc-daterange">
          <span>From</span>
          <input
            id="exc-from"
            type="date"
            value={filters.fromDate}
            onChange={(event) => updateFilter('fromDate', event.target.value)}
            aria-label="From date"
          />
          <span className="exc-daterange__sep" aria-hidden="true" />
          <span>To</span>
          <input
            id="exc-to"
            type="date"
            value={filters.toDate}
            onChange={(event) => updateFilter('toDate', event.target.value)}
            aria-label="To date"
          />
        </div>
      )}

      <select
        className="exc-filter-select"
        value={activeSortLabel}
        onChange={(event) => handleSortChange(event.target.value)}
        disabled={loading}
        aria-label="Sort"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.label} value={option.label}>{option.label}</option>
        ))}
      </select>

      {isFiltered && (
        <button type="button" className="exc-filter-clear-link" onClick={handleClear} disabled={loading}>
          Clear all
        </button>
      )}
    </div>
  )
}