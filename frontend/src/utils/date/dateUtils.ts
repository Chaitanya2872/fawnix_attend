export function formatDateTime(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDate(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function toDateInputValue(value: Date) {
  const offsetValue = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offsetValue).toISOString().slice(0, 10)
}

export function parseDateInputValue(value: string) {
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) {
    return new Date()
  }
  return new Date(year, month - 1, day)
}

export function formatAttendanceDateLabel(value: string) {
  if (!value) {
    return 'Pick a date'
  }

  const parsed = parseDateInputValue(value)
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getCalendarMonthLabel(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

export function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

export function isSameDate(value: string | undefined, targetDate: string) {
  if (!value || !targetDate) {
    return false
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return toDateInputValue(parsed) === targetDate
  }

  return value.slice(0, 10) === targetDate
}
