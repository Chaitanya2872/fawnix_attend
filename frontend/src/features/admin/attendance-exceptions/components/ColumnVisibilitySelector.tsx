import { useEffect, useRef, useState } from 'react'
import './ColumnVisibilitySelector.css'

export type ColumnDef = {
  key: string
  label: string
}

type Props = {
  columns: ColumnDef[]
  visibleKeys: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
}

export default function ColumnVisibilitySelector({ columns, visibleKeys, onToggle, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hiddenCount = columns.filter((c) => !visibleKeys.has(c.key)).length

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="exc-col-selector" ref={ref}>
      <button
        type="button"
        className="exc-col-trigger ghost"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        id="exc-col-btn"
      >
        Columns
        {hiddenCount > 0 && (
          <span className="exc-col-badge" aria-label={`${hiddenCount} hidden`}>
            {hiddenCount}
          </span>
        )}
        <span className="exc-col-arrow" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="exc-col-dropdown" role="listbox" aria-multiselectable="true" aria-labelledby="exc-col-btn">
          <div className="exc-col-dropdown-head">
            <span>Show / Hide Columns</span>
            <button type="button" className="exc-col-reset" onClick={onReset}>
              Reset
            </button>
          </div>
          {columns.map((col) => {
            const checked = visibleKeys.has(col.key)
            return (
              <label key={col.key} className="exc-col-item" role="option" aria-selected={checked}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(col.key)}
                />
                <span>{col.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
