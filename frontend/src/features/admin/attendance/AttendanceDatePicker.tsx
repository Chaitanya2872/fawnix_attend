import { useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/useClickOutside'
import {
  formatAttendanceDateLabel,
  getCalendarMonthLabel,
  parseDateInputValue,
  toDateInputValue
} from '../../../utils/date/dateUtils'

type AttendanceDatePickerProps = {
  value: string
  onChange: (value: string) => void
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TRIGGER_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getMondayCalendarDays(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstDay = addDays(firstOfMonth, -mondayOffset)
  return Array.from({ length: 42 }, (_, index) => addDays(firstDay, index))
}

export default function AttendanceDatePicker({ value, onChange }: AttendanceDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseDateInputValue(value)
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const pickerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const today = new Date()
  const todayValue = toDateInputValue(today)

  useClickOutside(pickerRef, isOpen, () => setIsOpen(false))

  const togglePicker = () => {
    if (!isOpen) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }

    setIsOpen((open) => !open)
  }

  const selectDate = (date: Date) => {
    onChange(toDateInputValue(date))
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const selectShortcut = (daysFromToday: number) => selectDate(addDays(today, daysFromToday))

  return (
    <div className="attendance-date-picker" ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="attendance-date-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Attendance date: ${formatAttendanceDateLabel(value)}`}
        onClick={togglePicker}
      >
        <svg className="attendance-date-trigger-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
        <span className="attendance-date-trigger-label">
          {value ? TRIGGER_DATE_FORMATTER.format(selectedDate) : 'Pick a date'}
        </span>
        <svg className="attendance-date-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>

      {isOpen && (
        <section className="attendance-calendar-popover" aria-label="Choose attendance date" role="dialog">
          <div className="attendance-calendar-shortcuts" aria-label="Quick dates">
            <button type="button" onClick={() => selectShortcut(0)}>Today</button>
            <button type="button" onClick={() => selectShortcut(1)}>Tomorrow</button>
            <button type="button" onClick={() => selectShortcut(2)}>In 2 days</button>
          </div>

          <div className="attendance-calendar-header">
            <button
              type="button"
              className="attendance-calendar-nav"
              aria-label="Previous month"
              onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <strong>{getCalendarMonthLabel(viewDate)}</strong>
            <button
              type="button"
              className="attendance-calendar-nav"
              aria-label="Next month"
              onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div className="attendance-calendar-weekdays" aria-hidden="true">
            {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="attendance-calendar-days">
            {getMondayCalendarDays(viewDate).map((date) => {
              const dateValue = toDateInputValue(date)
              const isSelected = dateValue === value
              const isToday = dateValue === todayValue
              const outsideMonth = date.getMonth() !== viewDate.getMonth()
              return (
                <button
                  key={dateValue}
                  type="button"
                  className={`attendance-calendar-day${isSelected ? ' attendance-calendar-day--selected' : ''}${isToday ? ' attendance-calendar-day--today' : ''}${outsideMonth ? ' attendance-calendar-day--outside' : ''}`}
                  aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
