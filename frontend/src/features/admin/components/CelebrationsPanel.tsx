import { useState } from 'react'
import { ClientPagination } from './ClientPagination'
import type { UpcomingBirthday } from './UpcomingBirthdaysPanel'
import type { UpcomingWorkAnniversary } from './WorkAnniversariesPanel'

type CelebrationTab = 'birthdays' | 'anniversaries'

type Props = {
  birthdays: UpcomingBirthday[]
  anniversaries: UpcomingWorkAnniversary[]
}

const PAGE_SIZE = 4
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const CONFETTI_PIECES = Array.from({ length: 7 }, (_, index) => index)

function timingLabel(daysUntil: number) {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `In ${daysUntil} days`
}

function yearsLabel(years: number) {
  return `${years} year${years === 1 ? '' : 's'}`
}

function employeeName(employee: Record<string, unknown>) {
  return String(employee.emp_full_name || employee.emp_code || 'Employee')
}

function employeeMeta(employee: Record<string, unknown>) {
  return String(employee.emp_department || employee.emp_designation || 'Employee')
}

export function CelebrationsPanel({ birthdays, anniversaries }: Props) {
  const [activeTab, setActiveTab] = useState<CelebrationTab>('birthdays')
  const [page, setPage] = useState(1)

  const isBirthdays = activeTab === 'birthdays'
  const activeTotal = isBirthdays ? birthdays.length : anniversaries.length
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const pageStart = (visiblePage - 1) * PAGE_SIZE
  const cardModeClass = isBirthdays ? 'ov2-celebrations-card--birthdays' : 'ov2-celebrations-card--anniversaries'

  function selectTab(tab: CelebrationTab) {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <section className={`ov2-card ov2-celebrations-card ${cardModeClass}`}>
      <div className="ov2-celebrations-confetti" aria-hidden="true">
        {CONFETTI_PIECES.map((piece) => <i key={piece} />)}
      </div>
      <div className="ov2-card-head">
        <div className="ov2-celebrations-heading">
          <span className="ov2-celebrations-title-icon" aria-hidden="true">
            {isBirthdays ? (
              <svg viewBox="0 0 24 24">
                <path d="M5 11h14v9H5zM7 11V8h10v3M9 8V5m6 3V5M9 3v2m6-2v2M5 15h14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
                <path d="m9 15 2 2 4-5" />
              </svg>
            )}
          </span>
          <div>
            <div className="ov2-card-title">Celebrations</div>
            <div className="ov2-card-sub">{isBirthdays ? 'Upcoming birthdays' : 'Work milestones'}</div>
          </div>
        </div>
        <div className="ov2-celebrations-toggle" role="group" aria-label="Celebration type">
          <button
            type="button"
            aria-pressed={isBirthdays}
            className={`ov2-celebrations-toggle-button ov2-celebrations-toggle-button--birthdays${isBirthdays ? ' is-active' : ''}`}
            onClick={() => selectTab('birthdays')}
          >
            <span>Birthdays</span>
            <span className="ov2-celebrations-tab-count">{birthdays.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={!isBirthdays}
            className={`ov2-celebrations-toggle-button ov2-celebrations-toggle-button--anniversaries${!isBirthdays ? ' is-active' : ''}`}
            onClick={() => selectTab('anniversaries')}
          >
            <span>Anniversaries</span>
            <span className="ov2-celebrations-tab-count">{anniversaries.length}</span>
          </button>
        </div>
      </div>

      {isBirthdays ? (
        <div className="ov2-exc-list ov2-birthday-list ov2-celebrations-list">
          {birthdays.slice(pageStart, pageStart + PAGE_SIZE).map(({ employee, date, daysUntil }) => {
            const name = employeeName(employee)
            return (
              <div key={`${employee.emp_code || name}-${date.toISOString()}`} className="ov2-exc-item ov2-birthday-item ov2-celebration-item">
                <div className="ov2-approval-avatar ov2-birthday-avatar">{name[0].toUpperCase()}</div>
                <div className="ov2-exc-body">
                  <span className="ov2-exc-name">{name}</span>
                  <span className="ov2-exc-desc">{employeeMeta(employee)}</span>
                </div>
                <div className="ov2-approval-copy ov2-birthday-date ov2-celebration-date">
                  <strong>{DATE_FORMATTER.format(date)}</strong>
                  <span>{timingLabel(daysUntil)}</span>
                </div>
              </div>
            )
          })}
          {birthdays.length === 0 && <div className="ov2-empty">No upcoming birthdays found.</div>}
        </div>
      ) : (
        <div className="ov2-exc-list ov2-anniversary-list ov2-celebrations-list">
          {anniversaries.slice(pageStart, pageStart + PAGE_SIZE).map(({ employee, date, daysUntil, years }) => {
            const name = employeeName(employee)
            return (
              <div key={`${employee.emp_code || name}-${date.toISOString()}`} className="ov2-exc-item ov2-anniversary-item ov2-celebration-item">
                <div className="ov2-approval-avatar ov2-anniversary-avatar">{name[0].toUpperCase()}</div>
                <div className="ov2-exc-body">
                  <span className="ov2-exc-name">{name}</span>
                  <span className="ov2-exc-desc">{employeeMeta(employee)}</span>
                </div>
                <div className="ov2-approval-copy ov2-birthday-date ov2-celebration-date">
                  <strong>{DATE_FORMATTER.format(date)}</strong>
                  <span>{yearsLabel(years)} - {timingLabel(daysUntil)}</span>
                </div>
              </div>
            )
          })}
          {anniversaries.length === 0 && <div className="ov2-empty">No upcoming work anniversaries found.</div>}
        </div>
      )}

      <ClientPagination page={visiblePage} pageSize={PAGE_SIZE} total={activeTotal} onPageChange={setPage} />
    </section>
  )
}
