import { useEffect, useRef, useState } from 'react'
import './FilterDropdown.css'

export type FilterDropdownOption = {
  value: string
  label: string
}

type FilterDropdownProps = {
  id: string
  label: string
  value: string
  options: FilterDropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  /** Renders as a bare label+arrow trigger with no border/box, for embedding inside a table header cell. */
  compact?: boolean
  menuAlign?: 'left' | 'right'
}

/**
 * Reusable single-select popover filter used across attendance admin pages
 * (exceptions, records, overtime). Renders as a compact pill trigger with a
 * radio-style option list, so filter fields stay visually consistent without
 * consuming the horizontal space a full <select> row would need.
 */
export default function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
  compact = false,
  menuAlign = 'left',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((option) => option.value === value)
  const isActive = Boolean(value)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [open])

  return (
    <div className={`filter-dropdown${compact ? ' filter-dropdown--compact' : ''}`} ref={ref}>
      {!compact && <span className="filter-dropdown__label">{label}</span>}
      <button
        type="button"
        id={id}
        className={`filter-dropdown__trigger${isActive ? ' filter-dropdown__trigger--active' : ''}${compact ? ' filter-dropdown__trigger--compact' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={compact ? label : undefined}
      >
        <span className="filter-dropdown__value">{compact ? label : active ? active.label : placeholder}</span>
        {isActive && compact && <span className="filter-dropdown__active-dot" aria-hidden="true" />}
        <span className="filter-dropdown__arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`filter-dropdown__menu${menuAlign === 'right' ? ' filter-dropdown__menu--right' : ''}`} role="listbox" aria-labelledby={id}>
          {options.map((option) => {
            const checked = option.value === value
            return (
              <label key={option.value || 'all'} className={`filter-dropdown__item${checked ? ' filter-dropdown__item--active' : ''}`}>
                <span className="filter-dropdown__dot" aria-hidden="true" />
                <input
                  type="radio"
                  name={id}
                  checked={checked}
                  onChange={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
