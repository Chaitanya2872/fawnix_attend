"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminEmployeeMasterPage;
var react_1 = require("react");
var employeeMasterConfig_1 = require("./employeeMasterConfig");
var LocationPicker_1 = require("./LocationPicker");
var useDialogFocus_1 = require("../hooks/useDialogFocus");
require("./AdminEmployeeMasterPage.css");
function stringifyValue(value) {
    if (value == null) {
        return '';
    }
    return String(value);
}
function formatStatusLabel(value) {
    if (!value) {
        return 'Unknown';
    }
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}
function getStatusTone(value) {
    var normalized = value.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'enabled') {
        return 'active';
    }
    if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'archived') {
        return 'inactive';
    }
    return 'accent';
}
function getOptionValueAndLabel(option) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (typeof option === 'string' || typeof option === 'number') {
        var value_1 = String(option);
        return value_1 ? { value: value_1, label: formatStatusLabel(value_1) } : null;
    }
    var rawValue = (_d = (_c = (_b = (_a = option.value) !== null && _a !== void 0 ? _a : option.code) !== null && _b !== void 0 ? _b : option.id) !== null && _c !== void 0 ? _c : option.name) !== null && _d !== void 0 ? _d : option.label;
    var value = stringifyValue(rawValue).trim();
    if (!value) {
        return null;
    }
    return {
        value: value,
        label: stringifyValue((_g = (_f = (_e = option.label) !== null && _e !== void 0 ? _e : option.name) !== null && _f !== void 0 ? _f : option.code) !== null && _g !== void 0 ? _g : rawValue) || value,
    };
}
function uniqueOptions(options) {
    var seen = new Set();
    var nextOptions = [];
    options.forEach(function (option) {
        if (!option || seen.has(option.value)) {
            return;
        }
        seen.add(option.value);
        nextOptions.push(option);
    });
    return nextOptions;
}
function getOptionsFromFilterData(optionKey, filterOptions, records, recordField, leadingOptions) {
    if (leadingOptions === void 0) { leadingOptions = []; }
    var backendOptions = filterOptions[optionKey] || [];
    var rowOptions = recordField
        ? records.map(function (record) {
            var value = stringifyValue(record[recordField]).trim();
            return value ? { value: value, label: value } : null;
        })
        : [];
    return uniqueOptions(__spreadArray(__spreadArray(__spreadArray([], leadingOptions, true), backendOptions.map(getOptionValueAndLabel), true), rowOptions, true));
}
function getRecordId(record, resource) {
    var _a;
    var value = (_a = record.id) !== null && _a !== void 0 ? _a : record[resource.codeField];
    return typeof value === 'string' || typeof value === 'number' ? value : null;
}
function getDisplayName(record, resource) {
    return stringifyValue(record[resource.nameField] || record[resource.codeField] || record.id || resource.singularLabel);
}
function buildFormValues(resource, record) {
    return resource.formFields.reduce(function (values, field) {
        var existingValue = record ? stringifyValue(record[field.key]) : '';
        values[field.key] = field.key === 'status' && !existingValue ? 'active' : existingValue;
        return values;
    }, {});
}
function buildPayload(values) {
    return Object.fromEntries(Object.entries(values).map(function (_a) {
        var key = _a[0], value = _a[1];
        return [key, value.trim()];
    }));
}
function validateForm(resource, values) {
    var errors = {};
    resource.formFields.forEach(function (field) {
        var _a;
        if (field.required && !((_a = values[field.key]) === null || _a === void 0 ? void 0 : _a.trim())) {
            errors[field.key] = "".concat(field.label, " is required.");
        }
    });
    return errors;
}
function truncate(value, maxLength) {
    if (maxLength === void 0) { maxLength = 64; }
    var text = stringifyValue(value).trim();
    if (!text) {
        return '--';
    }
    return text.length > maxLength ? "".concat(text.slice(0, maxLength - 1), "...") : text;
}
function DataListInput(_a) {
    var id = _a.id, _b = _a.type, type = _b === void 0 ? 'text' : _b, value = _a.value, options = _a.options, placeholder = _a.placeholder, onChange = _a.onChange;
    var listId = "".concat(id, "-options");
    return (<>
      <input id={id} type={type} list={options.length ? listId : undefined} value={value} placeholder={placeholder} onChange={function (event) { return onChange(event.target.value); }}/>
      {options.length ? (<datalist id={listId}>
          {options.map(function (option) { return (<option key={option.value} value={option.value}>
              {option.label}
            </option>); })}
        </datalist>) : null}
    </>);
}
function AdminEmployeeMasterPage(_a) {
    var _this = this;
    var actionLoading = _a.actionLoading, actionStatus = _a.actionStatus, canWriteAdminData = _a.canWriteAdminData, error = _a.error, filterOptions = _a.filterOptions, filters = _a.filters, appliedFilters = _a.appliedFilters, lastSyncedAt = _a.lastSyncedAt, loading = _a.loading, pagination = _a.pagination, records = _a.records, resource = _a.resource, resources = _a.resources, onSelectResource = _a.onSelectResource, applyFilters = _a.applyFilters, changePage = _a.changePage, clearFilters = _a.clearFilters, createRecord = _a.createRecord, deleteRecord = _a.deleteRecord, refresh = _a.refresh, updateFilter = _a.updateFilter, updateRecord = _a.updateRecord, _b = _a.createRequestId, createRequestId = _b === void 0 ? 0 : _b;
    var _c = (0, react_1.useState)(null), formPanel = _c[0], setFormPanel = _c[1];
    var _d = (0, react_1.useState)(null), deleteTarget = _d[0], setDeleteTarget = _d[1];
    var handledCreateRequestId = (0, react_1.useRef)(0);
    var formPanelRef = (0, react_1.useRef)(null);
    (0, useDialogFocus_1.useDialogFocus)({
        containerRef: formPanelRef,
        open: Boolean(formPanel),
        onClose: function () { return setFormPanel(null); },
    });
    var activeOnPage = records.filter(function (record) { return stringifyValue(record.status).toLowerCase() === 'active'; }).length;
    var inactiveOnPage = records.filter(function (record) { return stringifyValue(record.status).toLowerCase() === 'inactive'; }).length;
    var rangeStart = records.length ? (pagination.page - 1) * pagination.page_size + 1 : 0;
    var rangeEnd = rangeStart ? rangeStart + records.length - 1 : 0;
    var syncedLabel = lastSyncedAt
        ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Not synced';
    var statusOptions = (0, react_1.useMemo)(function () {
        return getOptionsFromFilterData('statuses', filterOptions, records, 'status', employeeMasterConfig_1.EMPLOYEE_MASTER_STATUS_OPTIONS);
    }, [filterOptions, records]);
    var _e = (0, react_1.useState)(false), showMoreFilters = _e[0], setShowMoreFilters = _e[1];
    var narrowedByFilters = Boolean(appliedFilters.search.trim()) ||
        Boolean(appliedFilters.status) ||
        resource.filters.some(function (filter) { return String(appliedFilters[filter.stateKey] || '').trim() !== ''; });
    var activeExtraFilterCount = resource.filters.filter(function (filter) { return String(filters[filter.stateKey] || '').trim() !== ''; }).length;
    // No reset needed when switching tabs: the page is keyed on resource.key in
    // FawnixApp, so each tab mounts fresh with the extra filters collapsed.
    var openCreatePanel = function () {
        setFormPanel({
            mode: 'create',
            record: null,
            values: buildFormValues(resource),
            errors: {},
        });
    };
    (0, react_1.useEffect)(function () {
        if (!createRequestId || handledCreateRequestId.current === createRequestId) {
            return;
        }
        handledCreateRequestId.current = createRequestId;
        if (!canWriteAdminData) {
            return;
        }
        var timer = window.setTimeout(function () {
            setFormPanel({
                mode: 'create',
                record: null,
                values: buildFormValues(resource),
                errors: {},
            });
        }, 0);
        return function () { return window.clearTimeout(timer); };
    }, [canWriteAdminData, createRequestId, resource]);
    var openEditPanel = function (record) {
        setFormPanel({
            mode: 'edit',
            record: record,
            values: buildFormValues(resource, record),
            errors: {},
        });
    };
    var updateFormValue = function (key, value) {
        setFormPanel(function (current) {
            var _a, _b;
            return current
                ? __assign(__assign({}, current), { values: __assign(__assign({}, current.values), (_a = {}, _a[key] = value, _a)), errors: __assign(__assign({}, current.errors), (_b = {}, _b[key] = '', _b)) }) : current;
        });
    };
    var updateFormValues = function (nextValues) {
        setFormPanel(function (current) {
            if (!current) {
                return current;
            }
            var errors = __assign({}, current.errors);
            Object.keys(nextValues).forEach(function (key) {
                errors[key] = '';
            });
            return __assign(__assign({}, current), { values: __assign(__assign({}, current.values), nextValues), errors: errors });
        });
    };
    var submitForm = function () { return __awaiter(_this, void 0, void 0, function () {
        var errors, payload, recordId, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!formPanel) {
                        return [2 /*return*/];
                    }
                    errors = validateForm(resource, formPanel.values);
                    if (Object.keys(errors).length) {
                        setFormPanel(__assign(__assign({}, formPanel), { errors: errors }));
                        return [2 /*return*/];
                    }
                    payload = buildPayload(formPanel.values);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    if (!(formPanel.mode === 'create')) return [3 /*break*/, 3];
                    return [4 /*yield*/, createRecord(payload)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 3:
                    recordId = formPanel.record ? getRecordId(formPanel.record, resource) : null;
                    if (recordId == null) {
                        setFormPanel(__assign(__assign({}, formPanel), { errors: { _form: "".concat(resource.singularLabel, " id is unavailable.") } }));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, updateRecord(recordId, payload)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    setFormPanel(null);
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var renderTableState = function () {
        // Only take the table over on a cold load. A refresh that already has rows
        // keeps them on screen -- swapping them for a spinner on every refetch is
        // what makes the page look like it is perpetually loading.
        if (loading && records.length === 0) {
            return (<div className="em-table-message">
              <span className="em-spinner" aria-hidden="true"/>
              <strong>Loading {resource.title.toLowerCase()}</strong>
              <span>Fetching the latest master records.</span>
            </div>);
        }
        if (error) {
            return (<div className="em-table-message">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <strong>{resource.title} did not load.</strong>
              <span>{error}</span>
              <button className="adm-btn" type="button" onClick={refresh}>
                Try again
              </button>
            </div>);
        }
        if (!records.length) {
            return narrowedByFilters ? (<div className="em-table-message em-table-message--empty">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                  <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <strong>No {resource.tabLabel.toLowerCase()} match these filters</strong>
                <span>
                  {appliedFilters.search.trim()
                    ? "Nothing found for \u201C".concat(appliedFilters.search.trim(), "\u201D. Try a different term or clear the filters.")
                    : 'Every record was filtered out. Widen or clear the filters to see more.'}
                </span>
                <button className="adm-btn" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>) : (<div className="em-table-message em-table-message--empty">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="adm-empty__icon">
                  <path d="M4 20V8l8-4 8 4v12M4 20h16M9 20v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <strong>No {resource.tabLabel.toLowerCase()} yet</strong>
                <span>
                  {canWriteAdminData
                    ? "Add your first ".concat(resource.singularLabel.toLowerCase(), " to start organizing employees against it.")
                    : "No ".concat(resource.tabLabel.toLowerCase(), " have been set up yet. Ask an administrator to add one.")}
                </span>
                {canWriteAdminData ? (<button className="adm-btn adm-btn--primary" type="button" onClick={openCreatePanel}>
                    Add {resource.singularLabel}
                  </button>) : null}
              </div>);
        }
        return null;
    };
    var renderRows = function () {
        return records.map(function (record, index) {
            var _a;
            var rowKey = stringifyValue((_a = getRecordId(record, resource)) !== null && _a !== void 0 ? _a : index);
            var displayName = getDisplayName(record, resource);
            return (<tr className="adm-row em-row" key={rowKey}>
          {resource.tableColumns.map(function (column) {
                    var value = stringifyValue(record[column.key]);
                    if (column.kind === 'primary') {
                        var code = stringifyValue(record[resource.codeField]);
                        return (<td key={column.key}>
                  <span className="adm-cell-primary">{value || '--'}</span>
                  <span className="adm-cell-meta">{code || 'Code unavailable'}</span>
                </td>);
                    }
                    if (column.kind === 'status') {
                        return (<td key={column.key}>
                  <span className={"adm-pill table-pill adm-pill--".concat(getStatusTone(value))}>
                    {formatStatusLabel(value)}
                  </span>
                </td>);
                    }
                    if (column.kind === 'code') {
                        return (<td key={column.key}>
                  <span className="adm-code em-code">{value || '--'}</span>
                </td>);
                    }
                    return (<td key={column.key} title={value}>
                <span className="adm-cell-secondary">{truncate(value)}</span>
              </td>);
                })}
          {canWriteAdminData ? (<td>
              <div className="adm-actions em-actions">
                <button className="adm-action-btn adm-action-btn--view" type="button" onClick={function () { return openEditPanel(record); }} disabled={actionLoading} aria-label={"Edit ".concat(displayName)}>
                  Edit
                </button>
                <button className="adm-action-btn adm-action-btn--delete" type="button" onClick={function () { return setDeleteTarget(record); }} disabled={actionLoading} aria-label={"Delete ".concat(displayName)}>
                  <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5m4-5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </td>) : null}
        </tr>);
        });
    };
    var confirmDelete = function () { return __awaiter(_this, void 0, void 0, function () {
        var recordId, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!deleteTarget) {
                        return [2 /*return*/];
                    }
                    recordId = getRecordId(deleteTarget, resource);
                    if (recordId == null) {
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, deleteRecord(recordId)];
                case 2:
                    _b.sent();
                    setDeleteTarget(null);
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var applyResolvedAddress = function (parts) {
        setFormPanel(function (current) {
            if (!current)
                return current;
            var values = __assign({}, current.values);
            var keys = {
                address: parts.address,
                city: parts.city,
                state: parts.state,
                country: parts.country,
                pincode: parts.pincode,
            };
            for (var _i = 0, _a = Object.entries(keys); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (value) {
                    values[key] = value;
                }
            }
            return __assign(__assign({}, current), { values: values });
        });
    };
    var tableState = renderTableState();
    return (<div className="admin-aligned-page admin-aligned-page--employee-master">
      <div className="em-header dashboard-section-head">
        <div className="em-header__copy">
          <p className="adm-eyebrow">Administration</p>
          <h1 className="adm-heading">Organization</h1>
          <p className="em-subtitle">
            Maintain the reference records that organize employees, payroll, reporting lines, and departments.
          </p>
          <div className="adm-tabs" role="tablist" aria-label="Organization records">
            {resources.map(function (entry) { return (<button key={entry.key} type="button" role="tab" aria-selected={entry.key === resource.key} className={"adm-tab".concat(entry.key === resource.key ? ' adm-tab--active' : '')} onClick={function () { return onSelectResource(entry.sidebarId); }}>
                {entry.tabLabel}
              </button>); })}
          </div>
        </div>

        <div className="em-header__actions">
          {!canWriteAdminData ? <span className="em-readonly-pill">Read only</span> : null}
          {canWriteAdminData ? (<button className="adm-btn adm-btn--primary" type="button" onClick={openCreatePanel}>
              <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Add {resource.singularLabel}
            </button>) : null}
          <button className="adm-btn adm-btn--icon" type="button" onClick={refresh} disabled={loading} aria-label={"Refresh ".concat(resource.title)}>
            <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4M4 8v4h4M16 12h4v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <section className="adm-stats-strip em-stats-strip" aria-label={"".concat(resource.title, " summary")}>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 19V7l8-4 8 4v12M4 11h16M9 19v-4h6v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Total Records</p>
            <strong className="adm-stat-value">{pagination.total_records.toLocaleString()}</strong>
            <span className="adm-stat-caption">{records.length.toLocaleString()} loaded on this page</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Active On Page</p>
            <strong className="adm-stat-value">{activeOnPage.toLocaleString()}</strong>
            <span className="adm-stat-caption">{inactiveOnPage.toLocaleString()} inactive on page</span>
          </div>
        </div>
        <div className="adm-stat-item">
          <span className="adm-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <p className="adm-stat-label">Last Sync</p>
            <strong className="adm-stat-value em-sync-value">{syncedLabel}</strong>
            <span className="adm-stat-caption">{loading ? 'Refreshing now' : 'Using admin API'}</span>
          </div>
        </div>
      </section>

      {actionStatus ? <div className="adm-status-line em-status-line" role="status">{actionStatus}</div> : null}

      <form className="em-filter-bar" onSubmit={function (event) {
            event.preventDefault();
            applyFilters();
        }}>
        <label className="em-filter-field em-filter-field--search" htmlFor="employee-master-search">
          <span>Search</span>
          <input id="employee-master-search" type="search" value={filters.search} onChange={function (event) { return updateFilter('search', event.target.value); }} placeholder={"Search ".concat(resource.title.toLowerCase())}/>
        </label>

        <label className="em-filter-field" htmlFor="employee-master-status-filter">
          <span>Status</span>
          <select id="employee-master-status-filter" value={filters.status} onChange={function (event) { return updateFilter('status', event.target.value); }}>
            <option value="">All statuses</option>
            {statusOptions.map(function (option) { return (<option key={option.value} value={option.value}>
                {option.label}
              </option>); })}
          </select>
        </label>

        <label className="em-filter-field" htmlFor="employee-master-page-size">
          <span>Rows</span>
          <select id="employee-master-page-size" value={filters.pageSize} onChange={function (event) { return updateFilter('pageSize', event.target.value); }}>
            {['10', '15', '25', '50'].map(function (pageSize) { return (<option key={pageSize} value={pageSize}>
                {pageSize}
              </option>); })}
          </select>
        </label>

        {resource.filters.length > 0 ? (<button type="button" className={"em-filter-more".concat(activeExtraFilterCount ? ' em-filter-more--active' : '')} onClick={function () { return setShowMoreFilters(function (current) { return !current; }); }} aria-expanded={showMoreFilters}>
          <svg className="adm-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {showMoreFilters ? 'Fewer filters' : 'More filters'}
          {activeExtraFilterCount ? <em>{activeExtraFilterCount}</em> : null}
        </button>) : null}

        <div className="em-filter-actions">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={loading}>
            Apply
          </button>
          <button className="adm-btn" type="button" onClick={clearFilters} disabled={loading}>
            Clear
          </button>
        </div>

        <div className={"em-filter-extra".concat(showMoreFilters ? ' em-filter-extra--open' : '')}>
        {resource.filters.map(function (filter) {
            var options = getOptionsFromFilterData(filter.optionKey, filterOptions, records, filter.recordField);
            var fieldId = "employee-master-filter-".concat(filter.stateKey);
            return (<label className="em-filter-field" htmlFor={fieldId} key={filter.stateKey}>
              <span>{filter.label}</span>
              {options.length ? (<select id={fieldId} value={filters[filter.stateKey]} onChange={function (event) { return updateFilter(filter.stateKey, event.target.value); }}>
                  <option value="">Any {filter.label.toLowerCase()}</option>
                  {options.map(function (option) { return (<option key={option.value} value={option.value}>
                      {option.label}
                    </option>); })}
                </select>) : (<input id={fieldId} value={filters[filter.stateKey]} onChange={function (event) { return updateFilter(filter.stateKey, event.target.value); }} placeholder={"Filter ".concat(filter.label.toLowerCase())}/>)}
            </label>);
        })}
        </div>
      </form>

      <div className="adm-table-card table-card em-table-card">
        <div className="adm-table-toolbar em-table-toolbar">
          <div className="adm-table-title">
            <strong>{resource.title}</strong>
            <span>
              {records.length
            ? "Showing ".concat(rangeStart.toLocaleString(), "-").concat(rangeEnd.toLocaleString(), " of ").concat(pagination.total_records.toLocaleString())
            : 'No rows loaded'}
            </span>
          </div>
        </div>

        <div className="adm-table-scroll table-scroll em-table-scroll" hidden={Boolean(tableState)}>
          <table className="adm-table dashboard-table em-table" aria-label={resource.title}>
            <thead>
              <tr>
                {resource.tableColumns.map(function (column) { return (<th key={column.key} style={column.minWidth ? { minWidth: column.minWidth } : undefined}>
                    {column.label}
                  </th>); })}
                {canWriteAdminData ? <th className="em-actions-th">Actions</th> : null}
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>

        {tableState ? <div className="em-table-state">{tableState}</div> : null}

        <div className="em-pagination">
          <strong>
            Page {pagination.page.toLocaleString()} of {Math.max(pagination.total_pages, 1).toLocaleString()}
          </strong>
          <div className="em-pagination__actions">
            <button className="adm-btn" type="button" onClick={function () { return changePage(pagination.page - 1); }} disabled={!pagination.has_previous || loading}>
              Previous
            </button>
            <button className="adm-btn" type="button" onClick={function () { return changePage(pagination.page + 1); }} disabled={!pagination.has_next || loading}>
              Next
            </button>
          </div>
        </div>
      </div>

      {formPanel ? (<>
          <button className="side-panel-scrim" type="button" aria-label={"Close ".concat(resource.singularLabel, " panel")} onClick={function () { return setFormPanel(null); }}/>
          <aside ref={formPanelRef} role="dialog" aria-modal="true" className="field-visit-panel employee-form-panel em-form-panel" aria-label={"".concat(formPanel.mode === 'create' ? 'Add' : 'Edit', " ").concat(resource.singularLabel)}>
            <div className="field-visit-panel-head employee-panel-head em-panel-head">
              <div>
                <span>Organization</span>
                <h3>{formPanel.mode === 'create' ? "Add ".concat(resource.singularLabel) : "Edit ".concat(resource.singularLabel)}</h3>
                <p className="employee-panel-copy">
                  Mandatory fields are marked before saving to the admin API.
                </p>
              </div>
              <button className="field-visit-panel-close" onClick={function () { return setFormPanel(null); }} type="button">
                Close
              </button>
            </div>

            <form className="form-card employee-form-card em-form-card" onSubmit={function (event) {
                event.preventDefault();
                void submitForm();
            }}>
              <div className="form-grid employee-form-grid em-form-grid">
                {resource.formFields.map(function (field) {
                var fieldId = "em-".concat(resource.key, "-").concat(field.key);
                var fieldOptions = field.optionKey
                    ? getOptionsFromFilterData(field.optionKey, filterOptions, records, field.key)
                    : [];
                var errorMessage = formPanel.errors[field.key];
                var showPickerAfter = resource.hasLocationPicker && field.key === 'geofence_radius';
                return (<react_1.Fragment key={field.key}>
                    <div className={"em-field".concat(errorMessage ? ' em-field--error' : '')}>
                      <label htmlFor={fieldId}>
                        {field.label}
                        {field.required ? <span className="em-required" aria-label="required">*</span> : null}
                      </label>
                      {field.type === 'select' ? (<select id={fieldId} value={formPanel.values[field.key] || ''} onChange={function (event) { return updateFormValue(field.key, event.target.value); }}>
                          <option value="">Select {field.label.toLowerCase()}</option>
                          {(field.options || []).map(function (option) { return (<option key={option.value} value={option.value}>
                              {option.label}
                            </option>); })}
                        </select>) : field.type === 'textarea' ? (<textarea id={fieldId} value={formPanel.values[field.key] || ''} onChange={function (event) { return updateFormValue(field.key, event.target.value); }} placeholder={field.placeholder} rows={4}/>) : (<DataListInput id={fieldId} type={field.inputType} value={formPanel.values[field.key] || ''} options={fieldOptions} placeholder={field.placeholder} onChange={function (value) { return updateFormValue(field.key, value); }}/>)}
                      {errorMessage ? <span className="em-field-error">{errorMessage}</span> : null}
                    </div>
                    {showPickerAfter ? (<div className="em-field em-field--full">
                        <label>Pin the location</label>
                        <LocationPicker_1.default latitude={formPanel.values.latitude || ''} longitude={formPanel.values.longitude || ''} geofenceRadius={formPanel.values.geofence_radius || ''} addressHint={[formPanel.values.address, formPanel.values.city, formPanel.values.state]
                            .filter(function (part) { return String(part || '').trim(); })
                            .join(', ') || undefined} onChange={function (next) {
                            updateFormValues({
                                latitude: next.latitude,
                                longitude: next.longitude,
                            });
                        }} onResolveAddress={applyResolvedAddress}/>
                      </div>) : null}
                    </react_1.Fragment>);
            })}
              </div>
              {formPanel.errors._form ? <p className="form-note em-form-error">{formPanel.errors._form}</p> : null}
              {actionStatus ? <p className="form-note">{actionStatus}</p> : null}
              <div className="form-actions employee-panel-actions em-panel-actions">
                <button className="ghost" type="button" onClick={function () { return setFormPanel(null); }} disabled={actionLoading}>
                  Cancel
                </button>
                <button className="cta" type="submit" disabled={actionLoading}>
                  {formPanel.mode === 'create' ? "Create ".concat(resource.singularLabel) : 'Save Changes'}
                </button>
              </div>
            </form>
          </aside>
        </>) : null}

      {deleteTarget ? (<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="em-delete-title">
          <div className="modal-card delete-modal-card em-delete-modal">
            <div className="modal-header">
              <strong id="em-delete-title">Delete {resource.singularLabel}</strong>
              <button className="ghost" onClick={function () { return setDeleteTarget(null); }} type="button">
                Close
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-modal-copy">
                Are you sure you want to delete {getDisplayName(deleteTarget, resource)}? This action cannot be undone.
              </p>
              <div className="delete-modal-summary">
                <strong>{stringifyValue(deleteTarget[resource.codeField]) || 'Code unavailable'}</strong>
                <span>{stringifyValue(deleteTarget[resource.nameField]) || resource.singularLabel}</span>
              </div>
              {actionStatus ? <p className="form-note">{actionStatus}</p> : null}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={function () { return setDeleteTarget(null); }} disabled={actionLoading} type="button">
                Cancel
              </button>
              <button className="danger" onClick={function () { return void confirmDelete(); }} disabled={actionLoading} type="button">
                Delete {resource.singularLabel}
              </button>
            </div>
          </div>
        </div>) : null}
    </div>);
}
