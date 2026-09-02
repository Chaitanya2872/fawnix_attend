"""
Bills Routes
Endpoints for uploading bills, creating bills, retrieving and approvals.
"""
from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from database.connection import get_db_connection, return_connection
from services import bills_service
from datetime import datetime, date, time

bills_bp = Blueprint('bills', __name__)


def serialize_row(row):
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date, time)):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _wrap_conn(conn):
    """Wrap a psycopg2 connection into an object with execute/commit/rollback
    so service functions that expect a DB-like object can use it.
    """
    cursor = conn.cursor()

    class DBWrap:
        def execute(self, query, params=None):
            cursor.execute(query, params or {})
            return cursor

        def fetchone(self):
            return cursor.fetchone()

        def fetchall(self):
            return cursor.fetchall()

        def commit(self):
            conn.commit()

        def rollback(self):
            conn.rollback()

    return DBWrap()


@bills_bp.route('/upload', methods=['POST'])
@token_required
def upload(current_user):
    """Upload a bill file. Form field: `file`"""
    upload = request.files.get('file')
    if not upload:
        return jsonify({"success": False, "message": "No file provided"}), 400

    file_bytes = upload.read()
    meta = bills_service.save_upload(file_bytes, filename=(upload.filename or None))
    return jsonify({"success": True, "data": {"file_meta": meta}}), 200


@bills_bp.route('/', methods=['POST'])
@token_required
def create_bill(current_user):
    """Create a bill record.

    JSON body fields: `employee_id`, `amount`, `date` (YYYY-MM-DD optional), `file_meta` (dict)
    """
    payload = request.get_json() or {}
    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        # Normalize date
        if payload.get('date'):
            try:
                payload['date'] = datetime.strptime(payload['date'], '%Y-%m-%d')
            except Exception:
                return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD"}), 400

        created = bills_service.create_bill(db, payload)
        return jsonify({"success": True, "data": created}), 201
    finally:
        return_connection(conn)


@bills_bp.route('/<int:bill_id>', methods=['GET'])
@token_required
def get_bill(current_user, bill_id):
    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        bill = bills_service.get_bill_by_id(db, bill_id)
        return jsonify({"success": True, "data": serialize_row(bill)}), 200
    except bills_service.BillNotFound:
        return jsonify({"success": False, "message": "Bill not found"}), 404
    finally:
        return_connection(conn)


@bills_bp.route('/', methods=['GET'])
@token_required
def list_bills(current_user):
    """List bills. Query params: `employee_id`, `limit`, `offset`"""
    emp_id = request.args.get('employee_id', type=int)
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        if emp_id:
            rows = bills_service.get_bills_by_employee(db, emp_id, limit=limit, offset=offset)
            return jsonify({"success": True, "count": len(rows), "data": [serialize_row(r) for r in rows]}), 200
        else:
            # Simple fallback: select recent bills
            cur = db.execute("SELECT * FROM bills ORDER BY created_at DESC LIMIT :lim OFFSET :off", {"lim": limit, "off": offset})
            rows = cur.fetchall()
            return jsonify({"success": True, "count": len(rows), "data": [serialize_row(dict(r)) for r in rows]}), 200
    finally:
        return_connection(conn)


@bills_bp.route('/<int:bill_id>/approvals', methods=['GET'])
@token_required
def get_approvals(current_user, bill_id):
    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        rows = bills_service.get_approvals_for_bill(db, bill_id)
        return jsonify({"success": True, "count": len(rows), "data": [serialize_row(r) for r in rows]}), 200
    finally:
        return_connection(conn)


@bills_bp.route('/<int:bill_id>/approve', methods=['POST'])
@token_required
def approve_bill(current_user, bill_id):
    """Approve/reject a bill for a given stage.

    JSON body: `action` ('approved'|'rejected'|'requested_changes'), optional `stage`, optional `comments`.
    """
    payload = request.get_json() or {}
    action = (payload.get('action') or '').strip().lower()
    stage = payload.get('stage')
    comments = payload.get('comments')

    if action not in {'approved', 'rejected', 'requested_changes'}:
        return jsonify({"success": False, "message": "Invalid action"}), 400

    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        approver_id = current_user.get('id') or current_user.get('user_id')
        # Allow stage passed as separate param or embedded in comments dict
        comments_payload = comments
        # If stage not provided, infer the current stage for the bill
        if not stage:
            try:
                stage = bills_service.get_current_approval_stage(db, bill_id)
            except Exception:
                stage = None

        # Map stages to allowed designations
        stage_allowed = {
            "hr_review": ["hr"],
            "finance_approve": ["finance"],
            "cfo": ["cfo"],
            "cmd": ["cmd"],
        }

        emp_designation = (current_user.get('emp_designation') or '').strip().lower()
        if stage and stage in stage_allowed:
            allowed = stage_allowed[stage]
            if emp_designation not in allowed and current_user.get('role') != 'admin':
                return jsonify({"success": False, "message": "Unauthorized for this approval stage"}), 403

        if stage:
            # attach stage as dict so service can detect it
            comments_payload = {"stage": stage, "text": comments}

        res = bills_service.create_approval(db, bill_id, approver_id, action, comments=comments_payload)
        return jsonify({"success": True, "data": res}), 200
    finally:
        return_connection(conn)


@bills_bp.route('/pending', methods=['GET'])
@token_required
def pending_for_stage(current_user):
    """List bills pending for a stage. Query param `stage` required."""
    stage = (request.args.get('stage') or '').strip()
    if not stage:
        return jsonify({"success": False, "message": "stage query param required"}), 400

    conn = get_db_connection()
    db = _wrap_conn(conn)
    try:
        rows = bills_service.list_bills_pending_for_stage(db, stage)
        return jsonify({"success": True, "count": len(rows), "data": [serialize_row(r) for r in rows]}), 200
    finally:
        return_connection(conn)
