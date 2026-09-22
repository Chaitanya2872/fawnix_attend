"""
Service Account Service
API-only identities for integrating external systems.

A service account never logs in: there is no OTP, no JWT and no refresh token.
It authenticates with a long-lived API key sent as a bearer token:

    Authorization: Bearer fxsa_<key_id>_<secret>

Only a SHA-256 hash of the key is stored; the plaintext is returned once, when
the account is created or its key regenerated.
"""

import hashlib
import hmac
import json
import logging
import re
import secrets
from datetime import datetime, time, timezone

from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

SERVICE_ACCOUNT_KEY_PREFIX = "fxsa_"
SERVICE_ACCOUNT_EMP_CODE_PREFIX = "SA:"
SERVICE_ACCOUNT_DESIGNATION = "service_account"

_KEY_PATTERN = re.compile(r"^fxsa_([0-9a-f]{16})_([A-Za-z0-9_-]{40,})$")
_NAME_MAX_LENGTH = 100
_DESCRIPTION_MAX_LENGTH = 500
_LAST_USED_UPDATE_INTERVAL_SECONDS = 60

READ_METHODS = {"GET", "HEAD", "OPTIONS"}
WRITE_METHODS = {"POST"}
UPDATE_METHODS = {"PUT", "PATCH"}

# Endpoints that grant or manage privileges, or belong to the interactive login
# flow. Service accounts are refused here whatever their permission flags say.
BLOCKED_PATH_PREFIXES = (
    "/api/auth",
    "/api/admin/admins",
    "/api/admin/service-accounts",
    "/api/admin/api-logs",
)
# Paths where only reads are permitted (writes would create users or change roles).
READ_ONLY_PATH_PREFIXES = (
    "/api/users",
)

SERVICE_ACCOUNT_PUBLIC_COLUMNS = """
    id, name, description, key_id, can_read, can_write, can_update, status,
    expires_at, created_by, created_at, updated_by, updated_at, key_rotated_at,
    revoked_at, revoked_by, revoke_reason, last_used_at, last_used_ip
"""


# ---------------------------------------------------------------------------
# Keys
# ---------------------------------------------------------------------------

def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def generate_api_key():
    """Return (key_id, plaintext_key, key_hash). The secret carries ~384 bits of entropy."""
    key_id = secrets.token_hex(8)
    secret = secrets.token_urlsafe(48)
    api_key = f"{SERVICE_ACCOUNT_KEY_PREFIX}{key_id}_{secret}"
    return key_id, api_key, hash_api_key(api_key)


def is_service_account_key(token) -> bool:
    return isinstance(token, str) and token.startswith(SERVICE_ACCOUNT_KEY_PREFIX)


def parse_api_key(token):
    """Return the public key_id of a well-formed key, otherwise None."""
    if not isinstance(token, str):
        return None
    match = _KEY_PATTERN.match(token.strip())
    return match.group(1) if match else None


def service_account_actor(key_id: str) -> str:
    return f"{SERVICE_ACCOUNT_EMP_CODE_PREFIX}{key_id}"


def is_service_account(current_user) -> bool:
    return bool(current_user and current_user.get("is_service_account"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_row(row):
    if not row:
        return row
    result = dict(row)
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _now_utc():
    return datetime.now(timezone.utc)


def _as_aware(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _parse_expires_at(value):
    """
    Parse an optional expiry. Returns (datetime_or_None, error_message_or_None).
    A bare date means the key is valid until the end of that day (UTC).
    """
    if value is None or (isinstance(value, str) and not value.strip()):
        return None, None
    if not isinstance(value, str):
        return None, "expires_at must be an ISO date or datetime string"

    raw = value.strip()
    try:
        if len(raw) == 10:
            parsed = datetime.combine(datetime.strptime(raw, "%Y-%m-%d").date(), time(23, 59, 59))
        else:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None, "expires_at must be an ISO date or datetime string"

    parsed = _as_aware(parsed)
    if parsed <= _now_utc():
        return None, "expires_at must be in the future"
    return parsed, None


def _validate_permissions(can_read, can_write, can_update):
    if not (can_read or can_write or can_update):
        return "At least one of read, write or update access is required"
    return None


def _validate_name(name):
    if not name:
        return "name is required"
    if len(name) > _NAME_MAX_LENGTH:
        return f"name must be at most {_NAME_MAX_LENGTH} characters"
    return None


def _validate_description(description):
    if description and len(description) > _DESCRIPTION_MAX_LENGTH:
        return f"description must be at most {_DESCRIPTION_MAX_LENGTH} characters"
    return None


def _insert_audit_event(cursor, service_account_id, event, actor, details=None, ip_address=None, user_agent=None):
    cursor.execute(
        """
        INSERT INTO service_account_audit_logs
            (service_account_id, event, actor, details, ip_address, user_agent)
        VALUES (%s, %s, %s, %s::jsonb, %s, %s)
        """,
        (
            service_account_id,
            event,
            actor,
            json.dumps(details or {}, default=str),
            ip_address,
            (user_agent or "")[:500] or None,
        ),
    )


def log_service_account_event(service_account_id, event, actor=None, details=None, ip_address=None, user_agent=None):
    """Write one audit event in its own transaction. Never raises."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        _insert_audit_event(cursor, service_account_id, event, actor, details, ip_address, user_agent)
        conn.commit()
    except Exception as exc:
        logger.warning("Could not record service account audit event %s: %s", event, exc)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)


def _build_current_user(row):
    key_id = row["key_id"]
    can_update = bool(row.get("can_update"))
    return {
        "id": None,
        "user_id": None,
        "emp_code": service_account_actor(key_id),
        "emp_full_name": f"{row['name']} (service account)",
        "emp_email": None,
        "emp_designation": SERVICE_ACCOUNT_DESIGNATION,
        "emp_department": None,
        "emp_manager": None,
        "role": "admin",
        "is_active": True,
        # Existing admin decorators only know read/write; the per-method gate in
        # check_service_account_request separates write (POST) from update (PUT/PATCH).
        "can_read": bool(row.get("can_read")),
        "can_write": bool(row.get("can_write")) or can_update,
        "can_update": can_update,
        "can_create": bool(row.get("can_write")),
        "is_service_account": True,
        "service_account_id": row["id"],
        "service_account_name": row["name"],
        "service_account_key_id": key_id,
    }


# ---------------------------------------------------------------------------
# Authentication and request gate
# ---------------------------------------------------------------------------

def authenticate_api_key(token, ip_address=None, user_agent=None):
    """
    Resolve an API key to a synthetic current_user dict.
    Returns (user, None) or (None, (body, status)). Failures never reveal why.
    """
    invalid = ({"success": False, "message": "Invalid token"}, 401)

    key_id = parse_api_key(token)
    if not key_id:
        return None, invalid

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, name, key_id, key_hash, can_read, can_write, can_update,
                   status, expires_at, last_used_at
            FROM service_accounts
            WHERE key_id = %s
            """,
            (key_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None, invalid
        row = dict(row)

        failure_reason = None
        stored_hash = row.get("key_hash") or ""
        if not stored_hash or not hmac.compare_digest(stored_hash, hash_api_key(token.strip())):
            failure_reason = "key_mismatch"
        elif row.get("status") != "active":
            failure_reason = "revoked"
        elif row.get("expires_at") and _as_aware(row["expires_at"]) <= _now_utc():
            failure_reason = "expired"

        if failure_reason:
            _insert_audit_event(
                cursor, row["id"], "auth_failed", service_account_actor(key_id),
                {"reason": failure_reason}, ip_address, user_agent,
            )
            conn.commit()
            return None, invalid

        cursor.execute(
            """
            UPDATE service_accounts
            SET last_used_at = CURRENT_TIMESTAMP, last_used_ip = %s
            WHERE id = %s
              AND (last_used_at IS NULL
                   OR last_used_at < CURRENT_TIMESTAMP - make_interval(secs => %s))
            """,
            (ip_address, row["id"], _LAST_USED_UPDATE_INTERVAL_SECONDS),
        )
        conn.commit()
        return _build_current_user(row), None
    except Exception as exc:
        conn.rollback()
        logger.error("Service account authentication error: %s", exc)
        return None, invalid
    finally:
        cursor.close()
        return_connection(conn)


def _path_matches(path, prefixes):
    normalized = (path or "").rstrip("/") or "/"
    return any(normalized == prefix or normalized.startswith(prefix + "/") for prefix in prefixes)


def check_service_account_request(current_user, method, path):
    """
    Enforce the service account access policy for one request.
    Returns None when allowed, otherwise (body, 403).
    """
    method = (method or "").upper()

    def deny(message):
        return ({"success": False, "message": message}, 403)

    if method == "DELETE":
        return deny("Service accounts are not permitted to delete data")

    if _path_matches(path, BLOCKED_PATH_PREFIXES):
        return deny("Service accounts cannot access this endpoint")

    if method not in READ_METHODS and _path_matches(path, READ_ONLY_PATH_PREFIXES):
        return deny("Service accounts cannot manage users")

    if method in READ_METHODS:
        if not current_user.get("can_read"):
            return deny("Service account read access denied")
    elif method in WRITE_METHODS:
        if not current_user.get("can_create"):
            return deny("Service account write access denied")
    elif method in UPDATE_METHODS:
        if not current_user.get("can_update"):
            return deny("Service account update access denied")
    else:
        return deny("Method not permitted for service accounts")

    return None


# ---------------------------------------------------------------------------
# Management
# ---------------------------------------------------------------------------

def _fetch_account(cursor, service_account_id, for_update=False):
    cursor.execute(
        f"SELECT {SERVICE_ACCOUNT_PUBLIC_COLUMNS} FROM service_accounts WHERE id = %s"
        + (" FOR UPDATE" if for_update else ""),
        (service_account_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def _name_taken(cursor, name, exclude_id=None):
    if exclude_id is None:
        cursor.execute("SELECT 1 FROM service_accounts WHERE lower(name) = lower(%s)", (name,))
    else:
        cursor.execute(
            "SELECT 1 FROM service_accounts WHERE lower(name) = lower(%s) AND id <> %s",
            (name, exclude_id),
        )
    return cursor.fetchone() is not None


def list_service_accounts():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"SELECT {SERVICE_ACCOUNT_PUBLIC_COLUMNS} FROM service_accounts ORDER BY created_at DESC, id DESC"
        )
        rows = [_serialize_row(row) for row in cursor.fetchall()]
        return {"success": True, "data": rows}, 200
    except Exception as exc:
        logger.error("List service accounts error: %s", exc)
        return {"success": False, "message": "Failed to load service accounts"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def get_service_account(service_account_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        row = _fetch_account(cursor, service_account_id)
        if not row:
            return {"success": False, "message": "Service account not found"}, 404
        return {"success": True, "data": _serialize_row(row)}, 200
    except Exception as exc:
        logger.error("Get service account error: %s", exc)
        return {"success": False, "message": "Failed to load service account"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def create_service_account(payload, actor, ip_address=None, user_agent=None):
    payload = payload or {}
    name = (payload.get("name") or "").strip()
    description = (payload.get("description") or "").strip() or None
    can_read = _to_bool(payload.get("can_read"))
    can_write = _to_bool(payload.get("can_write"))
    can_update = _to_bool(payload.get("can_update"))

    if payload.get("can_delete") is not None and _to_bool(payload.get("can_delete")):
        return {"success": False, "message": "Delete access cannot be granted to service accounts"}, 400

    error = (
        _validate_name(name)
        or _validate_description(description)
        or _validate_permissions(can_read, can_write, can_update)
    )
    if error:
        return {"success": False, "message": error}, 400

    expires_at, error = _parse_expires_at(payload.get("expires_at"))
    if error:
        return {"success": False, "message": error}, 400

    key_id, api_key, key_hash = generate_api_key()

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if _name_taken(cursor, name):
            return {"success": False, "message": f"Service account '{name}' already exists"}, 409

        cursor.execute(
            f"""
            INSERT INTO service_accounts
                (name, description, key_id, key_hash, can_read, can_write, can_update,
                 status, expires_at, created_by, updated_by, key_rotated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING {SERVICE_ACCOUNT_PUBLIC_COLUMNS}
            """,
            (name, description, key_id, key_hash, can_read, can_write, can_update,
             expires_at, actor, actor),
        )
        created = dict(cursor.fetchone())
        _insert_audit_event(
            cursor, created["id"], "created", actor,
            {
                "name": name,
                "permissions": {"read": can_read, "write": can_write, "update": can_update},
                "expires_at": expires_at.isoformat() if expires_at else None,
                "key_id": key_id,
            },
            ip_address, user_agent,
        )
        conn.commit()
        return {
            "success": True,
            "message": "Service account created. Store the API key now; it will not be shown again.",
            "data": {"service_account": _serialize_row(created), "api_key": api_key},
        }, 201
    except Exception as exc:
        conn.rollback()
        logger.error("Create service account error: %s", exc)
        return {"success": False, "message": "Failed to create service account"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def update_service_account(service_account_id, payload, actor, ip_address=None, user_agent=None):
    payload = payload or {}

    if payload.get("can_delete") is not None and _to_bool(payload.get("can_delete")):
        return {"success": False, "message": "Delete access cannot be granted to service accounts"}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        current = _fetch_account(cursor, service_account_id, for_update=True)
        if not current:
            return {"success": False, "message": "Service account not found"}, 404

        updates = {}

        if "name" in payload:
            name = (payload.get("name") or "").strip()
            error = _validate_name(name)
            if error:
                return {"success": False, "message": error}, 400
            if name != current["name"]:
                if _name_taken(cursor, name, exclude_id=service_account_id):
                    return {"success": False, "message": f"Service account '{name}' already exists"}, 409
                updates["name"] = name

        if "description" in payload:
            description = (payload.get("description") or "").strip() or None
            error = _validate_description(description)
            if error:
                return {"success": False, "message": error}, 400
            if description != current["description"]:
                updates["description"] = description

        new_flags = {
            flag: _to_bool(payload[flag]) if flag in payload else bool(current[flag])
            for flag in ("can_read", "can_write", "can_update")
        }
        error = _validate_permissions(new_flags["can_read"], new_flags["can_write"], new_flags["can_update"])
        if error:
            return {"success": False, "message": error}, 400
        permissions_changed = any(new_flags[flag] != bool(current[flag]) for flag in new_flags)
        if permissions_changed:
            updates.update(new_flags)

        if "expires_at" in payload:
            expires_at, error = _parse_expires_at(payload.get("expires_at"))
            if error:
                return {"success": False, "message": error}, 400
            if expires_at != _as_aware(current["expires_at"]):
                updates["expires_at"] = expires_at

        if not updates:
            return {"success": True, "message": "No changes", "data": _serialize_row(current)}, 200

        assignments = ", ".join(f"{column} = %s" for column in updates)
        cursor.execute(
            f"""
            UPDATE service_accounts
            SET {assignments}, updated_by = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING {SERVICE_ACCOUNT_PUBLIC_COLUMNS}
            """,
            [*updates.values(), actor, service_account_id],
        )
        updated = dict(cursor.fetchone())

        if permissions_changed:
            _insert_audit_event(
                cursor, service_account_id, "permissions_changed", actor,
                {
                    "before": {
                        "read": bool(current["can_read"]),
                        "write": bool(current["can_write"]),
                        "update": bool(current["can_update"]),
                    },
                    "after": {
                        "read": new_flags["can_read"],
                        "write": new_flags["can_write"],
                        "update": new_flags["can_update"],
                    },
                },
                ip_address, user_agent,
            )

        other_changes = {
            column: {"before": current[column], "after": value}
            for column, value in updates.items()
            if column not in new_flags
        }
        if other_changes:
            _insert_audit_event(
                cursor, service_account_id, "updated", actor, {"changes": other_changes},
                ip_address, user_agent,
            )

        conn.commit()
        return {"success": True, "message": "Service account updated", "data": _serialize_row(updated)}, 200
    except Exception as exc:
        conn.rollback()
        logger.error("Update service account error: %s", exc)
        return {"success": False, "message": "Failed to update service account"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def regenerate_api_key(service_account_id, actor, payload=None, ip_address=None, user_agent=None):
    """Issue a new key. The previous key stops working immediately."""
    payload = payload or {}
    expires_at, error = _parse_expires_at(payload.get("expires_at"))
    if error:
        return {"success": False, "message": error}, 400

    key_id, api_key, key_hash = generate_api_key()

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        current = _fetch_account(cursor, service_account_id, for_update=True)
        if not current:
            return {"success": False, "message": "Service account not found"}, 404

        if "expires_at" not in payload:
            # Keep the current expiry unless it has already passed.
            existing_expiry = _as_aware(current["expires_at"])
            if existing_expiry and existing_expiry > _now_utc():
                expires_at = existing_expiry

        cursor.execute(
            f"""
            UPDATE service_accounts
            SET key_id = %s,
                key_hash = %s,
                status = 'active',
                expires_at = %s,
                key_rotated_at = CURRENT_TIMESTAMP,
                revoked_at = NULL,
                revoked_by = NULL,
                revoke_reason = NULL,
                last_used_at = NULL,
                last_used_ip = NULL,
                updated_by = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING {SERVICE_ACCOUNT_PUBLIC_COLUMNS}
            """,
            (key_id, key_hash, expires_at, actor, service_account_id),
        )
        updated = dict(cursor.fetchone())
        _insert_audit_event(
            cursor, service_account_id, "key_regenerated", actor,
            {
                "previous_key_id": current["key_id"],
                "new_key_id": key_id,
                "previous_status": current["status"],
                "expires_at": expires_at.isoformat() if expires_at else None,
            },
            ip_address, user_agent,
        )
        conn.commit()
        return {
            "success": True,
            "message": "API key regenerated. The previous key no longer works. Store the new key now; it will not be shown again.",
            "data": {"service_account": _serialize_row(updated), "api_key": api_key},
        }, 200
    except Exception as exc:
        conn.rollback()
        logger.error("Regenerate service account key error: %s", exc)
        return {"success": False, "message": "Failed to regenerate API key"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def revoke_service_account(service_account_id, actor, reason=None, ip_address=None, user_agent=None):
    """Revoke the account's key. Service accounts are never deleted, so their history stays intact."""
    reason = (reason or "").strip()[:_DESCRIPTION_MAX_LENGTH] or None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        current = _fetch_account(cursor, service_account_id, for_update=True)
        if not current:
            return {"success": False, "message": "Service account not found"}, 404
        if current["status"] == "revoked":
            return {"success": False, "message": "Service account is already revoked"}, 409

        cursor.execute(
            f"""
            UPDATE service_accounts
            SET status = 'revoked',
                key_hash = NULL,
                revoked_at = CURRENT_TIMESTAMP,
                revoked_by = %s,
                revoke_reason = %s,
                updated_by = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING {SERVICE_ACCOUNT_PUBLIC_COLUMNS}
            """,
            (actor, reason, actor, service_account_id),
        )
        updated = dict(cursor.fetchone())
        _insert_audit_event(
            cursor, service_account_id, "revoked", actor,
            {"key_id": current["key_id"], "reason": reason},
            ip_address, user_agent,
        )
        conn.commit()
        return {"success": True, "message": "Service account revoked", "data": _serialize_row(updated)}, 200
    except Exception as exc:
        conn.rollback()
        logger.error("Revoke service account error: %s", exc)
        return {"success": False, "message": "Failed to revoke service account"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def get_service_account_audit_logs(service_account_id, limit=100, offset=0):
    try:
        limit = max(1, min(int(limit), 500))
        offset = max(0, int(offset))
    except (TypeError, ValueError):
        return {"success": False, "message": "limit and offset must be integers"}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if not _fetch_account(cursor, service_account_id):
            return {"success": False, "message": "Service account not found"}, 404

        cursor.execute(
            "SELECT COUNT(*) AS total FROM service_account_audit_logs WHERE service_account_id = %s",
            (service_account_id,),
        )
        total = cursor.fetchone()["total"]
        cursor.execute(
            """
            SELECT id, service_account_id, event, actor, details, ip_address, user_agent, created_at
            FROM service_account_audit_logs
            WHERE service_account_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s OFFSET %s
            """,
            (service_account_id, limit, offset),
        )
        rows = [_serialize_row(row) for row in cursor.fetchall()]
        return {"success": True, "data": rows, "total": total, "limit": limit, "offset": offset}, 200
    except Exception as exc:
        logger.error("Service account audit log error: %s", exc)
        return {"success": False, "message": "Failed to load audit logs"}, 500
    finally:
        cursor.close()
        return_connection(conn)
