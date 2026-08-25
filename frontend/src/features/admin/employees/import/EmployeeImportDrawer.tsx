/**
 * Employee bulk import: Upload → Map Columns → Preview Changes → Results.
 *
 * Nothing is written until the operator confirms the preview. The import then
 * replays through the existing /api/users endpoints, so server-side validation,
 * permissions and business rules stay exactly as they are for single edits.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { readSpreadsheet } from './spreadsheet'
import type { SheetData } from './spreadsheet'
import { IMPORT_FIELDS, FIELD_BY_KEY, KEY_FIELD, autoMapColumns } from './importFields'
import type { ImportFieldKey } from './importFields'
import { buildCreatePayload, buildImportPlan, buildUpdatePayload, existingValue } from './importPlan'
import type { PlannedRow, RowStatus } from './importPlan'
import type { EmployeeRow } from '../../../../types/admin'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import './EmployeeImportDrawer.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit) => Promise<any>

type EmployeeImportDrawerProps = {
  employees: EmployeeRow[]
  apiRequest: ApiRequest
  onClose: () => void
  /** Called after a confirmed import so the dashboard can reload. */
  onImported: () => Promise<void> | void
  onDownloadTemplate?: () => void
}

type Step = 'upload' | 'map' | 'preview' | 'result'

type FailedRow = { sourceRow: number; empCode: string; name: string; message: string }

type ImportOutcome = { created: number; updated: number; failures: FailedRow[] }

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload file' },
  { id: 'map', label: 'Map columns' },
  { id: 'preview', label: 'Preview changes' },
  { id: 'result', label: 'Results' },
]

const STATUS_LABEL: Record<RowStatus, string> = {
  new: 'New',
  update: 'Update',
  unchanged: 'Unchanged',
  error: 'Error',
}

/** How many writes run at once — fast enough for large files, gentle on the API. */
const IMPORT_CONCURRENCY = 4

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function Icon({ name }: { name: 'upload' | 'file' | 'close' | 'arrow' | 'check' | 'alert' | 'sheet' }) {
  const paths: Record<string, string> = {
    upload: 'M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2',
    file: 'M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4Zm0 0v4h4',
    close: 'M18 6 6 18M6 6l12 12',
    arrow: 'M5 12h14m0 0-5-5m5 5-5 5',
    check: 'm5 13 4 4L19 7',
    alert: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
    sheet: 'M4 5h16v14H4zM4 10h16M9 10v9',
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function EmployeeImportDrawer({
  employees,
  apiRequest,
  onClose,
  onImported,
  onDownloadTemplate,
}: EmployeeImportDrawerProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mapping, setMapping] = useState<(ImportFieldKey | null)[]>([])
  const [allowBlankOverwrite, setAllowBlankOverwrite] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'all' | RowStatus>('all')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [running, setRunning] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  useDialogFocus({
    containerRef: panelRef,
    open: true,
    // Escape must not abandon an import that is mid-flight.
    onClose: running ? undefined : onClose,
  })

  // Stops in-flight writes if the wizard unmounts mid-import. The flag is reset
  // on mount because StrictMode/HMR run the cleanup of a throwaway first mount.
  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const plan = useMemo(() => {
    if (!sheet || mapping.length === 0) return null
    return buildImportPlan(sheet.rows, mapping, employees, { allowBlankOverwrite })
  }, [sheet, mapping, employees, allowBlankOverwrite])

  const keyColumnMapped = mapping.includes(KEY_FIELD)
  const mappedCount = mapping.filter(Boolean).length

  const loadFile = async (nextFile: File, sheetName?: string) => {
    setParsing(true)
    setParseError('')
    try {
      const data = await readSpreadsheet(nextFile, sheetName)
      if (data.rows.length === 0) throw new Error('This file has a header row but no employee rows.')
      setFile(nextFile)
      setSheet(data)
      setMapping(autoMapColumns(data.headers))
      setStep('map')
    } catch (error) {
      setFile(null)
      setSheet(null)
      setParseError(error instanceof Error ? error.message : 'Could not read this file.')
    } finally {
      setParsing(false)
    }
  }

  const switchSheet = async (sheetName: string) => {
    if (file) await loadFile(file, sheetName)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) void loadFile(dropped)
  }

  const updateMapping = (columnIndex: number, field: ImportFieldKey | null) => {
    setMapping((current) =>
      current.map((existing, index) => {
        if (index === columnIndex) return field
        // A field can only be fed by one column.
        return field && existing === field ? null : existing
      })
    )
  }

  const resetToUpload = () => {
    setFile(null)
    setSheet(null)
    setMapping([])
    setParseError('')
    setStep('upload')
  }

  const runImport = async () => {
    if (!plan) return
    const queue = plan.rows.filter((row) => row.status === 'new' || row.status === 'update')
    setRunning(true)
    setStep('result')
    setProgress({ done: 0, total: queue.length })

    const result: ImportOutcome = { created: 0, updated: 0, failures: [] }
    let cursor = 0

    const worker = async () => {
      while (cursor < queue.length && !cancelledRef.current) {
        const row = queue[cursor]
        cursor += 1
        try {
          if (row.status === 'new') {
            await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(buildCreatePayload(row)) })
            result.created += 1
          } else {
            await apiRequest(`/api/users/${encodeURIComponent(row.empCode)}`, {
              method: 'PUT',
              body: JSON.stringify(buildUpdatePayload(row)),
            })
            result.updated += 1
          }
        } catch (error) {
          result.failures.push({
            sourceRow: row.sourceRow,
            empCode: row.empCode,
            name: row.name,
            message: error instanceof Error ? error.message : 'Request failed',
          })
        }
        setProgress((current) => ({ ...current, done: current.done + 1 }))
      }
    }

    await Promise.all(Array.from({ length: Math.min(IMPORT_CONCURRENCY, queue.length) }, worker))

    result.failures.sort((left, right) => left.sourceRow - right.sourceRow)
    setOutcome(result)
    setRunning(false)
    await onImported()
  }

  /* ---------------------------------------------------------------- */

  const renderUpload = () => (
    <div className="empimp-step empimp-step--upload">
      <label
        className={`empimp-drop${dragging ? ' empimp-drop--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xlsm,text/csv"
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked) void loadFile(picked)
            event.target.value = ''
          }}
        />
        <span className="empimp-drop-icon" aria-hidden="true">
          <Icon name="upload" />
        </span>
        <strong>{parsing ? 'Reading file…' : 'Drop your file here, or click to browse'}</strong>
        <span className="empimp-drop-hint">Excel (.xlsx) or CSV — up to a few thousand rows</span>
      </label>

      {parseError && (
        <p className="empimp-alert empimp-alert--error" role="alert">
          <Icon name="alert" />
          {parseError}
        </p>
      )}

      <div className="empimp-upload-aside">
        <div className="empimp-note">
          <strong>How matching works</strong>
          <p>
            Rows are matched on <b>Employee ID</b>. An ID that already exists updates that employee — it never creates a
            duplicate. Only the columns you map are written; everything else keeps its current value.
          </p>
        </div>
        {onDownloadTemplate && (
          <button className="empimp-link-btn" type="button" onClick={onDownloadTemplate}>
            <Icon name="file" />
            Download the sample template
          </button>
        )}
      </div>
    </div>
  )

  const renderMap = () => {
    if (!sheet) return null
    const sampleFor = (columnIndex: number) =>
      sheet.rows.find((row) => (row[columnIndex] ?? '').trim())?.[columnIndex]?.trim() || '—'

    return (
      <div className="empimp-step">
        <div className="empimp-filebar">
          <span className="empimp-filebar-icon" aria-hidden="true"><Icon name="file" /></span>
          <div className="empimp-filebar-text">
            <strong>{file?.name}</strong>
            <span>
              {sheet.rows.length} rows · {sheet.headers.length} columns
              {file ? ` · ${formatBytes(file.size)}` : ''}
            </span>
          </div>
          {sheet.sheetNames && sheet.sheetNames.length > 1 && (
            <label className="empimp-sheet-pick">
              <Icon name="sheet" />
              <select value={sheet.sheetName} onChange={(event) => void switchSheet(event.target.value)}>
                {sheet.sheetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="empimp-link-btn" type="button" onClick={resetToUpload}>Choose another file</button>
        </div>

        {!keyColumnMapped && (
          <p className="empimp-alert empimp-alert--error" role="alert">
            <Icon name="alert" />
            Map a column to <b>Employee ID</b> — it is the identifier used to match existing employees.
          </p>
        )}

        <div className="empimp-map-head">
          <span>{mappedCount} of {sheet.headers.length} columns mapped</span>
          <button className="empimp-link-btn" type="button" onClick={() => setMapping(autoMapColumns(sheet.headers))}>
            Re-detect automatically
          </button>
        </div>

        <div className="empimp-map-grid" role="table">
          <div className="empimp-map-row empimp-map-row--head" role="row">
            <span role="columnheader">Column in your file</span>
            <span role="columnheader">Sample value</span>
            <span role="columnheader" aria-hidden="true" />
            <span role="columnheader">Employee field</span>
          </div>
          {sheet.headers.map((header, index) => {
            const selected = mapping[index]
            const meta = selected ? FIELD_BY_KEY.get(selected) : null
            return (
              <div className={`empimp-map-row${selected ? '' : ' empimp-map-row--skipped'}`} role="row" key={`${header}-${index}`}>
                <span className="empimp-map-source" role="cell">
                  <b>{header}</b>
                </span>
                <span className="empimp-map-sample" role="cell" title={sampleFor(index)}>{sampleFor(index)}</span>
                <span className="empimp-map-arrow" role="cell" aria-hidden="true"><Icon name="arrow" /></span>
                <span className="empimp-map-target" role="cell">
                  <select
                    value={selected || ''}
                    onChange={(event) => updateMapping(index, (event.target.value || null) as ImportFieldKey | null)}
                    aria-label={`Map column ${header}`}
                  >
                    <option value="">Don't import</option>
                    {IMPORT_FIELDS.map((field) => (
                      <option
                        key={field.key}
                        value={field.key}
                        disabled={mapping.includes(field.key) && selected !== field.key}
                      >
                        {field.label}
                        {field.requiredForCreate ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  {meta?.hint && <small>{meta.hint}</small>}
                </span>
              </div>
            )
          })}
        </div>
        <p className="empimp-footnote">* Required when a row creates a new employee.</p>
      </div>
    )
  }

  const renderPreview = () => {
    if (!plan) return null
    const visibleRows = previewFilter === 'all' ? plan.rows : plan.rows.filter((row) => row.status === previewFilter)
    const columns = plan.mappedFields.filter((field) => field !== KEY_FIELD)
    const roleIgnored = plan.mappedFields.includes('role') && plan.counts.update > 0

    return (
      <div className="empimp-step empimp-step--preview">
        <div className="empimp-summary" role="status">
          <span className="empimp-summary-total">{plan.rows.length} rows detected</span>
          {(['new', 'update', 'unchanged', 'error'] as RowStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={`empimp-chip empimp-chip--${status}${previewFilter === status ? ' empimp-chip--on' : ''}`}
              onClick={() => setPreviewFilter(previewFilter === status ? 'all' : status)}
              aria-pressed={previewFilter === status}
            >
              <b>{plan.counts[status]}</b>
              {status === 'new' ? 'new' : status === 'update' ? 'updates' : status === 'unchanged' ? 'unchanged' : 'errors'}
            </button>
          ))}
          {previewFilter !== 'all' && (
            <button className="empimp-link-btn" type="button" onClick={() => setPreviewFilter('all')}>Show all</button>
          )}
          <label className="empimp-toggle">
            <input
              type="checkbox"
              checked={allowBlankOverwrite}
              onChange={(event) => setAllowBlankOverwrite(event.target.checked)}
            />
            <span>Let blank cells clear existing values</span>
          </label>
        </div>

        {plan.counts.error > 0 && (
          <p className="empimp-alert empimp-alert--warn">
            <Icon name="alert" />
            {plan.counts.error} row{plan.counts.error === 1 ? '' : 's'} will be skipped because of errors. Fix them in the
            file and re-upload, or continue and import the rest.
          </p>
        )}
        {roleIgnored && (
          <p className="empimp-alert empimp-alert--info">
            <Icon name="alert" />
            System Role is applied to new employees only — it is ignored for rows that update an existing employee.
          </p>
        )}

        <div className="empimp-table-wrap">
          <table className="empimp-table">
            <thead>
              <tr>
                <th className="empimp-col-row">#</th>
                <th className="empimp-col-status">Action</th>
                <th>Employee ID</th>
                {columns.map((field) => (
                  <th key={field}>{FIELD_BY_KEY.get(field)?.label || field}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <PreviewRow key={row.sourceRow} row={row} columns={columns} />
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className="empimp-empty" colSpan={columns.length + 3}>No rows in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="empimp-legend">
          <span><i className="empimp-swatch empimp-swatch--update" /> value will be overwritten</span>
          <span><i className="empimp-swatch empimp-swatch--new" /> new value</span>
          <span><i className="empimp-swatch empimp-swatch--keep" /> unchanged / not mapped — kept as is</span>
        </div>
      </div>
    )
  }

  const renderResult = () => {
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 100
    return (
      <div className="empimp-step empimp-step--result">
        {running || !outcome ? (
          <div className="empimp-progress-block">
            <strong>Importing {progress.total} row{progress.total === 1 ? '' : 's'}…</strong>
            <div className="empimp-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <span className="empimp-progress-count">{progress.done} of {progress.total} processed</span>
            <p className="empimp-footnote">Please keep this window open until the import finishes.</p>
          </div>
        ) : (
          <>
            <div className={`empimp-result-hero${outcome.failures.length ? ' empimp-result-hero--partial' : ''}`}>
              <span className="empimp-result-icon" aria-hidden="true">
                <Icon name={outcome.failures.length ? 'alert' : 'check'} />
              </span>
              <div>
                <strong>{outcome.failures.length ? 'Import finished with some failures' : 'Import complete'}</strong>
                <p>
                  {outcome.created} created · {outcome.updated} updated
                  {plan ? ` · ${plan.counts.unchanged} unchanged · ${plan.counts.error} skipped` : ''}
                  {outcome.failures.length ? ` · ${outcome.failures.length} failed` : ''}
                </p>
              </div>
            </div>

            {outcome.failures.length > 0 && (
              <div className="empimp-failures">
                <strong>Rows that could not be imported</strong>
                <ul>
                  {outcome.failures.map((failure) => (
                    <li key={`${failure.sourceRow}-${failure.empCode}`}>
                      <span className="empimp-failure-row">Row {failure.sourceRow}</span>
                      <span className="empimp-failure-emp">{failure.empCode}{failure.name ? ` · ${failure.name}` : ''}</span>
                      <span className="empimp-failure-msg">{failure.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan && plan.counts.error > 0 && (
              <p className="empimp-footnote">
                {plan.counts.error} row{plan.counts.error === 1 ? ' was' : 's were'} skipped before the import because of
                validation errors in the file.
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  const stepIndex = STEPS.findIndex((entry) => entry.id === step)
  const canContinue =
    step === 'upload' ? Boolean(sheet) : step === 'map' ? keyColumnMapped : step === 'preview' ? Boolean(plan && plan.counts.new + plan.counts.update > 0) : false

  return (
    <div className="empimp-overlay" role="dialog" aria-modal="true" aria-label="Import employees">
      <button className="empimp-scrim" type="button" aria-label="Close import" onClick={() => !running && onClose()} />
      <div className="empimp-panel" ref={panelRef}>
        <header className="empimp-head">
          <div className="empimp-head-title">
            <h2>Import Employees</h2>
            <p>Upload a file, map its columns, and review every change before anything is saved.</p>
          </div>
          <button className="empimp-close" type="button" onClick={onClose} disabled={running} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>

        <ol className="empimp-steps">
          {STEPS.map((entry, index) => (
            <li
              key={entry.id}
              className={`empimp-steps-item${index === stepIndex ? ' empimp-steps-item--current' : ''}${index < stepIndex ? ' empimp-steps-item--done' : ''}`}
            >
              <span className="empimp-steps-dot">{index < stepIndex ? <Icon name="check" /> : index + 1}</span>
              {entry.label}
            </li>
          ))}
        </ol>

        <div className="empimp-body">
          {step === 'upload' && renderUpload()}
          {step === 'map' && renderMap()}
          {step === 'preview' && renderPreview()}
          {step === 'result' && renderResult()}
        </div>

        <footer className="empimp-foot">
          <div className="empimp-foot-info">
            {step === 'preview' && plan && (
              <span>
                <b>{plan.counts.new + plan.counts.update}</b> row{plan.counts.new + plan.counts.update === 1 ? '' : 's'} will be
                written · <b>{plan.counts.unchanged + plan.counts.error}</b> skipped
              </span>
            )}
          </div>
          <div className="empimp-foot-actions">
            {step === 'result' ? (
              <button className="empimp-btn empimp-btn--primary" type="button" onClick={onClose} disabled={running}>
                Done
              </button>
            ) : (
              <>
                <button className="empimp-btn" type="button" onClick={onClose}>Cancel</button>
                {step !== 'upload' && (
                  <button
                    className="empimp-btn"
                    type="button"
                    onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}
                  >
                    Back
                  </button>
                )}
                {step === 'preview' ? (
                  <button className="empimp-btn empimp-btn--primary" type="button" onClick={() => void runImport()} disabled={!canContinue}>
                    Confirm import
                  </button>
                ) : (
                  <button
                    className="empimp-btn empimp-btn--primary"
                    type="button"
                    onClick={() => setStep(step === 'upload' ? 'map' : 'preview')}
                    disabled={!canContinue}
                  >
                    Continue
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

/** One preview row — updates render an old → new diff per changed field. */
function PreviewRow({ row, columns }: { row: PlannedRow; columns: ImportFieldKey[] }) {
  const changeByField = new Map(row.changes.map((change) => [change.field, change]))

  return (
    <tr className={`empimp-row empimp-row--${row.status}`}>
      <td className="empimp-col-row">{row.sourceRow}</td>
      <td className="empimp-col-status">
        <span className={`empimp-badge empimp-badge--${row.status}`}>{STATUS_LABEL[row.status]}</span>
        {row.status === 'error' && (
          <ul className="empimp-row-errors">
            {row.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </td>
      <td className="empimp-cell-code">{row.empCode || <em>missing</em>}</td>
      {columns.map((field) => {
        const change = changeByField.get(field)
        if (change) {
          return (
            <td key={field} className={`empimp-cell empimp-cell--changed${change.clearing ? ' empimp-cell--clearing' : ''}`}>
              <span className="empimp-diff">
                <span className="empimp-diff-from">{change.from || '—'}</span>
                <span className="empimp-diff-arrow" aria-hidden="true">→</span>
                <span className="empimp-diff-to">{change.to || <em>blank</em>}</span>
              </span>
            </td>
          )
        }
        const incoming = row.values[field]
        if (row.status === 'new') {
          return (
            <td key={field} className={incoming ? 'empimp-cell empimp-cell--fresh' : 'empimp-cell empimp-cell--muted'}>
              {incoming || '—'}
            </td>
          )
        }
        // Not changing: show what the record will keep.
        const kept = incoming ?? (row.existing ? existingValue(row.existing, field) : '')
        return (
          <td key={field} className="empimp-cell empimp-cell--muted">
            {kept || '—'}
          </td>
        )
      })}
    </tr>
  )
}
