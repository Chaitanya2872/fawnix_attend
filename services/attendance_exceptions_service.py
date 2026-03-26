"""
Attendance Exceptions Service
Business logic for late arrival and early leave handling
"""

from datetime import datetime, date, time
from database.connection import get_db_connection
from services.leaves_service import is_employee_on_leave
from typing import Dict, Tuple, Optional, List
import logging

logger = logging.getLogger(__name__)


# =========================
# HELPER FUNCTIONS
# =========================

def get_employee_shift_times(emp_code: str) -> Tuple[Optional[time], Optional[time]]:
    """
    Get employee's shift start and end times
    Returns: (shift_start_time, shift_end_time) or (None, None)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                s.shift_start_time,
                s.shift_end_time
            FROM employees e
            LEFT JOIN shifts s ON e.emp_shift_id = s.shift_id
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        result = cursor.fetchone()
        if not result:
            return None, None
        
        # Get shift times from the shift table
        start_time = result.get('shift_start_time')
        end_time = result.get('shift_end_time')
        
        # Convert to time objects if they're strings
        if isinstance(start_time, str):
            start_time = datetime.strptime(start_time, '%H:%M:%S').time()
        if isinstance(end_time, str):
            end_time = datetime.strptime(end_time, '%H:%M:%S').time()
        
        return start_time, end_time
        
    finally:
        cursor.close()
        conn.close()


def get_employee_and_manager_info(emp_code: str) -> Dict:
    """
    Get employee and their manager/informing manager information
    Handles manager-on-leave fallback logic
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_manager,
                m.emp_full_name as manager_name,
                m.emp_email as manager_email,
                e.emp_informing_manager,
                im.emp_full_name as informing_name,
                im.emp_email as informing_email
            FROM employees e
            LEFT JOIN employees m ON e.emp_manager = m.emp_code
            LEFT JOIN employees im ON e.emp_informing_manager = im.emp_code
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        emp = cursor.fetchone()
        
        if not emp:
            return None
        
        # Determine approver (manager or informing manager if manager is on leave)
        approver_code = emp.get('emp_manager')
        approver_email = emp.get('manager_email')
        approver_name = emp.get('manager_name')
        
        # If manager is on leave, fallback to informing manager
        if approver_code and is_employee_on_leave(approver_code):
            logger.info(f"Manager {approver_code} is on leave, using informing manager")
            approver_code = emp.get('emp_informing_manager')
            approver_email = emp.get('informing_email')
            approver_name = emp.get('informing_name')
        
        return {
            'emp_code': emp['emp_code'],
            'emp_name': emp['emp_full_name'],
            'emp_email': emp['emp_email'],
            'approver_code': approver_code,
            'approver_email': approver_email,
            'approver_name': approver_name
        }
        
    finally:
        cursor.close()
        conn.close()


def _get_employee_privilege_flags(emp_code: str) -> Tuple[Optional[str], Optional[str]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT emp_designation, emp_department FROM employees WHERE emp_code = %s",
            (emp_code,)
        )
        row = cursor.fetchone()
        if not row:
            return None, None
        if hasattr(row, 'keys'):
            return row.get('emp_designation'), row.get('emp_department')
        return row[0], row[1] if len(row) > 1 else None
    finally:
        cursor.close()
        conn.close()


def _is_privileged_emp(emp_code: str) -> bool:
    designation, department = _get_employee_privilege_flags(emp_code)
    designation = (designation or '').strip().upper()
    department = (department or '').strip().upper()
    return designation in ['HR', 'CMD', 'ADMIN'] or department == 'HR'


def _get_table_columns(cursor, table_name: str) -> set:
    """Return the available columns for a table to handle schema drift safely."""
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row['column_name'] for row in cursor.fetchall()}


def _build_exception_select(columns: set, include_employee_fields: bool = False) -> str:
    """Build a portable SELECT list for attendance_exceptions across schema versions."""
    def pick(column_name: str, alias: Optional[str] = None) -> str:
        alias = alias or column_name
        if column_name in columns:
            return f"{column_name} AS {alias}"
        return f"NULL AS {alias}"

    select_parts = [
        pick('id'),
        pick('attendance_id'),
        pick('exception_type'),
        pick('exception_date'),
        pick('exception_time'),
        pick('planned_arrival_time'),
        pick('planned_leave_time'),
        pick('late_by_minutes'),
        pick('early_by_minutes'),
        pick('reason'),
        pick('notes'),
        pick('status'),
        pick('manager_code'),
        pick('manager_email'),
        pick('requested_at'),
        pick('manager_remarks'),
    ]

    if 'reviewed_by' in columns:
        select_parts.append("reviewed_by AS reviewed_by")
    elif 'approved_by' in columns:
        select_parts.append("approved_by AS reviewed_by")
    else:
        select_parts.append("NULL AS reviewed_by")

    if 'reviewed_at' in columns:
        select_parts.append("reviewed_at AS reviewed_at")
    elif 'approved_at' in columns:
        select_parts.append("approved_at AS reviewed_at")
    else:
        select_parts.append("NULL AS reviewed_at")

    if include_employee_fields:
        select_parts.extend([
            pick('emp_code'),
            pick('emp_name'),
            pick('emp_email'),
        ])

    return ',\n                '.join(select_parts)


def _serialize_exception_rows(rows: List[Dict]) -> List[Dict]:
    """Format date/time/datetime values for API responses."""
    for row in rows:
        for key, value in row.items():
            if isinstance(value, datetime):
                row[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(value, date):
                row[key] = value.strftime('%Y-%m-%d')
            elif isinstance(value, time):
                row[key] = value.strftime('%H:%M')
    return rows


def _fetch_exception_rows_by_attendance_ids(
    cursor,
    attendance_ids: List[int],
    exception_type: str,
    include_employee_fields: bool = False
) -> Dict[int, Dict]:
    """Fetch exception rows keyed by attendance_id."""
    if not attendance_ids:
        return {}

    columns = _get_table_columns(cursor, 'attendance_exceptions')
    select_clause = _build_exception_select(columns, include_employee_fields=include_employee_fields)
    placeholders = ','.join(['%s'] * len(attendance_ids))

    cursor.execute(f"""
        SELECT
            {select_clause}
        FROM attendance_exceptions
        WHERE attendance_id IN ({placeholders})
          AND exception_type = %s
    """, attendance_ids + [exception_type])

    return {
        row['attendance_id']: row
        for row in cursor.fetchall()
        if row.get('attendance_id') is not None
    }


# =========================
# AUTO-DETECTION
# =========================

def auto_detect_late_arrival(emp_code: str, attendance_id: int, 
                             login_time: datetime) -> Optional[Dict]:
    """
    Auto-detect late arrival when employee clocks in
    
    Called automatically from attendance_service.clock_in()
    
    Returns:
        Detection result dict if late, None if on time
    """
    shift_start, _ = get_employee_shift_times(emp_code)
    
    if not shift_start:
        logger.warning(f"No shift time configured for {emp_code}")
        return None
    
    login_time_only = login_time.time()
    
    # Check if late
    if login_time_only <= shift_start:
        return None  # On time
    
    # Calculate late duration
    login_datetime = datetime.combine(datetime.today(), login_time_only)
    shift_datetime = datetime.combine(datetime.today(), shift_start)
    late_by_seconds = (login_datetime - shift_datetime).total_seconds()
    late_by_minutes = int(late_by_seconds / 60)
    
    logger.info(f"🚨 Late arrival detected: {emp_code} - {late_by_minutes} minutes late")
    
    return {
        "is_late": True,
        "late_by_minutes": late_by_minutes,
        "shift_start_time": shift_start.strftime('%H:%M'),
        "actual_login_time": login_time_only.strftime('%H:%M'),
        "attendance_id": attendance_id,
        "message": f"You are {late_by_minutes} minutes late. Please submit a reason."
    }


# =========================
# LATE ARRIVAL EXCEPTION
# =========================

def request_late_arrival_exception(emp_code: str, attendance_id: int,
                                   reason: str, notes: str = '') -> Tuple[Dict, int]:
    """
    Submit late arrival exception with reason
    
    Args:
        emp_code: Employee code
        attendance_id: Current attendance session ID
        reason: Reason for late arrival
        notes: Additional notes
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get employee and manager info
        emp_info = get_employee_and_manager_info(emp_code)
        
        if not emp_info:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        if not emp_info['approver_code']:
            return ({"success": False, "message": "No approver available"}, 400)
        
        # Get attendance record to verify and calculate late duration
        cursor.execute("""
            SELECT 
                login_time,
                employee_email,
                date
            FROM attendance
            WHERE id = %s AND employee_email = %s
        """, (attendance_id, emp_info['emp_email']))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({"success": False, "message": "Attendance record not found"}, 404)
        
        # Check if exception already exists for this attendance
        cursor.execute("""
            SELECT id FROM attendance_exceptions
            WHERE attendance_id = %s AND exception_type = 'late_arrival'
        """, (attendance_id,))
        
        if cursor.fetchone():
            return ({"success": False, "message": "Late arrival exception already submitted"}, 400)
        
        # Get shift times to determine planned arrival time
        shift_start, _ = get_employee_shift_times(emp_code)
        
        if not shift_start:
            return ({"success": False, "message": "Shift time not configured"}, 400)
        
        # Calculate late duration
        login_time = attendance['login_time']
        login_time_only = login_time.time() if isinstance(login_time, datetime) else login_time
        login_datetime = datetime.combine(datetime.today(), login_time_only)
        shift_datetime = datetime.combine(datetime.today(), shift_start)
        late_by_minutes = int((login_datetime - shift_datetime).total_seconds() / 60)
        
        if late_by_minutes <= 0:
            return ({"success": False, "message": "Not marked as late arrival"}, 400)
        
        # Create exception record with planned arrival time
        cursor.execute("""
            INSERT INTO attendance_exceptions (
                emp_code,
                emp_name,
                emp_email,
                attendance_id,
                exception_type,
                exception_date,
                exception_time,
                planned_arrival_time,  # New field
                late_by_minutes,
                reason,
                notes,
                manager_code,
                manager_email,
                status,
                requested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_code,
            emp_info['emp_name'],
            emp_info['emp_email'],
            attendance_id,
            'late_arrival',
            attendance['date'],
            login_time_only,
            shift_start,  # Planned arrival time
            late_by_minutes,
            reason,
            notes,
            emp_info['approver_code'],
            emp_info['approver_email'],
            'pending',
            datetime.now()
        ))
        
        exception_id = cursor.fetchone()['id']
        conn.commit()
        
        logger.info(f"✅ Late arrival exception submitted: ID={exception_id}, Employee={emp_code}")
        
        return ({
            "success": True,
            "message": "Late arrival exception submitted successfully",
            "data": {
                "exception_id": exception_id,
                "attendance_id": attendance_id,
                "exception_type": "late_arrival",
                "employee_name": emp_info['emp_name'],
                "late_by_minutes": late_by_minutes,
                "shift_start_time": shift_start.strftime('%H:%M'),
                "actual_login_time": login_time_only.strftime('%H:%M'),
                "planned_arrival_time": shift_start.strftime('%H:%M'),  # New field in response
                "manager": emp_info['approver_name'],
                "manager_code": emp_info['approver_code'],
                "manager_email": emp_info['approver_email'],
                "status": "pending"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Request late arrival exception error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# EARLY LEAVE EXCEPTION
# =========================

def request_early_leave_exception(emp_code: str, attendance_id: int,
                                  planned_leave_time: str, reason: str,
                                  notes: str = '') -> Tuple[Dict, int]:
    """
    Submit early leave exception request
    
    Args:
        emp_code: Employee code
        attendance_id: Current attendance session ID
        planned_leave_time: Planned leave time in HH:MM format
        reason: Reason for early leave
        notes: Additional notes
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get employee and manager info
        emp_info = get_employee_and_manager_info(emp_code)
        
        if not emp_info:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        if not emp_info['approver_code']:
            return ({"success": False, "message": "No approver available"}, 400)
        
        # Get attendance record to verify
        cursor.execute("""
            SELECT 
                id,
                employee_email,
                date,
                logout_time
            FROM attendance
            WHERE id = %s AND employee_email = %s
        """, (attendance_id, emp_info['emp_email']))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({"success": False, "message": "Attendance record not found"}, 404)
        
        if attendance['logout_time']:
            return ({"success": False, "message": "Already clocked out"}, 400)
        
        # Check if exception already exists for this attendance
        cursor.execute("""
            SELECT id FROM attendance_exceptions
            WHERE attendance_id = %s AND exception_type = 'early_leave'
        """, (attendance_id,))
        
        if cursor.fetchone():
            return ({"success": False, "message": "Early leave exception already submitted"}, 400)
        
        # Parse and validate planned leave time
        try:
            planned_leave_time_obj = datetime.strptime(planned_leave_time, '%H:%M').time()
        except ValueError:
            return ({"success": False, "message": "Invalid time format. Use HH:MM"}, 400)
        
        # Calculate early leave duration
        _, shift_end = get_employee_shift_times(emp_code)
        
        if not shift_end:
            return ({"success": False, "message": "Shift time not configured"}, 400)
        
        leave_datetime = datetime.combine(datetime.today(), planned_leave_time_obj)
        shift_end_datetime = datetime.combine(datetime.today(), shift_end)
        
        if leave_datetime >= shift_end_datetime:
            return ({"success": False, "message": "Planned leave time is after shift end time"}, 400)
        
        early_by_minutes = int((shift_end_datetime - leave_datetime).total_seconds() / 60)
        
        # Create exception record
        cursor.execute("""
            INSERT INTO attendance_exceptions (
                emp_code,
                emp_name,
                emp_email,
                attendance_id,
                exception_type,
                exception_date,
                planned_leave_time,
                early_by_minutes,
                reason,
                notes,
                manager_code,
                manager_email,
                status,
                requested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_code,
            emp_info['emp_name'],
            emp_info['emp_email'],
            attendance_id,
            'early_leave',
            attendance['date'],
            planned_leave_time_obj,
            early_by_minutes,
            reason,
            notes,
            emp_info['approver_code'],
            emp_info['approver_email'],
            'pending',
            datetime.now()
        ))
        
        exception_id = cursor.fetchone()['id']
        conn.commit()
        
        logger.info(f"✅ Early leave exception submitted: ID={exception_id}, Employee={emp_code}")
        
        return ({
            "success": True,
            "message": "Early leave exception submitted successfully",
            "data": {
                "exception_id": exception_id,
                "attendance_id": attendance_id,
                "exception_type": "early_leave",
                "employee_name": emp_info['emp_name'],
                "planned_leave_time": planned_leave_time,
                "early_by_minutes": early_by_minutes,
                "shift_end_time": shift_end.strftime('%H:%M'),
                "manager": emp_info['approver_name'],
                "manager_code": emp_info['approver_code'],
                "manager_email": emp_info['approver_email'],
                "status": "pending",
                "note": "Please wait for manager approval before clocking out"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Request early leave exception error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# APPROVE/REJECT EXCEPTION
# =========================

def approve_exception(exception_id: int, manager_code: str,
                     action: str, remarks: str = '') -> Tuple[Dict, int]:
    """
    Approve or reject attendance exception
    
    Args:
        exception_id: Exception ID
        manager_code: Manager's employee code
        action: 'approved' or 'rejected'
        remarks: Manager's remarks
    """
    if action not in ['approved', 'rejected']:
        return ({"success": False, "message": "Action must be 'approved' or 'rejected'"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get exception details
        is_privileged = _is_privileged_emp(manager_code)
        if is_privileged:
            cursor.execute("""
                SELECT * FROM attendance_exceptions
                WHERE id = %s
            """, (exception_id,))
        else:
            cursor.execute("""
                SELECT * FROM attendance_exceptions
                WHERE id = %s AND manager_code = %s
            """, (exception_id, manager_code))
        
        exception = cursor.fetchone()
        
        if not exception:
            return ({"success": False, "message": "Exception not found or unauthorized"}, 404)
        
        if exception['status'] != 'pending':
            return ({"success": False, "message": f"Exception already {exception['status']}"}, 400)
        
        # Update exception status
        cursor.execute("""
            UPDATE attendance_exceptions
            SET 
                status = %s,
                reviewed_by = %s,
                reviewed_at = %s,
                manager_remarks = %s
            WHERE id = %s
        """, (action, manager_code, datetime.now(), remarks, exception_id))
        
        conn.commit()
        
        exception_type = exception['exception_type']
        emp_name = exception['emp_name']
        
        logger.info(f"✅ {exception_type} {action}: Exception={exception_id}, Manager={manager_code}")
        
        return ({
            "success": True,
            "message": f"{exception_type.replace('_', ' ').title()} exception {action}",
            "data": {
                "exception_id": exception_id,
                "exception_type": exception_type,
                "status": action,
                "employee": emp_name,
                "emp_code": exception['emp_code'],
                "emp_email": exception['emp_email'],
                "reviewed_by": manager_code,
                "manager_remarks": remarks,
                "reviewed_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Approve exception error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET EXCEPTIONS
# =========================

def get_my_exceptions(emp_code: str, status: str = None,
                     exception_type: str = None) -> Tuple[Dict, int]:
    """
    Get employee's attendance exceptions
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        exception_columns = _get_table_columns(cursor, 'attendance_exceptions')
        select_clause = _build_exception_select(exception_columns)

        query = f"""
            SELECT 
                {select_clause}
            FROM attendance_exceptions
        """
        params = []

        if 'emp_code' in exception_columns:
            query += " WHERE emp_code = %s"
            params.append(emp_code)
        else:
            query += """
                WHERE attendance_id IN (
                    SELECT id
                    FROM attendance
                    WHERE employee_email = (
                        SELECT emp_email
                        FROM employees
                        WHERE emp_code = %s
                    )
                )
            """
            params.append(emp_code)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if exception_type:
            query += " AND exception_type = %s"
            params.append(exception_type)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        exceptions = cursor.fetchall()
        exceptions = _serialize_exception_rows(exceptions)
        
        # Calculate summary for the same exception type scope.
        summary_query = """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
            FROM attendance_exceptions
        """
        summary_params = []

        if 'emp_code' in exception_columns:
            summary_query += " WHERE emp_code = %s"
            summary_params.append(emp_code)
        else:
            summary_query += """
                WHERE attendance_id IN (
                    SELECT id
                    FROM attendance
                    WHERE employee_email = (
                        SELECT emp_email
                        FROM employees
                        WHERE emp_code = %s
                    )
                )
            """
            summary_params.append(emp_code)

        if exception_type:
            summary_query += " AND exception_type = %s"
            summary_params.append(exception_type)

        cursor.execute(summary_query, summary_params)
        
        summary = cursor.fetchone()
        
        return ({
            "success": True,
            "data": {
                "exceptions": exceptions,
                "count": len(exceptions),
                "summary": {
                    "pending": int(summary['pending_count'] or 0),
                    "approved": int(summary['approved_count'] or 0),
                    "rejected": int(summary['rejected_count'] or 0)
                }
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_team_exceptions(manager_code: str, status: str = None,
                       exception_type: str = None) -> Tuple[Dict, int]:
    """
    Get attendance exceptions for manager's team
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        exception_columns = _get_table_columns(cursor, 'attendance_exceptions')
        select_clause = _build_exception_select(exception_columns, include_employee_fields=True)
        is_privileged = _is_privileged_emp(manager_code)

        query = f"""
            SELECT 
                {select_clause}
            FROM attendance_exceptions
        """
        params = []

        if is_privileged:
            query += " WHERE 1=1"
        elif 'manager_code' in exception_columns:
            query += " WHERE manager_code = %s"
            params.append(manager_code)
        else:
            query += """
                WHERE attendance_id IN (
                    SELECT a.id
                    FROM attendance a
                    JOIN employees e ON a.employee_email = e.emp_email
                    WHERE e.emp_manager = %s OR e.emp_informing_manager = %s
                )
            """
            params.extend([manager_code, manager_code])
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if exception_type:
            query += " AND exception_type = %s"
            params.append(exception_type)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        exceptions = cursor.fetchall()
        exceptions = _serialize_exception_rows(exceptions)
        
        # Count pending
        pending_count = len([e for e in exceptions if e['status'] == 'pending'])
        
        return ({
            "success": True,
            "data": {
                "exceptions": exceptions,
                "count": len(exceptions),
                "pending_count": pending_count
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_my_late_arrival_records(emp_code: str, status: str = None) -> Tuple[Dict, int]:
    """Get self late-arrival records from attendance with linked exception status."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        emp_info = get_employee_and_manager_info(emp_code)
        shift_start, _ = get_employee_shift_times(emp_code)

        if not emp_info or not emp_info.get('emp_email') or not shift_start:
            return ({
                "success": True,
                "data": {
                    "exceptions": [],
                    "count": 0,
                    "summary": {
                        "pending": 0,
                        "approved": 0,
                        "rejected": 0,
                        "not_requested": 0
                    }
                }
            }, 200)

        cursor.execute("""
            SELECT id, date, login_time
            FROM attendance
            WHERE employee_email = %s
              AND login_time IS NOT NULL
            ORDER BY date DESC, login_time DESC
        """, (emp_info['emp_email'],))
        attendances = cursor.fetchall()

        attendance_ids = [row['id'] for row in attendances]
        exceptions_by_attendance = _fetch_exception_rows_by_attendance_ids(
            cursor,
            attendance_ids,
            'late_arrival'
        )

        records = []
        for attendance in attendances:
            login_time = attendance.get('login_time')
            login_time_only = login_time.time() if isinstance(login_time, datetime) else login_time

            if not login_time_only or login_time_only <= shift_start:
                continue

            exception = exceptions_by_attendance.get(attendance['id'], {})
            late_by_minutes = exception.get('late_by_minutes')
            if late_by_minutes is None:
                late_by_minutes = int((
                    datetime.combine(datetime.today(), login_time_only) -
                    datetime.combine(datetime.today(), shift_start)
                ).total_seconds() / 60)

            record = {
                "attendance_id": attendance['id'],
                "exception_id": exception.get('id'),
                "exception_type": "late_arrival",
                "exception_date": attendance.get('date'),
                "actual_login_time": login_time_only,
                "planned_arrival_time": exception.get('planned_arrival_time') or shift_start,
                "late_by_minutes": late_by_minutes,
                "status": exception.get('status') or 'not_requested',
                "reason": exception.get('reason'),
                "notes": exception.get('notes'),
                "requested_at": exception.get('requested_at'),
                "reviewed_by": exception.get('reviewed_by'),
                "reviewed_at": exception.get('reviewed_at'),
                "manager_code": exception.get('manager_code'),
                "manager_email": exception.get('manager_email'),
                "manager_remarks": exception.get('manager_remarks'),
            }

            if status and record['status'] != status:
                continue

            records.append(record)

        records = _serialize_exception_rows(records)
        summary = {
            "pending": len([r for r in records if r['status'] == 'pending']),
            "approved": len([r for r in records if r['status'] == 'approved']),
            "rejected": len([r for r in records if r['status'] == 'rejected']),
            "not_requested": len([r for r in records if r['status'] == 'not_requested']),
        }

        return ({
            "success": True,
            "data": {
                "exceptions": records,
                "count": len(records),
                "summary": summary
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()


def get_my_early_leave_records(emp_code: str, status: str = None) -> Tuple[Dict, int]:
    """Get self early-leave records from attendance with linked exception status."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        emp_info = get_employee_and_manager_info(emp_code)
        _, shift_end = get_employee_shift_times(emp_code)

        if not emp_info or not emp_info.get('emp_email') or not shift_end:
            return ({
                "success": True,
                "data": {
                    "exceptions": [],
                    "count": 0,
                    "summary": {
                        "pending": 0,
                        "approved": 0,
                        "rejected": 0,
                        "not_requested": 0
                    }
                }
            }, 200)

        cursor.execute("""
            SELECT id, date, login_time, logout_time
            FROM attendance
            WHERE employee_email = %s
            ORDER BY date DESC, COALESCE(logout_time, login_time) DESC
        """, (emp_info['emp_email'],))
        attendances = cursor.fetchall()

        attendance_ids = [row['id'] for row in attendances]
        exceptions_by_attendance = _fetch_exception_rows_by_attendance_ids(
            cursor,
            attendance_ids,
            'early_leave'
        )

        records = []
        for attendance in attendances:
            exception = exceptions_by_attendance.get(attendance['id'])
            logout_time = attendance.get('logout_time')
            logout_time_only = logout_time.time() if isinstance(logout_time, datetime) else logout_time
            has_raw_early_leave = bool(logout_time_only and logout_time_only < shift_end)

            if not exception and not has_raw_early_leave:
                continue

            early_by_minutes = exception.get('early_by_minutes') if exception else None
            if early_by_minutes is None and has_raw_early_leave:
                early_by_minutes = int((
                    datetime.combine(datetime.today(), shift_end) -
                    datetime.combine(datetime.today(), logout_time_only)
                ).total_seconds() / 60)

            record = {
                "attendance_id": attendance['id'],
                "exception_id": exception.get('id') if exception else None,
                "exception_type": "early_leave",
                "exception_date": attendance.get('date'),
                "actual_logout_time": logout_time_only,
                "planned_leave_time": exception.get('planned_leave_time') if exception else None,
                "shift_end_time": shift_end,
                "early_by_minutes": early_by_minutes,
                "status": (exception.get('status') if exception else 'not_requested'),
                "reason": exception.get('reason') if exception else None,
                "notes": exception.get('notes') if exception else None,
                "requested_at": exception.get('requested_at') if exception else None,
                "reviewed_by": exception.get('reviewed_by') if exception else None,
                "reviewed_at": exception.get('reviewed_at') if exception else None,
                "manager_code": exception.get('manager_code') if exception else None,
                "manager_email": exception.get('manager_email') if exception else None,
                "manager_remarks": exception.get('manager_remarks') if exception else None,
            }

            if status and record['status'] != status:
                continue

            records.append(record)

        records = _serialize_exception_rows(records)
        summary = {
            "pending": len([r for r in records if r['status'] == 'pending']),
            "approved": len([r for r in records if r['status'] == 'approved']),
            "rejected": len([r for r in records if r['status'] == 'rejected']),
            "not_requested": len([r for r in records if r['status'] == 'not_requested']),
        }

        return ({
            "success": True,
            "data": {
                "exceptions": records,
                "count": len(records),
                "summary": summary
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()


# =========================
# VALIDATION HELPERS
# =========================

def _coerce_time(value):
    """Normalize DB time values (time/datetime/str) into a time object."""
    if value is None:
        return None
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()
    if isinstance(value, str):
        for fmt in ('%H:%M:%S', '%H:%M'):
            try:
                return datetime.strptime(value, fmt).time()
            except ValueError:
                continue
    return None


def check_early_leave_approval(attendance_id: int, current_time: Optional[time] = None,
                               enforce_planned_time: bool = False) -> Tuple[bool, str]:
    """
    Check if employee has approved early leave for given attendance
    
    Called from clock_out() to validate early clock-out
    
    Returns:
        (is_approved, message)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                id,
                status,
                planned_leave_time
            FROM attendance_exceptions
            WHERE attendance_id = %s 
              AND exception_type = 'early_leave'
            ORDER BY requested_at DESC
            LIMIT 1
        """, (attendance_id,))
        
        exception = cursor.fetchone()
        
        if not exception:
            return (False, "No early leave request found. Please submit request first.")
        
        if exception['status'] == 'pending':
            return (False, "Early leave request is pending manager approval. Please wait for approval.")
        
        if exception['status'] == 'rejected':
            return (False, "Early leave request was rejected. Cannot clock out early.")
        
        if exception['status'] == 'approved':
            # Optional: enforce planned leave time if required
            planned_time = _coerce_time(exception.get('planned_leave_time'))
            if current_time is None:
                current_time = datetime.now().time()
            if enforce_planned_time and planned_time and current_time < planned_time:
                return (False, f"You can only clock out after {planned_time.strftime('%H:%M')}")

            return (True, "Early leave approved")
        
        return (False, "Invalid exception status")
        
    finally:
        cursor.close()
        conn.close()
