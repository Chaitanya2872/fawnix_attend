from functools import wraps
from flask import jsonify, request


def _is_devtester(current_user):
    designation = (current_user.get("emp_designation") or "").strip().lower()
    return designation == "devtester"


def _has_admin_access(current_user, require_write=False):
    if _is_devtester(current_user):
        return True

    role = (current_user.get("role") or "").strip().lower()
    if role != "admin":
        return False

    if require_write:
        return bool(current_user.get("can_write"))

    return bool(current_user.get("can_read") or current_user.get("can_write"))


def hr_or_devtester_required(f):
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        require_write = request.method.upper() not in {"GET", "HEAD", "OPTIONS"}
        if not _has_admin_access(current_user, require_write=require_write):
            access_type = "write" if require_write else "read"
            return jsonify({
                "success": False,
                "message": f"Admin {access_type} access denied"
            }), 403

        return f(current_user, *args, **kwargs)

    return decorated_function
