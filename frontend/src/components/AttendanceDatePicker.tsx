import { useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import {
  formatAttendanceDateLabel,
  getCalendarDays,
  getCalendarMonthLabel,
  parseDateInputValue,
  toDateInputValue
} from '../services/dateUtils'

type AttendanceDatePickerProps = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
}

export default function AttendanceDatePicker({
  id = 'attendance-date',
  label = 'Date',
  value,
  onChange
}: AttendanceDatePickerProps) {
  const todayValue = toDateInputValue(new Date())
  const [isOpen, setIsOpen] = useState(false)
  const [month, setMonth] = useState(() => parseDateInputValue(value || todayValue))
  const pickerRef = useRef<HTMLDivElement | null>(null)

  useClickOutside(pickerRef, isOpen, () => setIsOpen(false))

  const calendarMonthLabel = getCalendarMonthLabel(month)
  const calendarDays = getCalendarDays(month)

  return (
    <div className="attendance-filter attendance-filter-date">
      <label htmlFor={id}>{label}</label>
      <div className={`attendance-date-picker ${isOpen ? 'open' : ''}`} ref={pickerRef}>
        <button
          className="attendance-input-shell attendance-date-shell attendance-date-trigger"
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="attendance-input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="attendance-date-value">{formatAttendanceDateLabel(value)}</span>
          <span className="attendance-date-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="m8 10 4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {isOpen ? (
          <div className="attendance-date-popover" role="dialog" aria-label="Choose date">
            <div className="attendance-date-popover-head">
              <button
                className="attendance-date-nav"
                type="button"
                aria-label="Previous month"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="m14 7-5 5 5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <strong>{calendarMonthLabel}</strong>
              <button
                className="attendance-date-nav"
                type="button"
                aria-label="Next month"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="m10 7 5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="attendance-date-weekdays">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="attendance-date-grid">
              {calendarDays.map((day) => {
                const dayValue = toDateInputValue(day)
                const isSelected = dayValue === value
                const isToday = dayValue === todayValue
                const isOutsideMonth = day.getMonth() !== month.getMonth()

                return (
                  <button
                    key={dayValue}
                    className={[
                      'attendance-date-day',
                      isSelected ? 'selected' : '',
                      isToday ? 'today' : '',
                      isOutsideMonth ? 'outside' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    onClick={() => {
                      onChange(dayValue)
                      setMonth(parseDateInputValue(dayValue))
                      setIsOpen(false)
                    }}
                  >
                    <span>{day.getDate()}</span>
                  </button>
                )
              })}
            </div>
            <div className="attendance-date-popover-footer">
              <button
                className="attendance-date-footer-link"
                type="button"
                onClick={() => {
                  onChange(todayValue)
                  setMonth(parseDateInputValue(todayValue))
                  setIsOpen(false)
                }}
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
