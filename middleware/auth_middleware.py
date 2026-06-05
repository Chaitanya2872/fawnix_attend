"""
Authentication Middleware
JWT token validation
"""

from flask import request, jsonify
from functools import wraps
from services.auth_service import decode_jwt_token
from database.connection import get_db_connection
from config import Config
import jwt
import logging
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


def _extract_bearer_token():
    token = None

    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return None, ({"success": False, "message": "Invalid token format"}, 401)

    if not token:
        return None, ({"success": False, "message": "Token required"}, 401)

    return token, None


def _load_user(query, params):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(query, params)
        user = cursor.fetchone()
        return dict(user) if user else None
    finally:
        cursor.close()
        conn.close()


def _query_user_by_emp_code(emp_code):
    return _load_user("""
        SELECT
            u.*,
            e.emp_full_name,
            e.emp_email,
            e.emp_designation,
            e.emp_department,
            e.emp_manager,
            COALESCE(ap.can_read, FALSE) AS can_read,
            COALESCE(ap.can_write, FALSE) AS can_write
        FROM users u
        JOIN employees e ON u.emp_code = e.emp_code
        LEFT JOIN admin_permissions ap ON ap.emp_code = u.emp_code
        WHERE u.emp_code = %s
    """, (emp_code,))


def _query_user_by_email(email):
    return _load_user("""
        SELECT
            u.*,
            e.emp_full_name,
            e.emp_email,
            e.emp_designation,
            e.emp_department,
            e.emp_manager,
            COALESCE(ap.can_read, FALSE) AS can_read,
            COALESCE(ap.can_write, FALSE) AS can_write
        FROM users u
        JOIN employees e ON u.emp_code = e.emp_code
        LEFT JOIN admin_permissions ap ON ap.emp_code = u.emp_code
        WHERE lower(e.emp_email) = lower(%s)
    """, (email,))


def _finalize_current_user(user, payload, token, source):
    if not user:
        return None, ({"success": False, "message": "User not found"}, 401)

    if not user['is_active']:
        return None, ({"success": False, "message": "Account inactive"}, 403)

    resolved_user_id = user.get('id')
    if resolved_user_id is None:
        resolved_user_id = payload.get('id', payload.get('user_id'))
        if resolved_user_id is not None:
            user['id'] = resolved_user_id
    if resolved_user_id is not None and 'user_id' not in user:
        user['user_id'] = resolved_user_id

    user["_access_token"] = token
    user["_access_token_source"] = source
    return user, None


def _authenticate_fawnix_token(token):
    payload = decode_jwt_token(token)
    emp_code = payload.get('sub')
    user = _query_user_by_emp_code(emp_code)
    return _finalize_current_user(user, payload, token, "fawnix")


def _authenticate_verse_token(token):
    if not Config.VERSE_JWT_SECRET:
        raise Exception("Invalid token")

    payload = jwt.decode(
        token,
        Config.VERSE_JWT_SECRET,
        algorithms=[Config.VERSE_JWT_ALGORITHM],
        issuer=Config.VERSE_JWT_ISSUER,
    )
    email = (payload.get('email') or '').strip()
    if not email:
        raise Exception("Invalid token")

    user = _query_user_by_email(email)
    return _finalize_current_user(user, payload, token, "verse")


def _build_token_required_decorator(allow_verse=False):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token, token_error = _extract_bearer_token()
            if token_error:
                body, status = token_error
                return jsonify(body), status

            try:
                current_user, auth_error = _authenticate_fawnix_token(token)
                if auth_error:
                    body, status = auth_error
                    return jsonify(body), status
                return f(current_user, *args, **kwargs)
            except HTTPException:
                raise
            except Exception as fawnix_error:
                if allow_verse:
                    try:
                        current_user, auth_error = _authenticate_verse_token(token)
                        if auth_error:
                            body, status = auth_error
                            return jsonify(body), status
                        return f(current_user, *args, **kwargs)
                    except HTTPException:
                        raise
                    except Exception as verse_error:
                        logger.error(f"Token validation error: {verse_error}")
                        return jsonify({"success": False, "message": "Invalid token"}), 401

                logger.error(f"Token validation error: {fawnix_error}")
                return jsonify({"success": False, "message": str(fawnix_error)}), 401

        return decorated
    return decorator


token_required = _build_token_required_decorator(allow_verse=False)
token_required_allow_verse = _build_token_required_decorator(allow_verse=True)


def require_role(*roles):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(current_user, *args, **kwargs):
            if current_user['role'] not in roles:
                return jsonify({
                    "success": False,
                    "message": "Insufficient permissions"
                }), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator


def setup_auth_middleware(app):
    """Setup authentication middleware"""
    logger.info("Authentication middleware configured")
