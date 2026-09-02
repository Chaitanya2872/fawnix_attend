/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { ClientPagination } from './ClientPagination'

export type UpcomingBirthday = {
  employee: Record<string, any>
  date: Date
  daysUntil: number
}

type Props = { birthdays: UpcomingBirthday[] }

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const CONFETTI_PIECES = Array.from({ length: 7 }, (_, index) => index)

function timingLabel(daysUntil: number) {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `In ${daysUntil} days`
}

export function UpcomingBirthdaysPanel({ birthdays }: Props) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(birthdays.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const visibleBirthdays = birthdays.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  return (
    <div className="ov2-card ov2-birthday-card">
      <div className="ov2-birthday-confetti" aria-hidden="true">
        {CONFETTI_PIECES.map((piece) => <i key={piece} />)}
      </div>
      <div className="ov2-card-head">
        <div className="ov2-birthday-heading">
          <span className="ov2-birthday-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 11h14v9H5zM7 11V8h10v3M9 8V5m6 3V5M9 3v2m6-2v2M5 15h14" />
            </svg>
          </span>
          <div>
            <div className="ov2-card-title">Upcoming Birthdays</div>
            <div className="ov2-card-sub">Next employee celebrations</div>
          </div>
        </div>
      </div>
      <div className="ov2-exc-list ov2-birthday-list">
        {visibleBirthdays.map(({ employee, date, daysUntil }) => {
          const name = employee.emp_full_name || employee.emp_code || 'Employee'
          return (
            <div key={employee.emp_code || name} className="ov2-exc-item ov2-birthday-item">
              <div className="ov2-approval-avatar ov2-birthday-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">{name}</span>
                <span className="ov2-exc-desc">{employee.emp_department || employee.emp_designation || 'Employee'}</span>
              </div>
              <div className="ov2-approval-copy ov2-birthday-date">
                <strong>{DATE_FORMATTER.format(date)}</strong>
                <span>{timingLabel(daysUntil)}</span>
              </div>
            </div>
          )
        })}
        {birthdays.length === 0 && <div className="ov2-empty">No upcoming birthdays found.</div>}
      </div>
      <ClientPagination page={visiblePage} pageSize={pageSize} total={birthdays.length} onPageChange={setPage} />
    </div>
  )
}
