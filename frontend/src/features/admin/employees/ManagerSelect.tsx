import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { EmployeeRow } from '../../../types/admin'
import './ManagerSelect.css'

type ManagerSelectProps = {
  id: string
  /** Current manager code (the value persisted on the employee record). */
  value: string
  onChange: (empCode: string) => void
  employees: EmployeeRow[]
  /** Employee being edited — kept out of the list so nobody can manage themselves. */
  excludeEmpCode?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Searchable, scrollable manager picker used by the Add/Edit Employee drawer.
 * Admins pick a manager by name instead of remembering the manager's employee
 * code; the code is still what gets stored and sent to the API.
 */
export default function ManagerSelect({
  id,
  value,
  onChange,
  employees,
  excludeEmpCode,
  placeholder = 'Search manager by name…',
  disabled = false
}: ManagerSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const candidates = useMemo(
    () =>
      employees
        .filter((employee) => employee.emp_code && employee.emp_code !== excludeEmpCode)
        .sort((a, b) => (a.emp_full_name || '').localeCompare(b.emp_full_name || '')),
    [employees, excludeEmpCode]
  )

  const selected = candidates.find((employee) => employee.emp_code === value)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return candidates
    return candidates.filter((employee) =>
      [employee.emp_full_name, employee.emp_code, employee.emp_email, employee.emp_designation, employee.emp_department]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    )
  }, [candidates, query])

  useEffect(() => {
    if (!open) return
    const clickHandler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickHandler)
    return () => document.removeEventListener('mousedown', clickHandler)
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setHighlight(Math.max(0, filtered.findIndex((employee) => employee.emp_code === value)))
    searchRef.current?.focus()
    // Only re-run when the popover toggles — filtering handles its own highlight reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const active = listRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const commit = (empCode: string) => {
    onChange(empCode)
    setOpen(false)
  }

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((prev) => Math.min(prev + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((prev) => Math.max(prev - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const choice = filtered[highlight]
      if (choice?.emp_code) commit(choice.emp_code)
    }
  }

  const triggerLabel = selected
    ? selected.emp_full_name || selected.emp_code
    : value
      ? `Manager code ${value}`
      : 'No manager assigned'

  return (
    <div className={`manager-select${disabled ? ' manager-select--disabled' : ''}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className={`manager-select__trigger${value ? ' manager-select__trigger--filled' : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="manager-select__trigger-text">
          <span className="manager-select__trigger-name">{triggerLabel}</span>
          {selected?.emp_code && <span className="manager-select__trigger-meta">#{selected.emp_code}</span>}
        </span>
        <span className="manager-select__arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="manager-select__menu">
          <div className="manager-select__search">
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={placeholder}
              onChange={(event) => {
                setQuery(event.target.value)
                setHighlight(0)
              }}
              onKeyDown={handleKeyDown}
              aria-controls={`${id}-listbox`}
            />
          </div>
          <div className="manager-select__list" id={`${id}-listbox`} role="listbox" ref={listRef}>
            <button
              type="button"
              className={`manager-select__option manager-select__option--clear${value ? '' : ' manager-select__option--active'}`}
              onClick={() => commit('')}
            >
              No manager
            </button>
            {filtered.length === 0 ? (
              <p className="manager-select__empty">No manager matches “{query}”.</p>
            ) : (
              filtered.map((employee, index) => {
                const isActive = employee.emp_code === value
                return (
                  <button
                    key={employee.emp_code}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-highlighted={index === highlight}
                    className={`manager-select__option${isActive ? ' manager-select__option--active' : ''}${index === highlight ? ' manager-select__option--highlighted' : ''}`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => commit(employee.emp_code)}
                  >
                    <span className="manager-select__option-name">{employee.emp_full_name || employee.emp_code}</span>
                    <span className="manager-select__option-meta">
                      #{employee.emp_code}
                      {employee.emp_designation ? ` · ${employee.emp_designation}` : ''}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
