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
    <div className="ov2-card ov2-exc-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Upcoming Birthdays</div>
          <div className="ov2-card-sub">Next employee celebrations</div>
        </div>
      </div>
      <div className="ov2-exc-list">
        {visibleBirthdays.map(({ employee, date, daysUntil }) => {
          const name = employee.emp_full_name || employee.emp_code || 'Employee'
          return (
            <div key={employee.emp_code || name} className="ov2-exc-item">
              <div className="ov2-approval-avatar">{String(name)[0].toUpperCase()}</div>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">{name}</span>
                <span className="ov2-exc-desc">{employee.emp_department || employee.emp_designation || 'Employee'}</span>
              </div>
              <div className="ov2-approval-copy">
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
