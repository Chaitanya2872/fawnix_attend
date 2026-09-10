"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_KEY = exports.REFRESH_TOKEN_KEY = exports.ACCESS_TOKEN_KEY = void 0;
exports.readStoredAdminSession = readStoredAdminSession;
exports.persistAdminTokens = persistAdminTokens;
exports.persistAdminProfile = persistAdminProfile;
exports.clearStoredAdminSession = clearStoredAdminSession;
exports.ACCESS_TOKEN_KEY = 'fawnix_admin_access_token';
exports.REFRESH_TOKEN_KEY = 'fawnix_admin_refresh_token';
exports.USER_KEY = 'fawnix_admin_user';
function readStoredAdminSession() {
    var accessToken = window.localStorage.getItem(exports.ACCESS_TOKEN_KEY) || '';
    var refreshToken = window.localStorage.getItem(exports.REFRESH_TOKEN_KEY) || '';
    var rawUser = window.localStorage.getItem(exports.USER_KEY);
    if (!rawUser) {
        return { accessToken: accessToken, refreshToken: refreshToken, profile: null };
    }
    try {
        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: JSON.parse(rawUser)
        };
    }
    catch (_a) {
        window.localStorage.removeItem(exports.USER_KEY);
        return { accessToken: accessToken, refreshToken: refreshToken, profile: null };
    }
}
function persistAdminTokens(accessToken, refreshToken) {
    window.localStorage.setItem(exports.ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(exports.REFRESH_TOKEN_KEY, refreshToken);
}
function persistAdminProfile(profile) {
    window.localStorage.setItem(exports.USER_KEY, JSON.stringify(profile));
}
function clearStoredAdminSession() {
    window.localStorage.removeItem(exports.ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(exports.REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(exports.USER_KEY);
}
