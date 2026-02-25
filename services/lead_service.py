"""
Lead Management Service
CRUD operations for sales leads with optional field-visit linkage.
"""

from datetime import datetime
from decimal import Decimal
import logging

from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

VALID_LEAD_STATUS = {
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
}

VALID_PRIORITY = {"low", "medium", "high"}
PRIVILEGED_ROLES = {"admin", "user_manager"}


def _serialize_row(row):
    """Convert DB types into JSON-safe values."""
    if not row:
        return row

    for key, value in row.items():
        if isinstance(value, datetime):
            row[key] = value.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(value, Decimal):
            row[key] = float(value)
    return row


def _normalize_status(status):
    if status is None:
        return None
    value = str(status).strip().lower()
    if value not in VALID_LEAD_STATUS:
        return None
    return value


def _normalize_priority(priority):
    if priority is None:
        return None
    value = str(priority).strip().lower()
    if value not in VALID_PRIORITY:
        return None
    return value


def _parse_follow_up_date(raw_date):
    if raw_date in (None, "", "null"):
        return None
    return datetime.strptime(str(raw_date), "%Y-%m-%d").date()


def _is_privileged(current_user):
    return (current_user.get("role") or "").lower() in PRIVILEGED_ROLES


def _get_lead_with_access(cursor, lead_id, current_user):
    """Fetch lead with role-based access controls."""
    if _is_privileged(current_user):
        cursor.execute("SELECT * FROM leads WHERE id = %s", (lead_id,))
        return cursor.fetchone()

    cursor.execute(
        """
        SELECT *
        FROM leads
        WHERE id = %s
          AND (
              created_by_emp_code = %s
              OR assigned_to_emp_code = %s
          )
        """,
        (lead_id, current_user["emp_code"], current_user["emp_code"]),
    )
    return cursor.fetchone()


def create_lead(current_user, payload):
    """Create a lead. Optional field_visit_id can be linked."""
    lead_name = (payload.get("lead_name") or "").strip()
    if not lead_name:
        return ({"success": False, "message": "lead_name is required"}, 400)

    status = _normalize_status(payload.get("status") or "new")
    if not status:
        return (
            {
                "success": False,
                "message": f"Invalid status. Valid values: {', '.join(sorted(VALID_LEAD_STATUS))}",
            },
            400,
        )

    priority = _normalize_priority(payload.get("priority") or "medium")
    if not priority:
        return (
            {
                "success": False,
                "message": f"Invalid priority. Valid values: {', '.join(sorted(VALID_PRIORITY))}",
            },
            400,
        )

    follow_up_date = None
    try:
        follow_up_date = _parse_follow_up_date(payload.get("follow_up_date"))
    except Exception:
        return ({"success": False, "message": "follow_up_date must be YYYY-MM-DD"}, 400)

    expected_value = payload.get("expected_value")
    if expected_value in ("", None):
        expected_value = None
    else:
        try:
            expected_value = float(expected_value)
        except Exception:
            return ({"success": False, "message": "expected_value must be numeric"}, 400)

    field_visit_id = payload.get("field_visit_id")
    if field_visit_id in ("", None):
        field_visit_id = None
    else:
        try:
            field_visit_id = int(field_visit_id)
        except Exception:
            return ({"success": False, "message": "field_visit_id must be an integer"}, 400)

    assigned_to_emp_code = payload.get("assigned_to_emp_code") or current_user.get("emp_code")
    assigned_to_email = payload.get("assigned_to_email") or current_user.get("emp_email")
    if not _is_privileged(current_user):
        assigned_to_emp_code = current_user.get("emp_code")
        assigned_to_email = current_user.get("emp_email")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if field_visit_id is not None:
            cursor.execute("SELECT id FROM field_visits WHERE id = %s", (field_visit_id,))
            if not cursor.fetchone():
                return ({"success": False, "message": "field_visit_id not found"}, 404)

        now = datetime.now()
        cursor.execute(
            """
            INSERT INTO leads (
                lead_name, company_name, phone_number, email, source, status, priority,
                location, expected_value, follow_up_date, notes, field_visit_id,
                assigned_to_emp_code, assigned_to_email,
                created_by_emp_code, created_by_email, created_by_name,
                created_at, updated_at, last_contacted_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s
            )
            RETURNING *
            """,
            (
                lead_name,
                payload.get("company_name"),
                payload.get("phone_number"),
                payload.get("email"),
                payload.get("source"),
                status,
                priority,
                payload.get("location"),
                expected_value,
                follow_up_date,
                payload.get("notes"),
                field_visit_id,
                assigned_to_emp_code,
                assigned_to_email,
                current_user.get("emp_code"),
                current_user.get("emp_email"),
                current_user.get("emp_full_name"),
                now,
                now,
                now if field_visit_id else None,
            ),
        )
        lead = cursor.fetchone()
        conn.commit()

        return (
            {
                "success": True,
                "message": "Lead created successfully",
                "data": _serialize_row(lead),
            },
            201,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Create lead error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def list_leads(current_user, filters):
    """List leads with basic filtering and role-aware visibility."""
    status = filters.get("status")
    priority = filters.get("priority")
    search = (filters.get("search") or "").strip()
    scope = (filters.get("scope") or "my").strip().lower()
    field_visit_id = filters.get("field_visit_id")
    limit = int(filters.get("limit", 50))
    offset = int(filters.get("offset", 0))

    if limit < 1:
        limit = 1
    if limit > 200:
        limit = 200
    if offset < 0:
        offset = 0

    if status:
        status = _normalize_status(status)
        if not status:
            return (
                {
                    "success": False,
                    "message": f"Invalid status. Valid values: {', '.join(sorted(VALID_LEAD_STATUS))}",
                },
                400,
            )

    if priority:
        priority = _normalize_priority(priority)
        if not priority:
            return (
                {
                    "success": False,
                    "message": f"Invalid priority. Valid values: {', '.join(sorted(VALID_PRIORITY))}",
                },
                400,
            )

    if field_visit_id not in (None, ""):
        try:
            field_visit_id = int(field_visit_id)
        except Exception:
            return ({"success": False, "message": "field_visit_id must be an integer"}, 400)
    else:
        field_visit_id = None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT *
            FROM leads
            WHERE 1=1
        """
        params = []

        if not _is_privileged(current_user) or scope != "all":
            query += " AND (created_by_emp_code = %s OR assigned_to_emp_code = %s)"
            params.extend([current_user["emp_code"], current_user["emp_code"]])

        if status:
            query += " AND status = %s"
            params.append(status)

        if priority:
            query += " AND priority = %s"
            params.append(priority)

        if field_visit_id is not None:
            query += " AND field_visit_id = %s"
            params.append(field_visit_id)

        if search:
            query += """
                AND (
                    lead_name ILIKE %s
                    OR company_name ILIKE %s
                    OR phone_number ILIKE %s
                    OR email ILIKE %s
                )
            """
            like_query = f"%{search}%"
            params.extend([like_query, like_query, like_query, like_query])

        query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        for row in rows:
            _serialize_row(row)

        return (
            {
                "success": True,
                "data": {"leads": rows, "count": len(rows), "limit": limit, "offset": offset},
            },
            200,
        )
    except Exception as e:
        logger.error("List leads error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def get_lead(lead_id, current_user):
    """Get one lead by id with access control."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        lead = _get_lead_with_access(cursor, lead_id, current_user)
        if not lead:
            return ({"success": False, "message": "Lead not found"}, 404)

        return ({"success": True, "data": _serialize_row(lead)}, 200)
    except Exception as e:
        logger.error("Get lead error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def update_lead(lead_id, current_user, payload):
    """Update lead fields and optionally link field visit."""
    allowed_fields = {
        "lead_name": "lead_name",
        "company_name": "company_name",
        "phone_number": "phone_number",
        "email": "email",
        "source": "source",
        "status": "status",
        "priority": "priority",
        "location": "location",
        "expected_value": "expected_value",
        "follow_up_date": "follow_up_date",
        "notes": "notes",
        "field_visit_id": "field_visit_id",
        "assigned_to_emp_code": "assigned_to_emp_code",
        "assigned_to_email": "assigned_to_email",
    }

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        existing = _get_lead_with_access(cursor, lead_id, current_user)
        if not existing:
            return ({"success": False, "message": "Lead not found"}, 404)

        if not _is_privileged(current_user):
            if "assigned_to_emp_code" in payload and payload.get("assigned_to_emp_code") != current_user.get("emp_code"):
                return ({"success": False, "message": "Only managers/admins can reassign leads"}, 403)
            if "assigned_to_email" in payload and payload.get("assigned_to_email") != current_user.get("emp_email"):
                return ({"success": False, "message": "Only managers/admins can reassign leads"}, 403)

        set_clauses = []
        params = []

        if "status" in payload:
            normalized = _normalize_status(payload.get("status"))
            if not normalized:
                return (
                    {
                        "success": False,
                        "message": f"Invalid status. Valid values: {', '.join(sorted(VALID_LEAD_STATUS))}",
                    },
                    400,
                )
            payload["status"] = normalized

        if "priority" in payload:
            normalized = _normalize_priority(payload.get("priority"))
            if not normalized:
                return (
                    {
                        "success": False,
                        "message": f"Invalid priority. Valid values: {', '.join(sorted(VALID_PRIORITY))}",
                    },
                    400,
                )
            payload["priority"] = normalized

        if "follow_up_date" in payload:
            try:
                payload["follow_up_date"] = _parse_follow_up_date(payload.get("follow_up_date"))
            except Exception:
                return ({"success": False, "message": "follow_up_date must be YYYY-MM-DD"}, 400)

        if "expected_value" in payload and payload.get("expected_value") not in ("", None):
            try:
                payload["expected_value"] = float(payload["expected_value"])
            except Exception:
                return ({"success": False, "message": "expected_value must be numeric"}, 400)
        elif "expected_value" in payload and payload.get("expected_value") in ("", None):
            payload["expected_value"] = None

        if "field_visit_id" in payload:
            raw_id = payload.get("field_visit_id")
            if raw_id in ("", None):
                payload["field_visit_id"] = None
            else:
                try:
                    payload["field_visit_id"] = int(raw_id)
                except Exception:
                    return ({"success": False, "message": "field_visit_id must be an integer"}, 400)

                cursor.execute("SELECT id FROM field_visits WHERE id = %s", (payload["field_visit_id"],))
                if not cursor.fetchone():
                    return ({"success": False, "message": "field_visit_id not found"}, 404)

        for field, column in allowed_fields.items():
            if field in payload:
                set_clauses.append(f"{column} = %s")
                params.append(payload.get(field))

        if not set_clauses:
            return ({"success": False, "message": "No valid fields provided for update"}, 400)

        set_clauses.append("updated_at = %s")
        params.append(datetime.now())

        # Mark contact time when lead is linked to field visit or moved past new stage.
        status = payload.get("status")
        if payload.get("field_visit_id") is not None or status in {"contacted", "qualified", "proposal", "won"}:
            set_clauses.append("last_contacted_at = %s")
            params.append(datetime.now())

        params.append(lead_id)
        cursor.execute(
            f"""
            UPDATE leads
            SET {", ".join(set_clauses)}
            WHERE id = %s
            RETURNING *
            """,
            tuple(params),
        )
        updated = cursor.fetchone()
        conn.commit()

        return (
            {
                "success": True,
                "message": "Lead updated successfully",
                "data": _serialize_row(updated),
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Update lead error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def link_lead_field_visit(lead_id, field_visit_id, current_user):
    """Link a lead with an existing field visit."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        lead = _get_lead_with_access(cursor, lead_id, current_user)
        if not lead:
            return ({"success": False, "message": "Lead not found"}, 404)

        cursor.execute(
            "SELECT id, employee_email FROM field_visits WHERE id = %s",
            (field_visit_id,),
        )
        field_visit = cursor.fetchone()
        if not field_visit:
            return ({"success": False, "message": "Field visit not found"}, 404)

        if not _is_privileged(current_user) and field_visit.get("employee_email") != current_user.get("emp_email"):
            return ({"success": False, "message": "Cannot link lead to another user's field visit"}, 403)

        now = datetime.now()
        cursor.execute(
            """
            UPDATE leads
            SET
                field_visit_id = %s,
                updated_at = %s,
                last_contacted_at = %s,
                status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
            WHERE id = %s
            RETURNING *
            """,
            (field_visit_id, now, now, lead_id),
        )
        updated = cursor.fetchone()
        conn.commit()

        return (
            {
                "success": True,
                "message": "Lead linked to field visit successfully",
                "data": _serialize_row(updated),
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Link lead to field visit error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)
