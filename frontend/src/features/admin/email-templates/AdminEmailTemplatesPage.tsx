import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './AdminEmailTemplatesPage.css'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { AlertIcon, CheckIcon, ChevronIcon, CloseIcon, MailIcon, PlusIcon, RefreshIcon } from './icons'
import { RunDialog, TriggerEditor, TriggersCard } from './EmailTriggersPanel'
import {
  blankTrigger, endpoint, errorText, placeholders, relativeDay, segments, snake, splitRecipients, stamp,
  type ApiRequest, type EmailAudience, type EmailEvent, type EmailTrigger, type Segment,
} from './emailAutomation'

type EmailTemplate = {
  id?: number | string
  template_key: string
  template_name: string
  subject_template: string
  html_body: string
  text_body?: string
  active: boolean
  updated_at?: string
}
type Form = Omit<EmailTemplate, 'id' | 'updated_at'>

const blank: Form = { template_key: '', template_name: '', subject_template: '', html_body: '', text_body: '', active: true }
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
/** "today" reads naturally mid-sentence; a date does not. */
const whenUpdated = (date: Date) => {
  const label = relativeDay(date)
  return /^(Today|Tomorrow|Yesterday)$/.test(label) ? label.toLowerCase() : label
}

/** Readable stand-ins so the preview shows a shaped email rather than raw braces. */
function sampleValue(name: string) {
  const words = name.replace(/[_.-]+/g, ' ').trim()
  if (/time$/i.test(name)) return '9:30 AM'
  if (/date$/i.test(name)) return new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (/email$/i.test(name)) return 'name@example.com'
  if (/count$|_no$|number$/i.test(name)) return '3'
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export default function AdminEmailTemplatesPage({ apiRequest }: { apiRequest: ApiRequest }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [triggers, setTriggers] = useState<EmailTrigger[]>([])
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [audiences, setAudiences] = useState<EmailAudience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [sendingTemplate, setSendingTemplate] = useState<EmailTemplate | null>(null)
  const [editingTrigger, setEditingTrigger] = useState<EmailTrigger | null>(null)
  const [runningTrigger, setRunningTrigger] = useState<EmailTrigger | null>(null)

  const apiRequestRef = useRef(apiRequest)
  useEffect(() => { apiRequestRef.current = apiRequest }, [apiRequest])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [t, tr, ev, au] = await Promise.all([
        apiRequestRef.current(`${endpoint}/templates`),
        apiRequestRef.current(`${endpoint}/triggers`),
        apiRequestRef.current(`${endpoint}/events`),
        apiRequestRef.current(`${endpoint}/audiences`),
      ])
      setTemplates(Array.isArray(t?.data) ? t.data : [])
      setTriggers(Array.isArray(tr?.data) ? tr.data : [])
      setEvents(Array.isArray(ev?.data) ? ev.data : [])
      setAudiences(Array.isArray(au?.data) ? au.data : [])
    } catch (e) { setError(errorText(e)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const call = async (path: string, init: RequestInit, done: string) => {
    try { await apiRequestRef.current(path, init); await load(); notify(done) } catch (e) { setError(errorText(e)) }
  }

  const toggleTemplate = (item: EmailTemplate) =>
    call(`${endpoint}/templates/${encodeURIComponent(item.template_key)}/${item.active ? 'disable' : 'enable'}`, { method: 'POST', body: '{}' },
      item.active ? `${item.template_name || item.template_key} disabled` : `${item.template_name || item.template_key} enabled`)

  const toggleTrigger = (item: EmailTrigger) =>
    call(`${endpoint}/triggers/${encodeURIComponent(item.trigger_key)}/${item.active ? 'disable' : 'enable'}`, { method: 'POST', body: '{}' },
      `${item.trigger_name || item.trigger_key} ${item.active ? 'paused' : 'resumed'}`)

  const deleteTrigger = (item: EmailTrigger) => {
    const name = item.trigger_name || item.trigger_key
    if (!window.confirm(`Delete the trigger “${name}”? Its template is not affected.`)) return
    void call(`${endpoint}/triggers/${encodeURIComponent(item.trigger_key)}`, { method: 'DELETE' }, 'Trigger deleted')
  }

  const duplicateTrigger = (item: EmailTrigger) => void call(`${endpoint}/triggers`, {
    method: 'POST',
    body: JSON.stringify({
      triggerKey: `${item.trigger_key}_copy`, triggerName: `${item.trigger_name || item.trigger_key} (copy)`,
      templateKey: item.template_key, triggerType: item.trigger_type, eventName: item.event_name, scheduleCron: item.schedule_cron,
      toRecipients: item.to_recipients, ccRecipients: item.cc_recipients, bccRecipients: item.bcc_recipients,
      variables: item.variables, audience: item.audience,
      active: false, // a copy starts paused so it cannot send before it has been reviewed
    }),
  }, 'Duplicated as a paused copy')

  const usage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of triggers) counts[item.template_key] = (counts[item.template_key] || 0) + 1
    return counts
  }, [triggers])

  const stats = useMemo(() => {
    const active = triggers.filter(item => item.active)
    const upcoming = active
      .map(item => ({ item, at: stamp(item.next_run_at) }))
      .filter((row): row is { item: EmailTrigger; at: NonNullable<ReturnType<typeof stamp>> } => Boolean(row.at))
      .sort((a, b) => a.at.date.getTime() - b.at.date.getTime())[0]
    const recent = triggers
      .map(item => ({ item, at: stamp(item.last_run_at) }))
      .filter((row): row is { item: EmailTrigger; at: NonNullable<ReturnType<typeof stamp>> } => Boolean(row.at))
      .sort((a, b) => b.at.date.getTime() - a.at.date.getTime())[0]
    const enabled = templates.filter(item => item.active).length
    const used = templates.filter(item => usage[item.template_key]).length
    return {
      next: upcoming ? upcoming.at.main : 'Nothing scheduled',
      nextSub: upcoming ? upcoming.item.trigger_name || upcoming.item.trigger_key : active.length ? 'No upcoming run' : 'All triggers are paused',
      last: recent ? recent.at.main : '—',
      lastSub: recent ? `${recent.item.trigger_name || recent.item.trigger_key}${recent.item.last_status ? ` · ${recent.item.last_status}` : ''}` : 'No sends yet',
      hasLast: Boolean(recent),
      activeCount: `${active.length} of ${triggers.length}`,
      activePercent: triggers.length ? Math.round((active.length / triggers.length) * 100) : 0,
      enabled: templates.length ? `${enabled} of ${templates.length} enabled` : 'None yet',
      enabledSub: templates.length === 0 ? 'Create one to get started' : used === templates.length ? 'Every template is in use' : `${used} of ${templates.length} used by a trigger`,
    }
  }, [triggers, templates, usage])

  /** What a template can legitimately fill: every variable the triggers that send it will supply. */
  const knownVariables = useCallback((templateKey: string) => {
    const names = new Set<string>()
    for (const item of triggers) {
      if (item.template_key !== templateKey) continue
      Object.keys(item.variables || {}).forEach(name => names.add(name))
      if (item.trigger_type === 'event') events.find(e => e.eventName === item.event_name)?.variables.forEach(name => names.add(name))
      if (item.trigger_type === 'schedule') {
        names.add('run_date'); names.add('run_time')
        audiences.find(a => a.audience === item.audience)?.variables.forEach(name => names.add(name))
      }
    }
    return Array.from(names)
  }, [triggers, events, audiences])

  const openTemplate = (templateKey: string) => {
    const found = templates.find(item => item.template_key === templateKey)
    if (found) setEditingTemplate(found)
  }

  return <div className="adm-page admin-aligned-page email-templates-page">
    <header className="ea-head ea-enter">
      <div className="ea-head__text">
        <p className="ea-eyebrow">Administration / Delivery</p>
        <h1 className="ea-title">Email automation</h1>
        <p className="ea-lede">Templates hold the message. Triggers decide when it goes out and to whom. Recipients and variables are resolved at send time.</p>
      </div>
      <div className="ea-head__actions">
        <button type="button" className="ea-btn ea-ease ea-press" onClick={() => void load()}><RefreshIcon/>Refresh</button>
        <button type="button" className="ea-btn ea-btn--primary ea-ease ea-press" disabled={!templates.length} onClick={() => setEditingTrigger({ ...blankTrigger, template_key: templates[0]?.template_key || '' })}><PlusIcon/>New trigger</button>
      </div>
    </header>

    {error && <div className="ea-notice" role="alert"><AlertIcon/>{error}</div>}

    <div className="ea-stats ea-enter ea-enter--2">
      <div className="ea-stat ea-ease ea-lift">
        <span className="ea-stat__label">Next send</span>
        <span className="ea-stat__value">{stats.next}</span>
        <span className="ea-stat__sub">{stats.nextSub}</span>
      </div>
      <div className="ea-stat ea-ease ea-lift">
        <span className="ea-stat__label">Last send</span>
        <span className="ea-stat__value">{stats.hasLast && <span className="ea-dot ea-dot--live"/>}{stats.last}</span>
        <span className="ea-stat__sub">{stats.lastSub}</span>
      </div>
      <div className="ea-stat ea-ease ea-lift">
        <span className="ea-stat__label">Active triggers</span>
        <span className="ea-stat__value">{stats.activeCount}</span>
        <div className="ea-bar"><i style={{ width: `${stats.activePercent}%` }}/></div>
      </div>
      <div className="ea-stat ea-ease ea-lift">
        <span className="ea-stat__label">Templates</span>
        <span className="ea-stat__value">{stats.enabled}</span>
        <span className="ea-stat__sub">{stats.enabledSub}</span>
      </div>
    </div>

    <TriggersCard
      triggers={triggers}
      loading={loading}
      canCreate={templates.length > 0}
      onCreate={() => setEditingTrigger({ ...blankTrigger, template_key: templates[0]?.template_key || '' })}
      onEdit={setEditingTrigger}
      onRun={setRunningTrigger}
      onToggle={item => void toggleTrigger(item)}
      onDuplicate={duplicateTrigger}
      onDelete={deleteTrigger}
      onOpenTemplate={openTemplate}
    />

    <section className="ea-section ea-enter ea-enter--3">
      <div className="ea-section__head">
        <div>
          <h2>Templates</h2>
          <p>Template keys are shared across every module.</p>
        </div>
        <button type="button" className="ea-btn ea-btn--sm ea-ease ea-press" onClick={() => setEditingTemplate({ ...blank })}><PlusIcon size={15}/>New template</button>
      </div>
      <div className="ea-tpl-grid">
        {templates.map(item => {
          const used = usage[item.template_key] || 0
          const updated = stamp(item.updated_at)
          return <article key={item.template_key} className={`ea-tpl ea-ease ea-lift${item.active ? '' : ' ea-tpl--off'}`}>
            <div className="ea-tpl__head">
              <div className="ea-tpl__id">
                <button type="button" className="ea-rowlink ea-ease" onClick={() => setEditingTemplate(item)}>{item.template_name || item.template_key}</button>
                <span className="ea-key">{item.template_key}</span>
              </div>
              <button type="button" className={`ea-pill${item.active ? '' : ' ea-pill--off'}`} title={item.active ? 'Disable this template' : 'Enable this template'} style={{ border: 0, cursor: 'pointer' }} onClick={() => void toggleTemplate(item)}>{item.active ? 'Enabled' : 'Disabled'}</button>
            </div>
            <div className="ea-tpl__subject">{item.subject_template || 'No subject yet'}</div>
            <div className="ea-tpl__foot">
              <span>{used ? `Used by ${plural(used, 'trigger')}` : 'Not used by a trigger'}{updated ? ` · Updated ${whenUpdated(updated.date)}` : ''}</span>
              <div className="ea-tpl__actions">
                <button type="button" className="ea-btn ea-btn--xs ea-ease ea-press" onClick={() => setSendingTemplate(item)}>Send test</button>
                <button type="button" className="ea-btn ea-btn--xs ea-ease ea-press" onClick={() => setEditingTemplate(item)}>Edit</button>
              </div>
            </div>
          </article>
        })}
        {!loading && <button type="button" className="ea-tpl-new ea-ease ea-lift" onClick={() => setEditingTemplate({ ...blank })}>
          <MailIcon/>
          Create a template
          <span>e.g. leave approved, overtime logged</span>
        </button>}
      </div>
    </section>

    {editingTemplate && createPortal(
      <TemplateEditor
        template={editingTemplate}
        known={knownVariables(editingTemplate.template_key)}
        apiRequest={apiRequest}
        onClose={() => setEditingTemplate(null)}
        onSaved={message => { setEditingTemplate(null); notify(message); void load() }}
      />, document.body)}

    {sendingTemplate && createPortal(
      <SendDialog template={sendingTemplate} apiRequest={apiRequest} onClose={() => setSendingTemplate(null)}/>, document.body)}

    {editingTrigger && createPortal(
      <TriggerEditor
        trigger={editingTrigger}
        events={events}
        audiences={audiences}
        templates={templates.map(item => ({ template_key: item.template_key, template_name: item.template_name }))}
        apiRequest={apiRequest}
        onClose={() => setEditingTrigger(null)}
        onSaved={message => { setEditingTrigger(null); notify(message); void load() }}
      />, document.body)}

    {runningTrigger && createPortal(
      <RunDialog trigger={runningTrigger} apiRequest={apiRequest} onClose={() => { setRunningTrigger(null); void load() }}/>, document.body)}

    {toast && createPortal(<div className="ea-toast" role="status"><CheckIcon/>{toast}</div>, document.body)}
  </div>
}

const renderSegments = (parts: Segment[], highlight: boolean) => parts.map((part, index) =>
  part.kind === 'plain' || (part.kind === 'known' && !highlight)
    ? <span key={index}>{part.text}</span>
    : <span key={index} className={part.kind === 'known' ? 'ea-var--known' : 'ea-var--unknown'}>{part.text}</span>)

function TemplateEditor({ template, known, apiRequest, onClose, onSaved }: { template: EmailTemplate; known: string[]; apiRequest: ApiRequest; onClose: () => void; onSaved: (message: string) => void }) {
  const dialogRef = useRef<HTMLElement | null>(null)
  useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  const isNew = !template.id

  const [form, setForm] = useState<Form>({ ...blank, ...template })
  const [keyTouched, setKeyTouched] = useState(!isNew)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [highlight, setHighlight] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(Boolean(template.text_body))
  const [dataText, setDataText] = useState('{}')
  const [focusField, setFocusField] = useState<'subject' | 'body'>('body')
  const [caret, setCaret] = useState<number | null>(null)
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const templateKey = keyTouched ? form.template_key : snake(form.template_name).toUpperCase()
  const change = <K extends keyof Form>(key: K, value: Form[K]) => { setDirty(true); setForm(old => ({ ...old, [key]: value })) }

  const overrides = useMemo(() => {
    try { const parsed = JSON.parse(dataText || '{}'); return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {} } catch { return {} }
  }, [dataText])
  const variables = useMemo(() => Array.from(new Set([...known, ...Object.keys(overrides)])), [known, overrides])
  const data = useMemo(() => {
    const out: Record<string, unknown> = {}
    for (const name of known) out[name] = sampleValue(name)
    return { ...out, ...overrides }
  }, [known, overrides])

  const used = useMemo(() => placeholders(`${form.subject_template}\n${form.html_body}`), [form.subject_template, form.html_body])
  const unknown = used.filter(name => !(name in data))
  const subjectLength = segments(form.subject_template, data).map(part => part.text).join('').length

  const insert = (name: string) => {
    const token = `{{${name}}}`
    const field = focusField
    const current = field === 'subject' ? form.subject_template : form.html_body
    const at = caret === null ? current.length : Math.min(caret, current.length)
    change(field === 'subject' ? 'subject_template' : 'html_body', current.slice(0, at) + token + current.slice(at))
    setCaret(at + token.length)
    setMenuOpen(false)
    requestAnimationFrame(() => {
      const element = field === 'subject' ? subjectRef.current : bodyRef.current
      element?.focus()
      element?.setSelectionRange(at + token.length, at + token.length)
    })
  }

  const save = async () => {
    if (!templateKey.trim() || !form.template_name.trim()) return setError('Template key and name are required.')
    setSaving(true); setError('')
    try {
      await apiRequest(`${endpoint}/templates${isNew ? '' : `/${encodeURIComponent(template.template_key)}`}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({ ...form, template_key: templateKey }),
      })
      onSaved(isNew ? 'Template created' : 'Template saved')
    } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }

  const paragraphs = form.html_body.split(/\n{2,}/)

  return <div className="ea-scrim ea-fade" role="dialog" aria-modal="true" aria-label="Email template editor">
    <section className="ea-drawer ea-drawer--wide" ref={dialogRef}>
      <header className="ea-drawer__head">
        <div>
          <p className="ea-eyebrow">{isNew ? 'New template' : 'Edit template'}</p>
          <h2>{form.template_name || 'Untitled template'}</h2>
          <span className={`ea-badge${form.active ? '' : ' ea-badge--warn'}`}>{form.active ? 'Enabled' : 'Disabled'}</span>
        </div>
        <button type="button" className="ea-btn ea-btn--square-lg ea-ease ea-press" onClick={onClose} aria-label="Close"><CloseIcon/></button>
      </header>

      <form className="ea-editor" id="ea-template-form" onSubmit={event => { event.preventDefault(); void save() }}>
        <div className="ea-editor__pane">
          {error && <div className="ea-notice" role="alert"><AlertIcon/>{error}</div>}
          <div className="ea-pair">
            <label className="ea-field"><span>Name</span>
              <input className="ea-input" value={form.template_name} onChange={event => change('template_name', event.target.value)} placeholder="Late arrival – manager notification"/>
            </label>
            <label className="ea-field"><span>Key {isNew ? <em>· auto from name</em> : <em>· used in code, locked</em>}</span>
              <input className="ea-input ea-input--mono" value={templateKey} readOnly={!isNew} onChange={event => { setKeyTouched(true); change('template_key', event.target.value) }}/>
            </label>
          </div>

          <div className="ea-field">
            <div className="ea-label-row">
              <span className="ea-legend">Subject</span>
              <span className={`ea-hint${subjectLength > 70 ? ' ea-hint--warn' : ''}`}>{subjectLength} characters{subjectLength > 70 ? ' · may be cut off on phones' : ''}</span>
            </div>
            <input ref={subjectRef} className="ea-input" value={form.subject_template}
              onChange={event => { setCaret(event.target.selectionStart); setFocusField('subject'); change('subject_template', event.target.value) }}
              onFocus={event => { setFocusField('subject'); setCaret(event.currentTarget.selectionStart) }}
              onSelect={event => { setFocusField('subject'); setCaret(event.currentTarget.selectionStart) }}
              placeholder="Late arrival: {{employee_name}}"/>
          </div>

          <div className="ea-editor__grow">
            <div className="ea-label-row">
              <span className="ea-legend">Body</span>
              <button type="button" className="ea-varbtn ea-ease ea-press" aria-haspopup="menu" aria-expanded={menuOpen} disabled={!variables.length} onClick={() => setMenuOpen(open => !open)}><b>{'{ }'}</b>Insert variable</button>
              {menuOpen && <div role="menu" aria-label="Variables" className="ea-varmenu">
                <span>Inserts at the cursor in {focusField === 'subject' ? 'the subject' : 'the body'}</span>
                {variables.map(name => <button key={name} type="button" role="menuitem" onClick={() => insert(name)}>
                  <b>{`{{${name}}}`}</b><small>{String(data[name] ?? 'Supplied at send time')}</small>
                </button>)}
              </div>}
            </div>
            <textarea ref={bodyRef} className="ea-textarea" value={form.html_body}
              onChange={event => { setCaret(event.target.selectionStart); setFocusField('body'); change('html_body', event.target.value) }}
              onFocus={event => { setFocusField('body'); setCaret(event.currentTarget.selectionStart) }}
              onSelect={event => { setFocusField('body'); setCaret(event.currentTarget.selectionStart) }}
              placeholder={'Hi {{manager_name}},\n\n…'}/>
          </div>

          <div className="ea-field">
            <span className="ea-legend">Variables{variables.length ? ' · click to insert' : ''}</span>
            {variables.length
              ? <div className="ea-varchips">
                  {variables.map(name => <button key={name} type="button" className={`ea-varchip ea-ease ea-press${used.includes(name) ? ' ea-varchip--used' : ''}`} onClick={() => insert(name)}><i/>{`{{${name}}}`}</button>)}
                </div>
              : <span className="ea-hint">No trigger supplies variables to this template yet. Add preview data below to try placeholders out.</span>}
            {unknown.length > 0 && <div className="ea-notice ea-fade" role="alert">
              <AlertIcon/>
              <span>Unknown variable: <code>{unknown.map(name => `{{${name}}}`).join(', ')}</code> — nothing will fill it at send time.</span>
            </div>}
          </div>

          <div className="ea-field">
            <button type="button" className="ea-disclose" aria-expanded={textOpen} onClick={() => setTextOpen(open => !open)}><ChevronIcon/>Plain-text version{form.text_body ? '' : ' · optional'}</button>
            {textOpen && <textarea className="ea-textarea ea-fade" rows={4} value={form.text_body || ''} onChange={event => change('text_body', event.target.value)} placeholder="Shown by mail clients that cannot render HTML."/>}
          </div>
        </div>

        <aside className="ea-preview" aria-label="Preview">
          <div className="ea-preview__bar">
            <div role="tablist" aria-label="Preview size" className="ea-tabs">
              <button type="button" role="tab" aria-selected={device === 'desktop'} className="ea-tab ea-ease" onClick={() => setDevice('desktop')}>Desktop</button>
              <button type="button" role="tab" aria-selected={device === 'mobile'} className="ea-tab ea-ease" onClick={() => setDevice('mobile')}>Mobile</button>
            </div>
            <div className="ea-preview__opts">
              <label className="ea-check"><input type="checkbox" checked={highlight} onChange={event => setHighlight(event.target.checked)}/>Highlight variables</label>
            </div>
          </div>

          <div className="ea-preview__stage">
            <div className={`ea-frame${device === 'mobile' ? ' ea-frame--mobile' : ''}`}>
              <div className="ea-frame__head">
                <span><em>From</em>Attendance Suite</span>
                <span><em>To</em>Resolved at send time</span>
                <span className="ea-frame__subject">{form.subject_template ? renderSegments(segments(form.subject_template, data), highlight) : 'Subject preview'}</span>
              </div>
              <div className="ea-frame__body">
                {form.html_body
                  ? paragraphs.map((paragraph, index) => <p key={index}>{renderSegments(segments(paragraph, data), highlight)}</p>)
                  : <p>Your message preview will appear here. Substitutions are shown as plain text — nothing is rendered as HTML.</p>}
              </div>
            </div>
          </div>

          <label className="ea-field"><span>Preview data <em>· JSON, overrides the samples above</em></span>
            <textarea className="ea-textarea ea-textarea--mono" rows={3} value={dataText} onChange={event => setDataText(event.target.value)}/>
          </label>
        </aside>
      </form>

      <footer className="ea-drawer__foot">
        <div>
          <button type="button" role="switch" aria-checked={form.active} aria-label="Template enabled" className="ea-switch" onClick={() => change('active', !form.active)}><i/></button>
          <span className="ea-legend">{form.active ? 'Enabled' : 'Disabled'}</span>
          {dirty && !saving && <span className="ea-unsaved ea-fade"><i/>Unsaved changes</span>}
        </div>
        <div>
          <button type="button" className="ea-btn ea-ease ea-press" onClick={onClose}>Cancel</button>
          <button type="submit" form="ea-template-form" className="ea-btn ea-btn--primary ea-ease ea-press" disabled={saving}>
            {saving && <span className="ea-spinner ea-spinner--on-brand"/>}{saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </footer>
    </section>
  </div>
}

function SendDialog({ template, onClose, apiRequest }: { template: EmailTemplate; onClose: () => void; apiRequest: ApiRequest }) {
  const dialogRef = useRef<HTMLElement | null>(null)
  useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [variables, setVariables] = useState('{}')
  const [sourceService, setSourceService] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [state, setState] = useState<{ error?: string; success?: boolean }>({})
  const [busy, setBusy] = useState(false)

  const send = async () => {
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(variables || '{}') } catch { return setState({ error: 'Variables must be valid JSON.' }) }
    setBusy(true); setState({})
    try {
      await apiRequest(`${endpoint}/send`, {
        method: 'POST',
        body: JSON.stringify({
          templateKey: template.template_key, to: splitRecipients(to), cc: splitRecipients(cc), bcc: splitRecipients(bcc),
          variables: parsed, sourceService: sourceService || undefined, referenceId: referenceId || undefined,
        }),
      })
      setState({ success: true }); setBcc('')
    } catch (e) { setState({ error: errorText(e) }) } finally { setBusy(false) }
  }

  return <div className="ea-scrim ea-scrim--center ea-fade" role="dialog" aria-modal="true" aria-label="Send template">
    <section className="ea-modal" ref={dialogRef}>
      <header className="ea-drawer__head">
        <div><p className="ea-eyebrow">Manual send</p><h2>Send “{template.template_name || template.template_key}”</h2></div>
        <button type="button" className="ea-btn ea-btn--square-lg ea-ease ea-press" onClick={onClose} aria-label="Close"><CloseIcon/></button>
      </header>
      <div className="ea-drawer__body">
        {state.success
          ? <div className="ea-notice ea-notice--ok" role="status">Email submitted for delivery. BCC recipients are not displayed.</div>
          : <>
              {state.error && <div className="ea-notice" role="alert"><AlertIcon/>{state.error}</div>}
              <label className="ea-field"><span>To</span><textarea className="ea-textarea" rows={2} value={to} onChange={event => setTo(event.target.value)} placeholder="Separate addresses with commas or new lines"/></label>
              <div className="ea-pair">
                <label className="ea-field"><span>CC <em>· optional</em></span><textarea className="ea-textarea" rows={2} value={cc} onChange={event => setCc(event.target.value)}/></label>
                <label className="ea-field"><span>BCC <em>· optional</em></span><textarea className="ea-textarea" rows={2} value={bcc} onChange={event => setBcc(event.target.value)}/></label>
              </div>
              <label className="ea-field"><span>Variables <em>· JSON</em></span><textarea className="ea-textarea ea-textarea--mono" rows={4} value={variables} onChange={event => setVariables(event.target.value)}/></label>
              <div className="ea-pair">
                <label className="ea-field"><span>Source service <em>· optional</em></span><input className="ea-input" value={sourceService} onChange={event => setSourceService(event.target.value)}/></label>
                <label className="ea-field"><span>Reference ID <em>· optional</em></span><input className="ea-input" value={referenceId} onChange={event => setReferenceId(event.target.value)}/></label>
              </div>
            </>}
      </div>
      <footer className="ea-drawer__foot">
        <div/>
        <div>
          <button type="button" className="ea-btn ea-ease ea-press" onClick={onClose}>{state.success ? 'Close' : 'Cancel'}</button>
          {!state.success && <button type="button" className="ea-btn ea-btn--primary ea-ease ea-press" onClick={() => void send()} disabled={busy}>
            {busy && <span className="ea-spinner ea-spinner--on-brand"/>}{busy ? 'Sending…' : 'Send email'}
          </button>}
        </div>
      </footer>
    </section>
  </div>
}
