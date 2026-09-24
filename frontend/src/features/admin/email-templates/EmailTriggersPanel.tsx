import { useEffect, useMemo, useRef, useState } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { AlertIcon, ChevronIcon, ClockIcon, CloseIcon, KebabIcon } from './icons'
import {
  blankTrigger, buildCron, cronWords, dayWords, endpoint, errorText, nextRuns, parseCron, snake, splitRecipients, stamp,
  type ApiRequest, type EmailAudience, type EmailEvent, type EmailTrigger, type TriggerType,
} from './emailAutomation'

const TABS: { key: 'all' | TriggerType; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'schedule', label: 'Scheduled' }, { key: 'event', label: 'App event' }, { key: 'manual', label: 'Manual' },
]
const MODES: { key: TriggerType; label: string; hint: string }[] = [
  { key: 'schedule', label: 'On a schedule', hint: 'Days and a time' },
  { key: 'event', label: 'On an app event', hint: 'e.g. leave approved' },
  { key: 'manual', label: 'Manually', hint: 'Only via Run now' },
]
const DAY_BUTTONS: { short: string; full: string; value: number }[] = [
  { short: 'Mon', full: 'Monday', value: 1 }, { short: 'Tue', full: 'Tuesday', value: 2 }, { short: 'Wed', full: 'Wednesday', value: 3 },
  { short: 'Thu', full: 'Thursday', value: 4 }, { short: 'Fri', full: 'Friday', value: 5 }, { short: 'Sat', full: 'Saturday', value: 6 },
  { short: 'Sun', full: 'Sunday', value: 0 },
]
const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] }, { label: 'Mon–Sat', days: [1, 2, 3, 4, 5, 6] }, { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
]
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every(day => b.includes(day))

/** Whatever else the backend reports, only an explicit success should read as a clean send. */
const sentOk = (status?: string | null) => ['sent', 'success', 'ok'].includes((status || '').toLowerCase())

function whenLines(trigger: EmailTrigger) {
  if (trigger.trigger_type === 'schedule') return { main: cronWords(trigger.schedule_cron) || 'Custom schedule', sub: trigger.schedule_cron || '' }
  if (trigger.trigger_type === 'event') return { main: 'On an app event', sub: trigger.event_name || '' }
  return { main: 'Manual only', sub: 'Sends when you run it' }
}

type CardProps = {
  triggers: EmailTrigger[]
  loading: boolean
  canCreate: boolean
  onCreate: () => void
  onEdit: (trigger: EmailTrigger) => void
  onRun: (trigger: EmailTrigger) => void
  onToggle: (trigger: EmailTrigger) => void
  onDuplicate: (trigger: EmailTrigger) => void
  onDelete: (trigger: EmailTrigger) => void
  onOpenTemplate: (templateKey: string) => void
}

export function TriggersCard({ triggers, loading, canCreate, onCreate, onEdit, onRun, onToggle, onDuplicate, onDelete, onOpenTemplate }: CardProps) {
  const [tab, setTab] = useState<'all' | TriggerType>('all')
  const [menuFor, setMenuFor] = useState<string | null>(null)

  // A row menu should not survive a click anywhere else on the page.
  useEffect(() => {
    if (!menuFor) return
    const dismiss = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.('.ea-cell--actions')) return
      setMenuFor(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [menuFor])

  const shown = triggers.filter(item => tab === 'all' || item.trigger_type === tab)
  const count = (key: 'all' | TriggerType) => (key === 'all' ? triggers.length : triggers.filter(item => item.trigger_type === key).length)

  return <section className="ea-card ea-enter ea-enter--3">
    <div className="ea-card__head">
      <div className="ea-card__title">
        <h2>Triggers</h2>
        <span>When each email is sent. Recipients and variables are resolved at run time.</span>
      </div>
      <div role="tablist" aria-label="Filter triggers" className="ea-tabs">
        {TABS.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ea-tab ea-ease ea-press" onClick={() => { setTab(item.key); setMenuFor(null) }}>{item.label} · {count(item.key)}</button>)}
      </div>
    </div>

    <div className="ea-grid-head"><span>TRIGGER</span><span>SCHEDULE</span><span>SENDS TEMPLATE</span><span>NEXT RUN</span><span>LAST RUN</span><span>ACTIVE</span></div>

    {loading
      ? <div className="ea-empty"><strong>Loading triggers…</strong></div>
      : shown.length === 0
        ? <div className="ea-empty">
            <strong>{triggers.length ? 'Nothing of this type yet' : 'No triggers yet'}</strong>
            <span>{canCreate ? 'Bind a template to an event, a schedule, or a manual send.' : 'Create a template first, then add a trigger for it.'}</span>
            {canCreate && <button type="button" className="ea-btn ea-btn--sm ea-ease ea-press" onClick={onCreate}>New trigger</button>}
          </div>
        : shown.map(item => {
            const when = whenLines(item)
            const next = stamp(item.next_run_at)
            const last = stamp(item.last_run_at)
            const open = menuFor === item.trigger_key
            const name = item.trigger_name || item.trigger_key
            return <div key={item.trigger_key} className={`ea-row ea-ease${item.active ? '' : ' ea-row--off'}${open ? ' ea-row--menu' : ''}`}>
              <div className="ea-cell ea-cell--name">
                <button type="button" className="ea-rowlink ea-ease" onClick={() => onEdit(item)}>{name}</button>
                <span className="ea-key">{item.trigger_key}</span>
              </div>
              <div className="ea-cell" data-label="SCHEDULE">
                <span className="ea-cell__main">{when.main}</span>
                {when.sub && <span className="ea-key">{when.sub}</span>}
              </div>
              <div className="ea-cell" data-label="SENDS TEMPLATE">
                <button type="button" className="ea-chipkey ea-ease" title={`Open ${item.template_key}`} onClick={() => onOpenTemplate(item.template_key)}>{item.template_key}</button>
              </div>
              <div className="ea-cell" data-label="NEXT RUN">
                <span className="ea-cell__main">{!item.active ? 'Paused' : next ? next.main : '—'}</span>
                <span className="ea-cell__sub">{!item.active ? 'Resume to schedule' : next ? next.day : item.trigger_type === 'manual' ? 'On demand' : 'Not scheduled'}</span>
              </div>
              <div className="ea-cell" data-label="LAST RUN">
                <span className="ea-cell__main">{sentOk(item.last_status) && <span className="ea-dot"/>}{last ? last.main : 'Never run'}</span>
                <span className={`ea-cell__sub${last && !sentOk(item.last_status) ? ' ea-cell__sub--bad' : ''}`} title={item.last_error || undefined}>{item.last_status || ''}</span>
              </div>
              <div className="ea-cell ea-cell--actions">
                <button type="button" role="switch" aria-checked={item.active} aria-label={`${name} active`} className="ea-switch" onClick={() => onToggle(item)}><i/></button>
                <button type="button" className="ea-btn ea-btn--sm ea-ease ea-press" onClick={() => onRun(item)}>Run now</button>
                <button type="button" className="ea-btn ea-btn--sm ea-btn--square ea-more ea-ease ea-press" aria-haspopup="menu" aria-expanded={open} aria-label={`More actions for ${name}`} onClick={() => setMenuFor(open ? null : item.trigger_key)}><KebabIcon/></button>
                {open && <div role="menu" aria-label="Trigger actions" className="ea-menu">
                  <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onEdit(item) }}>Edit trigger</button>
                  <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onDuplicate(item) }}>Duplicate</button>
                  <hr/>
                  <button type="button" role="menuitem" className="ea-menu__danger" onClick={() => { setMenuFor(null); onDelete(item) }}>Delete trigger</button>
                </div>}
              </div>
            </div>
          })}
  </section>
}

type EditorProps = {
  trigger: EmailTrigger
  events: EmailEvent[]
  audiences: EmailAudience[]
  templates: { template_key: string; template_name: string }[]
  apiRequest: ApiRequest
  onClose: () => void
  onSaved: (message: string) => void
}

export function TriggerEditor({ trigger, events, audiences, templates, apiRequest, onClose, onSaved }: EditorProps) {
  const dialogRef = useRef<HTMLElement | null>(null)
  useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  const isNew = !trigger.id

  const [form, setForm] = useState<EmailTrigger>({
    ...blankTrigger, ...trigger,
    template_key: trigger.template_key || templates[0]?.template_key || '',
    event_name: trigger.event_name || events[0]?.eventName || '',
    schedule_cron: trigger.schedule_cron || blankTrigger.schedule_cron,
  })
  const initial = parseCron(form.schedule_cron)
  const [cron, setCron] = useState(form.schedule_cron || '')
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [time, setTime] = useState(initial?.time ?? '09:00')
  // A cron we cannot round-trip through the day/time picker is still a valid schedule — the text field owns it.
  const [custom, setCustom] = useState(!initial)
  const [advOpen, setAdvOpen] = useState(!initial)
  const [keyTouched, setKeyTouched] = useState(!isNew)
  const [to, setTo] = useState(trigger.to_recipients.join('\n'))
  const [cc, setCc] = useState(trigger.cc_recipients.join('\n'))
  const [bcc, setBcc] = useState(trigger.bcc_recipients.join('\n'))
  const [varsText, setVarsText] = useState(JSON.stringify(trigger.variables || {}, null, 2))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const touch = () => setDirty(true)
  const change = <K extends keyof EmailTrigger>(key: K, value: EmailTrigger[K]) => { touch(); setForm(old => ({ ...old, [key]: value })) }
  const triggerKey = keyTouched ? form.trigger_key : snake(form.trigger_name)

  const applySchedule = (nextDays: number[], nextTime: string) => {
    touch(); setDays(nextDays); setTime(nextTime); setCustom(false)
    if (nextDays.length) setCron(buildCron(nextDays, nextTime))
  }
  const onCronText = (value: string) => {
    touch(); setCron(value)
    const parsed = parseCron(value)
    if (parsed) { setDays(parsed.days); setTime(parsed.time); setCustom(false) } else setCustom(true)
  }

  const isSchedule = form.trigger_type === 'schedule'
  const noDays = isSchedule && !custom && days.length === 0
  const badCron = isSchedule && custom && !cron.trim()
  const runs = useMemo(() => (isSchedule && !custom && days.length ? nextRuns(days, time, 3) : []), [isSchedule, custom, days, time])
  const clock = cronWords(cron)?.split(' at ')[1] || ''
  const selectedEvent = events.find(item => item.eventName === form.event_name)
  const selectedAudience = audiences.find(item => item.audience === form.audience)
  const available = form.trigger_type === 'event'
    ? selectedEvent?.variables || []
    : isSchedule
      ? selectedAudience?.variables || ['run_date', 'run_time']
      : []

  const headline = isSchedule
    ? noDays ? 'No days selected' : custom ? 'Custom schedule' : `${dayWords(days)} · ${clock}`
    : form.trigger_type === 'event' ? 'Fires on an app event' : 'Manual only'

  const save = async () => {
    let variables: Record<string, unknown>
    try { variables = JSON.parse(varsText || '{}') } catch { return setError('Default variables must be valid JSON.') }
    if (!triggerKey.trim() || !form.trigger_name.trim()) return setError('Trigger key and name are required.')
    if (!form.template_key) return setError('Pick the template this trigger sends.')
    setSaving(true); setError('')
    try {
      await apiRequest(`${endpoint}/triggers${isNew ? '' : `/${encodeURIComponent(trigger.trigger_key)}`}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({
          triggerKey, triggerName: form.trigger_name, templateKey: form.template_key, triggerType: form.trigger_type,
          eventName: form.event_name, scheduleCron: cron,
          toRecipients: splitRecipients(to), ccRecipients: splitRecipients(cc), bccRecipients: splitRecipients(bcc),
          variables, audience: isSchedule ? form.audience || null : null, active: form.active,
        }),
      })
      onSaved(isNew ? 'Trigger created' : 'Trigger saved')
    } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }

  return <div className="ea-scrim ea-fade" role="dialog" aria-modal="true" aria-label="Email trigger editor">
    <section className="ea-drawer" ref={dialogRef}>
      <header className="ea-drawer__head">
        <div>
          <p className="ea-eyebrow">{isNew ? 'New trigger' : 'Edit trigger'}</p>
          <h2>{form.trigger_name || 'Untitled trigger'}</h2>
          <span className={`ea-badge${noDays || badCron ? ' ea-badge--warn' : ''}`}>{headline}</span>
        </div>
        <button type="button" className="ea-btn ea-btn--square-lg ea-ease ea-press" onClick={onClose} aria-label="Close"><CloseIcon/></button>
      </header>

      <form className="ea-drawer__body" id="ea-trigger-form" onSubmit={event => { event.preventDefault(); void save() }}>
        {error && <div className="ea-notice" role="alert"><AlertIcon/>{error}</div>}

        <div className="ea-pair">
          <label className="ea-field"><span>Name</span>
            <input className="ea-input" value={form.trigger_name} onChange={event => change('trigger_name', event.target.value)} placeholder="Late arrival to manager"/>
          </label>
          <label className="ea-field"><span>Key {isNew ? <em>· auto from name</em> : <em>· used in code, locked</em>}</span>
            <input className="ea-input ea-input--mono" value={triggerKey} readOnly={!isNew} onChange={event => { setKeyTouched(true); change('trigger_key', event.target.value) }}/>
          </label>
        </div>

        <fieldset className="ea-fieldset">
          <legend className="ea-legend">Fires</legend>
          <div className="ea-modes">
            {MODES.map(mode => <button key={mode.key} type="button" aria-pressed={form.trigger_type === mode.key} className="ea-mode ea-ease ea-press" onClick={() => change('trigger_type', mode.key)}>
              <span className="ea-mode__top"><b>{mode.label}</b><i/></span>
              <small>{mode.hint}</small>
            </button>)}
          </div>
        </fieldset>

        {isSchedule && <div className="ea-panel ea-fade">
          <div className="ea-field">
            <div className="ea-days-head">
              <span className="ea-legend">Days</span>
              <div className="ea-presets">
                {PRESETS.map(preset => <button key={preset.label} type="button" aria-pressed={!custom && sameDays(days, preset.days)} className="ea-preset ea-ease ea-press" onClick={() => applySchedule(preset.days.slice(), time)}>{preset.label}</button>)}
              </div>
            </div>
            <div role="group" aria-label="Days of week" className="ea-days">
              {DAY_BUTTONS.map(day => {
                const on = !custom && days.includes(day.value)
                return <button key={day.value} type="button" aria-pressed={on} aria-label={day.full} disabled={custom} className="ea-day ea-ease ea-press"
                  onClick={() => applySchedule(on ? days.filter(value => value !== day.value) : [...days, day.value], time)}>{day.short}</button>
              })}
            </div>
          </div>

          <div className="ea-pair">
            <label className="ea-field"><span>Time</span>
              <input className="ea-input" type="time" value={time} disabled={custom} onChange={event => { if (event.target.value) applySchedule(days, event.target.value) }}/>
            </label>
          </div>

          <div className={`ea-summary${noDays ? ' ea-summary--warn' : ''}`}>
            <div className="ea-summary__line"><ClockIcon/><span>
              {noDays ? 'Pick at least one day'
                : custom ? 'Custom expression — the picker above cannot show it, so the cron field below is what runs.'
                  : `Runs ${dayWords(days)} at ${clock}, server time`}
            </span></div>
            {runs.length > 0 && <div className="ea-runs">
              {runs.map(run => <div key={run.date} className="ea-run"><b>{run.date}</b><span>{run.rel}</span></div>)}
            </div>}
          </div>

          <div className="ea-field">
            <button type="button" className="ea-disclose" aria-expanded={advOpen} onClick={() => setAdvOpen(open => !open)}><ChevronIcon/>Advanced: cron expression</button>
            {advOpen && <div className="ea-field ea-fade">
              <input aria-label="Cron expression" className={`ea-input ea-input--mono${badCron ? ' ea-input--bad' : ''}`} value={cron} onChange={event => onCronText(event.target.value)} placeholder="0 9 * * 1-5"/>
              <span className={`ea-hint${badCron ? ' ea-hint--bad' : custom ? ' ea-hint--warn' : ''}`}>
                {badCron ? 'A schedule needs a cron expression.'
                  : custom ? 'Kept exactly as written — minute hour day month weekday.'
                    : 'Stays in sync with the days and time above. Editing it updates them.'}
              </span>
            </div>}
          </div>
        </div>}

        {form.trigger_type === 'event' && <div className="ea-panel ea-fade">
          <label className="ea-field"><span>When this happens</span>
            <select className="ea-select" value={form.event_name || ''} onChange={event => change('event_name', event.target.value)}>
              {events.map(item => <option key={item.eventName} value={item.eventName}>{item.label} ({item.eventName})</option>)}
            </select>
            <span className="ea-hint">The event carries its own variables into the template.</span>
          </label>
        </div>}

        {form.trigger_type === 'manual' && <div className="ea-panel ea-panel--dashed ea-fade">This trigger only sends when someone presses <strong>Run now</strong> on the overview.</div>}

        <div className="ea-pair">
          <label className="ea-field"><span>Template to send</span>
            <select className="ea-select" value={form.template_key} onChange={event => change('template_key', event.target.value)}>
              {!form.template_key && <option value="">Choose a template…</option>}
              {templates.map(item => <option key={item.template_key} value={item.template_key}>{item.template_name || item.template_key}</option>)}
            </select>
            {form.template_key && <span className="ea-hint"><code>{form.template_key}</code></span>}
          </label>
          {isSchedule && <label className="ea-field"><span>Send to</span>
            <select className="ea-select" value={form.audience || ''} onChange={event => change('audience', event.target.value || null)}>
              <option value="">One email per run</option>
              {audiences.map(item => <option key={item.audience} value={item.audience}>One email per person — {item.label}</option>)}
            </select>
            <span className="ea-hint">Resolved at run time; skipped if nobody matches.</span>
          </label>}
        </div>

        <div className="ea-panel">
          <label className="ea-field"><span>To {form.trigger_type === 'manual' && <em>· optional default</em>}</span>
            <textarea className="ea-textarea" rows={2} value={to} onChange={event => { touch(); setTo(event.target.value) }} placeholder={form.trigger_type === 'event' ? '{{employee_email}}' : 'team@example.com'}/>
          </label>
          <div className="ea-pair">
            <label className="ea-field"><span>CC <em>· optional</em></span><textarea className="ea-textarea" rows={2} value={cc} onChange={event => { touch(); setCc(event.target.value) }}/></label>
            <label className="ea-field"><span>BCC <em>· optional</em></span><textarea className="ea-textarea" rows={2} value={bcc} onChange={event => { touch(); setBcc(event.target.value) }}/></label>
          </div>
          <span className="ea-hint">One address per line. Placeholders such as <code>{'{{manager_email}}'}</code> are filled at send time, and <code>designation:CMD</code> expands to every active employee with that designation.</span>
          {available.length > 0 && <div className="ea-varchips">
            {available.map(name => <span key={name} className="ea-varchip ea-varchip--used"><i/>{`{{${name}}}`}</span>)}
          </div>}
        </div>

        <label className="ea-field"><span>Default variables <em>· JSON</em></span>
          <textarea className="ea-textarea ea-textarea--mono" rows={4} value={varsText} onChange={event => { touch(); setVarsText(event.target.value) }}/>
          <span className="ea-hint">Merged under the values the event or schedule supplies.</span>
        </label>
      </form>

      <footer className="ea-drawer__foot">
        <div>
          <button type="button" role="switch" aria-checked={form.active} aria-label="Trigger active" className="ea-switch" onClick={() => change('active', !form.active)}><i/></button>
          <span className="ea-legend">{form.active ? 'Active' : 'Paused'}</span>
          {dirty && !saving && <span className="ea-unsaved ea-fade"><i/>Unsaved changes</span>}
        </div>
        <div>
          <button type="button" className="ea-btn ea-ease ea-press" onClick={onClose}>Cancel</button>
          <button type="submit" form="ea-trigger-form" className="ea-btn ea-btn--primary ea-ease ea-press" disabled={saving || noDays || badCron}>
            {saving && <span className="ea-spinner ea-spinner--on-brand"/>}{saving ? 'Saving…' : 'Save trigger'}
          </button>
        </div>
      </footer>
    </section>
  </div>
}

export function RunDialog({ trigger, apiRequest, onClose }: { trigger: EmailTrigger; apiRequest: ApiRequest; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null)
  useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  const [testMode, setTestMode] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [state, setState] = useState<{ error?: string; message?: string }>({})
  const [busy, setBusy] = useState(false)
  const list = (values: string[]) => values.length ? values.join(', ') : '—'

  // Live: an empty body fires the trigger exactly as configured. Test: only the typed address receives it.
  const run = async () => {
    const recipients = splitRecipients(testTo)
    if (testMode && !recipients.length) return setState({ error: 'Enter an address for the test email.' })
    setBusy(true); setState({})
    try {
      const response = await apiRequest(`${endpoint}/triggers/${encodeURIComponent(trigger.trigger_key)}/run`, {
        method: 'POST', body: JSON.stringify(testMode ? { to: recipients, cc: [], bcc: [] } : {}),
      })
      setState(response?.success ? { message: response.message || 'Sent.' } : { error: response?.message || 'Not sent.' })
    } catch (e) { setState({ error: errorText(e) }) } finally { setBusy(false) }
  }

  return <div className="ea-scrim ea-scrim--center ea-fade" role="dialog" aria-modal="true" aria-label="Run trigger">
    <section className="ea-modal" ref={dialogRef}>
      <header className="ea-drawer__head">
        <div><p className="ea-eyebrow">Run now</p><h2>Run “{trigger.trigger_name || trigger.trigger_key}”</h2></div>
        <button type="button" className="ea-btn ea-btn--square-lg ea-ease ea-press" onClick={onClose} aria-label="Close"><CloseIcon/></button>
      </header>
      <div className="ea-drawer__body">
        {state.message
          ? <div className="ea-notice ea-notice--ok" role="status">{state.message}</div>
          : <>
              {state.error && <div className="ea-notice" role="alert"><AlertIcon/>{state.error}</div>}
              {testMode
                ? <label className="ea-field"><span>Send a test to</span><textarea className="ea-textarea" rows={2} value={testTo} onChange={event => setTestTo(event.target.value)} placeholder="you@example.com"/>
                    <span className="ea-hint">Only this address receives it. Placeholders are filled with {trigger.audience ? 'the first matching employee' : 'your own employee record'}.</span></label>
                : <>
                    <p className="ea-hint">This sends now, exactly as the automatic {trigger.trigger_type === 'schedule' ? 'scheduled' : trigger.trigger_type} run would{trigger.audience ? ': one email to each matching employee' : ''}.</p>
                    <p className="ea-hint"><strong>To</strong> {list(trigger.to_recipients)}<br/><strong>CC</strong> {list(trigger.cc_recipients)}<br/><strong>BCC</strong> {list(trigger.bcc_recipients)}</p>
                  </>}
              <button type="button" className="ea-btn ea-ease ea-press" onClick={() => { setTestMode(mode => !mode); setState({}) }}>
                {testMode ? 'Send to the configured recipients instead' : 'Send a test to one address instead'}
              </button>
            </>}
      </div>
      <footer className="ea-drawer__foot">
        <div/>
        <div>
          <button type="button" className="ea-btn ea-ease ea-press" onClick={onClose}>{state.message ? 'Close' : 'Cancel'}</button>
          {!state.message && <button type="button" className="ea-btn ea-btn--primary ea-ease ea-press" onClick={() => void run()} disabled={busy}>
            {busy && <span className="ea-spinner ea-spinner--on-brand"/>}{busy ? 'Sending…' : testMode ? 'Send test' : 'Send now'}
          </button>}
        </div>
      </footer>
    </section>
  </div>
}
