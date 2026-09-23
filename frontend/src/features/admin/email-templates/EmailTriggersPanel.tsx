import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '../hooks/useDialogFocus'

type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>
type TriggerType = 'manual' | 'event' | 'schedule'
type EmailTrigger = { id?: number | string; trigger_key: string; trigger_name: string; template_key: string; trigger_type: TriggerType; event_name?: string | null; schedule_cron?: string | null; to_recipients: string[]; cc_recipients: string[]; bcc_recipients: string[]; variables: Record<string, unknown>; audience?: string | null; active: boolean; next_run_at?: string | null; last_run_at?: string | null; last_status?: string | null; last_error?: string | null }
type EmailEvent = { eventName: string; label: string; variables: string[] }
type EmailAudience = { audience: string; label: string; variables: string[] }
type Props = { apiRequest: ApiRequest; templateKeys: string[] }
const endpoint = '/api/admin/email'
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'
const splitRecipients = (value: string) => value.split(/[\n,]+/).map(item => item.trim()).filter(Boolean)
const typeLabel: Record<TriggerType, string> = { manual: 'Manual', event: 'Automatic · event', schedule: 'Automatic · schedule' }
const blank: EmailTrigger = { trigger_key: '', trigger_name: '', template_key: '', trigger_type: 'event', event_name: '', schedule_cron: '0 9 * * 1-5', to_recipients: [], cc_recipients: [], bcc_recipients: [], variables: {}, audience: null, active: true }

export default function EmailTriggersPanel({ apiRequest, templateKeys }: Props) {
  const [items, setItems] = useState<EmailTrigger[]>([]); const [events, setEvents] = useState<EmailEvent[]>([]); const [audiences, setAudiences] = useState<EmailAudience[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [editing, setEditing] = useState<EmailTrigger | null>(null); const [running, setRunning] = useState<EmailTrigger | null>(null)
  const apiRequestRef = useRef(apiRequest)
  useEffect(() => { apiRequestRef.current = apiRequest }, [apiRequest])
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [t, e, a] = await Promise.all([apiRequestRef.current(`${endpoint}/triggers`), apiRequestRef.current(`${endpoint}/events`), apiRequestRef.current(`${endpoint}/audiences`)]); setItems(Array.isArray(t?.data) ? t.data : []); setEvents(Array.isArray(e?.data) ? e.data : []); setAudiences(Array.isArray(a?.data) ? a.data : []) } catch (err) { setError(errorText(err)) } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const act = async (path: string, method = 'POST') => { try { await apiRequestRef.current(path, { method, body: method === 'DELETE' ? undefined : '{}' }); await load() } catch (e) { setError(errorText(e)) } }
  const when = (item: EmailTrigger) => item.trigger_type === 'event' ? <code className="et-key">{item.event_name}</code> : item.trigger_type === 'schedule' ? <><code className="et-key">{item.schedule_cron}</code>{item.audience && <div className="adm-cell-secondary">each: {item.audience}</div>}{item.next_run_at && <div className="adm-cell-secondary">next {new Date(item.next_run_at).toLocaleString()}</div>}</> : <span className="adm-cell-secondary">On demand</span>
  return <section className="adm-table-card table-card">
    <div className="adm-table-toolbar"><div className="adm-table-title"><strong>{items.length} {items.length === 1 ? 'trigger' : 'triggers'}</strong><span>Manual triggers send on demand; automatic triggers fire on app events or a schedule</span></div><div className="adm-header__actions"><button className="adm-btn adm-btn--icon" onClick={() => void load()} aria-label="Reload triggers">↻</button><button className="adm-btn adm-btn--primary" onClick={() => setEditing({ ...blank, template_key: templateKeys[0] || '' })} disabled={!templateKeys.length}>+ New trigger</button></div></div>
    {error && <div className="et-notice" role="alert">{error}</div>}
    {loading ? <div className="adm-empty empty-state"><strong>Loading triggers…</strong></div> : items.length ? <div className="adm-table-scroll table-scroll"><table className="adm-table dashboard-table"><thead><tr><th>Trigger</th><th>Type</th><th>When</th><th>Template</th><th>Last run</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(item => <tr key={item.trigger_key}>
      <td><span className="adm-cell-primary">{item.trigger_name}</span><div className="adm-cell-secondary">{item.trigger_key}</div></td>
      <td>{typeLabel[item.trigger_type]}</td><td>{when(item)}</td><td><code className="et-key">{item.template_key}</code></td>
      <td className="adm-cell-secondary" title={item.last_error || undefined}>{item.last_run_at ? `${new Date(item.last_run_at).toLocaleString()} · ${item.last_status}` : '—'}</td>
      <td><span className={`adm-pill table-pill adm-pill--${item.active ? 'active' : 'inactive'}`}>{item.active ? 'Enabled' : 'Disabled'}</span></td>
      <td><div className="adm-actions"><button className="adm-action-btn adm-action-btn--view" onClick={() => setRunning(item)}>Run now</button><button className="adm-action-btn" onClick={() => setEditing(item)}>Edit</button><button className="adm-action-btn" onClick={() => void act(`${endpoint}/triggers/${encodeURIComponent(item.trigger_key)}/${item.active ? 'disable' : 'enable'}`)}>{item.active ? 'Disable' : 'Enable'}</button><button className="adm-action-btn" onClick={() => void act(`${endpoint}/triggers/${encodeURIComponent(item.trigger_key)}`, 'DELETE')}>Delete</button></div></td>
    </tr>)}</tbody></table></div> : <div className="adm-empty empty-state"><strong>No triggers yet</strong><span>{templateKeys.length ? 'Bind a template to an event, a schedule, or a manual send.' : 'Create a template first, then add a trigger for it.'}</span></div>}
    {editing && createPortal(<TriggerEditor trigger={editing} events={events} audiences={audiences} templateKeys={templateKeys} apiRequest={apiRequest} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }}/>, document.body)}
    {running && createPortal(<RunDialog trigger={running} apiRequest={apiRequest} onClose={() => { setRunning(null); void load() }}/>, document.body)}
  </section>
}

function TriggerEditor({ trigger, events, audiences, templateKeys, apiRequest, onClose, onSaved }: { trigger: EmailTrigger; events: EmailEvent[]; audiences: EmailAudience[]; templateKeys: string[]; apiRequest: ApiRequest; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null); useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  const [form, setForm] = useState<EmailTrigger>({ ...blank, ...trigger, event_name: trigger.event_name || events[0]?.eventName || '', schedule_cron: trigger.schedule_cron || blank.schedule_cron })
  const [to, setTo] = useState(trigger.to_recipients.join('\n')); const [cc, setCc] = useState(trigger.cc_recipients.join('\n')); const [bcc, setBcc] = useState(trigger.bcc_recipients.join('\n'))
  const [varsText, setVarsText] = useState(JSON.stringify(trigger.variables || {}, null, 2)); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const change = <K extends keyof EmailTrigger>(key: K, value: EmailTrigger[K]) => setForm(old => ({ ...old, [key]: value }))
  const selectedEvent = events.find(e => e.eventName === form.event_name); const selectedAudience = audiences.find(a => a.audience === form.audience)
  const save = async () => {
    let variables: Record<string, unknown>; try { variables = JSON.parse(varsText || '{}') } catch { return setError('Default variables must be valid JSON.') }
    setSaving(true); setError('')
    try { const isNew = !trigger.id; await apiRequest(`${endpoint}/triggers${isNew ? '' : `/${encodeURIComponent(trigger.trigger_key)}`}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify({ triggerKey: form.trigger_key, triggerName: form.trigger_name, templateKey: form.template_key, triggerType: form.trigger_type, eventName: form.event_name, scheduleCron: form.schedule_cron, toRecipients: splitRecipients(to), ccRecipients: splitRecipients(cc), bccRecipients: splitRecipients(bcc), variables, audience: form.trigger_type === 'schedule' ? form.audience || null : null, active: form.active }) }); onSaved() } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }
  return <div className="et-overlay" role="dialog" aria-modal="true" aria-label="Email trigger editor"><section className="et-drawer" ref={dialogRef}><header className="et-drawer-head"><div><p className="et-eyebrow">Trigger setup</p><h2>{trigger.id ? 'Edit trigger' : 'New trigger'}</h2></div><button className="et-close" onClick={onClose} aria-label="Close">×</button></header>{error && <div className="et-notice" role="alert">{error}</div>}
    <div className="et-editor-grid"><form className="et-form" onSubmit={e => { e.preventDefault(); void save() }}>
      <label>Trigger key<input value={form.trigger_key} disabled={Boolean(trigger.id)} onChange={e => change('trigger_key', e.target.value)} placeholder="leave_applied_manager"/></label>
      <label>Trigger name<input value={form.trigger_name} onChange={e => change('trigger_name', e.target.value)}/></label>
      <label>Template<select value={form.template_key} onChange={e => change('template_key', e.target.value)}>{templateKeys.map(k => <option key={k} value={k}>{k}</option>)}</select></label>
      <label>Type<select value={form.trigger_type} onChange={e => change('trigger_type', e.target.value as TriggerType)}><option value="event">Automatic — when an app event happens</option><option value="schedule">Automatic — on a schedule</option><option value="manual">Manual — only when I click Run now</option></select></label>
      {form.trigger_type === 'event' && <label>Event<select value={form.event_name || ''} onChange={e => change('event_name', e.target.value)}>{events.map(ev => <option key={ev.eventName} value={ev.eventName}>{ev.label} ({ev.eventName})</option>)}</select></label>}
      {form.trigger_type === 'schedule' && <label>Cron schedule<input value={form.schedule_cron || ''} onChange={e => change('schedule_cron', e.target.value)} placeholder="0 9 * * 1-5"/><span className="et-muted">minute hour day month weekday — e.g. <code>0 9 * * 1-5</code> = 9:00 on weekdays</span></label>}
      {form.trigger_type === 'schedule' && <label>Send to<select value={form.audience || ''} onChange={e => change('audience', e.target.value || null)}><option value="">One email per run</option>{audiences.map(a => <option key={a.audience} value={a.audience}>One email per person — {a.label}</option>)}</select></label>}
      <label>To {form.trigger_type === 'manual' && <span className="et-muted">optional default</span>}<textarea value={to} onChange={e => setTo(e.target.value)} rows={2} placeholder={form.trigger_type === 'event' ? '{{employee_email}}' : 'team@example.com'}/></label>
      <label>CC <span className="et-muted">optional</span><textarea value={cc} onChange={e => setCc(e.target.value)} rows={2}/></label>
      <label>BCC <span className="et-muted">optional</span><textarea value={bcc} onChange={e => setBcc(e.target.value)} rows={2}/></label>
      <label>Default variables JSON<textarea value={varsText} onChange={e => setVarsText(e.target.value)} rows={4}/></label>
      <label className="et-toggle"><input type="checkbox" checked={form.active} onChange={e => change('active', e.target.checked)}/><span>Trigger is enabled</span></label>
      <footer><button type="button" className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn adm-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save trigger'}</button></footer>
    </form><aside className="et-preview"><div><p className="et-eyebrow">Available variables</p><h3>{form.trigger_type === 'event' ? selectedEvent?.label || 'Event' : form.trigger_type === 'schedule' ? 'Scheduled run' : 'Manual run'}</h3><p>Use these in the template and in recipient fields, e.g. <code>{'{{manager_email}}'}</code>. Blank recipients are skipped. <code>designation:CMD</code> sends to every active employee with that designation.</p></div>
      <div className="et-mail"><pre>{form.trigger_type === 'event' ? (selectedEvent?.variables || []).map(v => `{{${v}}}`).join('\n') : form.trigger_type === 'schedule' ? (selectedAudience ? [...selectedAudience.variables].map(v => `{{${v}}}`).join('\n') : '{{run_date}}\n{{run_time}}\n+ default variables') : 'Default variables, plus any\nsupplied when you click Run now'}</pre></div></aside></div></section></div>
}

function RunDialog({ trigger, apiRequest, onClose }: { trigger: EmailTrigger; apiRequest: ApiRequest; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null); useDialogFocus({ containerRef: dialogRef, open: true, onClose })
  // Only literal addresses are pre-filled: placeholders and designation: lists would reach real people in a test.
  const literal = (list: string[]) => list.filter(v => !v.includes('{{') && !v.toLowerCase().startsWith('designation:')).join('\n')
  const dynamic = [...trigger.to_recipients, ...trigger.cc_recipients, ...trigger.bcc_recipients].filter(v => v.includes('{{') || v.toLowerCase().startsWith('designation:'))
  const [to, setTo] = useState(literal(trigger.to_recipients)); const [cc, setCc] = useState(literal(trigger.cc_recipients)); const [bcc, setBcc] = useState(literal(trigger.bcc_recipients)); const [variables, setVariables] = useState(JSON.stringify(trigger.variables || {}, null, 2))
  const [state, setState] = useState<{ error?: string; message?: string }>({}); const [busy, setBusy] = useState(false)
  const run = async () => {
    let parsed: Record<string, unknown>; try { parsed = JSON.parse(variables || '{}') } catch { return setState({ error: 'Variables must be valid JSON.' }) }
    setBusy(true); setState({})
    try { const r = await apiRequest(`${endpoint}/triggers/${encodeURIComponent(trigger.trigger_key)}/run`, { method: 'POST', body: JSON.stringify({ to: splitRecipients(to), cc: splitRecipients(cc), bcc: splitRecipients(bcc), variables: parsed }) }); setState(r?.success ? { message: `Sent${r.messageId ? ` (id ${r.messageId})` : ''}.` } : { error: r?.message || 'Not sent.' }) } catch (e) { setState({ error: errorText(e) }) } finally { setBusy(false) }
  }
  return <div className="et-overlay" role="dialog" aria-modal="true" aria-label="Run trigger"><section className="et-dialog" ref={dialogRef}><header className="et-drawer-head"><div><p className="et-eyebrow">Manual trigger</p><h2>Run “{trigger.trigger_name}”</h2></div><button className="et-close" onClick={onClose} aria-label="Close">×</button></header>
    {state.message ? <div className="et-success" role="status">{state.message}</div> : <div className="et-form">
      <label>To<textarea value={to} onChange={e => setTo(e.target.value)} rows={2} placeholder="Separate addresses with commas or new lines"/></label>
      <label>CC <span className="et-muted">optional</span><textarea value={cc} onChange={e => setCc(e.target.value)} rows={2}/></label>
      <label>BCC <span className="et-muted">optional</span><textarea value={bcc} onChange={e => setBcc(e.target.value)} rows={2}/></label>
      {dynamic.length > 0 && <p className="et-help">Test send: automatic recipients ({dynamic.join(', ')}) are not used here, so only the addresses above receive it. Placeholders are filled with {trigger.audience ? 'the first matching employee' : 'your own employee record'}.</p>}
      <label>Variables JSON<textarea value={variables} onChange={e => setVariables(e.target.value)} rows={6}/></label>
      {state.error && <div className="et-notice" role="alert">{state.error}</div>}
      <footer><button className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn adm-btn--primary" onClick={() => void run()} disabled={busy}>{busy ? 'Sending…' : 'Send now'}</button></footer>
    </div>}</section></div>
}
