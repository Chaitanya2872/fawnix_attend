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
exports.useAdminSession = useAdminSession;
var react_1 = require("react");
var adminStorage_1 = require("../../../services/storage/adminStorage");
var TELEMETRY_MAX_ITEMS = 40;
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function redactSensitiveValue(key, value) {
    var normalizedKey = key.toLowerCase();
    if (normalizedKey.includes('authorization') ||
        normalizedKey.includes('token') ||
        normalizedKey.includes('password') ||
        normalizedKey.includes('otp') ||
        normalizedKey.includes('secret')) {
        return '[redacted]';
    }
    if (value instanceof File) {
        return {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream'
        };
    }
    if (typeof value === 'string' && value.length > 600) {
        return "".concat(value.slice(0, 600), "...");
    }
    return sanitizeTelemetryData(value);
}
function sanitizeTelemetryData(value) {
    if (value == null) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.slice(0, 25).map(function (item) { return sanitizeTelemetryData(item); });
    }
    if (value instanceof FormData) {
        return Array.from(value.entries()).map(function (_a) {
            var key = _a[0], entryValue = _a[1];
            return ({
                key: key,
                value: redactSensitiveValue(key, entryValue)
            });
        });
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(Object.entries(value)
            .slice(0, 50)
            .map(function (_a) {
            var key = _a[0], entryValue = _a[1];
            return [key, redactSensitiveValue(key, entryValue)];
        }));
    }
    return value;
}
function parseTelemetryBody(body) {
    if (!body) {
        return undefined;
    }
    if (typeof body === 'string') {
        try {
            return sanitizeTelemetryData(JSON.parse(body));
        }
        catch (_a) {
            return body.length > 600 ? "".concat(body.slice(0, 600), "...") : body;
        }
    }
    if (body instanceof FormData) {
        return sanitizeTelemetryData(body);
    }
    return '[non-text body]';
}
function decodeJwtPayload(token) {
    if (!token) {
        return null;
    }
    try {
        var payload = token.split('.')[1];
        if (!payload) {
            return null;
        }
        var normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        var padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        var binary = atob(padded);
        var decoded = decodeURIComponent(Array.from(binary, function (char) { return "%".concat(("00".concat(char.charCodeAt(0).toString(16))).slice(-2)); }).join(''));
        return JSON.parse(decoded);
    }
    catch (_a) {
        return null;
    }
}
function getAccessTokenExpiryMs(token) {
    var payload = decodeJwtPayload(token);
    var expiresAt = payload === null || payload === void 0 ? void 0 : payload.exp;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
        return null;
    }
    return expiresAt * 1000;
}
function isAccessTokenExpiringSoon(token, bufferMs) {
    if (bufferMs === void 0) { bufferMs = 60000; }
    var expiryMs = getAccessTokenExpiryMs(token);
    if (expiryMs == null) {
        return false;
    }
    return Date.now() >= expiryMs - bufferMs;
}
function toFriendlyRequestSummary(method, path) {
    return "I called ".concat(method.toUpperCase(), " ").concat(path);
}
function toFriendlyRequestDetail(method, path, requestPayload) {
    if (requestPayload === undefined) {
        return "".concat(method.toUpperCase(), " ").concat(path, " was sent without a request payload.");
    }
    return "".concat(method.toUpperCase(), " ").concat(path, " was sent with the sanitized payload shown below.");
}
function getResponseErrorMessage(data) {
    if (!isPlainObject(data)) {
        return 'Request failed';
    }
    var message = data.message || data.error || data.detail;
    return typeof message === 'string' && message.trim() ? message.trim() : 'Request failed';
}
function useAdminSession(_a) {
    var _this = this;
    var onSessionCleared = _a.onSessionCleared, onSessionExpired = _a.onSessionExpired;
    var initialSession = (0, adminStorage_1.readStoredAdminSession)();
    var _b = (0, react_1.useState)(initialSession.accessToken), accessToken = _b[0], setAccessToken = _b[1];
    var _c = (0, react_1.useState)(initialSession.refreshToken), refreshToken = _c[0], setRefreshToken = _c[1];
    var _d = (0, react_1.useState)(initialSession.profile), profile = _d[0], setProfile = _d[1];
    var _e = (0, react_1.useState)(''), refreshNotice = _e[0], setRefreshNotice = _e[1];
    var _f = (0, react_1.useState)([]), telemetryEntries = _f[0], setTelemetryEntries = _f[1];
    var refreshPromiseRef = (0, react_1.useRef)(null);
    var appendTelemetryEntry = function (entry) {
        setTelemetryEntries(function (currentEntries) { return __spreadArray([entry], currentEntries, true).slice(0, TELEMETRY_MAX_ITEMS); });
    };
    var updateTelemetryEntry = function (id, updater) {
        setTelemetryEntries(function (currentEntries) {
            return currentEntries.map(function (entry) { return (entry.id === id ? updater(entry) : entry); });
        });
    };
    var clearTelemetryEntries = function () {
        setTelemetryEntries([]);
    };
    var updateTokens = function (nextAccessToken, nextRefreshToken) {
        setAccessToken(nextAccessToken);
        setRefreshToken(nextRefreshToken);
        (0, adminStorage_1.persistAdminTokens)(nextAccessToken, nextRefreshToken);
    };
    var clearSession = function () {
        setAccessToken('');
        setRefreshToken('');
        setProfile(null);
        setTelemetryEntries([]);
        (0, adminStorage_1.clearStoredAdminSession)();
        onSessionCleared === null || onSessionCleared === void 0 ? void 0 : onSessionCleared();
    };
    var persistSession = function (nextAccessToken, nextRefreshToken, nextProfile) {
        setAccessToken(nextAccessToken);
        setRefreshToken(nextRefreshToken);
        setProfile(nextProfile);
        (0, adminStorage_1.persistAdminTokens)(nextAccessToken, nextRefreshToken);
        (0, adminStorage_1.persistAdminProfile)(nextProfile);
    };
    var refreshAccessToken = function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (!refreshToken) {
                throw new Error('Refresh token missing');
            }
            if (!refreshPromiseRef.current) {
                refreshPromiseRef.current = (function () { return __awaiter(_this, void 0, void 0, function () {
                    var telemetryId, startedAt, requestPayload, startedTime, response, error_1, data, nextAccessToken, nextRefreshToken;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                telemetryId = "telemetry-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 8));
                                startedAt = new Date().toISOString();
                                requestPayload = sanitizeTelemetryData({ refresh_token: '[redacted]' });
                                appendTelemetryEntry({
                                    id: telemetryId,
                                    startedAt: startedAt,
                                    method: 'POST',
                                    path: '/api/auth/refresh',
                                    status: 'pending',
                                    summary: 'I’m refreshing your admin session in the background.',
                                    detail: 'POST /api/auth/refresh was sent with a redacted refresh payload.',
                                    requestPayload: requestPayload
                                });
                                startedTime = Date.now();
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, fetch('/api/auth/refresh', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ refresh_token: refreshToken })
                                    })];
                            case 2:
                                response = _a.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                error_1 = _a.sent();
                                updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', durationMs: Date.now() - startedTime, completedAt: new Date().toISOString(), summary: 'Session refresh could not reach the backend.', detail: error_1 instanceof Error ? error_1.message : 'Network request failed before a response was received.' })); });
                                throw error_1;
                            case 4: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                            case 5:
                                data = _a.sent();
                                if (!response.ok) {
                                    updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', httpStatus: response.status, durationMs: Date.now() - startedTime, completedAt: new Date().toISOString(), summary: "Session refresh failed with ".concat(response.status, "."), detail: "The refresh request was rejected and the current session may need a new login.", responsePayload: sanitizeTelemetryData(data) })); });
                                    throw new Error((data === null || data === void 0 ? void 0 : data.message) || 'Unable to refresh session');
                                }
                                nextAccessToken = (data === null || data === void 0 ? void 0 : data.access_token) || '';
                                nextRefreshToken = (data === null || data === void 0 ? void 0 : data.refresh_token) || '';
                                if (!nextAccessToken || !nextRefreshToken) {
                                    updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', httpStatus: response.status, durationMs: Date.now() - startedTime, completedAt: new Date().toISOString(), summary: 'Session refresh response was incomplete.', detail: 'The refresh endpoint responded, but the token pair was missing.', responsePayload: sanitizeTelemetryData(data) })); });
                                    throw new Error('Invalid refresh response');
                                }
                                updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'success', httpStatus: response.status, durationMs: Date.now() - startedTime, completedAt: new Date().toISOString(), summary: "Session refreshed successfully in ".concat(Date.now() - startedTime, "ms."), detail: 'The admin session token was renewed automatically and the original request can continue.', responsePayload: sanitizeTelemetryData({ access_token: '[redacted]', refresh_token: '[redacted]' }) })); });
                                updateTokens(nextAccessToken, nextRefreshToken);
                                setRefreshNotice('Session refreshed');
                                window.setTimeout(function () { return setRefreshNotice(''); }, 2500);
                                return [2 /*return*/, nextAccessToken];
                        }
                    });
                }); })().finally(function () {
                    refreshPromiseRef.current = null;
                });
            }
            return [2 /*return*/, refreshPromiseRef.current];
        });
    }); };
    var apiRequest = function (path_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([path_1], args_1, true), void 0, function (path, options, tokenOverride, allowRetry) {
            var token, freshToken, _a, headers, method, requestPayload, telemetryId, startedAt, startedTime, response, error_2, data, durationMs, message_1, shouldRefresh, nextAccessToken, refreshError_1;
            if (options === void 0) { options = {}; }
            if (allowRetry === void 0) { allowRetry = true; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        token = tokenOverride || accessToken;
                        if (!(token && !tokenOverride && isAccessTokenExpiringSoon(token, 60000))) return [3 /*break*/, 4];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, refreshAccessToken()];
                    case 2:
                        freshToken = _b.sent();
                        if (freshToken) {
                            token = freshToken;
                            options = __assign(__assign({}, options), { headers: __assign(__assign({}, (options.headers || {})), { Authorization: "Bearer ".concat(freshToken) }) });
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        clearSession();
                        onSessionExpired('Session expired. Please log in again.');
                        throw new Error('Session expired. Please log in again.');
                    case 4:
                        headers = new Headers(options.headers || {});
                        method = (options.method || 'GET').toUpperCase();
                        requestPayload = parseTelemetryBody(options.body);
                        telemetryId = "telemetry-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 8));
                        startedAt = new Date().toISOString();
                        startedTime = Date.now();
                        appendTelemetryEntry({
                            id: telemetryId,
                            startedAt: startedAt,
                            method: method,
                            path: path,
                            status: 'pending',
                            summary: toFriendlyRequestSummary(method, path),
                            detail: toFriendlyRequestDetail(method, path, requestPayload),
                            requestPayload: requestPayload
                        });
                        if (token) {
                            headers.set('Authorization', "Bearer ".concat(token));
                        }
                        if (!headers.has('Content-Type') && options.body) {
                            headers.set('Content-Type', 'application/json');
                        }
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, fetch(path, __assign(__assign({}, options), { headers: headers }))];
                    case 6:
                        response = _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _b.sent();
                        updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', durationMs: Date.now() - startedTime, completedAt: new Date().toISOString(), summary: "".concat(method, " ").concat(path, " could not reach the backend."), detail: error_2 instanceof Error ? error_2.message : 'Network request failed before a response was received.' })); });
                        throw error_2;
                    case 8: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                    case 9:
                        data = _b.sent();
                        durationMs = Date.now() - startedTime;
                        if (!!response.ok) return [3 /*break*/, 14];
                        message_1 = getResponseErrorMessage(data);
                        shouldRefresh = allowRetry &&
                            (response.status === 401 ||
                                message_1.toLowerCase().includes('token') ||
                                message_1.toLowerCase().includes('expired'));
                        if (!shouldRefresh) return [3 /*break*/, 13];
                        updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', httpStatus: response.status, durationMs: durationMs, completedAt: new Date().toISOString(), summary: "".concat(method, " ").concat(path, " returned ").concat(response.status, ", so I\u2019m trying a session refresh."), detail: 'The request hit an auth problem and the frontend is attempting one automatic retry after refreshing the session.', responsePayload: sanitizeTelemetryData(data) })); });
                        _b.label = 10;
                    case 10:
                        _b.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, refreshAccessToken()];
                    case 11:
                        nextAccessToken = _b.sent();
                        return [2 /*return*/, apiRequest(path, options, nextAccessToken, false)];
                    case 12:
                        refreshError_1 = _b.sent();
                        clearSession();
                        onSessionExpired('Session expired. Please log in again.');
                        throw refreshError_1;
                    case 13:
                        updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'error', httpStatus: response.status, durationMs: durationMs, completedAt: new Date().toISOString(), summary: "".concat(method, " ").concat(path, " failed with ").concat(response.status, "."), detail: typeof message_1 === 'string' && message_1.trim()
                                ? message_1.trim()
                                : 'The request failed before the page could continue.', responsePayload: sanitizeTelemetryData(data) })); });
                        throw new Error(message_1);
                    case 14:
                        updateTelemetryEntry(telemetryId, function (entry) { return (__assign(__assign({}, entry), { status: 'success', httpStatus: response.status, durationMs: durationMs, completedAt: new Date().toISOString(), summary: "".concat(method, " ").concat(path, " completed with ").concat(response.status, " in ").concat(durationMs, "ms."), detail: 'The backend responded successfully. You can inspect the sanitized request and response below.', responsePayload: sanitizeTelemetryData(data) })); });
                        return [2 /*return*/, data];
                }
            });
        });
    };
    return {
        accessToken: accessToken,
        hasStoredSession: Boolean(initialSession.accessToken),
        refreshToken: refreshToken,
        profile: profile,
        refreshNotice: refreshNotice,
        setProfile: setProfile,
        setRefreshNotice: setRefreshNotice,
        telemetryEntries: telemetryEntries,
        clearTelemetryEntries: clearTelemetryEntries,
        persistSession: persistSession,
        clearSession: clearSession,
        refreshAccessToken: refreshAccessToken,
        apiRequest: apiRequest
    };
}
