"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeAuditPanel = EmployeeAuditPanel;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var ClientPagination_1 = require("./ClientPagination");
var EXCLUDED_TABLES = new Set(['api_logs']);
var OPERATION_LABELS = {
    insert: 'Created',
    update: 'Updated',
    delete: 'Deleted',
};
var MINUTE = 60000;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
function toTitleCase(value) {
    return value.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}
function formatTableName(value) {
    var label = String(value || 'Database').replaceAll('_', ' ').trim();
    return toTitleCase(label);
}
function formatValue(value) {
    if (value == null || value === '') {
        return '-';
    }
    return String(value);
}
function getOperationLabel(value) {
    var operation = String(value || 'update').trim().toLowerCase();
    return OPERATION_LABELS[operation] || toTitleCase(operation);
}
function describe(log) {
    if (log.summary) {
        return String(log.summary);
    }
    var operation = String(log.operation || 'update').trim().toLowerCase();
    var fields = Array.isArray(log.changed_fields) ? log.changed_fields : [];
    var recordLabel = "record ".concat(formatValue(log.record_id));
    if (operation !== 'update') {
        return "".concat(getOperationLabel(operation), " ").concat(recordLabel);
    }
    var details = fields.slice(0, 2).map(function (field) {
        var _a, _b;
        var label = field.replace(/^emp_/, '').replaceAll('_', ' ');
        return "".concat(label, ": ").concat(formatValue((_a = log.old_data) === null || _a === void 0 ? void 0 : _a[field]), " -> ").concat(formatValue((_b = log.new_data) === null || _b === void 0 ? void 0 : _b[field]));
    });
    return details.join(' | ') || "Updated ".concat(recordLabel);
}
/** What was done, phrased to read on from the actor's name. */
function getAction(log) {
    if (log.action) {
        return String(log.action);
    }
    return "".concat(getOperationLabel(log.operation), " ").concat(formatTableName(log.table_name));
}
function getModule(log) {
    return String(log.module || formatTableName(log.table_name));
}
function getRecordLabel(log) {
    return String(log.record_label || formatValue(log.record_id));
}
/**
 * Who made the change. The backend resolves the stamped emp_code to a name;
 * changes made by a scheduler rather than a person come back as "System".
 */
function getActor(log) {
    var name = String(log.performed_by_name || '').trim();
    if (name) {
        return name;
    }
    return String(log.performed_by || log.changed_by || 'System').trim() || 'System';
}
/** The emp_code behind the actor, shown only when it adds something. */
function getActorCode(log) {
    var code = String(log.performed_by || '').trim();
    return code && code !== getActor(log) ? code : '';
}
function getInitials(actor) {
    if (actor === 'System') {
        return 'SYS';
    }
    var parts = actor.split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return '?';
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2);
    }
    return "".concat(parts[0][0]).concat(parts[parts.length - 1][0]);
}
function parseTimestamp(log) {
    var value = log.occurred_at || log.changed_at;
    if (!value) {
        return null;
    }
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
/** "just now" / "12m ago" / "3h ago" / "2d ago", then the plain date. */
function getRelativeTime(log) {
    var parsed = parseTimestamp(log);
    if (!parsed) {
        return '';
    }
    var elapsed = Date.now() - parsed.getTime();
    if (elapsed < MINUTE) {
        return 'just now';
    }
    if (elapsed < HOUR) {
        return "".concat(Math.floor(elapsed / MINUTE), "m ago");
    }
    if (elapsed < DAY) {
        return "".concat(Math.floor(elapsed / HOUR), "h ago");
    }
    if (elapsed < 7 * DAY) {
        return "".concat(Math.floor(elapsed / DAY), "d ago");
    }
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function getExactTime(log) {
    var parsed = parseTimestamp(log);
    return parsed ? parsed.toLocaleString('en-IN') : '';
}
/**
 * Who updated what, newest first. Each row leads with the person who made the
 * change, then the record they touched and the fields that moved, so the feed
 * answers "who did this?" without having to expand anything.
 */
function EmployeeAuditPanel(_a) {
    var logs = _a.logs;
    var _b = (0, react_1.useState)(1), page = _b[0], setPage = _b[1];
    var _c = (0, react_1.useState)('all'), moduleFilter = _c[0], setModuleFilter = _c[1];
    var _d = (0, react_1.useState)('all'), actorFilter = _d[0], setActorFilter = _d[1];
    var pageSize = 8;
    var activityLogs = (0, react_1.useMemo)(function () { return logs.filter(function (log) { return !EXCLUDED_TABLES.has(String(log.table_name || '').trim().toLowerCase()); }); }, [logs]);
    var moduleOptions = (0, react_1.useMemo)(function () { return Array.from(new Set(activityLogs.map(getModule))).sort(function (left, right) { return left.localeCompare(right); }); }, [activityLogs]);
    var actorOptions = (0, react_1.useMemo)(function () { return Array.from(new Set(activityLogs.map(getActor))).sort(function (left, right) { return left.localeCompare(right); }); }, [activityLogs]);
    var filteredLogs = (0, react_1.useMemo)(function () { return activityLogs.filter(function (log) { return ((moduleFilter === 'all' || getModule(log) === moduleFilter)
        && (actorFilter === 'all' || getActor(log) === actorFilter)); }); }, [activityLogs, moduleFilter, actorFilter]);
    var totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    // Clamped during render rather than in an effect, so a shrinking feed never
    // leaves the list stranded on a page that no longer exists.
    var currentPage = Math.min(page, totalPages);
    var visibleLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    var isFiltered = moduleFilter !== 'all' || actorFilter !== 'all';
    return (<div className="ov2-card ov2-approvals-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Recent Audit Activity</div>
          <div className="ov2-card-sub">Who updated what across admin data</div>
        </div>
        <div className="ov2-audit-filters">
          <label className="ov2-audit-filter">
            <span className="ov2-visually-hidden">Filter by person</span>
            <select value={actorFilter} onChange={function (event) {
            setActorFilter(event.target.value);
            setPage(1);
        }}>
              <option value="all">Everyone</option>
              {actorOptions.map(function (actor) { return (<option key={actor} value={actor}>{actor}</option>); })}
            </select>
          </label>
          <label className="ov2-audit-filter">
            <span className="ov2-visually-hidden">Filter by module</span>
            <select value={moduleFilter} onChange={function (event) {
            setModuleFilter(event.target.value);
            setPage(1);
        }}>
              <option value="all">All modules</option>
              {moduleOptions.map(function (module) { return (<option key={module} value={module}>{module}</option>); })}
            </select>
          </label>
        </div>
      </div>
      <div className="ov2-approvals-list">
        {visibleLogs.map(function (log, index) {
            var actor = getActor(log);
            var actorCode = getActorCode(log);
            return (<div key={log.id || "".concat(log.table_name || 'audit', "-").concat(index)} className="ov2-approval-row ov2-audit-row">
              <div className={"ov2-approval-avatar".concat(actor === 'System' ? ' is-system' : '')}>{getInitials(actor)}</div>
              <div className="ov2-approval-copy">
                <strong className="ov2-audit-headline">
                  {actor}
                  <span className="ov2-audit-action">{" ".concat(getAction(log).toLowerCase())}</span>
                </strong>
                <span className="ov2-audit-record">
                  <span className="ov2-audit-module">{getModule(log)}</span>
                  {getRecordLabel(log)}
                </span>
                <span className="ov2-audit-detail">{describe(log)}</span>
              </div>
              <div className="ov2-approval-date ov2-audit-when" title={getExactTime(log)}>
                <span>{getRelativeTime(log)}</span>
                {actorCode ? <span className="ov2-audit-actor-code">{actorCode}</span> : null}
              </div>
            </div>);
        })}
        {filteredLogs.length === 0 && (<div className="ov2-empty">
            {isFiltered ? 'No activity matches these filters.' : 'No audit activity recorded yet.'}
          </div>)}
      </div>
      <ClientPagination_1.ClientPagination page={currentPage} pageSize={pageSize} total={filteredLogs.length} onPageChange={setPage}/>
    </div>);
}
