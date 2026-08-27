"""
Employee master data service.

Shared CRUD, search, filter, status, and pagination behavior for the
administration master tables under Employee Master.
"""

import logging
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Dict, List

from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

VALID_STATUSES = {"active", "inactive"}

# Provenance is recorded by the server, never accepted from a client. Stripped
# from every write payload so a caller cannot claim someone else authored a
# record, nor rewrite when it was created.
IMMUTABLE_FIELDS = {"id", "created_by", "created_date", "created_at", "updated_at"}

# Returned instead of raw driver text, which otherwise leaks table names,
# column names and SQL fragments to the browser.
GENERIC_ERROR = "Something went wrong handling this request. Please try again."

UNIQUE_VIOLATION = "23505"
FOREIGN_KEY_VIOLATION = "23503"

RESOURCE_CONFIGS = {
    "working-units": {
        "table": "working_units",
        "singular": "Working unit",
        "code_field": "unit_code",
        "name_field": "unit_name",
        "required_fields": [
            "unit_code",
            "unit_name",
            "status",
        ],
        "fields": [
            "unit_name",
            "unit_code",
            "address",
            "city",
            "state",
            "country",
            "pincode",
            "latitude",
            "longitude",
            "geofence_radius",
            "branch_site_name",
            "shift_mapping_id",
            "status",
            "created_by",
            "created_date",
        ],
        "integer_fields": {"shift_mapping_id"},
        "numeric_fields": {"latitude", "longitude", "geofence_radius"},
        # A coordinate outside these bounds stores fine in NUMERIC(10,7) but
        # silently breaks geofencing at clock-in, so reject it at the door.
        "numeric_ranges": {
            "latitude": (Decimal("-90"), Decimal("90")),
            "longitude": (Decimal("-180"), Decimal("180")),
            "geofence_radius": (Decimal("0"), Decimal("100000")),
        },
        "date_fields": {"created_date"},
        # Deleting a unit that departments still point at would orphan them:
        # the reference is a free-text name, not a foreign key.
        "blocking_references": [
            {
                "table": "departments",
                "column": "working_unit",
                "match_fields": ["unit_name", "unit_code"],
                "label": "department",
            }
        ],
        "search_fields": [
            "unit_name",
            "unit_code",
            "address",
            "city",
            "state",
            "country",
            "pincode",
            "latitude",
            "longitude",
            "geofence_radius",
            "branch_site_name",
            "shift_mapping_id",
            "status",
            "created_by",
            "created_date",
        ],
        "filter_fields": ["city", "state", "country"],
        "filter_option_aliases": {
            "city": "cities",
            "state": "states",
            "country": "countries",
        },
        "sort_fields": [
            "unit_name",
            "unit_code",
            "city",
            "state",
            "country",
            "branch_site_name",
            "status",
            "created_by",
            "created_date",
        ],
    },
    "payroll-units": {
        "table": "payroll_units",
        "singular": "Payroll unit",
        "code_field": "unit_code",
        "name_field": "unit_name",
        "required_fields": [
            "unit_code",
            "unit_name",
            "status",
        ],
        "fields": [
            "unit_name",
            "unit_code",
            "legal_entity_name",
            "pay_group_id",
            "pan_tax_id",
            "gst_registration_no",
            "pf_registration_no",
            "esi_registration_no",
            "bank_name",
            "bank_account_no",
            "ifsc_swift_code",
            "payslip_template_id",
            "pay_cycle",
            "status",
            "created_by",
            "created_date",
        ],
        "integer_fields": {"pay_group_id", "payslip_template_id"},
        "date_fields": {"created_date"},
        "search_fields": [
            "unit_name",
            "unit_code",
            "legal_entity_name",
            "pay_group_id",
            "pan_tax_id",
            "gst_registration_no",
            "pf_registration_no",
            "esi_registration_no",
            "bank_name",
            "bank_account_no",
            "ifsc_swift_code",
            "payslip_template_id",
            "pay_cycle",
            "status",
            "created_by",
            "created_date",
        ],
        "filter_fields": ["pay_group_id", "pay_cycle"],
        "filter_option_aliases": {
            "pay_group_id": "pay_group_ids",
            "pay_cycle": "pay_cycles",
        },
        "sort_fields": [
            "unit_name",
            "unit_code",
            "legal_entity_name",
            "pay_group_id",
            "pay_cycle",
            "status",
            "created_by",
            "created_date",
        ],
    },
    "designations": {
        "table": "designations",
        "singular": "Designation",
        "code_field": "designation_code",
        "name_field": "designation_name",
        "required_fields": [
            "designation_code",
            "designation_name",
            "job_level_grade",
            "department",
            "status",
        ],
        "fields": [
            "designation_code",
            "designation_name",
            "description",
            "job_level_grade",
            "department",
            "status",
        ],
        "search_fields": [
            "designation_code",
            "designation_name",
            "description",
            "job_level_grade",
            "department",
            "status",
        ],
        "filter_fields": ["department", "job_level_grade"],
        "filter_option_aliases": {
            "department": "departments",
            "job_level_grade": "job_level_grades",
        },
        "sort_fields": [
            "designation_code",
            "designation_name",
            "job_level_grade",
            "department",
            "status",
            "created_at",
            "updated_at",
        ],
    },
    "departments": {
        "table": "departments",
        "singular": "Department",
        "code_field": "department_code",
        "name_field": "department_name",
        "required_fields": [
            "department_code",
            "department_name",
            "department_head",
            "working_unit",
            "location",
            "status",
        ],
        "fields": [
            "department_code",
            "department_name",
            "description",
            "department_head",
            "parent_department",
            "working_unit",
            "location",
            "status",
        ],
        "search_fields": [
            "department_code",
            "department_name",
            "description",
            "department_head",
            "parent_department",
            "working_unit",
            "location",
            "status",
        ],
        "filter_fields": ["parent_department", "working_unit", "location", "department_head"],
        "filter_option_aliases": {
            "parent_department": "parent_departments",
            "working_unit": "working_units",
            "location": "locations",
            "department_head": "department_heads",
        },
        "sort_fields": [
            "department_code",
            "department_name",
            "department_head",
            "parent_department",
            "working_unit",
            "location",
            "status",
            "created_at",
            "updated_at",
        ],
    },
}


def _serialize_row(row: Dict) -> Dict:
    result = {}
    for key, value in (row or {}).items():
        if isinstance(value, (datetime, date, time)):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = str(value)
        else:
            result[key] = value
    return result


def _select_columns(config: Dict) -> str:
    """
    Explicit projection for responses.

    `SELECT *` coupled the API payload to the physical table, so any column
    added for internal use would start leaking to the browser. Every table in
    this module carries id/created_at/updated_at alongside its configured
    fields.
    """
    columns = ["id", *config["fields"], "created_at", "updated_at"]
    seen = set()
    ordered = [c for c in columns if not (c in seen or seen.add(c))]
    return ", ".join(ordered)


def _get_config(resource: str) -> Dict:
    config = RESOURCE_CONFIGS.get((resource or "").strip())
    if not config:
        raise ValueError("Unknown employee master resource")
    return config


def _normalize_status(value) -> str:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return "active"
    if normalized not in VALID_STATUSES:
        raise ValueError("status must be active or inactive")
    return normalized


def _normalize_integer(field_name: str, value):
    text_value = "" if value is None else str(value).strip()
    if not text_value:
        return None
    try:
        return int(text_value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a whole number") from exc


def _normalize_decimal(field_name: str, value, value_range=None):
    text_value = "" if value is None else str(value).strip()
    if not text_value:
        return None
    try:
        number = Decimal(text_value)
    except InvalidOperation as exc:
        raise ValueError(f"{field_name} must be a number") from exc

    if value_range:
        minimum, maximum = value_range
        if number < minimum or number > maximum:
            raise ValueError(f"{field_name} must be between {minimum} and {maximum}")
    return number


def _normalize_date(field_name: str, value):
    text_value = "" if value is None else str(value).strip()
    if not text_value:
        return None
    try:
        return date.fromisoformat(text_value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid date") from exc


def _normalize_payload(payload: Dict, config: Dict, *, require_required_fields: bool) -> Dict:
    payload = {
        key: value for key, value in (payload or {}).items() if key not in IMMUTABLE_FIELDS
    }
    normalized = {}
    integer_fields = config.get("integer_fields") or set()
    numeric_fields = config.get("numeric_fields") or set()
    date_fields = config.get("date_fields") or set()
    required_fields = set(config["required_fields"])

    for field_name in config["fields"]:
        if field_name not in payload:
            continue
        value = payload.get(field_name)
        if field_name == "status":
            normalized[field_name] = _normalize_status(value)
            continue
        if field_name in integer_fields:
            normalized_value = _normalize_integer(field_name, value)
            if normalized_value is None and require_required_fields:
                continue
            normalized[field_name] = normalized_value
            continue
        if field_name in numeric_fields:
            normalized_value = _normalize_decimal(
                field_name, value, (config.get("numeric_ranges") or {}).get(field_name)
            )
            if normalized_value is None and require_required_fields:
                continue
            normalized[field_name] = normalized_value
            continue
        if field_name in date_fields:
            normalized_value = _normalize_date(field_name, value)
            if normalized_value is None and require_required_fields:
                continue
            normalized[field_name] = normalized_value
            continue
        if value is None:
            normalized[field_name] = None
            continue
        text_value = str(value).strip()
        normalized[field_name] = text_value if text_value or field_name in required_fields else None

    if require_required_fields:
        normalized.setdefault("status", "active")
        missing_fields = [
            field_name
            for field_name in config["required_fields"]
            if not str(normalized.get(field_name) or "").strip()
        ]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

    for field_name in config["required_fields"]:
        if field_name in normalized and not str(normalized.get(field_name) or "").strip():
            raise ValueError(f"{field_name} is required")

    return {
        field_name: value
        for field_name, value in normalized.items()
        if field_name in config["fields"]
    }


def _build_where(config: Dict, query_params: Dict):
    clauses = ["1=1"]
    values: List[object] = []

    search = str(query_params.get("search") or "").strip()
    if search:
        like_value = f"%{search}%"
        search_clauses = [f"COALESCE({field}::text, '') ILIKE %s" for field in config["search_fields"]]
        clauses.append(f"({' OR '.join(search_clauses)})")
        values.extend([like_value] * len(search_clauses))

    status = str(query_params.get("status") or "").strip().lower()
    if status:
        if status not in VALID_STATUSES:
            raise ValueError("status must be active or inactive")
        clauses.append("status = %s")
        values.append(status)

    # These back select controls whose values come from _filter_options, so they
    # match exactly -- a substring match let "Pune" also select "Pune East".
    for field_name in config["filter_fields"]:
        raw_value = str(query_params.get(field_name) or "").strip()
        if raw_value:
            clauses.append(f"LOWER(TRIM(COALESCE({field_name}::text, ''))) = LOWER(%s)")
            values.append(raw_value)

    return " AND ".join(clauses), values


def _pagination(page, page_size):
    normalized_page = max(int(page or 1), 1)
    normalized_page_size = min(max(int(page_size or 15), 1), 100)
    return normalized_page, normalized_page_size


def _sort_clause(config: Dict, sort_by: str = None, sort_order: str = None) -> str:
    sort_field = (sort_by or config["code_field"]).strip()
    if sort_field not in config["sort_fields"]:
        sort_field = config["code_field"]

    order = (sort_order or "asc").strip().lower()
    if order not in {"asc", "desc"}:
        order = "asc"

    return f"{sort_field} {order.upper()}, id DESC"


def _filter_options(cursor, config: Dict):
    options = {
        "statuses": sorted(VALID_STATUSES),
    }
    aliases = config.get("filter_option_aliases") or {}

    for field_name in config["filter_fields"]:
        cursor.execute(
            f"""
            SELECT DISTINCT {field_name}
            FROM {config['table']}
            WHERE NULLIF(TRIM(COALESCE({field_name}::text, '')), '') IS NOT NULL
            ORDER BY {field_name}
            """
        )
        options[field_name] = [
            row[field_name]
            for row in (cursor.fetchall() or [])
            if row.get(field_name)
        ]
        alias = aliases.get(field_name)
        if alias:
            options[alias] = options[field_name]

    return options


def list_master_records(resource: str, query_params: Dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        page, page_size = _pagination(query_params.get("page"), query_params.get("page_size"))
        offset = (page - 1) * page_size
        where_clause, values = _build_where(config, query_params)

        cursor.execute(
            f"SELECT COUNT(*) AS total FROM {config['table']} WHERE {where_clause}",
            values,
        )
        total_records = int((cursor.fetchone() or {}).get("total") or 0)

        cursor.execute(
            f"""
            SELECT {_select_columns(config)}
            FROM {config['table']}
            WHERE {where_clause}
            ORDER BY {_sort_clause(config, query_params.get('sort_by'), query_params.get('sort_order'))}
            LIMIT %s OFFSET %s
            """,
            [*values, page_size, offset],
        )
        records = [_serialize_row(row) for row in (cursor.fetchall() or [])]
        total_pages = (total_records + page_size - 1) // page_size if total_records else 0

        return ({
            "success": True,
            "data": {
                "records": records,
                "count": total_records,
                "filter_options": _filter_options(cursor, config),
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_records,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_previous": page > 1 and total_pages > 0,
                },
            },
        }, 200)
    except ValueError as exc:
        return ({"success": False, "message": str(exc)}, 400)
    except Exception:
        logger.exception("Employee master read failed for resource=%s", resource)
        return ({"success": False, "message": GENERIC_ERROR}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def get_master_record(resource: str, record_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        cursor.execute(
            f"SELECT {_select_columns(config)} FROM {config['table']} WHERE id = %s",
            (record_id,),
        )
        row = cursor.fetchone()
        if not row:
            return ({"success": False, "message": f"{config['singular']} not found"}, 404)
        return ({"success": True, "data": {"record": _serialize_row(row)}}, 200)
    except ValueError as exc:
        return ({"success": False, "message": str(exc)}, 400)
    except Exception:
        logger.exception("Employee master read failed for resource=%s", resource)
        return ({"success": False, "message": GENERIC_ERROR}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def create_master_record(resource: str, payload: Dict, created_by_emp_code: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        record_data = _normalize_payload(payload, config, require_required_fields=True)
        # Stamped after normalisation, which strips any client-supplied value.
        # created_date/created_at are left to the column defaults.
        if created_by_emp_code and "created_by" in config["fields"]:
            record_data["created_by"] = created_by_emp_code
        code_field = config["code_field"]

        cursor.execute(
            f"SELECT id FROM {config['table']} WHERE LOWER({code_field}) = LOWER(%s)",
            (record_data[code_field],),
        )
        if cursor.fetchone():
            return ({"success": False, "message": f"{config['singular']} code already exists"}, 409)

        columns = list(record_data.keys())
        values = [record_data[column] for column in columns]
        cursor.execute(
            f"""
            INSERT INTO {config['table']} ({', '.join(columns)})
            VALUES ({', '.join(['%s'] * len(columns))})
            RETURNING {_select_columns(config)}
            """,
            values,
        )
        created = cursor.fetchone()
        conn.commit()
        return ({
            "success": True,
            "message": f"{config['singular']} created successfully",
            "data": {"record": _serialize_row(created)},
        }, 201)
    except ValueError as exc:
        conn.rollback()
        return ({"success": False, "message": str(exc)}, 400)
    except Exception as exc:
        conn.rollback()
        if getattr(exc, "pgcode", None) == FOREIGN_KEY_VIOLATION:
            return (
                {"success": False, "message": "This record is still referenced elsewhere and cannot be deleted."},
                409,
            )
        if getattr(exc, "pgcode", None) == UNIQUE_VIOLATION:
            # The database is the real arbiter of code uniqueness; the
            # pre-check above can lose a race with a concurrent writer.
            return ({"success": False, "message": f"{_get_config(resource)['singular']} code already exists"}, 409)
        logger.exception("Employee master write failed for resource=%s", resource)
        return ({"success": False, "message": GENERIC_ERROR}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def update_master_record(resource: str, record_id: int, payload: Dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        cursor.execute(
            f"SELECT {_select_columns(config)} FROM {config['table']} WHERE id = %s",
            (record_id,),
        )
        current = cursor.fetchone()
        if not current:
            return ({"success": False, "message": f"{config['singular']} not found"}, 404)

        record_data = _normalize_payload(payload, config, require_required_fields=False)
        if not record_data:
            return ({"success": False, "message": "No valid fields provided"}, 400)

        code_field = config["code_field"]
        if code_field in record_data and record_data[code_field].lower() != str(current.get(code_field) or "").lower():
            cursor.execute(
                f"""
                SELECT id
                FROM {config['table']}
                WHERE LOWER({code_field}) = LOWER(%s)
                  AND id <> %s
                """,
                (record_data[code_field], record_id),
            )
            if cursor.fetchone():
                return ({"success": False, "message": f"{config['singular']} code already exists"}, 409)

        # NOW() rather than the app's naive local clock, so updated_at and
        # created_at are always read from the same source of time.
        assignments = [f"{column} = %s" for column in record_data]
        assignments.append("updated_at = NOW()")
        values = [record_data[column] for column in record_data]
        values.append(record_id)

        cursor.execute(
            f"""
            UPDATE {config['table']}
            SET {', '.join(assignments)}
            WHERE id = %s
            RETURNING {_select_columns(config)}
            """,
            values,
        )
        updated = cursor.fetchone()
        conn.commit()
        return ({
            "success": True,
            "message": f"{config['singular']} updated successfully",
            "data": {"record": _serialize_row(updated)},
        }, 200)
    except ValueError as exc:
        conn.rollback()
        return ({"success": False, "message": str(exc)}, 400)
    except Exception as exc:
        conn.rollback()
        if getattr(exc, "pgcode", None) == FOREIGN_KEY_VIOLATION:
            return (
                {"success": False, "message": "This record is still referenced elsewhere and cannot be deleted."},
                409,
            )
        if getattr(exc, "pgcode", None) == UNIQUE_VIOLATION:
            # The database is the real arbiter of code uniqueness; the
            # pre-check above can lose a race with a concurrent writer.
            return ({"success": False, "message": f"{_get_config(resource)['singular']} code already exists"}, 409)
        logger.exception("Employee master write failed for resource=%s", resource)
        return ({"success": False, "message": GENERIC_ERROR}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def _blocking_reference_count(cursor, config: Dict, record: Dict):
    """
    Counts rows elsewhere that still point at this record.

    These references are free-text names rather than foreign keys, so the
    database will not stop a delete from orphaning them -- this does.
    Returns (label, count) for the first reference found, else None.
    """
    for reference in config.get("blocking_references") or []:
        candidates = [
            str(record.get(field) or "").strip()
            for field in reference["match_fields"]
            if str(record.get(field) or "").strip()
        ]
        if not candidates:
            continue

        placeholders = ", ".join(["LOWER(%s)"] * len(candidates))
        cursor.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM {reference['table']}
            WHERE LOWER(TRIM(COALESCE({reference['column']}::text, ''))) IN ({placeholders})
            """,
            candidates,
        )
        total = int((cursor.fetchone() or {}).get("total") or 0)
        if total:
            return reference["label"], total
    return None


def delete_master_record(resource: str, record_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)

        cursor.execute(f"SELECT {_select_columns(config)} FROM {config['table']} WHERE id = %s", (record_id,))
        record = cursor.fetchone()
        if not record:
            conn.rollback()
            return ({"success": False, "message": f"{config['singular']} not found"}, 404)

        blocking = _blocking_reference_count(cursor, config, record)
        if blocking:
            label, total = blocking
            conn.rollback()
            return (
                {
                    "success": False,
                    "message": (
                        f"{config['singular']} is still used by {total} "
                        f"{label}{'' if total == 1 else 's'}. Reassign them, or set this "
                        f"{config['singular'].lower()} to inactive instead of deleting it."
                    ),
                },
                409,
            )

        cursor.execute(
            f"""
            DELETE FROM {config['table']}
            WHERE id = %s
            RETURNING id
            """,
            (record_id,),
        )
        deleted = cursor.fetchone()

        conn.commit()
        return ({
            "success": True,
            "message": f"{config['singular']} deleted successfully",
            "data": deleted,
        }, 200)
    except ValueError as exc:
        conn.rollback()
        return ({"success": False, "message": str(exc)}, 400)
    except Exception as exc:
        conn.rollback()
        if getattr(exc, "pgcode", None) == FOREIGN_KEY_VIOLATION:
            return (
                {"success": False, "message": "This record is still referenced elsewhere and cannot be deleted."},
                409,
            )
        if getattr(exc, "pgcode", None) == UNIQUE_VIOLATION:
            # The database is the real arbiter of code uniqueness; the
            # pre-check above can lose a race with a concurrent writer.
            return ({"success": False, "message": f"{_get_config(resource)['singular']} code already exists"}, 409)
        logger.exception("Employee master write failed for resource=%s", resource)
        return ({"success": False, "message": GENERIC_ERROR}, 500)
    finally:
        cursor.close()
        return_connection(conn)
