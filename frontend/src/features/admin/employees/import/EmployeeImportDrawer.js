"use strict";
/**
 * Employee bulk import: Upload → Map Columns → Preview Changes → Results.
 *
 * Nothing is written until the operator confirms the preview. The import then
 * replays through the existing /api/users endpoints, so server-side validation,
 * permissions and business rules stay exactly as they are for single edits.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmployeeImportDrawer;
var react_1 = require("react");
var spreadsheet_1 = require("./spreadsheet");
var importFields_1 = require("./importFields");
var importPlan_1 = require("./importPlan");
var useDialogFocus_1 = require("../../hooks/useDialogFocus");
require("./EmployeeImportDrawer.css");
var STEPS = [
    { id: 'upload', label: 'Upload file' },
    { id: 'map', label: 'Map columns' },
    { id: 'preview', label: 'Preview changes' },
    { id: 'result', label: 'Results' },
];
var STATUS_LABEL = {
    new: 'New',
    update: 'Update',
    unchanged: 'Unchanged',
    error: 'Error',
};
/** How many writes run at once — fast enough for large files, gentle on the API. */
var IMPORT_CONCURRENCY = 4;
var formatBytes = function (bytes) {
    return bytes < 1024 ? "".concat(bytes, " B") : bytes < 1024 * 1024 ? "".concat((bytes / 1024).toFixed(0), " KB") : "".concat((bytes / 1024 / 1024).toFixed(1), " MB");
};
function Icon(_a) {
    var name = _a.name;
    var paths = {
        upload: 'M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2',
        file: 'M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4Zm0 0v4h4',
        close: 'M18 6 6 18M6 6l12 12',
        arrow: 'M5 12h14m0 0-5-5m5 5-5 5',
        check: 'm5 13 4 4L19 7',
        alert: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
        sheet: 'M4 5h16v14H4zM4 10h16M9 10v9',
    };
    return (<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>);
}
function EmployeeImportDrawer(_a) {
    var _this = this;
    var employees = _a.employees, apiRequest = _a.apiRequest, onClose = _a.onClose, onImported = _a.onImported, onDownloadTemplate = _a.onDownloadTemplate;
    var _b = (0, react_1.useState)('upload'), step = _b[0], setStep = _b[1];
    var _c = (0, react_1.useState)(null), file = _c[0], setFile = _c[1];
    var _d = (0, react_1.useState)(null), sheet = _d[0], setSheet = _d[1];
    var _e = (0, react_1.useState)(''), parseError = _e[0], setParseError = _e[1];
    var _f = (0, react_1.useState)(false), parsing = _f[0], setParsing = _f[1];
    var _g = (0, react_1.useState)(false), dragging = _g[0], setDragging = _g[1];
    var _h = (0, react_1.useState)([]), mapping = _h[0], setMapping = _h[1];
    var _j = (0, react_1.useState)(false), allowBlankOverwrite = _j[0], setAllowBlankOverwrite = _j[1];
    var _k = (0, react_1.useState)('all'), previewFilter = _k[0], setPreviewFilter = _k[1];
    var _l = (0, react_1.useState)({ done: 0, total: 0 }), progress = _l[0], setProgress = _l[1];
    var _m = (0, react_1.useState)(null), outcome = _m[0], setOutcome = _m[1];
    var _o = (0, react_1.useState)(false), running = _o[0], setRunning = _o[1];
    var fileInputRef = (0, react_1.useRef)(null);
    var panelRef = (0, react_1.useRef)(null);
    var cancelledRef = (0, react_1.useRef)(false);
    (0, useDialogFocus_1.useDialogFocus)({
        containerRef: panelRef,
        open: true,
        // Escape must not abandon an import that is mid-flight.
        onClose: running ? undefined : onClose,
    });
    // Stops in-flight writes if the wizard unmounts mid-import. The flag is reset
    // on mount because StrictMode/HMR run the cleanup of a throwaway first mount.
    (0, react_1.useEffect)(function () {
        cancelledRef.current = false;
        return function () {
            cancelledRef.current = true;
        };
    }, []);
    var plan = (0, react_1.useMemo)(function () {
        if (!sheet || mapping.length === 0)
            return null;
        return (0, importPlan_1.buildImportPlan)(sheet.rows, mapping, employees, { allowBlankOverwrite: allowBlankOverwrite });
    }, [sheet, mapping, employees, allowBlankOverwrite]);
    var keyColumnMapped = mapping.includes(importFields_1.KEY_FIELD);
    var mappedCount = mapping.filter(Boolean).length;
    var loadFile = function (nextFile, sheetName) { return __awaiter(_this, void 0, void 0, function () {
        var data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setParsing(true);
                    setParseError('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, spreadsheet_1.readSpreadsheet)(nextFile, sheetName)];
                case 2:
                    data = _a.sent();
                    if (data.rows.length === 0)
                        throw new Error('This file has a header row but no employee rows.');
                    setFile(nextFile);
                    setSheet(data);
                    setMapping((0, importFields_1.autoMapColumns)(data.headers));
                    setStep('map');
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    setFile(null);
                    setSheet(null);
                    setParseError(error_1 instanceof Error ? error_1.message : 'Could not read this file.');
                    return [3 /*break*/, 5];
                case 4:
                    setParsing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var switchSheet = function (sheetName) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, loadFile(file, sheetName)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    var handleDrop = function (event) {
        var _a;
        event.preventDefault();
        setDragging(false);
        var dropped = (_a = event.dataTransfer.files) === null || _a === void 0 ? void 0 : _a[0];
        if (dropped)
            void loadFile(dropped);
    };
    var updateMapping = function (columnIndex, field) {
        setMapping(function (current) {
            return current.map(function (existing, index) {
                if (index === columnIndex)
                    return field;
                // A field can only be fed by one column.
                return field && existing === field ? null : existing;
            });
        });
    };
    var resetToUpload = function () {
        setFile(null);
        setSheet(null);
        setMapping([]);
        setParseError('');
        setStep('upload');
    };
    var runImport = function () { return __awaiter(_this, void 0, void 0, function () {
        var queue, result, cursor, worker;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!plan)
                        return [2 /*return*/];
                    queue = plan.rows.filter(function (row) { return row.status === 'new' || row.status === 'update'; });
                    setRunning(true);
                    setStep('result');
                    setProgress({ done: 0, total: queue.length });
                    result = { created: 0, updated: 0, failures: [] };
                    cursor = 0;
                    worker = function () { return __awaiter(_this, void 0, void 0, function () {
                        var row, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!(cursor < queue.length && !cancelledRef.current)) return [3 /*break*/, 8];
                                    row = queue[cursor];
                                    cursor += 1;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 6, , 7]);
                                    if (!(row.status === 'new')) return [3 /*break*/, 3];
                                    return [4 /*yield*/, apiRequest('/api/users', { method: 'POST', body: JSON.stringify((0, importPlan_1.buildCreatePayload)(row)) })];
                                case 2:
                                    _a.sent();
                                    result.created += 1;
                                    return [3 /*break*/, 5];
                                case 3: return [4 /*yield*/, apiRequest("/api/users/".concat(encodeURIComponent(row.empCode)), {
                                        method: 'PUT',
                                        body: JSON.stringify((0, importPlan_1.buildUpdatePayload)(row)),
                                    })];
                                case 4:
                                    _a.sent();
                                    result.updated += 1;
                                    _a.label = 5;
                                case 5: return [3 /*break*/, 7];
                                case 6:
                                    error_2 = _a.sent();
                                    result.failures.push({
                                        sourceRow: row.sourceRow,
                                        empCode: row.empCode,
                                        name: row.name,
                                        message: error_2 instanceof Error ? error_2.message : 'Request failed',
                                    });
                                    return [3 /*break*/, 7];
                                case 7:
                                    setProgress(function (current) { return (__assign(__assign({}, current), { done: current.done + 1 })); });
                                    return [3 /*break*/, 0];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, Promise.all(Array.from({ length: Math.min(IMPORT_CONCURRENCY, queue.length) }, worker))];
                case 1:
                    _a.sent();
                    result.failures.sort(function (left, right) { return left.sourceRow - right.sourceRow; });
                    setOutcome(result);
                    setRunning(false);
                    return [4 /*yield*/, onImported()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    /* ---------------------------------------------------------------- */
    var renderUpload = function () { return (<div className="empimp-step empimp-step--upload">
      <label className={"empimp-drop".concat(dragging ? ' empimp-drop--active' : '')} onDragOver={function (event) {
            event.preventDefault();
            setDragging(true);
        }} onDragLeave={function () { return setDragging(false); }} onDrop={handleDrop}>
        <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xlsx,.xlsm,text/csv" onChange={function (event) {
            var _a;
            var picked = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (picked)
                void loadFile(picked);
            event.target.value = '';
        }}/>
        <span className="empimp-drop-icon" aria-hidden="true">
          <Icon name="upload"/>
        </span>
        <strong>{parsing ? 'Reading file…' : 'Drop your file here, or click to browse'}</strong>
        <span className="empimp-drop-hint">Excel (.xlsx) or CSV — up to a few thousand rows</span>
      </label>

      {parseError && (<p className="empimp-alert empimp-alert--error" role="alert">
          <Icon name="alert"/>
          {parseError}
        </p>)}

      <div className="empimp-upload-aside">
        <div className="empimp-note">
          <strong>How matching works</strong>
          <p>
            Rows are matched on <b>Employee ID</b>. An ID that already exists updates that employee — it never creates a
            duplicate. Only the columns you map are written; everything else keeps its current value.
          </p>
        </div>
        {onDownloadTemplate && (<button className="empimp-link-btn" type="button" onClick={onDownloadTemplate}>
            <Icon name="file"/>
            Download the sample template
          </button>)}
      </div>
    </div>); };
    var renderMap = function () {
        if (!sheet)
            return null;
        var sampleFor = function (columnIndex) { var _a, _b; return ((_b = (_a = sheet.rows.find(function (row) { var _a; return ((_a = row[columnIndex]) !== null && _a !== void 0 ? _a : '').trim(); })) === null || _a === void 0 ? void 0 : _a[columnIndex]) === null || _b === void 0 ? void 0 : _b.trim()) || '—'; };
        return (<div className="empimp-step">
        <div className="empimp-filebar">
          <span className="empimp-filebar-icon" aria-hidden="true"><Icon name="file"/></span>
          <div className="empimp-filebar-text">
            <strong>{file === null || file === void 0 ? void 0 : file.name}</strong>
            <span>
              {sheet.rows.length} rows · {sheet.headers.length} columns
              {file ? " \u00B7 ".concat(formatBytes(file.size)) : ''}
            </span>
          </div>
          {sheet.sheetNames && sheet.sheetNames.length > 1 && (<label className="empimp-sheet-pick">
              <Icon name="sheet"/>
              <select value={sheet.sheetName} onChange={function (event) { return void switchSheet(event.target.value); }}>
                {sheet.sheetNames.map(function (name) { return (<option key={name} value={name}>{name}</option>); })}
              </select>
            </label>)}
          <button className="empimp-link-btn" type="button" onClick={resetToUpload}>Choose another file</button>
        </div>

        {!keyColumnMapped && (<p className="empimp-alert empimp-alert--error" role="alert">
            <Icon name="alert"/>
            Map a column to <b>Employee ID</b> — it is the identifier used to match existing employees.
          </p>)}

        <div className="empimp-map-head">
          <span>{mappedCount} of {sheet.headers.length} columns mapped</span>
          <button className="empimp-link-btn" type="button" onClick={function () { return setMapping((0, importFields_1.autoMapColumns)(sheet.headers)); }}>
            Re-detect automatically
          </button>
        </div>

        <div className="empimp-map-grid" role="table">
          <div className="empimp-map-row empimp-map-row--head" role="row">
            <span role="columnheader">Column in your file</span>
            <span role="columnheader">Sample value</span>
            <span role="columnheader" aria-hidden="true"/>
            <span role="columnheader">Employee field</span>
          </div>
          {sheet.headers.map(function (header, index) {
                var selected = mapping[index];
                var meta = selected ? importFields_1.FIELD_BY_KEY.get(selected) : null;
                return (<div className={"empimp-map-row".concat(selected ? '' : ' empimp-map-row--skipped')} role="row" key={"".concat(header, "-").concat(index)}>
                <span className="empimp-map-source" role="cell">
                  <b>{header}</b>
                </span>
                <span className="empimp-map-sample" role="cell" title={sampleFor(index)}>{sampleFor(index)}</span>
                <span className="empimp-map-arrow" role="cell" aria-hidden="true"><Icon name="arrow"/></span>
                <span className="empimp-map-target" role="cell">
                  <select value={selected || ''} onChange={function (event) { return updateMapping(index, (event.target.value || null)); }} aria-label={"Map column ".concat(header)}>
                    <option value="">Don't import</option>
                    {importFields_1.IMPORT_FIELDS.map(function (field) { return (<option key={field.key} value={field.key} disabled={mapping.includes(field.key) && selected !== field.key}>
                        {field.label}
                        {field.requiredForCreate ? ' *' : ''}
                      </option>); })}
                  </select>
                  {(meta === null || meta === void 0 ? void 0 : meta.hint) && <small>{meta.hint}</small>}
                </span>
              </div>);
            })}
        </div>
        <p className="empimp-footnote">* Required when a row creates a new employee.</p>
      </div>);
    };
    var renderPreview = function () {
        if (!plan)
            return null;
        var visibleRows = previewFilter === 'all' ? plan.rows : plan.rows.filter(function (row) { return row.status === previewFilter; });
        var columns = plan.mappedFields.filter(function (field) { return field !== importFields_1.KEY_FIELD; });
        var roleIgnored = plan.mappedFields.includes('role') && plan.counts.update > 0;
        return (<div className="empimp-step empimp-step--preview">
        <div className="empimp-summary" role="status">
          <span className="empimp-summary-total">{plan.rows.length} rows detected</span>
          {['new', 'update', 'unchanged', 'error'].map(function (status) { return (<button key={status} type="button" className={"empimp-chip empimp-chip--".concat(status).concat(previewFilter === status ? ' empimp-chip--on' : '')} onClick={function () { return setPreviewFilter(previewFilter === status ? 'all' : status); }} aria-pressed={previewFilter === status}>
              <b>{plan.counts[status]}</b>
              {status === 'new' ? 'new' : status === 'update' ? 'updates' : status === 'unchanged' ? 'unchanged' : 'errors'}
            </button>); })}
          {previewFilter !== 'all' && (<button className="empimp-link-btn" type="button" onClick={function () { return setPreviewFilter('all'); }}>Show all</button>)}
          <label className="empimp-toggle">
            <input type="checkbox" checked={allowBlankOverwrite} onChange={function (event) { return setAllowBlankOverwrite(event.target.checked); }}/>
            <span>Let blank cells clear existing values</span>
          </label>
        </div>

        {plan.counts.error > 0 && (<p className="empimp-alert empimp-alert--warn">
            <Icon name="alert"/>
            {plan.counts.error} row{plan.counts.error === 1 ? '' : 's'} will be skipped because of errors. Fix them in the
            file and re-upload, or continue and import the rest.
          </p>)}
        {roleIgnored && (<p className="empimp-alert empimp-alert--info">
            <Icon name="alert"/>
            System Role is applied to new employees only — it is ignored for rows that update an existing employee.
          </p>)}

        <div className="empimp-table-wrap">
          <table className="empimp-table">
            <thead>
              <tr>
                <th className="empimp-col-row">#</th>
                <th className="empimp-col-status">Action</th>
                <th>Employee ID</th>
                {columns.map(function (field) {
                var _a;
                return (<th key={field}>{((_a = importFields_1.FIELD_BY_KEY.get(field)) === null || _a === void 0 ? void 0 : _a.label) || field}</th>);
            })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(function (row) { return (<PreviewRow key={row.sourceRow} row={row} columns={columns}/>); })}
              {visibleRows.length === 0 && (<tr>
                  <td className="empimp-empty" colSpan={columns.length + 3}>No rows in this category.</td>
                </tr>)}
            </tbody>
          </table>
        </div>

        <div className="empimp-legend">
          <span><i className="empimp-swatch empimp-swatch--update"/> value will be overwritten</span>
          <span><i className="empimp-swatch empimp-swatch--new"/> new value</span>
          <span><i className="empimp-swatch empimp-swatch--keep"/> unchanged / not mapped — kept as is</span>
        </div>
      </div>);
    };
    var renderResult = function () {
        var percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 100;
        return (<div className="empimp-step empimp-step--result">
        {running || !outcome ? (<div className="empimp-progress-block">
            <strong>Importing {progress.total} row{progress.total === 1 ? '' : 's'}…</strong>
            <div className="empimp-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: "".concat(percent, "%") }}/>
            </div>
            <span className="empimp-progress-count">{progress.done} of {progress.total} processed</span>
            <p className="empimp-footnote">Please keep this window open until the import finishes.</p>
          </div>) : (<>
            <div className={"empimp-result-hero".concat(outcome.failures.length ? ' empimp-result-hero--partial' : '')}>
              <span className="empimp-result-icon" aria-hidden="true">
                <Icon name={outcome.failures.length ? 'alert' : 'check'}/>
              </span>
              <div>
                <strong>{outcome.failures.length ? 'Import finished with some failures' : 'Import complete'}</strong>
                <p>
                  {outcome.created} created · {outcome.updated} updated
                  {plan ? " \u00B7 ".concat(plan.counts.unchanged, " unchanged \u00B7 ").concat(plan.counts.error, " skipped") : ''}
                  {outcome.failures.length ? " \u00B7 ".concat(outcome.failures.length, " failed") : ''}
                </p>
              </div>
            </div>

            {outcome.failures.length > 0 && (<div className="empimp-failures">
                <strong>Rows that could not be imported</strong>
                <ul>
                  {outcome.failures.map(function (failure) { return (<li key={"".concat(failure.sourceRow, "-").concat(failure.empCode)}>
                      <span className="empimp-failure-row">Row {failure.sourceRow}</span>
                      <span className="empimp-failure-emp">{failure.empCode}{failure.name ? " \u00B7 ".concat(failure.name) : ''}</span>
                      <span className="empimp-failure-msg">{failure.message}</span>
                    </li>); })}
                </ul>
              </div>)}

            {plan && plan.counts.error > 0 && (<p className="empimp-footnote">
                {plan.counts.error} row{plan.counts.error === 1 ? ' was' : 's were'} skipped before the import because of
                validation errors in the file.
              </p>)}
          </>)}
      </div>);
    };
    var stepIndex = STEPS.findIndex(function (entry) { return entry.id === step; });
    var canContinue = step === 'upload' ? Boolean(sheet) : step === 'map' ? keyColumnMapped : step === 'preview' ? Boolean(plan && plan.counts.new + plan.counts.update > 0) : false;
    return (<div className="empimp-overlay" role="dialog" aria-modal="true" aria-label="Import employees">
      <button className="empimp-scrim" type="button" aria-label="Close import" onClick={function () { return !running && onClose(); }}/>
      <div className="empimp-panel" ref={panelRef}>
        <header className="empimp-head">
          <div className="empimp-head-title">
            <h2>Import Employees</h2>
            <p>Upload a file, map its columns, and review every change before anything is saved.</p>
          </div>
          <button className="empimp-close" type="button" onClick={onClose} disabled={running} aria-label="Close">
            <Icon name="close"/>
          </button>
        </header>

        <ol className="empimp-steps">
          {STEPS.map(function (entry, index) { return (<li key={entry.id} className={"empimp-steps-item".concat(index === stepIndex ? ' empimp-steps-item--current' : '').concat(index < stepIndex ? ' empimp-steps-item--done' : '')}>
              <span className="empimp-steps-dot">{index < stepIndex ? <Icon name="check"/> : index + 1}</span>
              {entry.label}
            </li>); })}
        </ol>

        <div className="empimp-body">
          {step === 'upload' && renderUpload()}
          {step === 'map' && renderMap()}
          {step === 'preview' && renderPreview()}
          {step === 'result' && renderResult()}
        </div>

        <footer className="empimp-foot">
          <div className="empimp-foot-info">
            {step === 'preview' && plan && (<span>
                <b>{plan.counts.new + plan.counts.update}</b> row{plan.counts.new + plan.counts.update === 1 ? '' : 's'} will be
                written · <b>{plan.counts.unchanged + plan.counts.error}</b> skipped
              </span>)}
          </div>
          <div className="empimp-foot-actions">
            {step === 'result' ? (<button className="empimp-btn empimp-btn--primary" type="button" onClick={onClose} disabled={running}>
                Done
              </button>) : (<>
                <button className="empimp-btn" type="button" onClick={onClose}>Cancel</button>
                {step !== 'upload' && (<button className="empimp-btn" type="button" onClick={function () { return setStep(step === 'preview' ? 'map' : 'upload'); }}>
                    Back
                  </button>)}
                {step === 'preview' ? (<button className="empimp-btn empimp-btn--primary" type="button" onClick={function () { return void runImport(); }} disabled={!canContinue}>
                    Confirm import
                  </button>) : (<button className="empimp-btn empimp-btn--primary" type="button" onClick={function () { return setStep(step === 'upload' ? 'map' : 'preview'); }} disabled={!canContinue}>
                    Continue
                  </button>)}
              </>)}
          </div>
        </footer>
      </div>
    </div>);
}
/** One preview row — updates render an old → new diff per changed field. */
function PreviewRow(_a) {
    var row = _a.row, columns = _a.columns;
    var changeByField = new Map(row.changes.map(function (change) { return [change.field, change]; }));
    return (<tr className={"empimp-row empimp-row--".concat(row.status)}>
      <td className="empimp-col-row">{row.sourceRow}</td>
      <td className="empimp-col-status">
        <span className={"empimp-badge empimp-badge--".concat(row.status)}>{STATUS_LABEL[row.status]}</span>
        {row.status === 'error' && (<ul className="empimp-row-errors">
            {row.errors.map(function (error) { return (<li key={error}>{error}</li>); })}
          </ul>)}
      </td>
      <td className="empimp-cell-code">{row.empCode || <em>missing</em>}</td>
      {columns.map(function (field) {
            var change = changeByField.get(field);
            if (change) {
                return (<td key={field} className={"empimp-cell empimp-cell--changed".concat(change.clearing ? ' empimp-cell--clearing' : '')}>
              <span className="empimp-diff">
                <span className="empimp-diff-from">{change.from || '—'}</span>
                <span className="empimp-diff-arrow" aria-hidden="true">→</span>
                <span className="empimp-diff-to">{change.to || <em>blank</em>}</span>
              </span>
            </td>);
            }
            var incoming = row.values[field];
            if (row.status === 'new') {
                return (<td key={field} className={incoming ? 'empimp-cell empimp-cell--fresh' : 'empimp-cell empimp-cell--muted'}>
              {incoming || '—'}
            </td>);
            }
            // Not changing: show what the record will keep.
            var kept = incoming !== null && incoming !== void 0 ? incoming : (row.existing ? (0, importPlan_1.existingValue)(row.existing, field) : '');
            return (<td key={field} className="empimp-cell empimp-cell--muted">
            {kept || '—'}
          </td>);
        })}
    </tr>);
}
