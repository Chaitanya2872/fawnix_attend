from functools import wraps
from flask import jsonify

ALLOWED_DESIGNATIONS = {"hr", "devtester"}


def hr_or_devtester_required(f):
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        designation = (current_user.get("emp_designation") or "").strip().lower()
        if designation not in ALLOWED_DESIGNATIONS:
            return jsonify({
                "success": False,
                "message": "Access denied"
            }), 403

        return f(current_user, *args, **kwargs)

    return decorated_function
