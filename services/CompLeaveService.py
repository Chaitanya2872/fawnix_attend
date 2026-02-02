"""
Comp-off Service - Complete Implementation
Business Logic Implementation as per requirements
"""

from datetime import datetime, timedelta, date
from database.connection import get_db_connection
from typing import Tuple, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# =========================
# CONFIGURATION
# =========================

COMPOFF_THRESHOLD_HALF_DAY = 3.0  # > 3 hours = 0.5 day comp-off
COMPOFF_THRESHOLD_FULL_DAY = 6.0  # > 6 hours = 1 day comp-off
COMPOFF_RECORDING_WINDOW_DAYS = 30  # Must record within 30 days
COMPOFF_EXPIRY_DAYS = 90  # Comp-offs expire after 90 days
COMPOFF_CMD_APPROVAL_THRESHOLD = 3  # > 3 comp-offs in month needs CMD approval


# =========================
# HELPER: Check if date is working day
# =========================

def is_working_day(check_date: date, emp_code: str) -> bool:
    """
    Check if date is a working day
    Excludes:
    - Sundays
    - 2nd and 4th Saturdays
    - Organization holidays
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if Sunday
        if check_date.weekday() == 6:  # Sunday
            return False
        
        # Check if 2nd or 4th Saturday
        if check_date.weekday() == 5:  # Saturday
            week_of_month = (check_date.day - 1) // 7 + 1
            if week_of_month in [2, 4]:
                return False
        
        # Check organization holidays
        cursor.execute("""
            SELECT 1 FROM organization_holidays
            WHERE holiday_date = %s
            LIMIT 1
        """, (check_date,))
        
        if cursor.fetchone():
            return False
        
        return True
        
    finally:
        cursor.close()
        conn.close()


# =========================
# HELPER: Count clock-ins on a date
# =========================

def count_clock_ins_on_date(emp_email: str, work_date: date) -> int:
    """
    Count number of clock-ins (attendance sessions) on a specific date
    
    Business Rule: Comp-off starts from SECOND clock-in in a day
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM attendance
            WHERE employee_email = %s 
              AND date = %s
        """, (emp_email, work_date))
        
        result = cursor.fetchone()
        return result['count'] if result else 0
        
    finally:
        cursor.close()
        conn.close()


# =========================
# HELPER: Get shift hours
# =========================

def get_shift_hours(emp_code: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get employee's shift start and end times in hours
    Returns: (shift_start_hours, shift_end_hours) or (None, None)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT
    s.shift_start_time,
    s.shift_end_time
FROM employees e
JOIN shifts s ON e.emp_shift_id = s.shift_id
WHERE e.emp_code = %s;
        """, (emp_code,))
        
        result = cursor.fetchone()
        if not result:
            return None, None
        
        # Use employee's custom shift times, fallback to default shift
        start_time = result['shift_start_time'] or result.get('default_shift_start')
        end_time = result['shift_end_time'] or result.get('default_shift_end')
        
        if not start_time or not end_time:
            return None, None
        
        # Convert time to hours (e.g., "09:00:00" -> 9.0)
        if isinstance(start_time, str):
            start_hours = float(start_time.split(':')[0]) + float(start_time.split(':')[1]) / 60
        else:
            start_hours = start_time.hour + start_time.minute / 60
        
        if isinstance(end_time, str):
            end_hours = float(end_time.split(':')[0]) + float(end_time.split(':')[1]) / 60
        else:
            end_hours = end_time.hour + end_time.minute / 60
        
        return start_hours, end_hours
        
    finally:
        cursor.close()
        conn.close()


# =========================
# CORE: Calculate and Record Overtime/Comp-off
# =========================

def calculate_and_record_compoff(attendance_id: int, emp_code: str, 
                                emp_email: str, emp_name: str,
                                work_date: date, working_hours: float) -> Optional[Dict]:
    """
    Calculate comp-off eligibility and create record
    
    Business Rules:
    1. WORKING DAYS: Comp-off from SECOND clock-in onwards
    2. NON-WORKING DAYS (weekends/holidays): Comp-off from FIRST clock-in
    3. > 3 hours = 0.5 day comp-off
    4. > 6 hours = 1 day comp-off
    5. Must be recorded within 30 days
    6. Expires after 90 days
    
    Called automatically during clock-out
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # ✅ RULE 1 & 2: Check eligibility based on day type
        is_working = is_working_day(work_date, emp_code)
        clock_in_count = count_clock_ins_on_date(emp_email, work_date)
        
        if is_working:
            # Working day: Need SECOND clock-in for comp-off
            if clock_in_count < 2:
                logger.info(f"No comp-off: First clock-in on working day for {emp_email}")
                return None
            logger.info(f"✅ Working day - Second clock-in detected, checking comp-off eligibility")
        else:
            # Non-working day (weekend/holiday): FIRST clock-in itself eligible
            logger.info(f"✅ Non-working day ({work_date.strftime('%A')}) - First clock-in eligible for comp-off")
        
        # ✅ Fetch existing overtime records for this employee
        cursor.execute("""
            SELECT id, overtime_id, comp_off_days, status, expires_at
            FROM overtime_records
            WHERE emp_code = %s 
              AND status IN ('eligible', 'approved')
              AND expires_at > NOW()
            ORDER BY work_date DESC
            LIMIT 10
        """, (emp_code,))
        
        existing_records = cursor.fetchall()
        
        if existing_records:
            logger.info(f"📊 Found {len(existing_records)} existing overtime records for {emp_email}")
            for rec in existing_records:
                logger.info(f"   - Overtime ID: {rec['id']}, Comp-off: {rec['comp_off_days']} days, Status: {rec['status']}, Expires: {rec['expires_at']}")
        else:
            logger.info(f"📊 No existing overtime records found for {emp_email}")
        
        # ✅ Get shift hours to calculate standard working hours
        shift_start, shift_end = get_shift_hours(emp_code)
        if shift_start and shift_end:
            standard_hours = shift_end - shift_start
        else:
            standard_hours = 8.0  # Default to 8 hours if shift not configured
        
        # Calculate extra hours based on day type
        if is_working:
            # Working day: Extra hours = actual - standard
            extra_hours = working_hours - standard_hours
        else:
            # Non-working day: ALL hours count as extra
            extra_hours = working_hours
            standard_hours = 0  # No standard hours on non-working days
        
        # ✅ RULE 3 & 4: Calculate comp-off days based on extra hours
        comp_off_days = 0
        if extra_hours > COMPOFF_THRESHOLD_FULL_DAY:
            comp_off_days = 1.0
            logger.info(f"✅ Full day comp-off: {extra_hours:.2f}h > {COMPOFF_THRESHOLD_FULL_DAY}h")
        elif extra_hours > COMPOFF_THRESHOLD_HALF_DAY:
            comp_off_days = 0.5
            logger.info(f"✅ Half day comp-off: {extra_hours:.2f}h > {COMPOFF_THRESHOLD_HALF_DAY}h")
        else:
            logger.info(f"No comp-off: {extra_hours:.2f}h not enough")
            return None
        
        # ✅ RULE 5: Set recording deadline (30 days)
        recording_deadline = work_date + timedelta(days=COMPOFF_RECORDING_WINDOW_DAYS)
        
        # ✅ RULE 6: Set expiry date (90 days)
        expires_at = work_date + timedelta(days=COMPOFF_EXPIRY_DAYS)
        
        day_of_week = work_date.strftime('%A')
        day_type = 'working' if is_working else 'non_working'
        
        # Insert overtime record
        cursor.execute("""
            INSERT INTO overtime_records (
                emp_code, emp_email, emp_name,
                attendance_id, work_date, day_of_week, day_type,
                standard_hours, actual_hours, extra_hours,
                comp_off_days, status, expires_at, recording_deadline
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, comp_off_days, expires_at
        """, (
            emp_code, emp_email, emp_name,
            attendance_id, work_date, day_of_week, day_type,
            standard_hours, working_hours, extra_hours,
            comp_off_days, 'eligible', expires_at, recording_deadline
        ))
        
        result = cursor.fetchone()
        overtime_id = result['id']
        
        conn.commit()
        
        logger.info(f"✅ Comp-off recorded: {emp_email} ({day_type} day) - {extra_hours:.2f}h → {comp_off_days} days")
        
        return {
            "overtime_id": overtime_id,
            "comp_off_days": comp_off_days,
            "extra_hours": extra_hours,
            "expires_at": expires_at.strftime('%Y-%m-%d'),
            "existing_overtime_records": len(existing_records),
            "eligible_records": [
                {
                    "overtime_id": rec['id'],
                    "comp_off_days": rec['comp_off_days'],
                    "status": rec['status'],
                    "expires_at": rec['expires_at'].strftime('%Y-%m-%d') if isinstance(rec['expires_at'], date) else str(rec['expires_at'])
                }
                for rec in existing_records
            ] if existing_records else []
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error recording comp-off: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
    finally:
        cursor.close()
        conn.close()


# =========================
# TRIGGER: Auto-calculate Comp-off on API Call
# =========================

def trigger_compoff_calculation(emp_code: str) -> Tuple[Dict, int]:
    """
    Manually trigger comp-off calculation for an employee
    Called automatically when overtime records API is accessed
    
    This function:
    1. Finds all attendance records without overtime records
    2. Calculates comp-off days based on extra hours
    3. Creates overtime_records entries
    4. Marks them as eligible for comp-off request
    
    Returns: Success status and number of records updated
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Step 1: Find all attendance records for this employee that logged out but have no overtime record
        cursor.execute("""
            SELECT 
                a.id as attendance_id,
                a.employee_code,
                a.employee_email,
                a.employee_name,
                a.date as work_date,
                EXTRACT(DOW FROM a.date) as day_of_week,
                EXTRACT(ISODOW FROM a.date) as iso_day,
                a.checkin_time,
                a.checkout_time,
                EXTRACT(EPOCH FROM (a.checkout_time - a.checkin_time)) / 3600.0 as actual_hours
            FROM attendance a
            WHERE a.employee_code = %s
              AND a.checkout_time IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM overtime_records 
                  WHERE attendance_id = a.id
              )
            ORDER BY a.date DESC
            LIMIT 100
        """, (emp_code,))
        
        attendance_records = cursor.fetchall()
        records_created = 0
        records_updated = 0
        
        for att_rec in attendance_records:
            work_date = att_rec['work_date']
            actual_hours = att_rec['actual_hours'] or 0
            
            # Step 2: Check if it's a working day
            is_working = is_working_day(work_date, emp_code)
            
            # Step 3: Get standard shift hours for this employee
            shift_info = get_shift_hours(emp_code)
            standard_hours = shift_info[0] or 8.0
            
            # Calculate extra hours
            extra_hours = max(0, actual_hours - standard_hours)
            
            # Step 4: Calculate comp-off days based on extra hours
            if extra_hours >= COMPOFF_THRESHOLD_FULL_DAY:  # >= 6 hours
                comp_off_days = 1.0
            elif extra_hours >= COMPOFF_THRESHOLD_HALF_DAY:  # >= 3 hours
                comp_off_days = 0.5
            else:
                comp_off_days = 0.0
            
            # Step 5: Only create overtime record if on a working day with extra hours
            if is_working and comp_off_days > 0:
                expires_at = work_date + timedelta(days=COMPOFF_EXPIRY_DAYS)
                recording_deadline = work_date + timedelta(days=COMPOFF_RECORDING_WINDOW_DAYS)
                
                # Check if overtime record already exists
                cursor.execute("""
                    SELECT id FROM overtime_records 
                    WHERE attendance_id = %s
                    LIMIT 1
                """, (att_rec['attendance_id'],))
                
                if not cursor.fetchone():
                    # Create new overtime record
                    cursor.execute("""
                        INSERT INTO overtime_records (
                            emp_code, emp_email, emp_name,
                            attendance_id, work_date, day_of_week,
                            standard_hours, actual_hours, extra_hours,
                            comp_off_days, status,
                            expires_at, recording_deadline,
                            created_at, updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (
                        att_rec['employee_code'],
                        att_rec['employee_email'],
                        att_rec['employee_name'],
                        att_rec['attendance_id'],
                        work_date,
                        att_rec['day_of_week'],
                        standard_hours,
                        actual_hours,
                        extra_hours,
                        comp_off_days,
                        'eligible',
                        expires_at,
                        recording_deadline
                    ))
                    records_created += 1
        
        conn.commit()
        
        return ({
            "success": True,
            "message": f"Comp-off trigger executed successfully",
            "data": {
                "employee_code": emp_code,
                "records_created": records_created,
                "records_processed": len(attendance_records)
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error triggering comp-off calculation for {emp_code}: {e}")
        return ({
            "success": False,
            "message": f"Error during comp-off trigger: {str(e)}"
        }, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET: Overtime Records
# =========================

def get_employee_overtime_records(emp_code: str, status: str = None, 
                                 limit: int = 50) -> Tuple[Dict, int]:
    """
    Get employee's overtime/comp-off records
    
    Status options: 'eligible', 'requested', 'approved', 'rejected', 'expired', 'utilized'
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update expired records first
        today = date.today()
        cursor.execute("""
            UPDATE overtime_records
            SET status = 'expired'
            WHERE emp_code = %s 
              AND status = 'eligible'
              AND expires_at < %s
        """, (emp_code, today))
        conn.commit()
        
        # Fetch records
        query = """
            SELECT 
                id, emp_code, work_date, day_of_week,
                standard_hours, actual_hours, extra_hours,
                comp_off_days, status,
                expires_at, recording_deadline,
                TO_CHAR(work_date, 'DD-MM-YYYY') as formatted_date,
                TO_CHAR(work_date, 'Day') as day_name,
                CASE 
                    WHEN status = 'eligible' AND expires_at < CURRENT_DATE THEN true
                    ELSE false
                END as is_expired,
                CASE
                    WHEN status = 'eligible' AND recording_deadline < CURRENT_DATE THEN true
                    ELSE false
                END as recording_overdue
            FROM overtime_records
            WHERE emp_code = %s
        """
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY work_date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        records = cursor.fetchall()
        
        # Convert to list of dicts
        records_list = []
        for rec in records:
            record_dict = dict(rec)
            
            # Format dates
            for key, value in record_dict.items():
                if isinstance(value, (datetime, date)):
                    record_dict[key] = value.strftime('%Y-%m-%d')
                elif isinstance(value, float):
                    record_dict[key] = round(value, 2)
            
            records_list.append(record_dict)
        
        # Calculate summary
        eligible_records = [r for r in records_list if r.get('status') == 'eligible']
        total_eligible_comp_days = sum(r.get('comp_off_days', 0) for r in eligible_records)
        total_extra_hours = sum(r.get('extra_hours', 0) for r in eligible_records)
        
        return ({
            "success": True,
            "data": {
                "records": records_list,
                "summary": {
                    "total_records": len(records_list),
                    "eligible_records": len(eligible_records),
                    "total_eligible_comp_days": round(total_eligible_comp_days, 2),
                    "total_extra_hours": round(total_extra_hours, 2)
                }
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"Error fetching overtime records: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# REQUEST: Comp-off
# =========================

def request_compoff(emp_code: str, overtime_record_ids: List[int],
                   reason: str = '', notes: str = '') -> Tuple[Dict, int]:
    """
    Submit comp-off request
    
    Business Rules:
    1. All records must be 'eligible'
    2. Records must not be expired
    3. Records must be within 30-day recording window
    4. If > 3 comp-offs in current month, requires CMD approval
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if not overtime_record_ids:
            return ({"success": False, "message": "No overtime records selected"}, 400)
        
        # ✅ Fetch employee info
        cursor.execute("""
            SELECT emp_email, emp_full_name, emp_manager
            FROM employees WHERE emp_code = %s
        """, (emp_code,))
        
        emp = cursor.fetchone()
        if not emp:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        emp_email = emp['emp_email']
        emp_name = emp['emp_full_name']
        manager_code = emp['emp_manager_code']
        
        # Fetch manager email
        manager_email = None
        if manager_code:
            cursor.execute("SELECT emp_email FROM employees WHERE emp_code = %s", (manager_code,))
            mgr = cursor.fetchone()
            manager_email = mgr['emp_email'] if mgr else None
        
        # ✅ Validate overtime records
        cursor.execute("""
            SELECT 
                id, work_date, extra_hours, comp_off_days, status, 
                expires_at, recording_deadline
            FROM overtime_records
            WHERE id = ANY(%s) AND emp_code = %s
        """, (overtime_record_ids, emp_code))
        
        records = cursor.fetchall()
        
        if len(records) != len(overtime_record_ids):
            return ({"success": False, "message": "Some overtime records not found or don't belong to you"}, 404)
        
        # ✅ Validate eligibility
        today = date.today()
        total_comp_days = 0
        work_dates = []
        invalid_records = []
        
        for rec in records:
            work_date = rec['work_date']
            
            # Check if eligible status
            if rec['status'] != 'eligible':
                invalid_records.append(f"Record {rec['id']}: status is {rec['status']}")
                continue
            
            # ✅ Check if expired
            if rec['expires_at'] < today:
                invalid_records.append(f"Record {rec['id']}: expired on {rec['expires_at']}")
                continue
            
            # ✅ Check if within recording window (30 days)
            if rec['recording_deadline'] < today:
                invalid_records.append(f"Record {rec['id']}: recording window expired on {rec['recording_deadline']}")
                continue
            
            total_comp_days += rec['comp_off_days']
            work_dates.append(work_date.strftime('%Y-%m-%d'))
        
        if invalid_records:
            return ({
                "success": False,
                "message": "Some records are not eligible",
                "errors": invalid_records
            }, 400)
        
        # ✅ Check if CMD approval required (> 3 comp-offs in current month)
        current_month_start = date.today().replace(day=1)
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM compoff_requests
            WHERE emp_code = %s
              AND requested_at >= %s
              AND status NOT IN ('rejected', 'cancelled')
        """, (emp_code, current_month_start))
        
        result = cursor.fetchone()
        requests_this_month = result['count'] if result else 0
        
        requires_cmd_approval = requests_this_month >= COMPOFF_CMD_APPROVAL_THRESHOLD
        approval_level = 'cmd' if requires_cmd_approval else 'manager'
        
        # Calculate total extra hours
        total_extra_hours = sum(r['extra_hours'] for r in records)
        
        # ✅ Create comp-off request
        cursor.execute("""
            INSERT INTO compoff_requests (
                emp_code, emp_email, emp_name,
                manager_code, manager_email,
                overtime_record_ids, total_extra_hours, total_comp_days,
                work_dates, reason, notes,
                status, approval_level, requested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_code, emp_email, emp_name,
            manager_code, manager_email,
            overtime_record_ids, total_extra_hours, total_comp_days,
            work_dates, reason, notes,
            'pending', approval_level, datetime.now()
        ))
        
        result = cursor.fetchone()
        request_id = result['id']
        
        # ✅ Update overtime records status
        cursor.execute("""
            UPDATE overtime_records
            SET status = 'requested'
            WHERE id = ANY(%s)
        """, (overtime_record_ids,))
        
        conn.commit()
        
        logger.info(f"✅ Comp-off request created: ID={request_id}, Employee={emp_email}, Days={total_comp_days}")
        
        return ({
            "success": True,
            "message": "Comp-off request submitted successfully",
            "data": {
                "request_id": request_id,
                "total_comp_days": round(total_comp_days, 2),
                "total_extra_hours": round(total_extra_hours, 2),
                "selected_dates": work_dates,
                "approval_level": approval_level,
                "requires_cmd_approval": requires_cmd_approval,
                "status": "pending"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error creating comp-off request: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET: Comp-off Requests
# =========================

def get_my_compoff_requests(emp_code: str, status: str = None, 
                           limit: int = 50) -> Tuple[Dict, int]:
    """Get employee's comp-off requests"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                id, emp_code, manager_code,
                total_extra_hours, total_comp_days,
                work_dates, reason, notes,
                status, approval_level,
                reviewed_by, reviewed_at, reviewer_remarks,
                utilized_on, utilized_at,
                requested_at, updated_at
            FROM compoff_requests
            WHERE emp_code = %s
        """
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY requested_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Convert to list
        requests_list = []
        for req in requests:
            req_dict = dict(req)
            
            # Format dates
            for key, value in req_dict.items():
                if isinstance(value, (datetime, date)):
                    req_dict[key] = value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime) else value.strftime('%Y-%m-%d')
                elif isinstance(value, float):
                    req_dict[key] = round(value, 2)
            
            requests_list.append(req_dict)
        
        return ({
            "success": True,
            "data": {
                "requests": requests_list,
                "count": len(requests_list)
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"Error fetching comp-off requests: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# APPROVE/REJECT: Comp-off Request
# =========================

def approve_compoff_request(request_id: int, approver_code: str,
                           action: str, remarks: str = '') -> Tuple[Dict, int]:
    """
    Approve or reject comp-off request
    
    Business Rules:
    - Manager can approve if approval_level = 'manager'
    - CMD approval required if approval_level = 'cmd'
    """
    if action not in ['approved', 'rejected']:
        return ({"success": False, "message": "Invalid action. Use 'approved' or 'rejected'"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Fetch request
        cursor.execute("""
            SELECT * FROM compoff_requests WHERE id = %s
        """, (request_id,))
        
        request = cursor.fetchone()
        if not request:
            return ({"success": False, "message": "Comp-off request not found"}, 404)
        
        # Check authorization
        cursor.execute("""
            SELECT role FROM employees WHERE emp_code = %s
        """, (approver_code,))
        
        approver = cursor.fetchone()
        if not approver:
            return ({"success": False, "message": "Approver not found"}, 404)
        
        approval_level = request['approval_level']
        approver_role = approver['role']
        
        # ✅ Validate approval authority
        if approval_level == 'cmd' and approver_role not in ['CMD', 'HR', 'Admin']:
            return ({
                "success": False,
                "message": "This request requires CMD approval"
            }, 403)
        
        if approval_level == 'manager' and request['manager_code'] != approver_code:
            # Allow HR/CMD to approve manager-level requests too
            if approver_role not in ['CMD', 'HR', 'Admin']:
                return ({
                    "success": False,
                    "message": "Unauthorized to approve this request"
                }, 403)
        
        # Check if already processed
        if request['status'] != 'pending':
            return ({
                "success": False,
                "message": f"Request already {request['status']}"
            }, 400)
        
        # Update request
        cursor.execute("""
            UPDATE compoff_requests
            SET 
                status = %s,
                reviewed_by = %s,
                reviewed_at = %s,
                reviewer_remarks = %s
            WHERE id = %s
        """, (action, approver_code, datetime.now(), remarks, request_id))
        
        # Update overtime records status
        new_overtime_status = 'approved' if action == 'approved' else 'rejected'
        cursor.execute("""
            UPDATE overtime_records
            SET status = %s
            WHERE id = ANY(%s)
        """, (new_overtime_status, request['overtime_record_ids']))
        
        conn.commit()
        
        logger.info(f"✅ Comp-off request {action}: ID={request_id}, Approver={approver_code}")
        
        return ({
            "success": True,
            "message": f"Comp-off request {action} successfully",
            "data": {
                "request_id": request_id,
                "status": action,
                "comp_days": request['total_comp_days']
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error processing comp-off approval: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# CANCEL: Comp-off Request
# =========================

def cancel_compoff_request(request_id: int, emp_code: str) -> Tuple[Dict, int]:
    """Cancel pending comp-off request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM compoff_requests
            WHERE id = %s AND emp_code = %s AND status = 'pending'
        """, (request_id, emp_code))
        
        request = cursor.fetchone()
        if not request:
            return ({
                "success": False,
                "message": "Request not found or cannot be cancelled"
            }, 404)
        
        # Update request status
        cursor.execute("""
            UPDATE compoff_requests
            SET status = 'cancelled', updated_at = %s
            WHERE id = %s
        """, (datetime.now(), request_id))
        
        # Reset overtime records back to eligible
        cursor.execute("""
            UPDATE overtime_records
            SET status = 'eligible'
            WHERE id = ANY(%s)
        """, (request['overtime_record_ids'],))
        
        conn.commit()
        
        return ({
            "success": True,
            "message": "Comp-off request cancelled successfully"
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error cancelling comp-off request: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET: Comp-off Balance
# =========================

def get_compoff_balance(emp_code: str) -> Tuple[Dict, int]:
    """
    Get employee's comp-off balance
    Shows approved comp-offs available for utilization
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get approved comp-offs
        cursor.execute("""
            SELECT 
                SUM(total_comp_days) as total_approved_days
            FROM compoff_requests
            WHERE emp_code = %s
              AND status = 'approved'
              AND status != 'utilized'
        """, (emp_code,))
        
        result = cursor.fetchone()
        approved_days = float(result['total_approved_days'] or 0)
        
        # Get eligible (not yet requested)
        cursor.execute("""
            SELECT 
                SUM(comp_off_days) as total_eligible_days,
                COUNT(*) as eligible_count
            FROM overtime_records
            WHERE emp_code = %s
              AND status = 'eligible'
              AND expires_at >= CURRENT_DATE
        """, (emp_code,))
        
        result = cursor.fetchone()
        eligible_days = float(result['total_eligible_days'] or 0)
        eligible_count = int(result['eligible_count'] or 0)
        
        # Get pending requests
        cursor.execute("""
            SELECT 
                SUM(total_comp_days) as total_pending_days
            FROM compoff_requests
            WHERE emp_code = %s
              AND status = 'pending'
        """, (emp_code,))
        
        result = cursor.fetchone()
        pending_days = float(result['total_pending_days'] or 0)
        
        return ({
            "success": True,
            "data": {
                "approved_balance": round(approved_days, 2),
                "eligible_not_requested": round(eligible_days, 2),
                "eligible_records_count": eligible_count,
                "pending_approval": round(pending_days, 2),
                "total_potential": round(approved_days + eligible_days, 2)
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"Error fetching comp-off balance: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()
        
        




# =========================
# GET: Team Comp-off Requests (Manager View)
# =========================

def get_team_compoff_requests(manager_code: str, status: Optional[str] = None, 
                              limit: int = 50) -> Tuple[Dict, int]:
    """
    Get comp-off requests for manager's team members
    
    Authorization: Manager, HR, CMD, Admin
    
    Args:
        manager_code: Manager's employee code
        status: Filter by status (pending, approved, rejected, cancelled)
        limit: Maximum number of records
    
    Returns:
        List of team comp-off requests with employee details
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get manager's role to determine access level
        cursor.execute("""
            SELECT role FROM employees WHERE emp_code = %s
        """, (manager_code,))
        
        manager = cursor.fetchone()
        if not manager:
            return ({"success": False, "message": "Manager not found"}, 404)
        
        manager_role = manager['role']
        
        # Build query based on role
        if manager_role in ['CMD', 'HR', 'Admin']:
            # CMD/HR/Admin can see all requests
            where_clause = "WHERE 1=1"
            params = []
        else:
            # Regular manager can only see their team's requests
            where_clause = "WHERE cr.manager_code = %s"
            params = [manager_code]
        
        # Add status filter if provided
        if status:
            where_clause += " AND cr.status = %s"
            params.append(status)
        
        # Fetch requests
        query = f"""
            SELECT 
                cr.id,
                cr.emp_code,
                cr.emp_name,
                cr.emp_email,
                cr.overtime_record_ids,
                cr.total_comp_days,
                cr.total_extra_hours,
                cr.reason,
                cr.notes,
                cr.approval_level,
                cr.status,
                cr.requested_at,
                cr.reviewed_by,
                cr.reviewed_at,
                cr.reviewer_remarks,
                cr.manager_code,
                m.emp_full_name as manager_name,
                -- Count records by date to show details
                (
                    SELECT json_agg(json_build_object(
                        'work_date', work_date,
                        'day_of_week', day_of_week,
                        'day_type', day_type,
                        'extra_hours', extra_hours,
                        'comp_off_days', comp_off_days
                    ) ORDER BY work_date)
                    FROM overtime_records
                    WHERE id = ANY(cr.overtime_record_ids)
                ) as overtime_details
            FROM compoff_requests cr
            LEFT JOIN employees m ON cr.manager_code = m.emp_code
            {where_clause}
            ORDER BY 
                CASE 
                    WHEN cr.status = 'pending' THEN 1
                    WHEN cr.status = 'approved' THEN 2
                    WHEN cr.status = 'rejected' THEN 3
                    ELSE 4
                END,
                cr.requested_at DESC
            LIMIT %s
        """
        
        params.append(limit)
        cursor.execute(query, params)
        
        requests = cursor.fetchall()
        
        # Format dates
        for req in requests:
            if req.get('requested_at'):
                req['requested_at'] = req['requested_at'].strftime('%Y-%m-%d %H:%M:%S')
            if req.get('reviewed_at'):
                req['reviewed_at'] = req['reviewed_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Get summary counts
        summary_query = f"""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                SUM(total_comp_days) FILTER (WHERE status = 'pending') as pending_days,
                COUNT(*) FILTER (WHERE approval_level = 'cmd' AND status = 'pending') as cmd_approval_needed
            FROM compoff_requests cr
            {where_clause}
        """
        
        cursor.execute(summary_query, params[:-1])  # Exclude limit param
        summary = cursor.fetchone()
        
        return ({
            "success": True,
            "data": {
                "requests": requests,
                "count": len(requests),
                "summary": {
                    "pending_count": int(summary['pending_count'] or 0),
                    "approved_count": int(summary['approved_count'] or 0),
                    "rejected_count": int(summary['rejected_count'] or 0),
                    "pending_days": float(summary['pending_days'] or 0),
                    "cmd_approval_needed": int(summary['cmd_approval_needed'] or 0)
                },
                "manager_info": {
                    "emp_code": manager_code,
                    "role": manager_role,
                    "access_level": "full" if manager_role in ['CMD', 'HR', 'Admin'] else "team"
                }
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Error fetching team comp-off requests: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# GET: Comp-off Statistics
# =========================

def get_compoff_statistics(emp_code: str, year: Optional[int] = None, 
                           month: Optional[int] = None) -> Tuple[Dict, int]:
    """
    Get comprehensive comp-off statistics for employee
    
    Args:
        emp_code: Employee code
        year: Filter by year (optional, defaults to current year)
        month: Filter by month (optional, 1-12)
    
    Returns:
        Statistics including:
        - Monthly breakdown
        - Year-to-date summary
        - Utilization rate
        - Trend analysis
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Default to current year if not specified
        if not year:
            year = datetime.now().year
        
        # =========================
        # 1. MONTHLY BREAKDOWN
        # =========================
        
        if month:
            # Specific month statistics
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, month + 1, 1)
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    SUM(comp_off_days) as total_comp_days,
                    SUM(extra_hours) as total_extra_hours,
                    COUNT(*) FILTER (WHERE status = 'eligible') as eligible_count,
                    COUNT(*) FILTER (WHERE status = 'requested') as requested_count,
                    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                    SUM(comp_off_days) FILTER (WHERE status = 'eligible') as eligible_days,
                    SUM(comp_off_days) FILTER (WHERE status = 'approved') as approved_days
                FROM overtime_records
                WHERE emp_code = %s
                  AND work_date >= %s
                  AND work_date < %s
            """, (emp_code, month_start, month_end))
            
            monthly_data = cursor.fetchone()
            
        else:
            # All months in the year
            cursor.execute("""
                SELECT 
                    EXTRACT(MONTH FROM work_date) as month,
                    COUNT(*) as total_records,
                    SUM(comp_off_days) as total_comp_days,
                    SUM(extra_hours) as total_extra_hours,
                    COUNT(*) FILTER (WHERE status = 'eligible') as eligible_count,
                    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                    SUM(comp_off_days) FILTER (WHERE status = 'eligible') as eligible_days,
                    SUM(comp_off_days) FILTER (WHERE status = 'approved') as approved_days
                FROM overtime_records
                WHERE emp_code = %s
                  AND EXTRACT(YEAR FROM work_date) = %s
                GROUP BY EXTRACT(MONTH FROM work_date)
                ORDER BY month
            """, (emp_code, year))
            
            monthly_breakdown = cursor.fetchall()
            
            # Format monthly data
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            monthly_data = []
            for row in monthly_breakdown:
                monthly_data.append({
                    'month': int(row['month']),
                    'month_name': month_names[int(row['month']) - 1],
                    'total_records': int(row['total_records'] or 0),
                    'total_comp_days': float(row['total_comp_days'] or 0),
                    'total_extra_hours': float(row['total_extra_hours'] or 0),
                    'eligible_count': int(row['eligible_count'] or 0),
                    'approved_count': int(row['approved_count'] or 0),
                    'eligible_days': float(row['eligible_days'] or 0),
                    'approved_days': float(row['approved_days'] or 0)
                })
        
        # =========================
        # 2. YEAR-TO-DATE SUMMARY
        # =========================
        
        year_start = date(year, 1, 1)
        year_end = date(year + 1, 1, 1)
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_overtime_records,
                SUM(extra_hours) as total_extra_hours,
                SUM(comp_off_days) as total_comp_days_earned,
                COUNT(*) FILTER (WHERE day_type = 'working') as working_day_count,
                COUNT(*) FILTER (WHERE day_type = 'non_working') as non_working_day_count,
                COUNT(*) FILTER (WHERE status = 'eligible') as eligible_records,
                COUNT(*) FILTER (WHERE status = 'requested') as requested_records,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_records,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_records,
                COUNT(*) FILTER (WHERE status = 'expired') as expired_records,
                SUM(comp_off_days) FILTER (WHERE status = 'eligible') as eligible_days,
                SUM(comp_off_days) FILTER (WHERE status = 'approved') as approved_days,
                SUM(comp_off_days) FILTER (WHERE status = 'expired') as expired_days
            FROM overtime_records
            WHERE emp_code = %s
              AND work_date >= %s
              AND work_date < %s
        """, (emp_code, year_start, year_end))
        
        ytd_summary = cursor.fetchone()
        
        # =========================
        # 3. COMP-OFF REQUESTS STATS
        # =========================
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_requests,
                SUM(total_comp_days) as total_days_requested,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
                SUM(total_comp_days) FILTER (WHERE status = 'approved') as approved_days,
                SUM(total_comp_days) FILTER (WHERE status = 'rejected') as rejected_days,
                AVG(total_comp_days) FILTER (WHERE status = 'approved') as avg_approved_days
            FROM compoff_requests
            WHERE emp_code = %s
              AND requested_at >= %s
              AND requested_at < %s
        """, (emp_code, year_start, year_end))
        
        request_stats = cursor.fetchone()
        
        # =========================
        # 4. UTILIZATION RATE
        # =========================
        
        total_earned = float(ytd_summary['total_comp_days_earned'] or 0)
        total_approved = float(request_stats['approved_days'] or 0)
        total_expired = float(ytd_summary['expired_days'] or 0)
        
        if total_earned > 0:
            utilization_rate = (total_approved / total_earned) * 100
            expiry_rate = (total_expired / total_earned) * 100
        else:
            utilization_rate = 0
            expiry_rate = 0
        
        # =========================
        # 5. CURRENT BALANCE
        # =========================
        
        cursor.execute("""
            SELECT 
                SUM(total_comp_days) as approved_balance
            FROM compoff_requests
            WHERE emp_code = %s
              AND status = 'approved'
              AND status != 'utilized'
        """, (emp_code,))
        
        balance = cursor.fetchone()
        current_balance = float(balance['approved_balance'] or 0)
        
        # =========================
        # 6. TOP OVERTIME DATES
        # =========================
        
        cursor.execute("""
            SELECT 
                work_date,
                day_of_week,
                day_type,
                extra_hours,
                comp_off_days,
                status
            FROM overtime_records
            WHERE emp_code = %s
              AND work_date >= %s
              AND work_date < %s
            ORDER BY extra_hours DESC
            LIMIT 10
        """, (emp_code, year_start, year_end))
        
        top_overtime = cursor.fetchall()
        
        # Format top overtime dates
        for record in top_overtime:
            record['work_date'] = record['work_date'].strftime('%Y-%m-%d')
        
        # =========================
        # BUILD RESPONSE
        # =========================
        
        response = {
            "success": True,
            "data": {
                "year": year,
                "month": month,
                "year_to_date": {
                    "total_overtime_records": int(ytd_summary['total_overtime_records'] or 0),
                    "total_extra_hours": float(ytd_summary['total_extra_hours'] or 0),
                    "total_comp_days_earned": float(ytd_summary['total_comp_days_earned'] or 0),
                    "working_day_overtime": int(ytd_summary['working_day_count'] or 0),
                    "non_working_day_overtime": int(ytd_summary['non_working_day_count'] or 0),
                    "status_breakdown": {
                        "eligible": int(ytd_summary['eligible_records'] or 0),
                        "requested": int(ytd_summary['requested_records'] or 0),
                        "approved": int(ytd_summary['approved_records'] or 0),
                        "rejected": int(ytd_summary['rejected_records'] or 0),
                        "expired": int(ytd_summary['expired_records'] or 0)
                    },
                    "days_by_status": {
                        "eligible_days": float(ytd_summary['eligible_days'] or 0),
                        "approved_days": float(ytd_summary['approved_days'] or 0),
                        "expired_days": float(ytd_summary['expired_days'] or 0)
                    }
                },
                "requests": {
                    "total_requests": int(request_stats['total_requests'] or 0),
                    "total_days_requested": float(request_stats['total_days_requested'] or 0),
                    "pending": int(request_stats['pending_requests'] or 0),
                    "approved": int(request_stats['approved_requests'] or 0),
                    "rejected": int(request_stats['rejected_requests'] or 0),
                    "cancelled": int(request_stats['cancelled_requests'] or 0),
                    "approved_days": float(request_stats['approved_days'] or 0),
                    "rejected_days": float(request_stats['rejected_days'] or 0),
                    "avg_approved_days": float(request_stats['avg_approved_days'] or 0)
                },
                "utilization": {
                    "total_earned": round(total_earned, 2),
                    "total_utilized": round(total_approved, 2),
                    "total_expired": round(total_expired, 2),
                    "utilization_rate": round(utilization_rate, 2),
                    "expiry_rate": round(expiry_rate, 2),
                    "current_balance": round(current_balance, 2)
                },
                "top_overtime_dates": top_overtime
            }
        }
        
        # Add monthly breakdown if requested
        if month:
            response["data"]["month_detail"] = {
                'total_records': int(monthly_data['total_records'] or 0),
                'total_comp_days': float(monthly_data['total_comp_days'] or 0),
                'total_extra_hours': float(monthly_data['total_extra_hours'] or 0),
                'eligible_count': int(monthly_data['eligible_count'] or 0),
                'approved_count': int(monthly_data['approved_count'] or 0),
                'eligible_days': float(monthly_data['eligible_days'] or 0),
                'approved_days': float(monthly_data['approved_days'] or 0)
            }
        else:
            response["data"]["monthly_breakdown"] = monthly_data
        
        return (response, 200)
        
    except Exception as e:
        logger.error(f"❌ Error fetching comp-off statistics: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# =========================
# BONUS: Admin Statistics (Optional)
# =========================

def get_organization_compoff_stats(admin_code: str) -> Tuple[Dict, int]:
    """
    Get organization-wide comp-off statistics (Admin only)
    
    Returns:
    - Total overtime hours across organization
    - Pending approvals count
    - Top employees with overtime
    - Department-wise breakdown
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify admin access
        cursor.execute("""
            SELECT role FROM employees WHERE emp_code = %s
        """, (admin_code,))
        
        admin = cursor.fetchone()
        if not admin or admin['role'] not in ['Admin', 'HR', 'CMD']:
            return ({
                "success": False,
                "message": "Admin access required"
            }, 403)
        
        # Organization-wide stats
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT emp_code) as total_employees_with_overtime,
                COUNT(*) as total_overtime_records,
                SUM(extra_hours) as total_extra_hours,
                SUM(comp_off_days) as total_comp_days,
                COUNT(*) FILTER (WHERE status = 'eligible') as eligible_records,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_records,
                SUM(comp_off_days) FILTER (WHERE status = 'eligible') as eligible_days,
                SUM(comp_off_days) FILTER (WHERE status = 'approved') as approved_days
            FROM overtime_records
            WHERE EXTRACT(YEAR FROM work_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """)
        
        org_stats = cursor.fetchone()
        
        # Pending approvals
        cursor.execute("""
            SELECT COUNT(*) as pending_count
            FROM compoff_requests
            WHERE status = 'pending'
        """)
        
        pending = cursor.fetchone()
        
        # Top employees
        cursor.execute("""
            SELECT 
                emp_code,
                emp_name,
                COUNT(*) as overtime_count,
                SUM(extra_hours) as total_extra_hours,
                SUM(comp_off_days) as total_comp_days
            FROM overtime_records
            WHERE EXTRACT(YEAR FROM work_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY emp_code, emp_name
            ORDER BY total_extra_hours DESC
            LIMIT 10
        """)
        
        top_employees = cursor.fetchall()
        
        return ({
            "success": True,
            "data": {
                "organization_stats": {
                    "total_employees": int(org_stats['total_employees_with_overtime'] or 0),
                    "total_records": int(org_stats['total_overtime_records'] or 0),
                    "total_extra_hours": float(org_stats['total_extra_hours'] or 0),
                    "total_comp_days": float(org_stats['total_comp_days'] or 0),
                    "eligible_days": float(org_stats['eligible_days'] or 0),
                    "approved_days": float(org_stats['approved_days'] or 0)
                },
                "pending_approvals": int(pending['pending_count'] or 0),
                "top_employees": top_employees
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Error fetching organization comp-off stats: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()