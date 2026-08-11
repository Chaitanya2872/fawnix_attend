"""
Employee master data service.

Shared CRUD, search, filter, status, and pagination behavior for the
administration master tables under Employee Master.
"""

from datetime import date, datetime, time
from typing import Dict, List

from database.connection import get_db_connection, return_connection


VALID_STATUSES = {"active", "inactive"}

RESOURCE_CONFIGS = {
    "working-units": {
        "table": "working_units",
        "singular": "Working unit",
        "code_field": "working_unit_code",
        "name_field": "working_unit_name",
        "required_fields": [
            "working_unit_code",
            "working_unit_name",
            "unit_head_manager",
            "location",
            "status",
        ],
        "fields": [
            "working_unit_code",
            "working_unit_name",
            "description",
            "unit_head_manager",
            "location",
            "status",
        ],
        "search_fields": [
            "working_unit_code",
            "working_unit_name",
            "description",
            "unit_head_manager",
            "location",
            "status",
        ],
        "filter_fields": ["location", "unit_head_manager"],
        "filter_option_aliases": {
            "location": "locations",
            "unit_head_manager": "unit_head_managers",
        },
        "sort_fields": [
            "working_unit_code",
            "working_unit_name",
            "unit_head_manager",
            "location",
            "status",
            "created_at",
            "updated_at",
        ],
    },
    "payroll-units": {
        "table": "payroll_units",
        "singular": "Payroll unit",
        "code_field": "payroll_unit_code",
        "name_field": "payroll_unit_name",
        "required_fields": [
            "payroll_unit_code",
            "payroll_unit_name",
            "payroll_manager",
            "pay_cycle",
            "location",
            "status",
        ],
        "fields": [
            "payroll_unit_code",
            "payroll_unit_name",
            "description",
            "payroll_manager",
            "pay_cycle",
            "location",
            "status",
        ],
        "search_fields": [
            "payroll_unit_code",
            "payroll_unit_name",
            "description",
            "payroll_manager",
            "pay_cycle",
            "location",
            "status",
        ],
        "filter_fields": ["pay_cycle", "location", "payroll_manager"],
        "filter_option_aliases": {
            "pay_cycle": "pay_cycles",
            "location": "locations",
            "payroll_manager": "payroll_managers",
        },
        "sort_fields": [
            "payroll_unit_code",
            "payroll_unit_name",
            "payroll_manager",
            "pay_cycle",
            "location",
            "status",
            "created_at",
            "updated_at",
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
        else:
            result[key] = value
    return result


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


def _normalize_payload(payload: Dict, config: Dict, *, require_required_fields: bool) -> Dict:
    payload = payload or {}
    normalized = {}

    for field_name in config["fields"]:
        if field_name not in payload:
            continue
        value = payload.get(field_name)
        if field_name == "status":
            normalized[field_name] = _normalize_status(value)
            continue
        if value is None:
            normalized[field_name] = None
            continue
        normalized[field_name] = str(value).strip()

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
        search_clauses = [f"COALESCE({field}, '') ILIKE %s" for field in config["search_fields"]]
        clauses.append(f"({' OR '.join(search_clauses)})")
        values.extend([like_value] * len(search_clauses))

    status = str(query_params.get("status") or "").strip().lower()
    if status:
        if status not in VALID_STATUSES:
            raise ValueError("status must be active or inactive")
        clauses.append("status = %s")
        values.append(status)

    for field_name in config["filter_fields"]:
        raw_value = str(query_params.get(field_name) or "").strip()
        if raw_value:
            clauses.append(f"{field_name} ILIKE %s")
            values.append(f"%{raw_value}%")

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
            WHERE NULLIF(TRIM(COALESCE({field_name}, '')), '') IS NOT NULL
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
            SELECT *
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
    except Exception as exc:
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def get_master_record(resource: str, record_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        cursor.execute(
            f"SELECT * FROM {config['table']} WHERE id = %s",
            (record_id,),
        )
        row = cursor.fetchone()
        if not row:
            return ({"success": False, "message": f"{config['singular']} not found"}, 404)
        return ({"success": True, "data": {"record": _serialize_row(row)}}, 200)
    except ValueError as exc:
        return ({"success": False, "message": str(exc)}, 400)
    except Exception as exc:
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def create_master_record(resource: str, payload: Dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        record_data = _normalize_payload(payload, config, require_required_fields=True)
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
            RETURNING *
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
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def update_master_record(resource: str, record_id: int, payload: Dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        cursor.execute(
            f"SELECT * FROM {config['table']} WHERE id = %s",
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

        record_data["updated_at"] = datetime.now()
        assignments = [f"{column} = %s" for column in record_data]
        values = [record_data[column] for column in record_data]
        values.append(record_id)

        cursor.execute(
            f"""
            UPDATE {config['table']}
            SET {', '.join(assignments)}
            WHERE id = %s
            RETURNING *
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
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def delete_master_record(resource: str, record_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        config = _get_config(resource)
        cursor.execute(
            f"""
            DELETE FROM {config['table']}
            WHERE id = %s
            RETURNING id
            """,
            (record_id,),
        )
        deleted = cursor.fetchone()
        if not deleted:
            conn.rollback()
            return ({"success": False, "message": f"{config['singular']} not found"}, 404)

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
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        return_connection(conn)
