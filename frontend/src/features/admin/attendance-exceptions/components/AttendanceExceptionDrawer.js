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
exports.default = AttendanceExceptionDrawer;
var react_1 = require("react");
function formatExType(v) {
    if (!v)
        return '--';
    return v === 'late_arrival' ? 'Late Arrival' : v === 'early_leave' ? 'Early Leave' : v;
}
function formatStatusLabel(v) {
    if (!v)
        return 'Unknown';
    return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}
function getStatusClass(v) {
    var n = (v || '').toLowerCase();
    if (n === 'pending')
        return 'accent';
    if (n === 'approved' || n === 'resolved')
        return 'active';
    if (n === 'rejected')
        return 'danger';
    return 'inactive';
}
function severityTier(minutes) {
    var value = minutes !== null && minutes !== void 0 ? minutes : 0;
    if (value >= 60)
        return 'high';
    if (value >= 25)
        return 'medium';
    return 'low';
}
function formatTimeShort(value, formatDateTime) {
    var raw = (value || '').trim();
    if (!raw)
        return '--';
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw))
        return raw.slice(0, 5);
    return formatDateTime(raw);
}
function fact(k, v) {
    var display = v == null || v === '' ? '--' : String(v);
    return (<div className="exc-drawer-fact" key={k}>
      <div className="exc-drawer-fact__k">{k}</div>
      <div className="exc-drawer-fact__v">{display}</div>
    </div>);
}
function AttendanceExceptionDrawer(_a) {
    var _this = this;
    var _b, _c, _d;
    var record = _a.record, open = _a.open, onClose = _a.onClose, onReviewed = _a.onReviewed, apiRequest = _a.apiRequest, accessToken = _a.accessToken, formatDateTime = _a.formatDateTime, formatDate = _a.formatDate;
    var _e = (0, react_1.useState)(''), remarks = _e[0], setRemarks = _e[1];
    var _f = (0, react_1.useState)(false), reviewing = _f[0], setReviewing = _f[1];
    var _g = (0, react_1.useState)(''), reviewStatus = _g[0], setReviewStatus = _g[1];
    var overlayRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (open) {
            setRemarks('');
            setReviewStatus('');
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
    var handleReview = function (action) { return __awaiter(_this, void 0, void 0, function () {
        var response, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(record === null || record === void 0 ? void 0 : record.id))
                        return [2 /*return*/];
                    setReviewing(true);
                    setReviewStatus('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, apiRequest('/api/attendance-exceptions/approve', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ exception_id: record.id, action: action, remarks: remarks.trim() }),
                        }, accessToken)];
                case 2:
                    response = _a.sent();
                    if (!(response === null || response === void 0 ? void 0 : response.success)) {
                        throw new Error((response === null || response === void 0 ? void 0 : response.message) || 'Review failed');
                    }
                    setReviewStatus(action === 'approved' ? 'Approved' : 'Rejected');
                    setTimeout(function () {
                        onReviewed();
                        onClose();
                    }, 900);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setReviewStatus(err_1 instanceof Error ? err_1.message : 'Review failed — try again');
                    return [3 /*break*/, 5];
                case 4:
                    setReviewing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    if (!record)
        return null;
    var isPending = (record.status || '').toLowerCase() === 'pending';
    var employeeName = record.employee_name || record.emp_name || record.emp_code || '--';
    var exType = formatExType(record.exception_type);
    var tier = severityTier((_b = record.late_by_minutes) !== null && _b !== void 0 ? _b : record.early_by_minutes);
    var meta = [record.employee_code || record.emp_code, record.department]
        .filter(Boolean)
        .join(' · ');
    var variance = record.late_by_minutes != null
        ? "+".concat(record.late_by_minutes, " min late")
        : record.early_by_minutes != null
            ? "\u2212".concat(record.early_by_minutes, " min early")
            : null;
    var plannedShift = "".concat(formatTimeShort(record.planned_arrival_time, formatDateTime), " \u2013 ").concat(formatTimeShort(record.planned_leave_time, formatDateTime));
    var actualPunch = "".concat(formatTimeShort(record.login_time, formatDateTime), " \u2013 ").concat(formatTimeShort(record.logout_time, formatDateTime));
    return (<>
      <div className={"exc-drawer-overlay".concat(open ? ' exc-drawer-overlay--open' : '')} ref={overlayRef} onClick={onClose} aria-hidden="true"/>
      <aside className={"exc-drawer".concat(open ? ' exc-drawer--open' : '')} role="dialog" aria-modal="true" aria-label={"".concat(exType, " exception \u2014 ").concat(employeeName)}>
        <div className="exc-drawer-header">
          <div style={{ minWidth: 0 }}>
            <h3 className="exc-drawer-header__title">{employeeName}</h3>
            <p className="exc-drawer-header__meta">{meta || '--'}</p>
          </div>
          <button type="button" className="exc-drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="exc-drawer-body">
          <div className="exc-drawer-pillrow">
            <span className={"exc-drawer-typepill exc-drawer-typepill--".concat(tier)}>{exType}</span>
            <span className={"table-pill ".concat(getStatusClass(record.status))}>{formatStatusLabel(record.status)}</span>
            <span className="exc-drawer-date">{formatDate(record.attendance_date || record.exception_date)}</span>
          </div>

          <div className="exc-drawer-facts">
            {fact('Planned shift', plannedShift)}
            {fact('Actual punch', actualPunch)}
            {fact('Variance', variance)}
            {fact('Hours logged', record.working_hours != null ? "".concat(record.working_hours.toFixed(1), " h") : null)}
            {fact('Prior exceptions (90d)', record.prior_exceptions_90d != null ? "".concat(record.prior_exceptions_90d, "\u00D7") : null)}
          </div>

          {(record.reason || record.notes) && (<div>
              <h4 className="exc-drawer-section__title">Employee reason</h4>
              {record.reason && <p className="exc-drawer-text">{record.reason}</p>}
              {record.notes && <p className="exc-drawer-text" style={{ marginTop: 8 }}>{record.notes}</p>}
            </div>)}

          <div>
            <h4 className="exc-drawer-section__title">Pattern</h4>
            <p className="exc-drawer-text">
              {((_c = record.prior_exceptions_90d) !== null && _c !== void 0 ? _c : 0) >= 3
            ? "".concat(record.prior_exceptions_90d, " exceptions in the last 90 days \u2014 flagged as a repeat pattern.")
            : 'Isolated incident. No pattern in the last 90 days.'}
            </p>
          </div>

          <div>
            <h4 className="exc-drawer-section__title">Manager remark</h4>
            <p className="exc-drawer-note">
              {record.manager_remarks || 'No remark recorded by the reporting manager.'}
            </p>
            {(record.reviewed_by || record.reviewed_at) && (<p className="exc-drawer-pattern-note">
                {[record.reviewed_by, record.reviewed_at ? formatDateTime(record.reviewed_at) : null]
                .filter(Boolean)
                .join(' · ')}
              </p>)}
          </div>

          {isPending && (<div>
              <label className="exc-drawer-remarks-label" htmlFor="exc-drawer-remarks">
                Add a remark <span>(optional)</span>
              </label>
              <textarea id="exc-drawer-remarks" className="exc-drawer-remarks" placeholder="Add a comment for the employee" value={remarks} onChange={function (e) { return setRemarks(e.target.value); }} rows={3} disabled={reviewing}/>
              {reviewStatus && <p className="exc-drawer-review-status">{reviewStatus}</p>}
            </div>)}
        </div>

        <div className="exc-drawer-footer">
          {isPending ? (<>
              <div className="exc-drawer-footer__note">Record ID {(_d = record.id) !== null && _d !== void 0 ? _d : '--'}</div>
              <div className="exc-drawer-footer__actions">
                <button type="button" className="exc-drawer-reject" onClick={function () { return void handleReview('rejected'); }} disabled={reviewing}>
                  {reviewing ? 'Saving…' : 'Reject'}
                </button>
                <button type="button" className="exc-drawer-approve" onClick={function () { return void handleReview('approved'); }} disabled={reviewing}>
                  {reviewing ? 'Saving…' : 'Approve'}
                </button>
              </div>
            </>) : (<div className="exc-drawer-footer__note">
              Read-only · decided by {record.reviewed_by || 'the reporting manager'}
            </div>)}
        </div>
      </aside>
    </>);
}
