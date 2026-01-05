"""
Late Arrival & Early Leave Approval Service
Manager approval system for late arrival and early leave requests
"""

from datetime import datetime
from database.connection import get_db_connection
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def request_late_arrival_approval(emp_code: str, activity_id: int, 
                                  reason: str, notes: str = '') -> Tuple[Dict, int]:
    """
    Convert late arrival activity to approval request
    
    Args:
        emp_code: Employee code
        activity_id: Late arrival activity ID
        reason: Reason for late arrival
        notes: Additional notes
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get employee and manager info
        cursor.execute("""
            SELECT 
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_manager,
                m.emp_full_name as manager_name,
                m.emp_email as manager_email
            FROM employees e
            LEFT JOIN employees m ON e.emp_manager = m.emp_code
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        emp = cursor.fetchone()
        
        if not emp:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        if not emp.get('emp_manager'):
            return ({"success": False, "message": "No manager assigned"}, 400)
        
        # Get activity details
        cursor.execute("""
            SELECT * FROM activities
            WHERE id = %s AND employee_email = %s AND activity_type = 'late_arrival'
        """, (activity_id, emp['emp_email']))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Late arrival activity not found"}, 404)
        
        # Create approval request
        cursor.execute("""
            INSERT INTO activity_approvals (
                activity_id,
                emp_code,
                emp_name,
                emp_email,
                manager_code,
                manager_email,
                activity_type,
                request_date,
                reason,
                notes,
                status,
                requested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            activity_id,
            emp['emp_code'],
            emp['emp_full_name'],
            emp['emp_email'],
            emp['emp_manager'],
            emp['manager_email'],
            'late_arrival',
            activity['date'],
            reason,
            notes,
            'pending',
            datetime.now()
        ))
        
        approval_id = cursor.fetchone()['id']
        
        # Update activity with approval link
        cursor.execute("""
            UPDATE activities
            SET notes = %s
            WHERE id = %s
        """, (
            f"Pending approval - Reason: {reason}",
            activity_id
        ))
        
        conn.commit()
        
        logger.info(f"✅ Late arrival approval requested: Activity {activity_id} by {emp['emp_full_name']}")
        
        return ({
            "success": True,
            "message": "Late arrival approval requested",
            "data": {
                "approval_id": approval_id,
                "activity_id": activity_id,
                "manager": emp['manager_name'],
                "manager_email": emp['manager_email'],
                "status": "pending"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Request late arrival approval error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def request_early_leave_approval(emp_code: str, activity_id: int, 
                                 reason: str, notes: str = '') -> Tuple[Dict, int]:
    """
    Convert early leave activity to approval request
    
    Args:
        emp_code: Employee code
        activity_id: Early leave activity ID
        reason: Reason for early leave
        notes: Additional notes
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get employee and manager info
        cursor.execute("""
            SELECT 
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_manager,
                m.emp_full_name as manager_name,
                m.emp_email as manager_email
            FROM employees e
            LEFT JOIN employees m ON e.emp_manager = m.emp_code
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        emp = cursor.fetchone()
        
        if not emp:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        if not emp.get('emp_manager'):
            return ({"success": False, "message": "No manager assigned"}, 400)
        
        # Get activity details
        cursor.execute("""
            SELECT * FROM activities
            WHERE id = %s AND employee_email = %s AND activity_type = 'early_leave'
        """, (activity_id, emp['emp_email']))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Early leave activity not found"}, 404)
        
        # Create approval request
        cursor.execute("""
            INSERT INTO activity_approvals (
                activity_id,
                emp_code,
                emp_name,
                emp_email,
                manager_code,
                manager_email,
                activity_type,
                request_date,
                reason,
                notes,
                status,
                requested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            activity_id,
            emp['emp_code'],
            emp['emp_full_name'],
            emp['emp_email'],
            emp['emp_manager'],
            emp['manager_email'],
            'early_leave',
            activity['date'],
            reason,
            notes,
            'pending',
            datetime.now()
        ))
        
        approval_id = cursor.fetchone()['id']
        
        # Update activity with approval link
        cursor.execute("""
            UPDATE activities
            SET notes = %s
            WHERE id = %s
        """, (
            f"Pending approval - Reason: {reason}",
            activity_id
        ))
        
        conn.commit()
        
        logger.info(f"✅ Early leave approval requested: Activity {activity_id} by {emp['emp_full_name']}")
        
        return ({
            "success": True,
            "message": "Early leave approval requested",
            "data": {
                "approval_id": approval_id,
                "activity_id": activity_id,
                "manager": emp['manager_name'],
                "manager_email": emp['manager_email'],
                "status": "pending"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Request early leave approval error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def approve_activity_request(approval_id: int, manager_code: str, 
                            action: str, remarks: str = '') -> Tuple[Dict, int]:
    """
    Approve or reject late arrival/early leave request
    
    Args:
        approval_id: Approval request ID
        manager_code: Manager's employee code
        action: 'approved' or 'rejected'
        remarks: Manager's remarks
    """
    if action not in ['approved', 'rejected']:
        return ({"success": False, "message": "Action must be 'approved' or 'rejected'"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get approval request
        cursor.execute("""
            SELECT * FROM activity_approvals
            WHERE id = %s AND manager_code = %s
        """, (approval_id, manager_code))
        
        approval = cursor.fetchone()
        
        if not approval:
            return ({"success": False, "message": "Approval request not found or unauthorized"}, 404)
        
        if approval['status'] != 'pending':
            return ({"success": False, "message": f"Request already {approval['status']}"}, 400)
        
        # Update approval request
        cursor.execute("""
            UPDATE activity_approvals
            SET 
                status = %s,
                reviewed_by = %s,
                reviewed_at = %s,
                manager_remarks = %s
            WHERE id = %s
        """, (action, manager_code, datetime.now(), remarks, approval_id))
        
        # Update activity notes
        activity_id = approval['activity_id']
        activity_type = approval['activity_type']
        
        activity_note = f"{action.capitalize()} by manager"
        if remarks:
            activity_note += f" - {remarks}"
        
        cursor.execute("""
            UPDATE activities
            SET notes = %s
            WHERE id = %s
        """, (activity_note, activity_id))
        
        conn.commit()
        
        logger.info(f"✅ {activity_type} {action}: Approval {approval_id} by manager {manager_code}")
        
        return ({
            "success": True,
            "message": f"{activity_type.replace('_', ' ').title()} request {action}",
            "data": {
                "approval_id": approval_id,
                "activity_id": activity_id,
                "activity_type": activity_type,
                "status": action,
                "employee": approval['emp_name'],
                "reviewed_by": manager_code,
                "reviewed_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Approve activity error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_my_approval_requests(emp_code: str, status: str = None) -> Tuple[Dict, int]:
    """
    Get employee's approval requests
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM activity_approvals WHERE emp_code = %s"
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Format dates
        for req in requests:
            for key, value in req.items():
                if isinstance(value, datetime):
                    req[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "requests": requests,
                "count": len(requests)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_team_approval_requests(manager_code: str, status: str = None) -> Tuple[Dict, int]:
    """
    Get approval requests for manager's team
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT * FROM activity_approvals 
            WHERE manager_code = %s
        """
        params = [manager_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY requested_at DESC"
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Format dates
        for req in requests:
            for key, value in req.items():
                if isinstance(value, datetime):
                    req[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "requests": requests,
                "count": len(requests),
                "pending_count": len([r for r in requests if r['status'] == 'pending'])
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()