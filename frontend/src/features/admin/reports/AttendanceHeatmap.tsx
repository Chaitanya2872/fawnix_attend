import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AttendanceHeatmapCell,
  AttendanceHeatmapEmployee,
  AttendanceHeatmapMatrix,
  AttendanceStatusCode
} from '../../../types/admin'
import {
  ATTENDANCE_LEGEND_ORDER,
  ATTENDANCE_STATUS_META,
  EDITABLE_ATTENDANCE_STATUSES,
  WORKED_ATTENDANCE_STATUSES
} from './attendanceStatus'
import { formatWorkingHours } from '../utils/formatters'
import './AttendanceHeatmap.css'

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type AttendanceHeatmapProps = {
  data: AttendanceHeatmapMatrix | null
  efficiencyScores: Array<{
    key: string
    detail: string
    score: number | null
  }>
  loading: boolean
  /** Status-message string, mirroring the attendanceReportStatus pattern used elsewhere. */
  statusMessage: string
  /** Cell currently being saved, keyed as `empCode|date`. */
  savingCellKey: string | null
  canEdit: boolean
  onCellEdit: (employeeId: string, date: string, newStatus: AttendanceStatusCode) => void
  onRefresh: () => void
}

type CellAnchor = {
  empCode: string
  date: string
  top: number
  bottom: number
  left: number
}

function toCellKey(empCode: string, date: string) {
  return `${empCode}|${date}`
}

function formatCellDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return parsed.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function countWorkedDays(employee: AttendanceHeatmapEmployee) {
  return Object.values(employee.days).filter((cell) => WORKED_ATTENDANCE_STATUSES.includes(cell.status)).length
}

function normaliseEfficiencyScore(score: number | null | undefined) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null
  }
  return Math.min(100, Math.max(0, score))
}

function efficiencyTone(score: number | null) {
  if (score === null) return 'is-idle'
  if (score >= 90) return 'is-excellent'
  if (score >= 75) return 'is-good'
  if (score >= 60) return 'is-fair'
  return 'is-poor'
}

/**
 * GitHub-contributions-style attendance grid: one row per employee, one column
 * per day of the selected month. Colour encodes the status code, hovering a
 * cell explains it, and clicking one opens an inline status editor that hands
 * the change back through onCellEdit — this component never calls the API.
 */
export default function AttendanceHeatmap({
  data,
  efficiencyScores,
  loading,
  statusMessage,
  savingCellKey,
  canEdit,
  onCellEdit,
  onRefresh
}: AttendanceHeatmapProps) {
  const [hovered, setHovered] = useState<CellAnchor | null>(null)
  const [editing, setEditing] = useState<CellAnchor | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const efficiencyByEmployee = useMemo(
    () => new Map(efficiencyScores.map((item) => [item.key, item])),
    [efficiencyScores]
  )

  const columns = useMemo(() => {
    if (!data) {
      return []
    }
    return data.dates.map((date) => {
      const parsed = new Date(`${date}T00:00:00`)
      const weekday = parsed.getDay()
      return {
        date,
        dayOfMonth: String(parsed.getDate()),
        weekdayInitial: WEEKDAY_INITIALS[weekday] ?? '',
        isWeekend: weekday === 0 || weekday === 6
      }
    })
  }, [data])

  useEffect(() => {
    if (!editing) {
      return
    }
    const clickHandler = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setEditing(null)
      }
    }
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditing(null)
      }
    }
    document.addEventListener('mousedown', clickHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', clickHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [editing])

  // Both popovers are position: fixed, so scrolling the grid would otherwise strand them.
  useEffect(() => {
    if (!editing && !hovered) {
      return
    }
    const dismiss = () => {
      setEditing(null)
      setHovered(null)
    }
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [editing, hovered])

  const anchorFor = (element: HTMLElement, empCode: string, date: string): CellAnchor => {
    const rect = element.getBoundingClientRect()
    return {
      empCode,
      date,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left + rect.width / 2
    }
  }

  const openEditor = (element: HTMLElement, empCode: string, date: string) => {
    if (!canEdit) {
      return
    }
    setHovered(null)
    setEditing((current) =>
      current && current.empCode === empCode && current.date === date
        ? null
        : anchorFor(element, empCode, date)
    )
  }

  const applyStatus = (status: AttendanceStatusCode) => {
    if (!editing) {
      return
    }
    onCellEdit(editing.empCode, editing.date, status)
    setEditing(null)
  }

  const hoveredEmployee = hovered
    ? data?.employees.find((employee) => employee.empCode === hovered.empCode)
    : undefined
  const hoveredCell: AttendanceHeatmapCell | undefined = hovered ? hoveredEmployee?.days[hovered.date] : undefined
  const editingCell: AttendanceHeatmapCell | undefined = editing
    ? data?.employees.find((employee) => employee.empCode === editing.empCode)?.days[editing.date]
    : undefined

  return (
    <div className="attendance-heatmap">
      <div className="attendance-heatmap-legend">
        {ATTENDANCE_LEGEND_ORDER.map((status) => (
          <span key={status} className="attendance-heatmap-legend-item">
            <span className={`attendance-heatmap-swatch ${ATTENDANCE_STATUS_META[status].className}`} aria-hidden="true" />
            {ATTENDANCE_STATUS_META[status].label}
          </span>
        ))}
      </div>

      {loading && !data ? (
        <div className="empty-state">Loading attendance heatmap...</div>
      ) : !data || !data.employees.length ? (
        <div className="empty-state">
          No attendance summary for this month yet.
          <button className="ghost dashboard-button attendance-heatmap-retry" onClick={onRefresh} type="button">Reload</button>
        </div>
      ) : (
        <div className={`attendance-heatmap-scroll${loading ? ' is-refreshing' : ''}`}>
          <table className="attendance-heatmap-table">
            <thead>
              <tr>
                <th scope="col" className="attendance-heatmap-name-head">Employee</th>
                <th
                  scope="col"
                  className="attendance-heatmap-efficiency-head"
                  title="Share of expected working days attended"
                >
                  Efficiency
                </th>
                {columns.map((column) => (
                  <th
                    key={column.date}
                    scope="col"
                    className={`attendance-heatmap-day-head${column.isWeekend ? ' is-weekend' : ''}`}
                    title={formatCellDate(column.date)}
                  >
                    <span className="attendance-heatmap-weekday">{column.weekdayInitial}</span>
                    <span className="attendance-heatmap-daynum">{column.dayOfMonth}</span>
                  </th>
                ))}
                <th scope="col" className="attendance-heatmap-total-head">Worked</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((employee) => {
                const efficiency = efficiencyByEmployee.get(employee.empCode)
                  ?? efficiencyByEmployee.get(employee.name)
                const score = normaliseEfficiencyScore(efficiency?.score)

                return (
                  <tr key={employee.empCode}>
                    <th scope="row" className="attendance-heatmap-name-cell">
                      <strong>{employee.name || employee.empCode}</strong>
                      <span>{employee.designation || employee.empCode}</span>
                    </th>
                    <td className="attendance-heatmap-efficiency-cell">
                      <div
                        className={`attendance-heatmap-efficiency ${efficiencyTone(score)}`}
                        title={efficiency?.detail ?? 'Efficiency score unavailable'}
                      >
                        <strong>{score === null ? '-' : `${Math.round(score)}%`}</strong>
                        <span className="attendance-heatmap-efficiency-track" aria-hidden="true">
                          <span style={{ width: `${score ?? 0}%` }} />
                        </span>
                      </div>
                    </td>
                    {columns.map((column) => {
                      const cell = employee.days[column.date]
                      const meta = cell ? ATTENDANCE_STATUS_META[cell.status] : null
                      const isSaving = savingCellKey === toCellKey(employee.empCode, column.date)
                      const isEditing = editing?.empCode === employee.empCode && editing.date === column.date
                      const cellClassName = [
                        'attendance-heatmap-cell',
                        meta ? meta.className : 'is-empty',
                        cell?.source === 'manual' ? 'is-manual' : '',
                        column.isWeekend ? 'is-weekend-col' : '',
                        isEditing ? 'is-editing' : '',
                        isSaving ? 'is-saving' : ''
                      ].filter(Boolean).join(' ')
                      return (
                        <td key={column.date} className="attendance-heatmap-cell-wrap">
                          <button
                            type="button"
                            className={cellClassName}
                            disabled={!canEdit || isSaving}
                            aria-label={`${employee.name || employee.empCode}, ${formatCellDate(column.date)}, ${meta ? meta.label : 'No data'}`}
                            onMouseEnter={(event) => setHovered(anchorFor(event.currentTarget, employee.empCode, column.date))}
                            onMouseLeave={() => setHovered((current) => (
                              current?.empCode === employee.empCode && current.date === column.date ? null : current
                            ))}
                            onFocus={(event) => setHovered(anchorFor(event.currentTarget, employee.empCode, column.date))}
                            onBlur={() => setHovered(null)}
                            onClick={(event) => openEditor(event.currentTarget, employee.empCode, column.date)}
                          >
                            <span aria-hidden="true">{meta ? meta.glyph : ''}</span>
                          </button>
                        </td>
                      )
                    })}
                    <td className="attendance-heatmap-total-cell">{countWorkedDays(employee)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {statusMessage ? <span className="report-status attendance-heatmap-status">{statusMessage}</span> : null}

      {hovered && hoveredEmployee ? (
        <div className="attendance-heatmap-tooltip" style={{ top: hovered.top - 10, left: hovered.left }} role="tooltip">
          <strong>{hoveredEmployee.name || hoveredEmployee.empCode}</strong>
          <span>{formatCellDate(hovered.date)}</span>
          <span>Status: {hoveredCell ? ATTENDANCE_STATUS_META[hoveredCell.status].label : 'No data'}</span>
          {hoveredCell && hoveredCell.workingHours !== null ? (
            <span>Hours: {formatWorkingHours(hoveredCell.workingHours)}</span>
          ) : null}
          {hoveredCell?.remarks ? <span>Note: {hoveredCell.remarks}</span> : null}
          <span className="attendance-heatmap-tooltip-source">
            {hoveredCell?.source === 'manual' ? 'Manually corrected' : 'Auto-generated'}
          </span>
        </div>
      ) : null}

      {editing ? (
        <div className="attendance-heatmap-editor" style={{ top: editing.bottom + 8, left: editing.left }} ref={editorRef}>
          <p className="attendance-heatmap-editor-title">{formatCellDate(editing.date)}</p>
          {EDITABLE_ATTENDANCE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`attendance-heatmap-editor-option${editingCell?.status === status ? ' is-active' : ''}`}
              onClick={() => applyStatus(status)}
            >
              <span className={`attendance-heatmap-swatch ${ATTENDANCE_STATUS_META[status].className}`} aria-hidden="true" />
              {ATTENDANCE_STATUS_META[status].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
