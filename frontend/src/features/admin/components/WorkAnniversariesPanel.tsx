/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { ClientPagination } from './ClientPagination'

export type UpcomingWorkAnniversary = {
  employee: Record<string, any>
  date: Date
  daysUntil: number
  years: number
}

type Props = { anniversaries: UpcomingWorkAnniversary[] }

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })

function timingLabel(daysUntil: number) {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `In ${daysUntil} days`
}

function yearsLabel(years: number) {
  return `${years} year${years === 1 ? '' : 's'}`
}

export function WorkAnniversariesPanel({ anniversaries }: Props) {
  const [page, setPage] = useState(1)
  const pageSize = 4
  const totalPages = Math.max(1, Math.ceil(anniversaries.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const visibleAnniversaries = anniversaries.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)

  return (
    <div className="ov2-card ov2-anniversary-card">
      <div className="ov2-card-head">
        <div className="ov2-birthday-heading">
          <span className="ov2-anniversary-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
              <path d="m9 15 2 2 4-5" />
            </svg>
          </span>
          <div>
            <div className="ov2-card-title">Work Anniversaries</div>
            <div className="ov2-card-sub">Next employee milestones</div>
          </div>
        </div>
      </div>
      <div className="ov2-exc-list ov2-anniversary-list">
        {visibleAnniversaries.map(({ employee, date, daysUntil, years }) => {
          const name = employee.emp_full_name || employee.emp_code || 'Employee'
          return (
            <div key={`${employee.emp_code || name}-${date.toISOString()}`} className="ov2-exc-item ov2-anniversary-item">
              <div className="ov2-approval-avatar ov2-anniversary-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">{name}</span>
                <span className="ov2-exc-desc">{employee.emp_department || employee.emp_designation || 'Employee'}</span>
              </div>
              <div className="ov2-approval-copy ov2-birthday-date">
                <strong>{DATE_FORMATTER.format(date)}</strong>
                <span>{yearsLabel(years)} - {timingLabel(daysUntil)}</span>
              </div>
            </div>
          )
        })}
        {anniversaries.length === 0 && <div className="ov2-empty">No upcoming work anniversaries found.</div>}
      </div>
      <ClientPagination page={visiblePage} pageSize={pageSize} total={anniversaries.length} onPageChange={setPage} />
    </div>
  )
}
