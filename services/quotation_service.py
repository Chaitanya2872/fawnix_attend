"""
Lead Quotation Service

Quotations are built and stored locally against a CRM lead id (the CRM
service itself has no quotation concept). Each quotation has one or more
line items; totals are always computed server-side from those items so the
stored numbers can never drift from what the items actually add up to.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation

from database.connection import get_db_connection

ALLOWED_STATUSES = {"draft", "sent", "accepted", "rejected"}


def _to_decimal(value, default="0"):
    try:
        if value in (None, ""):
            return Decimal(default)
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError(f"Invalid numeric value: {value!r}")


def _normalize_items(raw_items):
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("At least one quotation item is required")

    items = []
    for index, raw_item in enumerate(raw_items):
        description = str((raw_item or {}).get("description") or "").strip()
        if not description:
            raise ValueError(f"Item {index + 1}: description is required")

        quantity = _to_decimal(raw_item.get("quantity"), "1")
        unit_price = _to_decimal(raw_item.get("unitPrice", raw_item.get("unit_price")), "0")
        if quantity <= 0:
            raise ValueError(f"Item {index + 1}: quantity must be greater than 0")
        if unit_price < 0:
            raise ValueError(f"Item {index + 1}: unit price cannot be negative")

        amount = (quantity * unit_price).quantize(Decimal("0.01"))
        items.append({
            "sort_order": index,
            "description": description,
            "quantity": quantity,
            "unit_price": unit_price,
            "amount": amount,
        })
    return items


def _compute_totals(items, discount_amount, tax_percent):
    subtotal = sum((item["amount"] for item in items), Decimal("0.00"))
    if discount_amount > subtotal:
        raise ValueError("Discount cannot exceed the subtotal")
    taxable_base = subtotal - discount_amount
    tax_amount = (taxable_base * tax_percent / Decimal("100")).quantize(Decimal("0.01"))
    total_amount = (taxable_base + tax_amount).quantize(Decimal("0.01"))
    return subtotal.quantize(Decimal("0.01")), tax_amount, total_amount


def _serialize_quotation(row, items=None):
    quotation = dict(row)
    for key, value in quotation.items():
        if isinstance(value, datetime):
            quotation[key] = value.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(value, Decimal):
            quotation[key] = float(value)
    if items is not None:
        quotation["items"] = [_serialize_item(item) for item in items]
    return quotation


def _serialize_item(row):
    item = dict(row)
    for key, value in item.items():
        if isinstance(value, Decimal):
            item[key] = float(value)
    return item


def create_quotation(lead_id: str, current_user: dict, payload: dict):
    try:
        items = _normalize_items(payload.get("items"))
        discount_amount = _to_decimal(payload.get("discountAmount", payload.get("discount_amount")), "0")
        tax_percent = _to_decimal(payload.get("taxPercent", payload.get("tax_percent")), "0")
        subtotal, tax_amount, total_amount = _compute_totals(items, discount_amount, tax_percent)
    except ValueError as exc:
        return ({"success": False, "message": str(exc)}, 400)

    title = str(payload.get("title") or "").strip() or "Quotation"
    notes = str(payload.get("notes") or "").strip() or None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO lead_quotations (
                lead_id, title, status, subtotal, discount_amount,
                tax_percent, tax_amount, total_amount, notes,
                created_by_emp_code, created_by_name
            ) VALUES (%s, %s, 'draft', %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            lead_id, title, subtotal, discount_amount,
            tax_percent, tax_amount, total_amount, notes,
            current_user.get("emp_code"), current_user.get("emp_full_name"),
        ))
        quotation_row = cursor.fetchone()
        quotation_id = quotation_row["id"]

        cursor.execute(
            "UPDATE lead_quotations SET quotation_number = %s WHERE id = %s RETURNING *",
            (f"QTN-{quotation_id:05d}", quotation_id),
        )
        quotation_row = cursor.fetchone()

        item_rows = []
        for item in items:
            cursor.execute("""
                INSERT INTO lead_quotation_items (
                    quotation_id, sort_order, description, quantity, unit_price, amount
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                quotation_id, item["sort_order"], item["description"],
                item["quantity"], item["unit_price"], item["amount"],
            ))
            item_rows.append(cursor.fetchone())

        conn.commit()
        return ({
            "success": True,
            "message": "Quotation created",
            "data": _serialize_quotation(quotation_row, item_rows),
        }, 201)
    except Exception as exc:
        conn.rollback()
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        conn.close()


def list_quotations(lead_id: str, current_user: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT * FROM lead_quotations
            WHERE lead_id = %s AND created_by_emp_code = %s
            ORDER BY created_at DESC
        """, (lead_id, current_user.get("emp_code")))
        quotations = cursor.fetchall()

        data = []
        for quotation_row in quotations:
            cursor.execute("""
                SELECT * FROM lead_quotation_items
                WHERE quotation_id = %s
                ORDER BY sort_order ASC
            """, (quotation_row["id"],))
            item_rows = cursor.fetchall()
            data.append(_serialize_quotation(quotation_row, item_rows))

        return ({
            "success": True,
            "data": {"quotations": data, "count": len(data)},
        }, 200)
    except Exception as exc:
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        conn.close()


def _fetch_owned_quotation(cursor, lead_id: str, quotation_id: int, emp_code: str):
    cursor.execute("""
        SELECT * FROM lead_quotations
        WHERE id = %s AND lead_id = %s AND created_by_emp_code = %s
    """, (quotation_id, lead_id, emp_code))
    return cursor.fetchone()


def get_quotation(lead_id: str, quotation_id: int, current_user: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        quotation_row = _fetch_owned_quotation(cursor, lead_id, quotation_id, current_user.get("emp_code"))
        if not quotation_row:
            return ({"success": False, "message": "Quotation not found"}, 404)

        cursor.execute("""
            SELECT * FROM lead_quotation_items
            WHERE quotation_id = %s
            ORDER BY sort_order ASC
        """, (quotation_id,))
        item_rows = cursor.fetchall()

        return ({"success": True, "data": _serialize_quotation(quotation_row, item_rows)}, 200)
    except Exception as exc:
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        conn.close()


def _field(payload: dict, *keys, fallback=None):
    """First non-null value among `keys`, else `fallback`.

    Kotlin's ktor client is configured with encodeDefaults=true, so every
    optional request field (including ones the caller left unset) arrives as
    an explicit JSON null rather than being omitted. A plain `payload.get(key,
    fallback)` or `key in payload` check would then treat "left unset" the
    same as "explicitly present", wiping fields (or crashing on `items`) on
    every partial update such as a status-only change.
    """
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return value
    return fallback


def update_quotation(lead_id: str, quotation_id: int, current_user: dict, payload: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        existing = _fetch_owned_quotation(cursor, lead_id, quotation_id, current_user.get("emp_code"))
        if not existing:
            return ({"success": False, "message": "Quotation not found"}, 404)

        status = _field(payload, "status", fallback=existing["status"])
        if status not in ALLOWED_STATUSES:
            return ({"success": False, "message": f"status must be one of {sorted(ALLOWED_STATUSES)}"}, 400)

        title = str(_field(payload, "title", fallback=existing["title"]) or "").strip() or existing["title"]
        notes = _field(payload, "notes", fallback=existing["notes"])

        raw_items = _field(payload, "items")
        recompute_items = raw_items is not None
        if recompute_items:
            try:
                items = _normalize_items(raw_items)
                discount_amount = _to_decimal(
                    _field(payload, "discountAmount", "discount_amount", fallback=existing["discount_amount"])
                )
                tax_percent = _to_decimal(
                    _field(payload, "taxPercent", "tax_percent", fallback=existing["tax_percent"])
                )
                subtotal, tax_amount, total_amount = _compute_totals(items, discount_amount, tax_percent)
            except ValueError as exc:
                return ({"success": False, "message": str(exc)}, 400)

            cursor.execute("DELETE FROM lead_quotation_items WHERE quotation_id = %s", (quotation_id,))
            for item in items:
                cursor.execute("""
                    INSERT INTO lead_quotation_items (
                        quotation_id, sort_order, description, quantity, unit_price, amount
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    quotation_id, item["sort_order"], item["description"],
                    item["quantity"], item["unit_price"], item["amount"],
                ))
        else:
            subtotal = existing["subtotal"]
            discount_amount = existing["discount_amount"]
            tax_percent = existing["tax_percent"]
            tax_amount = existing["tax_amount"]
            total_amount = existing["total_amount"]

        cursor.execute("""
            UPDATE lead_quotations
            SET title = %s, status = %s, subtotal = %s, discount_amount = %s,
                tax_percent = %s, tax_amount = %s, total_amount = %s,
                notes = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING *
        """, (
            title, status, subtotal, discount_amount,
            tax_percent, tax_amount, total_amount, notes, quotation_id,
        ))
        quotation_row = cursor.fetchone()

        cursor.execute("""
            SELECT * FROM lead_quotation_items
            WHERE quotation_id = %s
            ORDER BY sort_order ASC
        """, (quotation_id,))
        item_rows = cursor.fetchall()

        conn.commit()
        return ({"success": True, "message": "Quotation updated", "data": _serialize_quotation(quotation_row, item_rows)}, 200)
    except Exception as exc:
        conn.rollback()
        return ({"success": False, "message": str(exc)}, 500)
    finally:
        cursor.close()
        conn.close()
