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
exports.useAdminAuth = useAdminAuth;
var react_1 = require("react");
var useAdminSession_1 = require("./useAdminSession");
var permissions_1 = require("../utils/permissions");
function useAdminAuth(_a) {
    var _this = this;
    var onSessionCleared = _a.onSessionCleared;
    var _b = (0, react_1.useState)(true), showAdminLogin = _b[0], setShowAdminLogin = _b[1];
    var _c = (0, react_1.useState)(false), authLoading = _c[0], setAuthLoading = _c[1];
    var _d = (0, react_1.useState)(''), authStatus = _d[0], setAuthStatus = _d[1];
    var _e = (0, react_1.useState)(''), adminEmpCode = _e[0], setAdminEmpCode = _e[1];
    var _f = (0, react_1.useState)(''), adminOtp = _f[0], setAdminOtp = _f[1];
    var _g = (0, useAdminSession_1.useAdminSession)({
        onSessionCleared: onSessionCleared,
        onSessionExpired: function (message) {
            setShowAdminLogin(true);
            setAuthStatus(message);
        }
    }), accessToken = _g.accessToken, hasStoredSession = _g.hasStoredSession, refreshToken = _g.refreshToken, profile = _g.profile, refreshNotice = _g.refreshNotice, telemetryEntries = _g.telemetryEntries, clearTelemetryEntries = _g.clearTelemetryEntries, persistSession = _g.persistSession, clearSession = _g.clearSession, refreshAccessToken = _g.refreshAccessToken, apiRequest = _g.apiRequest;
    (0, react_1.useEffect)(function () {
        if (hasStoredSession) {
            setShowAdminLogin(false);
        }
    }, [hasStoredSession]);
    var handleSessionExpired = function () {
        clearSession();
        setShowAdminLogin(true);
    };
    var handleAdminRequestOtp = function () { return __awaiter(_this, void 0, void 0, function () {
        var data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!adminEmpCode.trim()) {
                        setAuthStatus('Enter your Employee ID to request OTP.');
                        return [2 /*return*/];
                    }
                    setAuthLoading(true);
                    setAuthStatus('Requesting admin OTP...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, apiRequest('/api/auth/request-otp', {
                            method: 'POST',
                            body: JSON.stringify({ emp_code: adminEmpCode.trim() })
                        })];
                case 2:
                    data = _a.sent();
                    setAuthStatus((data === null || data === void 0 ? void 0 : data.message) || 'OTP sent successfully.');
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    setAuthStatus(error_1 instanceof Error ? error_1.message : 'Failed to request OTP');
                    return [3 /*break*/, 5];
                case 4:
                    setAuthLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleAdminLogin = function () { return __awaiter(_this, void 0, void 0, function () {
        var loginData, nextAccessToken, nextRefreshToken, profileResponse, nextProfile, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!adminEmpCode.trim() || !adminOtp.trim()) {
                        setAuthStatus('Employee ID and OTP are required.');
                        return [2 /*return*/];
                    }
                    setAuthLoading(true);
                    setAuthStatus('Verifying admin login...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiRequest('/api/auth/verify-otp', {
                            method: 'POST',
                            body: JSON.stringify({
                                emp_code: adminEmpCode.trim(),
                                otp: adminOtp.trim(),
                                device_info: {
                                    device_name: 'Fawnix Admin Web',
                                    os: navigator.platform || 'web',
                                    app_version: 'frontend-admin-dashboard'
                                }
                            })
                        })];
                case 2:
                    loginData = _a.sent();
                    nextAccessToken = (loginData === null || loginData === void 0 ? void 0 : loginData.access_token) || '';
                    nextRefreshToken = (loginData === null || loginData === void 0 ? void 0 : loginData.refresh_token) || '';
                    if (!nextAccessToken) {
                        throw new Error('Access token missing from login response');
                    }
                    return [4 /*yield*/, apiRequest('/api/auth/me', {}, nextAccessToken)];
                case 3:
                    profileResponse = _a.sent();
                    nextProfile = ((profileResponse === null || profileResponse === void 0 ? void 0 : profileResponse.data) || null);
                    if (!(0, permissions_1.isPrivilegedUser)(nextProfile)) {
                        throw new Error('This dashboard currently requires DevTester or admin permissions access');
                    }
                    persistSession(nextAccessToken, nextRefreshToken, nextProfile);
                    setShowAdminLogin(false);
                    setAuthStatus('Admin login successful.');
                    setAdminOtp('');
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    clearSession();
                    setAuthStatus(error_2 instanceof Error ? error_2.message : 'Admin login failed');
                    return [3 /*break*/, 6];
                case 5:
                    setAuthLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleLogout = function () {
        var logoutAccessToken = accessToken;
        var logoutRefreshToken = refreshToken;
        // Local logout must never wait for a slow or unavailable API.
        clearSession();
        setShowAdminLogin(true);
        setAuthStatus('');
        if (logoutAccessToken && logoutRefreshToken) {
            void fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    Authorization: "Bearer ".concat(logoutAccessToken),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: logoutRefreshToken }),
                keepalive: true
            }).catch(function () { return undefined; });
        }
    };
    return {
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile,
        refreshNotice: refreshNotice,
        telemetryEntries: telemetryEntries,
        clearTelemetryEntries: clearTelemetryEntries,
        refreshAccessToken: refreshAccessToken,
        apiRequest: apiRequest,
        showAdminLogin: showAdminLogin,
        authLoading: authLoading,
        authStatus: authStatus,
        adminEmpCode: adminEmpCode,
        adminOtp: adminOtp,
        setAdminEmpCode: setAdminEmpCode,
        setAdminOtp: setAdminOtp,
        handleAdminRequestOtp: handleAdminRequestOtp,
        handleAdminLogin: handleAdminLogin,
        handleLogout: handleLogout,
        handleSessionExpired: handleSessionExpired
    };
}
