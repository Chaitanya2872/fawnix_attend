"""
Enhanced Comp-off Service - Version 2.0
Implements shift-based overtime calculation with multi-level approval

BUSINESS RULES:
1. Working Hours:
   - Monday-Friday: 10:00 AM to 6:30 PM (8.5 hours)
   - 1st, 3rd, 5th Saturdays: 10:00 AM to 1:30 PM (3.5 hours)
   
2. Non-Working Days (All hours count as overtime):
   - Organization Holidays
   - 2nd, 4th Saturdays
   - Sundays
   - Hours outside shift times on working days
   
3. Comp-off Eligibility:
   - > 3 extra hours = 0.5 day comp-off
   - > 6 extra hours = 1 day comp-off
   
4. Approval Levels:
   - <= 3 comp-offs in current month: Manager approval only
   - > 3 comp-offs in current month: Manager → HR/CMD approval
"""

from datetime import datetime, timedelta, date, time
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
COMPOFF_CMD_APPROVAL_THRESHOLD = 3  # > 3 comp-offs in month needs HR/CMD approval

# Standard shift times
WEEKDAY_SHIFT_START = time(10, 0)  # 10:00 AM
WEEKDAY_SHIFT_END = time(18, 30)   # 6:30 PM
SATURDAY_SHIFT_START = time(10, 0)  # 10:00 AM
SATURDAY_SHIFT_END = time(13, 30)   # 1:30 PM


# =========================
# HELPER: Check if date is working day
# =========================

def is_working_day(check_date: date, emp_code: str) -> Tuple[bool, str]:
    """
    Check if date is a working day and return day type
    
    Returns:
        (is_working, day_type)
        day_type: 'weekday', 'working_saturday', 'non_working_saturday', 'sunday', 'holiday'
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if Sunday
        if check_date.weekday() == 6:
            return False, 'sunday'
        
        # Check if Saturday
        if check_date.weekday() == 5:
            week_of_month = (check_date.day - 1) // 7 + 1
            # 1st, 3rd, 5th Saturdays are working days
            if week_of_month in [1, 3, 5]:
                return True, 'working_saturday'
            else:
                # 2nd, 4th Saturdays are non-working
                return False, 'non_working_saturday'
        
        # Check organization holidays
        cursor.execute("""
            SELECT holiday_name FROM organization_holidays
            WHERE holiday_date = %s
            LIMIT 1
        """, (check_date,))
        
        holiday = cursor.fetchone()
        if holiday:
            return False, 'holiday'
        
        # Regular weekday (Mon-Fri)
        return True, 'weekday'
        
    finally:
        cursor.close()
        conn.close()


# =========================
# HELPER: Get shift times for date
# =========================

def get_shift_times_for_date(work_date: date, emp_code: str) -> Tuple[Optional[time], Optional[time], float]:
    """
    Get shift start/end times and expected hours for a specific date
    
    Returns:
        (shift_start, shift_end, expected_hours)
    """
    is_working, day_type = is_working_day(work_date, emp_code)
    
    if not is_working:
        # Non-working days have no shift - all hours are overtime
        return None, None, 0.0
    
    if day_type == 'working_saturday':
        # 1st, 3rd, 5th Saturdays: 10:00 AM - 1:30 PM (3.5 hours)
        return SATURDAY_SHIFT_START, SATURDAY_SHIFT_END, 3.5
    else:
        # Regular weekdays: 10:00 AM - 6:30 PM (8.5 hours)
        return WEEKDAY_SHIFT_START, WEEKDAY_SHIFT_END, 8.5


# =========================
# HELPER: Calculate overtime hours
# =========================

def calculate_overtime_hours(
    login_time: datetime, 
    logout_time: datetime, 
    work_date: date,
    emp_code: str,
    clock_in_sequence: int
) -> Tuple[float, float, str]:
    """
    Calculate overtime hours based on shift times and working day status
    
    Business Logic:
    1. Non-working days (holidays/Sundays/2nd-4th Saturdays): ALL hours count as overtime
    2. Working days:
       - First clock-in: Only hours OUTSIDE shift time count as overtime
       - Second+ clock-in: ALL hours count as overtime
    
    Returns:
        (total_hours, extra_hours, calculation_method)
    """
    # Calculate total working hours
    total_hours = (logout_time - login_time).total_seconds() / 3600
    
    is_working, day_type = is_working_day(work_date, emp_code)
    
    # NON-WORKING DAYS: All hours are overtime
    if not is_working:
        logger.info(f"📅 Non-working day ({day_type}) - All {total_hours:.2f} hours count as overtime")
        return total_hours, total_hours, f'non_working_day_{day_type}'
    
    # WORKING DAYS - Second+ clock-in: All hours are overtime
    if clock_in_sequence >= 2:
        logger.info(f"📅 Working day - Clock-in #{clock_in_sequence} - All {total_hours:.2f} hours count as overtime")
        return total_hours, total_hours, f'working_day_second_clockin'
    
    # WORKING DAYS - First clock-in: Calculate hours outside shift
    shift_start, shift_end, expected_hours = get_shift_times_for_date(work_date, emp_code)
    
    if not shift_start or not shift_end:
        # Shouldn't happen, but safety check
        return total_hours, 0.0, 'no_shift_defined'
    
    # Convert login/logout to time objects for comparison
    login_time_only = login_time.time()
    logout_time_only = logout_time.time()
    
    overtime_hours = 0.0
    breakdown = []
    
    # Check early start (before shift)
    if login_time_only < shift_start:
        shift_start_dt = datetime.combine(work_date, shift_start)
        early_hours = (shift_start_dt - login_time).total_seconds() / 3600
        overtime_hours += early_hours
        breakdown.append(f"early_start:{early_hours:.2f}h")
        logger.info(f"⏰ Early start: {early_hours:.2f} hours before {shift_start}")
    
    # Check late finish (after shift)
    if logout_time_only > shift_end:
        shift_end_dt = datetime.combine(work_date, shift_end)
        late_hours = (logout_time - shift_end_dt).total_seconds() / 3600
        overtime_hours += late_hours
        breakdown.append(f"late_finish:{late_hours:.2f}h")
        logger.info(f"⏰ Late finish: {late_hours:.2f} hours after {shift_end}")
    
    calculation_method = f"working_day_first_clockin_{'_'.join(breakdown)}" if breakdown else "working_day_within_shift"
    
    logger.info(f"📊 Overtime calculation: Total={total_hours:.2f}h, Overtime={overtime_hours:.2f}h, Method={calculation_method}")
    
    return total_hours, overtime_hours, calculation_method


# =========================
# HELPER: Count clock-ins on a date
# =========================

def count_clock_ins_on_date(emp_email: str, work_date: date) -> int:
    """
    Count number of completed clock-ins (with logout) on a specific date
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM attendance
            WHERE employee_email = %s 
              AND date = %s
              AND logout_time IS NOT NULL
        """, (emp_email, work_date))
        
        result = cursor.fetchone()
        return result['count'] if result else 0
        
    finally:
        cursor.close()
        conn.close()


# =========================
# HELPER: Get employee details
# =========================

def get_employee_details(emp_code: str) -> Optional[Dict]:
    """
    Get employee details including manager and designation
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                emp_code,
                emp_email,
                emp_full_name,
                emp_manager,
                emp_designation
            FROM employees
            WHERE emp_code = %s
        """, (emp_code,))
        
        return cursor.fetchone()
        
    finally:
        cursor.close()
        conn.close()


# =========================
# CORE: Calculate and Record Overtime/Comp-off
# =========================

def calculate_and_record_compoff(
    attendance_id: int, 
    emp_code: str, 
    emp_email: str, 
    emp_name: str,
    work_date: date, 
    login_time: datetime,
    logout_time: datetime
) -> Optional[Dict]:
    """
    Enhanced comp-off calculation based on shift times
    
    Business Rules:
    1. Non-working days: ALL hours count as overtime
    2. Working days - First clock-in: Only hours outside shift (early/late) count
    3. Working days - Second+ clock-in: ALL hours count as overtime
    4. > 3 hours = 0.5 day comp-off
    5. > 6 hours = 1 day comp-off
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get clock-in sequence number
        clock_in_sequence = count_clock_ins_on_date(emp_email, work_date)
        
        # Calculate overtime hours
        total_hours, extra_hours, calculation_method = calculate_overtime_hours(
            login_time, 
            logout_time, 
            work_date, 
            emp_code,
            clock_in_sequence
        )
        
        # Check if eligible for comp-off
        if extra_hours < COMPOFF_THRESHOLD_HALF_DAY:
            logger.info(f"❌ No comp-off: Only {extra_hours:.2f} extra hours (need > {COMPOFF_THRESHOLD_HALF_DAY})")
            return None
        
        # Calculate comp-off days
        if extra_hours >= COMPOFF_THRESHOLD_FULL_DAY:
            comp_off_days = 1.0
        else:
            comp_off_days = 0.5
        
        is_working, day_type = is_working_day(work_date, emp_code)
        
        # Check if record already exists
        cursor.execute("""
            SELECT id, overtime_id 
            FROM overtime_records
            WHERE attendance_id = %s
        """, (attendance_id,))
        
        existing = cursor.fetchone()
        
        if existing:
            logger.info(f"⚠️ Overtime record already exists for attendance_id {attendance_id}")
            return None
        
        # Create overtime record
        cursor.execute("""
            INSERT INTO overtime_records (
                attendance_id, emp_code, emp_email, emp_name,
                work_date, day_of_week, day_type, is_working_day,
                clock_in_sequence, total_hours, extra_hours,
                comp_off_days, status, calculation_method,
                created_at, expires_at
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                NOW(), NOW() + INTERVAL '%s days'
            )
            RETURNING overtime_id, created_at, expires_at
        """, (
            attendance_id, emp_code, emp_email, emp_name,
            work_date, work_date.strftime('%A'), day_type, is_working,
            clock_in_sequence, total_hours, extra_hours,
            comp_off_days, 'eligible', calculation_method,
            COMPOFF_EXPIRY_DAYS
        ))
        
        result = cursor.fetchone()
        conn.commit()
        
        logger.info(f"✅ Comp-off record created: ID={result['overtime_id']}, Days={comp_off_days}, Extra Hours={extra_hours:.2f}")
        
        return {
            'overtime_id': result['overtime_id'],
            'comp_off_days': comp_off_days,
            'extra_hours': extra_hours,
            'total_hours': total_hours,
            'day_type': day_type,
            'calculation_method': calculation_method,
            'expires_at': result['expires_at'].strftime('%Y-%m-%d')
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error creating comp-off record: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
        
    finally:
        cursor.close()
        conn.close()


# =========================
# NEW: Scan and Push Attendance to Overtime Records
# =========================

def scan_attendance_and_create_overtime_records(
    emp_code: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days_back: int = 30
) -> Tuple[Dict, int]:
    """
    Scan attendance records and create missing overtime records
    
    This API can be used to:
    1. Backfill missing overtime records
    2. Recalculate comp-offs for a date range
    3. Process specific employee or all employees
    
    Parameters:
        emp_code: Specific employee (optional, processes all if None)
        start_date: Start date (optional)
        end_date: End date (optional)
        days_back: Days to look back if dates not specified (default: 30)
    
    Returns:
        Summary of records processed and created
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set date range
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=days_back)
        
        logger.info(f"🔍 Scanning attendance records from {start_date} to {end_date}")
        
        # Build query
        query = """
            SELECT 
                a.id as attendance_id,
                a.employee_email,
                a.login_time,
                a.logout_time,
                a.date as work_date,
                e.emp_code,
                e.emp_full_name
            FROM attendance a
            JOIN employees e ON a.employee_email = e.emp_email
            WHERE a.logout_time IS NOT NULL
              AND a.date BETWEEN %s AND %s
        """
        
        params = [start_date, end_date]
        
        if emp_code:
            query += " AND e.emp_code = %s"
            params.append(emp_code)
        
        query += " ORDER BY a.date DESC, a.login_time DESC"
        
        cursor.execute(query, params)
        attendance_records = cursor.fetchall()
        
        logger.info(f"📊 Found {len(attendance_records)} completed attendance records")
        
        # Process each record
        processed = 0
        created = 0
        skipped = 0
        errors = 0
        
        created_records = []
        
        for record in attendance_records:
            try:
                # Check if overtime record already exists
                cursor.execute("""
                    SELECT overtime_id 
                    FROM overtime_records
                    WHERE attendance_id = %s
                """, (record['attendance_id'],))
                
                if cursor.fetchone():
                    skipped += 1
                    continue
                
                # Calculate and create overtime record
                result = calculate_and_record_compoff(
                    record['attendance_id'],
                    record['emp_code'],
                    record['employee_email'],
                    record['emp_full_name'],
                    record['work_date'],
                    record['login_time'],
                    record['logout_time']
                )
                
                processed += 1
                
                if result:
                    created += 1
                    created_records.append({
                        'overtime_id': result['overtime_id'],
                        'emp_code': record['emp_code'],
                        'emp_name': record['emp_full_name'],
                        'work_date': record['work_date'].strftime('%Y-%m-%d'),
                        'comp_off_days': result['comp_off_days'],
                        'extra_hours': result['extra_hours']
                    })
                
            except Exception as e:
                errors += 1
                logger.error(f"❌ Error processing attendance_id {record['attendance_id']}: {e}")
        
        logger.info(f"✅ Scan complete: Processed={processed}, Created={created}, Skipped={skipped}, Errors={errors}")
        
        return ({
            "success": True,
            "message": f"Successfully scanned {len(attendance_records)} attendance records",
            "data": {
                "date_range": {
                    "start_date": start_date.strftime('%Y-%m-%d'),
                    "end_date": end_date.strftime('%Y-%m-%d')
                },
                "summary": {
                    "total_attendance_records": len(attendance_records),
                    "processed": processed,
                    "created": created,
                    "skipped": skipped,
                    "errors": errors
                },
                "created_records": created_records[:50]  # Limit to first 50 for display
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Error scanning attendance records: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({
            "success": False,
            "message": f"Error scanning attendance records: {str(e)}"
        }, 500)
        
    finally:
        cursor.close()
        conn.close()


# =========================
# REQUEST: Enhanced with Multi-level Approval
# =========================

def request_compoff(
    emp_code: str,
    overtime_record_ids: List[int],
    reason: str = '',
    notes: str = ''
) -> Tuple[Dict, int]:
    """
    Request comp-off with automatic approval level determination
    
    Approval Logic:
    1. Count current month's approved/pending comp-off requests
    2. If count > 3: Requires HR/CMD approval (approval_level = 'cmd')
    3. If count <= 3: Requires Manager approval only (approval_level = 'manager')
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get employee details
        emp_details = get_employee_details(emp_code)
        if not emp_details:
            return ({"success": False, "message": "Employee not found"}, 404)
        
        emp_manager = emp_details['emp_manager']
        emp_designation = emp_details['emp_designation']
        
        # Count current month's requests
        current_month_start = date.today().replace(day=1)
        
        cursor.execute("""
            SELECT COUNT(*) as request_count
            FROM compoff_requests
            WHERE emp_code = %s
              AND created_at >= %s
              AND status IN ('pending', 'approved')
        """, (emp_code, current_month_start))
        
        month_count = cursor.fetchone()['request_count']
        
        # Determine approval level
        if month_count >= COMPOFF_CMD_APPROVAL_THRESHOLD:
            approval_level = 'cmd'
            approval_message = f"This is your {month_count + 1}th comp-off request this month. Requires HR/CMD approval."
        else:
            approval_level = 'manager'
            approval_message = f"This is your {month_count + 1}th comp-off request this month. Requires Manager approval."
        
        logger.info(f"📋 Comp-off request: {emp_code}, Month count: {month_count}, Approval level: {approval_level}")
        
        # Validate overtime records
        placeholders = ','.join(['%s'] * len(overtime_record_ids))
        cursor.execute(f"""
            SELECT 
                overtime_id, 
                emp_code, 
                comp_off_days, 
                status, 
                work_date,
                expires_at
            FROM overtime_records
            WHERE overtime_id IN ({placeholders})
              AND emp_code = %s
        """, overtime_record_ids + [emp_code])
        
        records = cursor.fetchall()
        
        if len(records) != len(overtime_record_ids):
            return ({
                "success": False,
                "message": "Some overtime records not found or don't belong to you"
            }, 400)
        
        # Validate all records are eligible
        ineligible = [r for r in records if r['status'] != 'eligible']
        if ineligible:
            return ({
                "success": False,
                "message": f"Some records are not eligible. Status: {ineligible[0]['status']}"
            }, 400)
        
        # Check expiry
        today = date.today()
        expired = [r for r in records if r['expires_at'].date() <= today]
        if expired:
            return ({
                "success": False,
                "message": f"Some records have expired: {expired[0]['work_date']}"
            }, 400)
        
        # Calculate total comp-off days
        total_comp_days = sum([float(r['comp_off_days']) for r in records])
        
        # Create comp-off request
        cursor.execute("""
            INSERT INTO compoff_requests (
                emp_code, emp_email, emp_name,
                overtime_record_ids, total_comp_days,
                reason, notes,
                approval_level, approver_emp_code,
                status, created_at
            ) VALUES (
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                'pending', NOW()
            )
            RETURNING request_id, created_at
        """, (
            emp_code, emp_details['emp_email'], emp_details['emp_full_name'],
            overtime_record_ids, total_comp_days,
            reason, notes,
            approval_level, emp_manager
        ))
        
        request_result = cursor.fetchone()
        request_id = request_result['request_id']
        
        # Update overtime records status
        cursor.execute(f"""
            UPDATE overtime_records
            SET status = 'requested', compoff_request_id = %s
            WHERE overtime_id IN ({placeholders})
        """, [request_id] + overtime_record_ids)
        
        conn.commit()
        
        logger.info(f"✅ Comp-off request created: ID={request_id}, Days={total_comp_days}, Level={approval_level}")
        
        return ({
            "success": True,
            "message": f"Comp-off request submitted successfully. {approval_message}",
            "data": {
                "request_id": request_id,
                "total_comp_days": total_comp_days,
                "overtime_records_count": len(overtime_record_ids),
                "approval_level": approval_level,
                "approver": emp_manager,
                "month_request_count": month_count + 1,
                "created_at": request_result['created_at'].strftime('%Y-%m-%d %H:%M:%S'),
                "status": "pending"
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error creating comp-off request: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({
            "success": False,
            "message": f"Error creating comp-off request: {str(e)}"
        }, 500)
        
    finally:
        cursor.close()
        conn.close()


# =========================
# APPROVE: Enhanced with Multi-level Approval Check
# =========================

def approve_compoff_request(
    request_id: int,
    approver_emp_code: str,
    action: str,  # 'approved' or 'rejected'
    remarks: str = ''
) -> Tuple[Dict, int]:
    """
    Approve or reject comp-off request with authorization check
    
    Authorization Rules:
    1. Manager: Can approve 'manager' level requests for their team
    2. HR/CMD: Can approve both 'manager' and 'cmd' level requests
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get approver details
        approver = get_employee_details(approver_emp_code)
        if not approver:
            return ({"success": False, "message": "Approver not found"}, 404)
        
        approver_designation = approver['emp_designation']
        
        # Get request details
        cursor.execute("""
            SELECT 
                cr.*,
                e.emp_manager
            FROM compoff_requests cr
            JOIN employees e ON cr.emp_code = e.emp_code
            WHERE cr.request_id = %s
        """, (request_id,))
        
        request = cursor.fetchone()
        
        if not request:
            return ({"success": False, "message": "Request not found"}, 404)
        
        if request['status'] != 'pending':
            return ({
                "success": False,
                "message": f"Request is already {request['status']}"
            }, 400)
        
        # Authorization check
        approval_level = request['approval_level']
        emp_manager = request['emp_manager']
        
        is_authorized = False
        
        # HR/CMD can approve all levels
        if approver_designation in ['HR', 'CMD']:
            is_authorized = True
            logger.info(f"✅ {approver_designation} approval for request {request_id}")
        
        # Manager can approve 'manager' level for their team
        elif approval_level == 'manager' and approver_emp_code == emp_manager:
            is_authorized = True
            logger.info(f"✅ Manager approval for request {request_id}")
        
        if not is_authorized:
            return ({
                "success": False,
                "message": f"Unauthorized. This request requires {approval_level.upper()} approval."
            }, 403)
        
        # Update request status
        cursor.execute("""
            UPDATE compoff_requests
            SET 
                status = %s,
                approver_emp_code = %s,
                approver_remarks = %s,
                approved_at = NOW()
            WHERE request_id = %s
            RETURNING approved_at
        """, (action, approver_emp_code, remarks, request_id))
        
        result = cursor.fetchone()
        
        # Update overtime records
        new_status = 'approved' if action == 'approved' else 'rejected'
        
        overtime_ids = request['overtime_record_ids']
        placeholders = ','.join(['%s'] * len(overtime_ids))
        
        cursor.execute(f"""
            UPDATE overtime_records
            SET status = %s
            WHERE overtime_id IN ({placeholders})
        """, [new_status] + overtime_ids)
        
        conn.commit()
        
        logger.info(f"✅ Request {request_id} {action} by {approver_emp_code}")
        
        return ({
            "success": True,
            "message": f"Comp-off request {action} successfully",
            "data": {
                "request_id": request_id,
                "status": action,
                "total_comp_days": float(request['total_comp_days']),
                "approver": approver_emp_code,
                "approver_designation": approver_designation,
                "approved_at": result['approved_at'].strftime('%Y-%m-%d %H:%M:%S')
            }
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error approving comp-off request: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({
            "success": False,
            "message": f"Error approving comp-off request: {str(e)}"
        }, 500)
        
    finally:
        cursor.close()
        conn.close()


# =========================
# EXISTING FUNCTIONS (keeping signatures compatible)
# =========================

def trigger_compoff_calculation(emp_code: str) -> Tuple[Dict, int]:
    """Trigger comp-off calculation - kept for backward compatibility"""
    return scan_attendance_and_create_overtime_records(emp_code=emp_code, days_back=7)


def get_employee_overtime_records(emp_code: str, status: Optional[str] = None, limit: int = 50) -> Tuple[Dict, int]:
    """Get employee's overtime records"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT * FROM overtime_records
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
        
        # Convert dates to strings
        for record in records:
            for key, value in record.items():
                if isinstance(value, (date, datetime)):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime) else value.strftime('%Y-%m-%d')
        
        return ({
            "success": True,
            "data": {
                "records": records,
                "count": len(records)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_my_compoff_requests(emp_code: str, status: Optional[str] = None, limit: int = 50) -> Tuple[Dict, int]:
    """Get employee's comp-off requests"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT * FROM compoff_requests
            WHERE emp_code = %s
        """
        params = [emp_code]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Convert dates to strings
        for req in requests:
            for key, value in req.items():
                if isinstance(value, (date, datetime)):
                    req[key] = value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime) else value.strftime('%Y-%m-%d')
        
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


def cancel_compoff_request(request_id: int, emp_code: str) -> Tuple[Dict, int]:
    """Cancel pending comp-off request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM compoff_requests
            WHERE request_id = %s AND emp_code = %s
        """, (request_id, emp_code))
        
        request = cursor.fetchone()
        
        if not request:
            return ({"success": False, "message": "Request not found"}, 404)
        
        if request['status'] != 'pending':
            return ({"success": False, "message": f"Cannot cancel {request['status']} request"}, 400)
        
        # Update request
        cursor.execute("""
            UPDATE compoff_requests
            SET status = 'cancelled'
            WHERE request_id = %s
        """, (request_id,))
        
        # Reset overtime records
        overtime_ids = request['overtime_record_ids']
        placeholders = ','.join(['%s'] * len(overtime_ids))
        
        cursor.execute(f"""
            UPDATE overtime_records
            SET status = 'eligible', compoff_request_id = NULL
            WHERE overtime_id IN ({placeholders})
        """, overtime_ids)
        
        conn.commit()
        
        return ({
            "success": True,
            "message": "Request cancelled successfully"
        }, 200)
        
    except Exception as e:
        conn.rollback()
        return ({"success": False, "message": str(e)}, 500)
        
    finally:
        cursor.close()
        conn.close()


def get_compoff_balance(emp_code: str) -> Tuple[Dict, int]:
    """Get comp-off balance summary"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Approved balance
        cursor.execute("""
            SELECT SUM(total_comp_days) as approved_balance
            FROM compoff_requests
            WHERE emp_code = %s AND status = 'approved'
        """, (emp_code,))
        
        approved = cursor.fetchone()
        
        # Eligible not requested
        cursor.execute("""
            SELECT 
                COUNT(*) as eligible_count,
                SUM(comp_off_days) as eligible_days
            FROM overtime_records
            WHERE emp_code = %s AND status = 'eligible'
        """, (emp_code,))
        
        eligible = cursor.fetchone()
        
        # Pending approval
        cursor.execute("""
            SELECT SUM(total_comp_days) as pending_days
            FROM compoff_requests
            WHERE emp_code = %s AND status = 'pending'
        """, (emp_code,))
        
        pending = cursor.fetchone()
        
        return ({
            "success": True,
            "data": {
                "approved_balance": float(approved['approved_balance'] or 0),
                "eligible_not_requested": float(eligible['eligible_days'] or 0),
                "eligible_records_count": int(eligible['eligible_count'] or 0),
                "pending_approval": float(pending['pending_days'] or 0),
                "total_potential": float(approved['approved_balance'] or 0) + float(eligible['eligible_days'] or 0)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_team_compoff_requests(manager_emp_code: str, status: Optional[str] = None, limit: int = 50) -> Tuple[Dict, int]:
    """Get team's comp-off requests for approval"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get manager's designation
        manager = get_employee_details(manager_emp_code)
        if not manager:
            return ({"success": False, "message": "Manager not found"}, 404)
        
        manager_designation = manager['emp_designation']
        
        # Build query based on role
        if manager_designation in ['HR', 'CMD']:
            # HR/CMD can see all requests
            query = """
                SELECT cr.*, e.emp_manager
                FROM compoff_requests cr
                JOIN employees e ON cr.emp_code = e.emp_code
                WHERE 1=1
            """
            params = []
        else:
            # Managers see only their team's requests
            query = """
                SELECT cr.*, e.emp_manager
                FROM compoff_requests cr
                JOIN employees e ON cr.emp_code = e.emp_code
                WHERE e.emp_manager = %s
            """
            params = [manager_emp_code]
        
        if status:
            query += " AND cr.status = %s"
            params.append(status)
        
        query += " ORDER BY cr.created_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Convert dates
        for req in requests:
            for key, value in req.items():
                if isinstance(value, (date, datetime)):
                    req[key] = value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime) else value.strftime('%Y-%m-%d')
        
        return ({
            "success": True,
            "data": {
                "requests": requests,
                "count": len(requests),
                "manager_designation": manager_designation
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_compoff_statistics(emp_code: str, year: Optional[int] = None, month: Optional[int] = None) -> Tuple[Dict, int]:
    """Get comp-off statistics - placeholder for detailed implementation"""
    return ({
        "success": True,
        "message": "Statistics endpoint - implement as needed"
    }, 200)