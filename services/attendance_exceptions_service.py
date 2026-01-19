"""
Attendance Exceptions Service
Business logic for late arrival and early leave handling
"""

from datetime import datetime, time
from database.connection import get_db_connection
from services.leaves_service import is_employee_on_leave
from typing import Dict, Tuple, Optional
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
                e.shift_start_time,
                e.shift_end_time,
                s.shift_start_time as default_shift_start,
                s.shift_end_time as default_shift_end
            FROM employees e
            LEFT JOIN shifts s ON e.emp_shift_id = s.shift_id
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        result = cursor.fetchone()
        if not result:
            return None, None
        
        # Use employee's custom shift times, fallback to default shift
        start_time = result['shift_start_time'] or result.get('default_shift_start')
        end_time = result['shift_end_time'] or result.get('default_shift_end')
        
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
        
        # Calculate late duration
        login_time = attendance['login_time']
        shift_start, _ = get_employee_shift_times(emp_code)
        
        if not shift_start:
            return ({"success": False, "message": "Shift time not configured"}, 400)
        
        login_time_only = login_time.time() if isinstance(login_time, datetime) else login_time
        login_datetime = datetime.combine(datetime.today(), login_time_only)
        shift_datetime = datetime.combine(datetime.today(), shift_start)
        late_by_minutes = int((login_datetime - shift_datetime).total_seconds() / 60)
        
        if late_by_minutes <= 0:
            return ({"success": False, "message": "Not marked as late arrival"}, 400)
        
        # Create exception record
        cursor.execute("""
            INSERT INTO attendance_exceptions (
                emp_code,
                emp_name,
                emp_email,
                attendance_id,
                exception_type,
                exception_date,
                exception_time,
                late_by_minutes,
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
            'late_arrival',
            attendance['date'],
            login_time_only,
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
                "late_by_minutes": late_by_minutes,
                "shift_start_time": shift_start.strftime('%H:%M'),
                "actual_login_time": login_time_only.strftime('%H:%M'),
                "manager": emp_info['approver_name'],
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
                "planned_leave_time": planned_leave_time,
                "early_by_minutes": early_by_minutes,
                "shift_end_time": shift_end.strftime('%H:%M'),
                "manager": emp_info['approver_name'],
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
                "reviewed_by": manager_code,
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
        query = """
            SELECT 
                id,
                attendance_id,
                exception_type,
                exception_date,
                exception_time,
                planned_leave_time,
                late_by_minutes,
                early_by_minutes,
                reason,
                notes,
                status,
                manager_code,
                manager_email,
                reviewed_by,
                reviewed_at,
                manager_remarks,
                requested_at
            FROM attendance_exceptions
            WHERE emp_code = %s
        """
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if exception_type:
            query += " AND exception_type = %s"
            params.append(exception_type)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        exceptions = cursor.fetchall()
        
        # Format dates and times
        for exc in exceptions:
            for key, value in exc.items():
                if isinstance(value, datetime):
                    exc[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, time):
                    exc[key] = value.strftime('%H:%M')
        
        # Calculate summary
        cursor.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
            FROM attendance_exceptions
            WHERE emp_code = %s
        """, (emp_code,))
        
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
        query = """
            SELECT 
                id,
                emp_code,
                emp_name,
                emp_email,
                attendance_id,
                exception_type,
                exception_date,
                exception_time,
                planned_leave_time,
                late_by_minutes,
                early_by_minutes,
                reason,
                notes,
                status,
                requested_at,
                reviewed_by,
                reviewed_at,
                manager_remarks
            FROM attendance_exceptions
            WHERE manager_code = %s
        """
        params = [manager_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if exception_type:
            query += " AND exception_type = %s"
            params.append(exception_type)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        exceptions = cursor.fetchall()
        
        # Format dates and times
        for exc in exceptions:
            for key, value in exc.items():
                if isinstance(value, datetime):
                    exc[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, time):
                    exc[key] = value.strftime('%H:%M')
        
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


# =========================
# VALIDATION HELPERS
# =========================

def check_early_leave_approval(attendance_id: int) -> Tuple[bool, str]:
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
            # Check if clocking out at or after planned time
            planned_time = exception['planned_leave_time']
            current_time = datetime.now().time()
            
            if current_time < planned_time:
                return (False, f"You can only clock out after {planned_time.strftime('%H:%M')}")
            
            return (True, "Early leave approved")
        
        return (False, "Invalid exception status")
        
    finally:
        cursor.close()
        conn.close()