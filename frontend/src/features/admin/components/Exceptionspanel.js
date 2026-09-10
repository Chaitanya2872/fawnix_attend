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
exports.ExceptionsPanel = ExceptionsPanel;
/* eslint-disable @typescript-eslint/no-explicit-any */
var react_1 = require("react");
var FILTERS = ['All', 'Punch', 'Geofence', 'Late', 'Absent'];
function ExceptionsPanel(_a) {
    var _this = this;
    var exceptions = _a.exceptions, onAlertManager = _a.onAlertManager;
    var _b = (0, react_1.useState)('All'), exceptionFilter = _b[0], setExceptionFilter = _b[1];
    var _c = (0, react_1.useState)(''), alertLoadingKey = _c[0], setAlertLoadingKey = _c[1];
    var _d = (0, react_1.useState)(''), alertStatus = _d[0], setAlertStatus = _d[1];
    var filtered = exceptionFilter === 'All'
        ? exceptions
        : exceptions.filter(function (r) {
            return "".concat((r === null || r === void 0 ? void 0 : r.type) || '', " ").concat((r === null || r === void 0 ? void 0 : r.reason) || '', " ").concat((r === null || r === void 0 ? void 0 : r.message) || '')
                .toLowerCase()
                .includes(exceptionFilter.toLowerCase());
        });
    var handleAlert = function (row) { return __awaiter(_this, void 0, void 0, function () {
        var key, next, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    key = String(row.id || row.emp_code || Math.random());
                    setAlertLoadingKey(key);
                    setAlertStatus('');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, onAlertManager(row)];
                case 2:
                    next = _a.sent();
                    setAlertStatus(next);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setAlertStatus(err_1 instanceof Error ? err_1.message : 'Failed.');
                    return [3 /*break*/, 5];
                case 4:
                    setAlertLoadingKey('');
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="ov2-card ov2-exc-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">
            Exceptions &amp; Alerts
            {exceptions.length > 0 && <span className="ov2-exc-live-badge">LIVE</span>}
          </div>
          <div className="ov2-card-sub">
            {filtered.length} of {exceptions.length} shown
          </div>
        </div>
      </div>

      <div className="ov2-exc-filters">
        {FILTERS.map(function (f) { return (<button key={f} className={"ov2-exc-chip".concat(exceptionFilter === f ? ' active' : '')} onClick={function () { return setExceptionFilter(f); }} type="button">
            {f}
            {f === 'All' && exceptions.length > 0 && (<span className="ov2-chip-count">{exceptions.length}</span>)}
          </button>); })}
      </div>

      <div className="ov2-exc-list">
        {filtered.slice(0, 8).map(function (row, i) {
            var text = "".concat((row === null || row === void 0 ? void 0 : row.type) || (row === null || row === void 0 ? void 0 : row.reason) || (row === null || row === void 0 ? void 0 : row.message) || 'Exception');
            var isLate = text.toLowerCase().includes('late');
            var isGeo = text.toLowerCase().includes('geo') || text.toLowerCase().includes('location');
            var dotClass = isLate ? 'amber' : isGeo ? 'blue' : 'red';
            var rowKey = String(row.id || row.emp_code || i);
            return (<div key={rowKey} className="ov2-exc-item">
              <span className={"ov2-exc-dot ".concat(dotClass)}/>
              <div className="ov2-exc-body">
                <span className="ov2-exc-name">
                  {row.emp_full_name || row.emp_code || 'Unknown'}
                </span>
                <span className="ov2-exc-desc">{text.slice(0, 52)}</span>
              </div>
              <button className="ov2-resolve-btn" onClick={function () { return void handleAlert(row); }} disabled={alertLoadingKey === rowKey} type="button">
                {alertLoadingKey === rowKey ? '…' : 'Alert'}
              </button>
            </div>);
        })}

        {filtered.length === 0 && (<div className="ov2-empty">
            No exceptions{exceptionFilter !== 'All' ? " matching \"".concat(exceptionFilter, "\"") : ' today'}.
          </div>)}

        {alertStatus && <div className="ov2-alert-status">{alertStatus}</div>}
      </div>
    </div>);
}
