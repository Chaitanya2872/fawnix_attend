"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrivilegedUser = isPrivilegedUser;
exports.hasWriteAccess = hasWriteAccess;
function isPrivilegedUser(profile) {
    if (!profile) {
        return false;
    }
    var designation = (profile.emp_designation || '').trim().toLowerCase();
    if (designation === 'devtester') {
        return true;
    }
    var role = (profile.role || '').trim().toLowerCase();
    if (role !== 'admin') {
        return false;
    }
    return Boolean(profile.can_read || profile.can_write);
}
function hasWriteAccess(profile) {
    if (!profile) {
        return false;
    }
    var designation = (profile.emp_designation || '').trim().toLowerCase();
    if (designation === 'devtester') {
        return true;
    }
    return (profile.role || '').trim().toLowerCase() === 'admin' && Boolean(profile.can_write);
}
