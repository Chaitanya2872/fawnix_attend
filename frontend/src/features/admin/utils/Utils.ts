export function toMonthKey(value?: string) {
  return (value || '').slice(0, 7)
}

export function getPrevMonthKey(mk: string) {
  const [y, m] = mk.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function getPrevMonthLabel(mk: string) {
  const prev = getPrevMonthKey(mk)
  return new Date(`${prev}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

export function getMonthAvgRate(
  countByDate: Record<string, number>,
  monthKey: string,
  totalEmployees: number
): number | null {
  const dates = Object.keys(countByDate).filter((d) => d.startsWith(monthKey))
  if (!dates.length) return null
  const total = dates.reduce((sum, d) => sum + (countByDate[d] || 0), 0)
  return Math.round((total / dates.length / Math.max(totalEmployees, 1)) * 100)
}

export function getMonthExceptionCount(
  exceptionCountByDate: Record<string, number>,
  monthKey: string
): number {
  return Object.keys(exceptionCountByDate)
    .filter((d) => d.startsWith(monthKey))
    .reduce((sum, d) => sum + (exceptionCountByDate[d] || 0), 0)
}

export function getWeekRangeLabel(value: string) {
  const base = new Date(`${value}T00:00:00`)
  if (Number.isNaN(base.getTime())) return 'This week'
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}