"""
Bills service: provides helper functions for bill upload, creation,
retrieval and approval workflows.

This file implements lightweight service-layer functions. It intentionally
keeps database interactions generic so they can be wired into the existing
app DB/session patterns (pass `db` or adapt to your project's ORM/session).
"""
from typing import Optional, Dict, Any, List
import os
import uuid
from datetime import datetime

from database import connection

UPLOADS_DIR = os.path.join(os.getcwd(), "uploads", "bills")
os.makedirs(UPLOADS_DIR, exist_ok=True)


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg", ".jpeg", ".png", ".webp", ".heic",
    ".doc", ".docx",
    ".xls", ".xlsx", ".csv",
    ".txt",
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp", "image/heic",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
}

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB — bump up a bit since docs/xlsx can be larger than a phone photo

# Ordered approval stages for bills workflows
APPROVAL_STAGES = ["hr_review", "finance_approve", "cfo", "cmd"]


class BillNotFound(Exception):
    pass


def _now():
    return datetime.utcnow()


def save_upload(file_bytes: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
    """Save an uploaded bill file to disk and return metadata.

    Returns a dict with `file_path`, `filename`, and `uploaded_at`.
    """
    if not filename:
        filename = f"bill_{uuid.uuid4().hex}.bin"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as fh:
        fh.write(file_bytes)

    return {"file_path": filepath, "filename": filename, "uploaded_at": _now()}


def create_bill(db, bill_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a bill record in the database.

    - `db` is the database/session object used by the project (SQLAlchemy session
      or a simple connection). Adapt insert logic to your ORM.
    - `bill_data` should include `employee_id`, `amount`, `date`, `file_meta` etc.

    Returns the created bill dict including generated `id`.
    """
    # Example generic implementation using a simple SQL insert pattern.
    # Replace with your project's ORM calls as needed.
    query = """
    INSERT INTO bills (employee_id, amount, bill_date, file_path, status, created_at, metadata)
    VALUES (:employee_id, :amount, :bill_date, :file_path, :status, :created_at, :metadata)
    """

    params = {
        "employee_id": bill_data.get("employee_id"),
        "amount": bill_data.get("amount"),
        "bill_date": bill_data.get("date") or _now(),
        "file_path": bill_data.get("file_meta", {}).get("file_path"),
        "status": bill_data.get("status", "pending"),
        "created_at": _now(),
        "metadata": bill_data.get("metadata", {}),
    }

    # If db provides execute/commit, use that. Otherwise adapt accordingly.
    result = None
    try:
        result = db.execute(query, params)
        db.commit()
        # Attempt to get last inserted id in a DB-agnostic way
        inserted_id = getattr(result, "lastrowid", None) or params.get("id")
    except Exception:
        # Fallback: if using an ORM, you should replace this block.
        db.rollback()
        raise

    return {
        "id": inserted_id,
        "employee_id": params["employee_id"],
        "amount": params["amount"],
        "bill_date": params["bill_date"],
        "file_path": params["file_path"],
        "status": params["status"],
        "created_at": params["created_at"],
    }


def get_bill_by_id(db, bill_id: int) -> Dict[str, Any]:
    """Return a bill record by its id or raise BillNotFound."""
    query = "SELECT * FROM bills WHERE id = :id LIMIT 1"
    row = db.execute(query, {"id": bill_id}).fetchone()
    if not row:
        raise BillNotFound(f"Bill {bill_id} not found")
    return dict(row)


def get_bills_by_employee(db, employee_id: int, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """Return a list of bills for an employee."""
    query = "SELECT * FROM bills WHERE employee_id = :emp ORDER BY created_at DESC LIMIT :lim OFFSET :off"
    rows = db.execute(query, {"emp": employee_id, "lim": limit, "off": offset}).fetchall()
    return [dict(r) for r in rows]


def create_approval(db, bill_id: int, approver_id: int, action: str, comments: Optional[str] = None) -> Dict[str, Any]:
    """Create an approval action for a bill.

    `action` should be one of: 'approved', 'rejected', 'requested_changes'.
    `stage` should be one of the ordered `APPROVAL_STAGES` (e.g. 'hr_review').

    This function will attempt to write a `stage` column in `bill_approvals` if
    available; if not, it will fall back to inserting without the column and
    append the stage into `comments` so the stage is still recorded.
    """
    valid_actions = {"approved", "rejected", "requested_changes"}
    if action not in valid_actions:
        raise ValueError("invalid action")

    # Allow caller to pass stage by including it in comments dict-like pattern:
    # if comments is dict and contains 'stage', extract it. Otherwise None.
    stage: Optional[str] = None
    if isinstance(comments, dict) and "stage" in comments:
        stage = comments.pop("stage")
        # If comments dict had other text, convert to string
        comments = comments.get("text")

    params = {"bill_id": bill_id, "approver_id": approver_id, "action": action, "comments": comments, "acted_at": _now()}

    # If stage provided, validate
    if stage is not None and stage not in APPROVAL_STAGES:
        raise ValueError("invalid approval stage")

    # Prefer inserting with a `stage` column if the DB supports it.
    if stage is not None:
        query_with_stage = """
        INSERT INTO bill_approvals (bill_id, approver_id, stage, action, comments, acted_at)
        VALUES (:bill_id, :approver_id, :stage, :action, :comments, :acted_at)
        """
        params_with_stage = dict(params)
        params_with_stage["stage"] = stage
        try:
            db.execute(query_with_stage, params_with_stage)
            db.commit()
        except Exception:
            # Fallback: DB may not have `stage` column. Try a simpler insert and
            # embed stage information into comments for traceability.
            db.rollback()
            combined_comments = f"[stage={stage}] {comments or ''}"
            fallback_query = """
            INSERT INTO bill_approvals (bill_id, approver_id, action, comments, acted_at)
            VALUES (:bill_id, :approver_id, :action, :comments, :acted_at)
            """
            params_fallback = dict(params)
            params_fallback["comments"] = combined_comments
            db.execute(fallback_query, params_fallback)
            db.commit()
    else:
        # No stage provided — insert without stage column
        query = """
        INSERT INTO bill_approvals (bill_id, approver_id, action, comments, acted_at)
        VALUES (:bill_id, :approver_id, :action, :comments, :acted_at)
        """
        try:
            db.execute(query, params)
            db.commit()
        except Exception:
            db.rollback()
            raise

    # After approval insert, if this was a final approval, mark bill approved
    # Determine final stage approval: if stage is last in APPROVAL_STAGES and action == 'approved'
    try:
        if stage == APPROVAL_STAGES[-1] and action == "approved":
            db.execute("UPDATE bills SET status = 'approved' WHERE id = :id", {"id": bill_id})
            db.commit()
        if action == "rejected":
            db.execute("UPDATE bills SET status = 'rejected' WHERE id = :id", {"id": bill_id})
            db.commit()
    except Exception:
        db.rollback()

    return {"bill_id": bill_id, "approver_id": approver_id, "stage": stage, "action": action, "comments": comments, "acted_at": params["acted_at"]}


def get_approvals_for_bill(db, bill_id: int) -> List[Dict[str, Any]]:
    """Return approval history for a bill."""
    query = "SELECT * FROM bill_approvals WHERE bill_id = :bill_id ORDER BY acted_at DESC"
    rows = db.execute(query, {"bill_id": bill_id}).fetchall()
    return [dict(r) for r in rows]


def parse_stage_from_comments(comments: Optional[str]) -> Optional[str]:
    """Extract stage token from comments when stage column isn't available.

    Expects pattern like "[stage=hr_review] ..." and returns 'hr_review'.
    """
    if not comments:
        return None
    marker = "[stage="
    idx = comments.find(marker)
    if idx == -1:
        return None
    end = comments.find("]", idx)
    if end == -1:
        return None
    return comments[idx + len(marker):end]


def get_current_approval_stage(db, bill_id: int) -> str:
    """Infer the current approval stage for a bill.

    Logic:
    - If `bill_approvals` has a `stage` column, find the highest-stage that
      has an 'approved' action. Next stage is the one after it.
    - Otherwise, attempt to parse stage tokens from comments.
    - If no approvals exist, return the first stage.
    - If all stages approved, return 'completed'.
    """
    # Try stage-aware query first
    try:
        q = "SELECT stage, action FROM bill_approvals WHERE bill_id = :bill_id ORDER BY acted_at ASC"
        rows = db.execute(q, {"bill_id": bill_id}).fetchall()
        if not rows:
            return APPROVAL_STAGES[0]
        # Build map of last action per stage
        last_action_by_stage = {}
        for r in rows:
            row = dict(r)
            stage = row.get("stage") or parse_stage_from_comments(row.get("comments"))
            action = row.get("action")
            if stage:
                last_action_by_stage[stage] = action

        # determine highest approved stage
        approved_up_to = -1
        for idx, st in enumerate(APPROVAL_STAGES):
            if last_action_by_stage.get(st) == "approved":
                approved_up_to = idx
            else:
                break

        if approved_up_to + 1 >= len(APPROVAL_STAGES):
            return "completed"
        return APPROVAL_STAGES[approved_up_to + 1]
    except Exception:
        # If any error, fallback to simple inference from comments-only entries
        rows = db.execute("SELECT comments, action FROM bill_approvals WHERE bill_id = :bill_id ORDER BY acted_at ASC", {"bill_id": bill_id}).fetchall()
        if not rows:
            return APPROVAL_STAGES[0]
        last_stage = None
        for r in rows:
            rd = dict(r)
            st = parse_stage_from_comments(rd.get("comments"))
            if st and rd.get("action") == "approved":
                last_stage = st

        if not last_stage:
            return APPROVAL_STAGES[0]
        try:
            idx = APPROVAL_STAGES.index(last_stage)
            if idx + 1 >= len(APPROVAL_STAGES):
                return "completed"
            return APPROVAL_STAGES[idx + 1]
        except ValueError:
            return APPROVAL_STAGES[0]


def list_bills_pending_for_stage(db, stage: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """Return bills that are awaiting action for the specified `stage`.

    Logic: select bills that do not yet have an 'approved' action for the
    given stage and are not rejected/approved final.
    """
    if stage not in APPROVAL_STAGES:
        raise ValueError("unknown stage")

    # Attempt to use stage column
    try:
        q = """
        SELECT b.* FROM bills b
        LEFT JOIN (
            SELECT bill_id, MAX(CASE WHEN action = 'approved' THEN 1 ELSE 0 END) as stage_approved
            FROM bill_approvals WHERE stage = :stage GROUP BY bill_id
        ) a ON a.bill_id = b.id
        WHERE COALESCE(a.stage_approved, 0) = 0 AND COALESCE(b.status, '') NOT IN ('rejected', 'approved')
        ORDER BY b.created_at DESC LIMIT :lim OFFSET :off
        """
        rows = db.execute(q, {"stage": stage, "lim": limit, "off": offset}).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        # Fallback: select bills and filter in python by scanning approvals comments
        q = "SELECT * FROM bills WHERE COALESCE(status, '') NOT IN ('rejected', 'approved') ORDER BY created_at DESC LIMIT :lim OFFSET :off"
        bills = db.execute(q, {"lim": limit, "off": offset}).fetchall()
        result = []
        for b in bills:
            bdict = dict(b)
            # see if there's an approved approval for this stage
            approvals = db.execute("SELECT comments, action FROM bill_approvals WHERE bill_id = :id", {"id": bdict["id"]}).fetchall()
            approved = False
            for a in approvals:
                ar = dict(a)
                st = parse_stage_from_comments(ar.get("comments"))
                if st == stage and ar.get("action") == "approved":
                    approved = True
                    break
            if not approved:
                result.append(bdict)
        return result



def example_db() -> Any:
    """Helper to get a DB connection/session from `database.connection` if available.

    Many project modules call `connection.get_db()` or similar. Adapt as needed.
    """
    # Try common entrypoints
    try:
        return connection.get_db()
    except Exception:
        try:
            return connection.get_connection()
        except Exception:
            return None
