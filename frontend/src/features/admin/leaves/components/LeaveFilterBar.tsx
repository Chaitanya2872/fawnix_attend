import { useMemo, useState } from 'react'
import AttendanceDatePicker from '../../../../components/AttendanceDatePicker'
import type { AdminLeaveFilterState } from '../../../../types/admin'

type Props = {
  filters: AdminLeaveFilterState
  departmentOptions: string[]
  managerOptions: Array<{ code: string; name: string }>
  loading: boolean
  onClear: () => void
  updateFilter: <K extends keyof AdminLeaveFilterState>(
    key: K,
    value: AdminLeaveFilterState[K]
  ) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

const RANGE_PRESETS = ['All time', 'This week', 'Last 7 days', 'Last 30 days', 'This month', 'Custom range'] as const

const SORT_OPTIONS: Array<{ label: string; sortBy: string; sortOrder: 'asc' | 'desc' }> = [
  { label: 'Newest first', sortBy: 'applied_at', sortOrder: 'desc' },
  { label: 'Oldest first', sortBy: 'applied_at', sortOrder: 'asc' },
  { label: 'Most days', sortBy: 'leave_count', sortOrder: 'desc' },
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

export default function LeaveFilterBar({
  filters,
  departmentOptions,
  managerOptions,
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
          filters.manager.trim() ||
          filters.leaveType ||
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
    <div className="lv-filter-bar" aria-label="Leave request filters">
      <div className="lv-filter-grid">
        <div className="attendance-filter attendance-filter-search lv-filter-search">
          <label htmlFor="lv-search">Search</label>
          <div className="attendance-input-shell attendance-search-shell">
            <input
              id="lv-search"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search employee, code or manager"
            />
          </div>
        </div>

        <label className="attendance-filter attendance-filter-compact">
          <span>Department</span>
          <select value={filters.department} onChange={(event) => updateFilter('department', event.target.value)} disabled={loading}>
            <option value="">All departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Manager</span>
          <select value={filters.manager} onChange={(event) => updateFilter('manager', event.target.value)} disabled={loading}>
            <option value="">All managers</option>
            {managerOptions.map((manager) => (
              <option key={manager.code} value={manager.code}>{manager.name}</option>
            ))}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Date Range</span>
          <select value={rangePreset} onChange={(event) => handleRangeChange(event.target.value)} disabled={loading}>
            {RANGE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </label>

        <label className="attendance-filter attendance-filter-compact">
          <span>Sort</span>
          <select value={activeSortLabel} onChange={(event) => handleSortChange(event.target.value)} disabled={loading}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>{option.label}</option>
            ))}
          </select>
        </label>

        {isCustomRange && (
          <>
            <AttendanceDatePicker id="lv-from" label="From Date" value={filters.fromDate} onChange={(value) => updateFilter('fromDate', value)} />
            <AttendanceDatePicker id="lv-to" label="To Date" value={filters.toDate} onChange={(value) => updateFilter('toDate', value)} />
          </>
        )}

        {isFiltered && (
          <button type="button" className="lv-filter-clear-link" onClick={handleClear} disabled={loading}>
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
