/* Shared vocabulary for the Email automation screen: the API surface, and the
   small amount of date/cron reasoning the UI does locally so an admin can see
   what a trigger will actually do before saving it. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

export type TriggerType = 'manual' | 'event' | 'schedule'
export type EmailTrigger = {
  id?: number | string
  trigger_key: string
  trigger_name: string
  template_key: string
  trigger_type: TriggerType
  event_name?: string | null
  schedule_cron?: string | null
  to_recipients: string[]
  cc_recipients: string[]
  bcc_recipients: string[]
  variables: Record<string, unknown>
  audience?: string | null
  active: boolean
  next_run_at?: string | null
  last_run_at?: string | null
  last_status?: string | null
  last_error?: string | null
}
export type EmailEvent = { eventName: string; label: string; variables: string[] }
export type EmailAudience = { audience: string; label: string; variables: string[] }

export const blankTrigger: EmailTrigger = {
  trigger_key: '', trigger_name: '', template_key: '', trigger_type: 'schedule', event_name: '', schedule_cron: '0 9 * * 1-5',
  to_recipients: [], cc_recipients: [], bcc_recipients: [], variables: {}, audience: null, active: true,
}

export const endpoint = '/api/admin/email'

export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.')
export const splitRecipients = (value: string) => value.split(/[\n,]+/).map(item => item.trim()).filter(Boolean)
export const snake = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const fmt12 = (hour: number, minute: number) => `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`

/** Consecutive days grouped, so 1,2,3,4,5 reads as one range rather than five entries. */
function runsOf(days: number[]) {
  const sorted = Array.from(new Set(days)).sort((a, b) => a - b)
  const out: number[][] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    out.push(sorted.slice(i, j + 1))
    i = j + 1
  }
  return out
}

export function dayWords(days: number[]) {
  const sorted = Array.from(new Set(days)).sort((a, b) => a - b)
  if (!sorted.length) return 'No days'
  if (sorted.length === 7) return 'Every day'
  if (sorted.join() === '1,2,3,4,5') return 'Mon–Fri'
  return runsOf(sorted).map(run => (run.length >= 3 ? `${WEEK[run[0]]}–${WEEK[run[run.length - 1]]}` : run.map(d => WEEK[d]).join(', '))).join(', ')
}

function dowField(days: number[]) {
  const sorted = Array.from(new Set(days)).sort((a, b) => a - b)
  if (sorted.length === 7) return '*'
  return runsOf(sorted).map(run => (run.length >= 3 ? `${run[0]}-${run[run.length - 1]}` : run.join(','))).join(',')
}

/**
 * The day/time picker only covers "at a fixed time on chosen weekdays". Anything
 * richer is still a valid schedule, so we return null and let the cron field own it
 * rather than rewriting an expression we do not fully understand.
 */
export function parseCron(cron: string | null | undefined): { days: number[]; time: string } | null {
  const parts = (cron || '').trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hour, dayOfMonth, month, dayOfWeek] = parts
  if (dayOfMonth !== '*' || month !== '*') return null
  if (!/^\d{1,2}$/.test(min) || !/^\d{1,2}$/.test(hour)) return null
  const m = Number(min)
  const h = Number(hour)
  if (m > 59 || h > 23) return null
  const days: number[] = []
  if (dayOfWeek === '*') days.push(0, 1, 2, 3, 4, 5, 6)
  else for (const part of dayOfWeek.split(',')) {
    const range = part.match(/^([0-7])(?:-([0-7]))?$/)
    if (!range) return null
    const from = Number(range[1])
    const to = range[2] === undefined ? from : Number(range[2])
    if (to < from) return null
    for (let d = from; d <= to; d++) if (!days.includes(d % 7)) days.push(d % 7)
  }
  return { days: days.sort((a, b) => a - b), time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
}

export function buildCron(days: number[], time: string) {
  const [hour, minute] = time.split(':')
  return `${Number(minute)} ${Number(hour)} * * ${dowField(days)}`
}

export function cronWords(cron: string | null | undefined) {
  const parsed = parseCron(cron)
  if (!parsed) return null
  const [hour, minute] = parsed.time.split(':')
  return `${dayWords(parsed.days)} at ${fmt12(Number(hour), Number(minute))}`
}

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
const longDay = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export function relativeDay(date: Date) {
  const offset = Math.round((dayStart(date) - dayStart(new Date())) / 86400000)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  return longDay(date)
}

/** A timestamp split into the two lines the cards and rows show. */
export function stamp(iso?: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return { date, main: `${relativeDay(date)}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`, day: longDay(date) }
}

export function nextRuns(days: number[], time: string, count: number) {
  const [hour, minute] = time.split(':').map(Number)
  const now = new Date()
  const out: { date: string; rel: string }[] = []
  for (let i = 0; i < 28 && out.length < count; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0)
    if (at <= now || !days.includes(at.getDay())) continue
    const away = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `in ${i} days`
    out.push({ date: longDay(at), rel: `${away} · ${fmt12(hour, minute)}` })
  }
  return out
}

const TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g

export function placeholders(text: string) {
  const out: string[] = []
  const re = new RegExp(TOKEN.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) if (!out.includes(match[1])) out.push(match[1])
  return out
}

export type Segment = { text: string; kind: 'plain' | 'known' | 'unknown' }

/** Splits template text so the preview can tint resolved values and flag ones that will never be filled. */
export function segments(text: string, data: Record<string, unknown>): Segment[] {
  const out: Segment[] = []
  const re = new RegExp(TOKEN.source, 'g')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) out.push({ text: text.slice(last, match.index), kind: 'plain' })
    const known = Object.prototype.hasOwnProperty.call(data, match[1])
    out.push({ text: known ? String(data[match[1]]) : match[0], kind: known ? 'known' : 'unknown' })
    last = re.lastIndex
  }
  if (last < text.length) out.push({ text: text.slice(last), kind: 'plain' })
  return out
}
