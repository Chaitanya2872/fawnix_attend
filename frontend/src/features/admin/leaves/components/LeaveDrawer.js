"use strict";
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
exports.default = LeaveDrawer;
var react_1 = require("react");
function formatStatusLabel(v) {
    if (!v)
        return 'Unknown';
    return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}
function getStatusClass(v) {
    var n = (v || '').toLowerCase();
    if (n === 'pending')
        return 'accent';
    if (n === 'approved')
        return 'active';
    if (n === 'rejected')
        return 'danger';
    return 'inactive';
}
function fact(k, v) {
    var display = v == null || v === '' ? '--' : String(v);
    return (<div className="lv-drawer-fact" key={k}>
      <div className="lv-drawer-fact__k">{k}</div>
      <div className="lv-drawer-fact__v">{display}</div>
    </div>);
}
var BALANCE_ROWS = [
    { key: 'casual', label: 'Casual leave' },
    { key: 'sick', label: 'Sick leave' },
    { key: 'annual', label: 'Annual leave' },
    { key: 'monthly', label: 'Monthly leave' },
];
function LeaveDrawer(_a) {
    var _this = this;
    var _b;
    var record = _a.record, open = _a.open, onClose = _a.onClose, onAlert = _a.onAlert, apiRequest = _a.apiRequest, accessToken = _a.accessToken, formatDateTime = _a.formatDateTime, formatDate = _a.formatDate, formatLeaveTypeLabel = _a.formatLeaveTypeLabel;
    var _c = (0, react_1.useState)(false), alerting = _c[0], setAlerting = _c[1];
    var _d = (0, react_1.useState)(''), alertStatus = _d[0], setAlertStatus = _d[1];
    var _e = (0, react_1.useState)(null), balance = _e[0], setBalance = _e[1];
    var _f = (0, react_1.useState)(false), balanceLoading = _f[0], setBalanceLoading = _f[1];
    (0, react_1.useEffect)(function () {
        if (open) {
            setAlertStatus('');
            setBalance(null);
        }
    }, [open, record === null || record === void 0 ? void 0 : record.id]);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handler = function (e) {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handler);
        return function () { return document.removeEventListener('keydown', handler); };
    }, [open, onClose]);
    (0, react_1.useEffect)(function () {
        if (!open || !(record === null || record === void 0 ? void 0 : record.employee_code))
            return;
        var cancelled = false;
        setBalanceLoading(true);
        apiRequest("/api/admin/leaves/balance?emp_code=".concat(encodeURIComponent(record.employee_code)), {}, accessToken)
            .then(function (response) {
            if (cancelled)
                return;
            if (response === null || response === void 0 ? void 0 : response.success)
                setBalance(response.data);
        })
            .catch(function () { })
            .finally(function () { if (!cancelled)
            setBalanceLoading(false); });
        return function () { cancelled = true; };
    }, [open, record === null || record === void 0 ? void 0 : record.employee_code, record === null || record === void 0 ? void 0 : record.id, apiRequest, accessToken]);
    if (!record)
        return null;
    var isPending = (record.status || '').toLowerCase() === 'pending';
    var employeeName = record.employee_name || record.employee_code || '--';
    var meta = [record.employee_code, record.department].filter(Boolean).join(' · ');
    var days = record.leave_count != null ? "".concat(record.leave_count, " day").concat(record.leave_count === 1 ? '' : 's') : '--';
    var handleAlert = function () { return __awaiter(_this, void 0, void 0, function () {
        var nextStatus, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setAlerting(true);
                    setAlertStatus('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, onAlert(record)];
                case 2:
                    nextStatus = _a.sent();
                    setAlertStatus(nextStatus);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setAlertStatus(err_1 instanceof Error ? err_1.message : 'Failed to alert manager.');
                    return [3 /*break*/, 5];
                case 4:
                    setAlerting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<>
      <div className={"lv-drawer-overlay".concat(open ? ' lv-drawer-overlay--open' : '')} onClick={onClose} aria-hidden="true"/>
      <aside className={"lv-drawer".concat(open ? ' lv-drawer--open' : '')} role="dialog" aria-modal="true" aria-label={"".concat(formatLeaveTypeLabel(record), " \u2014 ").concat(employeeName)}>
        <div className="lv-drawer-header">
          <div style={{ minWidth: 0 }}>
            <h3 className="lv-drawer-header__title">{employeeName}</h3>
            <p className="lv-drawer-header__meta">{meta || '--'}</p>
          </div>
          <button type="button" className="lv-drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="lv-drawer-body">
          <div className="lv-drawer-pillrow">
            <span className="lv-drawer-typepill">{formatLeaveTypeLabel(record)}</span>
            <span className={"table-pill ".concat(getStatusClass(record.status))}>{formatStatusLabel(record.status)}</span>
            <span className="lv-drawer-days">{days}</span>
          </div>

          <div className="lv-drawer-facts">
            {fact('From', formatDate(record.from_date))}
            {fact('To', formatDate(record.to_date))}
            {fact('Applied on', formatDate(record.applied_at))}
            {record.status && !isPending
            ? fact("".concat(formatStatusLabel(record.status), " on"), record.reviewed_at ? formatDate(record.reviewed_at) : '--')
            : fact('Reporting manager', record.manager_name)}
            {fact('Reporting manager', record.manager_name)}
          </div>

          {(record.notes || record.remarks) && (<div>
              <h4 className="lv-drawer-section__title">Employee note</h4>
              {record.notes && <p className="lv-drawer-text">{record.notes}</p>}
            </div>)}

          <div>
            <h4 className="lv-drawer-section__title">Pattern</h4>
            <p className="lv-drawer-text">
              {((_b = record.prior_requests_90d) !== null && _b !== void 0 ? _b : 0) >= 3
            ? "".concat(record.prior_requests_90d, " other requests in the last 90 days \u2014 flagged as a repeat pattern.")
            : 'Isolated request. No pattern in the last 90 days.'}
            </p>
          </div>

          <div>
            <h4 className="lv-drawer-section__title">Leave balance</h4>
            {balanceLoading ? (<p className="lv-drawer-text">Loading balance…</p>) : balance ? (<div className="lv-drawer-balance">
                {BALANCE_ROWS.filter(function (row) { return balance[row.key]; }).map(function (row) {
                var entry = balance[row.key];
                var pct = entry.max > 0 ? Math.min(100, Math.round((entry.used / entry.max) * 100)) : 0;
                return (<div key={row.key}>
                      <div className="lv-drawer-balance__row">
                        <span>{row.label}</span>
                        <span>{entry.used} of {entry.max} used</span>
                      </div>
                      <div className="lv-drawer-balance__track">
                        <div className="lv-drawer-balance__fill" style={{ width: "".concat(pct, "%") }}/>
                      </div>
                    </div>);
            })}
              </div>) : (<p className="lv-drawer-text">Balance unavailable.</p>)}
          </div>

          <div>
            <h4 className="lv-drawer-section__title">Manager remark</h4>
            <p className="lv-drawer-note">
              {record.remarks || 'No remark recorded by the reporting manager.'}
            </p>
            {(record.reviewed_by || record.reviewed_at) && (<p className="lv-drawer-pattern-note">
                {[record.reviewed_by, record.reviewed_at ? formatDateTime(record.reviewed_at) : null]
                .filter(Boolean)
                .join(' · ')}
              </p>)}
          </div>

          {alertStatus && <p className="lv-drawer-review-status">{alertStatus}</p>}
        </div>

        <div className="lv-drawer-footer">
          {isPending ? (<>
              <div className="lv-drawer-footer__note">Read-only · awaiting reporting manager</div>
              <button type="button" className="lv-drawer-alert" onClick={function () { return void handleAlert(); }} disabled={alerting}>
                {alerting ? 'Alerting…' : 'Alert manager'}
              </button>
            </>) : (<div className="lv-drawer-footer__note">
              Read-only · {formatStatusLabel(record.status).toLowerCase()} by {record.manager_name || 'the reporting manager'}
            </div>)}
        </div>
      </aside>
    </>);
}
