"""
Leave Service
Leave management business logic with cumulative monthly accrual
"""

from datetime import datetime, timedelta, date
from database.connection import get_db_connection
from typing import List, Tuple, Dict
import logging

logger = logging.getLogger(__name__)

# =========================
# LEAVE CONFIGURATION
# =========================

LEAVE_TYPES = {
    'casual': {'max': 12, 'name': 'Casual Leave'},
    'sick': {'max': 6, 'name': 'Sick Leave'},
}

LEAVE_DURATIONS = ['full_day', 'first_half', 'second_half']


# =========================
# HELPER FUNCTIONS
# =========================

def is_employee_on_leave(emp_code: str) -> bool:
    """Check if employee is currently on approved leave"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 1 FROM leaves
            WHERE emp_code = %s
              AND status = 'approved'
              AND CURRENT_DATE BETWEEN from_date AND to_date
            LIMIT 1
        """, (emp_code,))
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()


def calculate_cumulative_leaves(joining_date: date, year: int) -> Dict:
    """
    Monthly cumulative accrual:
    - 1.5 leaves per month
    - Split as 1 Casual + 0.5 Sick
    - Accrues each month until current month
    """
    today = date.today()

    if joining_date > today:
        return {'casual': 0, 'sick': 0, 'months': 0}

    # If employee joined before this year, start from January
    start_month = joining_date.month if joining_date.year == year else 1
    
    # Only accrue until current month
    end_month = today.month if year == today.year else 12

    months = 0.0
    for month in range(start_month, end_month + 1):
        # If this is joining month, check if joined before/after 15th
        if joining_date.year == year and month == joining_date.month:
            months += 1 if joining_date.day <= 15 else 0.5
        else:
            months += 1

    # Calculate accrued leaves
    casual = min(round(months * 1, 2), 12)  # 1 casual per month, max 12
    sick = min(round(months * 0.5, 2), 6)   # 0.5 sick per month, max 6

    return {
        'casual': casual,
        'sick': sick,
        'months': months
    }


def get_organization_holidays(year: int) -> List[date]:
    """Get organization holidays for the year"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT holiday_date FROM organization_holidays
            WHERE EXTRACT(YEAR FROM holiday_date) = %s
        """, (year,))
        return [row['holiday_date'] for row in cursor.fetchall()]
    except Exception as e:
        logger.warning(f"Could not fetch holidays: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def calculate_leave_count(start_date: date, end_date: date, duration: str, holidays: List[date]) -> float:
    """Calculate working days excluding weekends and holidays"""
    working_days = []
    current = start_date

    while current <= end_date:
        # Skip Sundays
        if current.weekday() == 6:
            current += timedelta(days=1)
            continue
        
        # Skip 2nd and 4th Saturdays
        if current.weekday() == 5:
            week_of_month = (current.day - 1) // 7 + 1
            if week_of_month in [2, 4]:
                current += timedelta(days=1)
                continue
        
        # Skip holidays
        if current in holidays:
            current += timedelta(days=1)
            continue
        
        working_days.append(current)
        current += timedelta(days=1)

    if not working_days:
        return 0

    if duration == 'full_day':
        return float(len(working_days))
    
    if duration in ['first_half', 'second_half']:
        if len(working_days) != 1:
            raise ValueError("Half day leave allowed only for single day")
        return 0.5
    
    return 0


def get_late_arrival_count(emp_code: str, from_date: date, to_date: date) -> int:
    """Count late arrivals in a period"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT s.shift_start_time
            FROM employees e
            LEFT JOIN shifts s ON e.emp_shift_id = s.shift_id
            WHERE e.emp_code = %s
        """, (emp_code,))
        
        shift = cursor.fetchone()
        if not shift or not shift['shift_start_time']:
            cursor.execute("SELECT shift_start_time FROM employees WHERE emp_code = %s", (emp_code,))
            shift = cursor.fetchone()
            
        if not shift or not shift['shift_start_time']:
            return 0
        
        shift_start = shift['shift_start_time']
        
        cursor.execute("""
            SELECT COUNT(*) as late_count
            FROM attendance
            WHERE employee_email = (SELECT emp_email FROM employees WHERE emp_code = %s)
            AND date BETWEEN %s AND %s
            AND EXTRACT(HOUR FROM login_time) * 60 + EXTRACT(MINUTE FROM login_time) > 
                EXTRACT(HOUR FROM %s::time) * 60 + EXTRACT(MINUTE FROM %s::time)
        """, (emp_code, from_date, to_date, shift_start, shift_start))
        
        return cursor.fetchone()['late_count']
    except Exception as e:
        logger.error(f"Error counting late arrivals: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()


def get_short_working_days(emp_code: str, from_date: date, to_date: date) -> int:
    """Count days with <= 4 hours work"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT COUNT(*) as short_days
            FROM attendance
            WHERE employee_email = (SELECT emp_email FROM employees WHERE emp_code = %s)
            AND date BETWEEN %s AND %s
            AND working_hours IS NOT NULL
            AND working_hours <= 4
        """, (emp_code, from_date, to_date))
        
        return cursor.fetchone()['short_days']
    except Exception as e:
        logger.error(f"Error counting short working days: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()


def calculate_auto_deductions(emp_code: str, month: int, year: int) -> Dict:
    """
    Calculate automatic leave deductions:
    - >3 late arrivals = 0.5 day leave
    - Working hours ≤ 4 = 0.5 day leave per day
    """
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year, 12, 31)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    late_arrivals = get_late_arrival_count(emp_code, start_date, end_date)
    short_days = get_short_working_days(emp_code, start_date, end_date)
    
    return {
        'late_arrivals': {
            'count': late_arrivals,
            'deduction': 0.5 if late_arrivals > 3 else 0
        },
        'short_working_days': {
            'count': short_days,
            'deduction': short_days * 0.5
        },
        'total_deduction': (0.5 if late_arrivals > 3 else 0) + (short_days * 0.5)
    }


# =========================
# BALANCE FUNCTION
# =========================

def get_employee_leave_balance(emp_code: str) -> Dict:
    """Get employee's cumulative leave balance"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get employee joining date
        cursor.execute("""
            SELECT emp_joined_date
            FROM employees
            WHERE emp_code = %s
        """, (emp_code,))
        
        emp = cursor.fetchone()
        if not emp:
            return {"error": "Employee not found"}

        joining_date = emp['emp_joined_date'] or date.today()
        if isinstance(joining_date, str):
            joining_date = datetime.strptime(joining_date, "%Y-%m-%d").date()

        year = datetime.now().year
        
        # Calculate accrued leaves based on months worked
        accrued = calculate_cumulative_leaves(joining_date, year)

        # Get used leaves this year
        cursor.execute("""
            SELECT leave_type, SUM(leave_count) AS used
            FROM leaves
            WHERE emp_code = %s
              AND EXTRACT(YEAR FROM from_date) = %s
              AND status IN ('approved', 'pending')
            GROUP BY leave_type
        """, (emp_code, year))

        used = {row['leave_type']: float(row['used']) for row in cursor.fetchall()}

        return {
            'casual': {
                'max': accrued['casual'],
                'used': used.get('casual', 0),
                'remaining': accrued['casual'] - used.get('casual', 0)
            },
            'sick': {
                'max': accrued['sick'],
                'used': used.get('sick', 0),
                'remaining': accrued['sick'] - used.get('sick', 0)
            },
            '_info': {
                'accrual_type': 'cumulative',
                'months_counted': accrued['months'],
                'joining_date': joining_date.strftime('%d-%m-%Y'),
                'note': f"Accrued {accrued['months']} months @ 1.5 leaves/month"
            }
        }

    except Exception as e:
        logger.error(f"Error getting leave balance: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


# =========================
# APPLY LEAVE (MANAGER FALLBACK)
# =========================

def apply_leave(emp_code: str, from_date: str, to_date: str, leave_type: str,
                duration: str, notes: str = '') -> Tuple[Dict, int]:
    """Apply for leave with manager fallback logic"""

    if leave_type not in LEAVE_TYPES:
        return ({"success": False, "message": "Invalid leave type"}, 400)
    
    if duration not in LEAVE_DURATIONS:
        return ({"success": False, "message": "Invalid leave duration"}, 400)

    try:
        start_date = datetime.strptime(from_date, '%d-%m-%Y').date()
        end_date = datetime.strptime(to_date, '%d-%m-%Y').date()
    except ValueError:
        return ({"success": False, "message": "Invalid date format. Use dd-mm-yyyy"}, 400)

    if start_date > end_date:
        return ({"success": False, "message": "Start date must be before end date"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get employee and manager details
        cursor.execute("""
            SELECT e.emp_code, e.emp_full_name, e.emp_email,
                   e.emp_manager, e.emp_informing_manager,
                   m.emp_email AS manager_email, m.emp_full_name AS manager_name,
                   im.emp_email AS informing_email, im.emp_full_name AS informing_name
            FROM employees e
            LEFT JOIN employees m ON e.emp_manager = m.emp_code
            LEFT JOIN employees im ON e.emp_informing_manager = im.emp_code
            WHERE e.emp_code = %s
        """, (emp_code,))

        emp = cursor.fetchone()
        if not emp:
            return ({"success": False, "message": "Employee not found"}, 404)

        # Determine approver (manager or informing manager if manager is on leave)
        approver_code = emp['emp_manager']
        approver_email = emp['manager_email']
        approver_name = emp['manager_name']

        if approver_code and is_employee_on_leave(approver_code):
            logger.info(f"Manager {approver_code} is on leave, using informing manager")
            approver_code = emp['emp_informing_manager']
            approver_email = emp['informing_email']
            approver_name = emp['informing_name']

        if not approver_code:
            return ({"success": False, "message": "No approver available"}, 400)

        # Calculate leave count
        holidays = get_organization_holidays(start_date.year)
        leave_count = calculate_leave_count(start_date, end_date, duration, holidays)

        if leave_count == 0:
            return ({"success": False, "message": "No working days in selected period"}, 400)

        # Check balance
        balance = get_employee_leave_balance(emp_code)
        if 'error' in balance:
            return ({"success": False, "message": balance['error']}, 500)

        if balance[leave_type]['remaining'] < leave_count:
            return ({
                "success": False,
                "message": f"Insufficient {LEAVE_TYPES[leave_type]['name']} balance. " +
                          f"Available: {balance[leave_type]['remaining']}, Required: {leave_count}"
            }, 400)

        # Check for overlapping leaves
        cursor.execute("""
            SELECT * FROM leaves
            WHERE emp_code = %s
            AND status IN ('pending', 'approved')
            AND (
                (from_date <= %s AND to_date >= %s) OR
                (from_date <= %s AND to_date >= %s) OR
                (from_date >= %s AND to_date <= %s)
            )
        """, (emp_code, start_date, start_date, end_date, end_date, start_date, end_date))

        if cursor.fetchone():
            return ({"success": False, "message": "Overlapping leave request exists"}, 400)

        # Insert leave request
        cursor.execute("""
            INSERT INTO leaves (
                emp_code, emp_name, emp_email,
                manager_code, manager_email,
                from_date, to_date, leave_type, duration,
                leave_count, notes, status, applied_at
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending',%s)
            RETURNING id
        """, (
            emp_code, emp['emp_full_name'], emp['emp_email'],
            approver_code, approver_email,
            start_date, end_date, leave_type, duration,
            leave_count, notes, datetime.now()
        ))

        leave_id = cursor.fetchone()['id']
        conn.commit()

        return ({
            "success": True,
            "message": "Leave request submitted successfully",
            "data": {
                "leave_id": leave_id,
                "leave_count": leave_count,
                "remaining_balance": balance[leave_type]['remaining'] - leave_count,
                "approver": approver_name,
                "approver_email": approver_email,
                "status": "pending"
            }
        }, 201)

    except Exception as e:
        conn.rollback()
        logger.error(f"Apply leave error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# APPROVE/REJECT LEAVE
# =========================

def approve_leave(leave_id: int, manager_code: str, action: str, remarks: str = '') -> Tuple[Dict, int]:
    """Approve or reject leave request"""
    
    if action not in ['approved', 'rejected']:
        return ({"success": False, "message": "Invalid action"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM leaves WHERE id = %s AND manager_code = %s
        """, (leave_id, manager_code))
        
        leave = cursor.fetchone()
        if not leave:
            return ({"success": False, "message": "Leave request not found or unauthorized"}, 404)
        
        if leave['status'] != 'pending':
            return ({"success": False, "message": f"Leave already {leave['status']}"}, 400)
        
        cursor.execute("""
            UPDATE leaves
            SET status = %s, reviewed_by = %s, reviewed_at = %s, remarks = %s
            WHERE id = %s
        """, (action, manager_code, datetime.now(), remarks, leave_id))
        
        conn.commit()
        
        return ({
            "success": True,
            "message": f"Leave request {action}",
            "data": {
                "leave_id": leave_id,
                "status": action,
                "employee": leave['emp_name']
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Approve leave error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET LEAVES
# =========================

def get_my_leaves(emp_code: str, status: str = None, limit: int = 50) -> Tuple[Dict, int]:
    """Get employee's leave requests"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM leaves WHERE emp_code = %s"
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY applied_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        leaves = cursor.fetchall()
        
        for leave in leaves:
            for key, value in leave.items():
                if isinstance(value, (datetime, date)):
                    leave[key] = value.strftime('%d-%m-%Y' if isinstance(value, date) else '%Y-%m-%d %H:%M:%S')
        
        balance = get_employee_leave_balance(emp_code)
        
        return ({
            "success": True,
            "data": {
                "leaves": leaves,
                "balance": balance,
                "count": len(leaves)
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def get_team_leaves(manager_code: str, status: str = None, limit: int = 50) -> Tuple[Dict, int]:
    """Get leave requests for manager's team"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM leaves WHERE manager_code = %s"
        params = [manager_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY applied_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        leaves = cursor.fetchall()
        
        for leave in leaves:
            for key, value in leave.items():
                if isinstance(value, (datetime, date)):
                    leave[key] = value.strftime('%d-%m-%Y' if isinstance(value, date) else '%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "leaves": leaves,
                "count": len(leaves)
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def cancel_leave(leave_id: int, emp_code: str) -> Tuple[Dict, int]:
    """Cancel pending leave request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM leaves
            WHERE id = %s AND emp_code = %s AND status = 'pending'
        """, (leave_id, emp_code))
        
        leave = cursor.fetchone()
        if not leave:
            return ({"success": False, "message": "Leave not found or cannot be cancelled"}, 404)
        
        cursor.execute("""
            UPDATE leaves SET status = 'cancelled', updated_at = %s
            WHERE id = %s
        """, (datetime.now(), leave_id))
        
        conn.commit()
        
        return ({"success": True, "message": "Leave request cancelled"}, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Cancel leave error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_leave_summary(emp_code: str, year: int = None) -> Tuple[Dict, int]:
    """Get detailed leave summary with auto-deductions"""
    if not year:
        year = datetime.now().year
    
    balance = get_employee_leave_balance(emp_code)
    current_month = datetime.now().month
    deductions = calculate_auto_deductions(emp_code, current_month, year)
    
    return ({
        "success": True,
        "data": {
            "year": year,
            "balance": balance,
            "auto_deductions": deductions
        }
    }, 200)