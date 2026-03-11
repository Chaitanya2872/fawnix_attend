# Comp-Off Trigger System Documentation

## Overview

The database trigger system automatically manages comp-off session flags and overtime record creation during attendance clock-in and clock-out operations. This ensures data consistency and eliminates the need for application-level logic duplication.

## Architecture

### Components

```
Attendance Table (INSERT/UPDATE)
    ↓
Trigger: trigger_mark_compoff_on_insert / trigger_mark_compoff_on_update
    ↓
Function: mark_compoff_session()
    ↓
Determines if date is non-working day via is_working_day()
    ↓
Sets is_compoff_session = TRUE if non-working day
    │
    └─→ Separate Trigger on Attendance UPDATE
        ↓
        Trigger: trigger_populate_compoff_on_clockout
        ↓
        Function: populate_compoff_on_clockout()
        ↓
        On logout_time SET: Create overtime_records entry
        ↓
        Insert into overtime_records table
```

## Database Functions

### 1. `is_working_day(check_date DATE, emp_code_param VARCHAR) → BOOLEAN`

**Purpose**: Determines if a given date is a working day

**Non-Working Days**:
- Sundays (weekday 0)
- 2nd Saturdays (weekday 6, week_of_month = 2)
- 4th Saturdays (weekday 6, week_of_month = 4)
- Dates in `organization_holidays` table

**Example Usage**:
```sql
-- Check if 2024-02-10 is a working day for employee EMP001
SELECT is_working_day('2024-02-10'::DATE, 'EMP001');
-- Returns: FALSE (if it's a non-working day)
```

### 2. `mark_compoff_session() → TRIGGER`

**Purpose**: Auto-sets `is_compoff_session` flag when attendance is created or updated

**Trigger Points**:
- `BEFORE INSERT ON attendance`
- `BEFORE UPDATE ON attendance`

**Logic**:
```
1. Get employee emp_code from employees table (using email)
2. Check if attendance.date is non-working day via is_working_day()
3. If non-working day → SET is_compoff_session = TRUE
4. Otherwise → keep as FALSE (or whatever was set)
```

**Execution Context**:
- Fires before INSERT/UPDATE completes
- Has access to NEW record (being inserted/updated)
- Returns modified NEW record to database

### 3. `populate_compoff_on_clockout() → TRIGGER`

**Purpose**: Auto-creates overtime records when employee clocks out on comp-off session

**Trigger Points**:
- `AFTER UPDATE ON attendance`

**Logic**:
```
1. Check if logout_time is being set (clock-out happening)
   OLD.logout_time IS NULL AND NEW.logout_time IS NOT NULL
   
2. Get employee details (emp_code, name)

3. Check if is_working_day() returns FALSE (non-working day)

4. If non-working day or is_compoff_session = TRUE:
   a. Check if overtime_records already exists for this attendance
   b. If not exists AND working_hours is set:
      - INSERT into overtime_records with:
        * emp_code, email, name
        * attendance_id (foreign key)
        * work_date
        * day_of_week (from date)
        * day_type: 'working' or 'non_working'
        * standard_hours: 8.0 for working days, 0.0 for non-working
        * actual_hours: from NEW.working_hours
        * extra_hours: working_hours - standard_hours
        * status: 'eligible'
        * expires_at: work_date + 90 days
        * recording_deadline: work_date + 30 days
```

**Execution Context**:
- Fires AFTER INSERT/UPDATE completes (can read committed data)
- Prevents duplicate overtime records (checks before insert)
- Links overtime record to specific attendance session

## Data Flow

### Clock-In (INSERT attendance)

```
POST /api/attendance/login
    ↓
attendance_service.clock_in()
    ↓
INSERT INTO attendance (date, employee_email, login_time, ...)
    ↓
Trigger: trigger_mark_compoff_on_insert
    ↓
Function: mark_compoff_session()
    ├─ Get emp_code from employees table
    ├─ Check is_working_day(date, emp_code)
    └─ Set is_compoff_session = TRUE (if non-working day)
    ↓
Attendance record created with is_compoff_session flag set
    ↓
Response to client with attendance_id and is_compoff_session status
```

### Clock-Out (UPDATE attendance)

```
POST /api/attendance/logout
    ↓
attendance_service.clock_out()
    ↓
UPDATE attendance SET logout_time = NOW(), working_hours = 8.5 WHERE id = X
    ↓
Trigger: trigger_mark_compoff_on_update (if updating date/email)
    ↓
Function: mark_compoff_session() (ensures flag is correct)
    ↓
UPDATE completes
    ↓
Trigger: trigger_populate_compoff_on_clockout (AFTER UPDATE)
    ↓
Function: populate_compoff_on_clockout()
    ├─ Check logout_time was just set
    ├─ Get employee details
    ├─ Check is_working_day(date, emp_code)
    ├─ Check if overtime_records already exists
    └─ CREATE overtime_records entry (if new, non-working day, has hours)
    ↓
Overtime record linked to attendance
    ↓
Response to client (includes overtime details and existing overtime records)
```

## Database Tables Modified

### attendance Table

**New Column**:
```sql
is_compoff_session BOOLEAN DEFAULT false
```

- **Purpose**: Flag indicating session is on non-working day
- **Set By**: Trigger `mark_compoff_session()`
- **Used By**: Application logic to allow flexible clock-out

### overtime_records Table

**Auto-Populated By**: Trigger `populate_compoff_on_clockout()`

**Columns Populated**:
- `emp_code`: From employees table
- `emp_email`: From attendance record
- `emp_name`: From employees table
- `attendance_id`: Link to attendance record
- `work_date`: From attendance date
- `day_of_week`: Calculated from date
- `day_type`: 'working' or 'non_working'
- `standard_hours`: 8.0 or 0.0
- `actual_hours`: From attendance.working_hours
- `extra_hours`: Calculated
- `status`: 'eligible'
- `expires_at`: work_date + 90 days
- `recording_deadline`: work_date + 30 days

### organization_holidays Table

**Used By**: Function `is_working_day()` to check if date is holiday

## Trigger Execution Order

When an attendance UPDATE happens:

```
1. BEFORE UPDATE triggers (in declaration order):
   └─ trigger_mark_compoff_on_update (calls mark_compoff_session)

2. UPDATE statement executes

3. AFTER UPDATE triggers (in declaration order):
   └─ trigger_populate_compoff_on_clockout (calls populate_compoff_on_clockout)
```

## Error Handling

The migration includes error handling:
- IF NOT EXISTS checks prevent duplicate columns
- DROP IF EXISTS with triggers prevents conflicts
- CREATE OR REPLACE allows function updates
- Idempotent design allows safe re-runs

## Performance Considerations

1. **Function Indexing**:
   - `is_working_day()` marked as IMMUTABLE (PostgreSQL can cache results)
   - Queries to `organization_holidays` should use indexed `holiday_date`

2. **Trigger Performance**:
   - Triggers fire on every INSERT/UPDATE (even if unchanged)
   - Consider table row count when dealing with large batches
   - Function calls are inline (no external process overhead)

3. **Indexes Required** (created in init_database):
   ```sql
   CREATE INDEX idx_holidays_date ON organization_holidays(holiday_date);
   CREATE INDEX idx_attendance_email_date ON attendance(employee_email, date, status);
   ```

## Testing the Trigger

### Test 1: Clock-in on Non-Working Day

```sql
-- Insert organization holiday
INSERT INTO organization_holidays (holiday_date, holiday_name, is_mandatory)
VALUES ('2024-02-10', 'Test Holiday', true);

-- Employee clocks in on holiday
-- Check that is_compoff_session is automatically set to TRUE
SELECT id, date, is_compoff_session FROM attendance 
WHERE employee_email = 'test@company.com' 
ORDER BY created_at DESC LIMIT 1;
-- Expected: is_compoff_session = TRUE
```

### Test 2: Overtime Record Creation on Clock-Out

```sql
-- Get the attendance record created above
-- Clock out (update the attendance record)
-- Check that overtime_records has entry
SELECT * FROM overtime_records 
WHERE attendance_id = <attendance_id>;
-- Expected: 1 row with status='eligible', day_type='non_working'
```

### Test 3: Prevent Duplicate Overtime Records

```sql
-- Manually update attendance record again
UPDATE attendance SET working_hours = 9.0 WHERE id = <attendance_id>;

-- Check overtime_records still has only 1 entry (not duplicated)
SELECT COUNT(*) FROM overtime_records 
WHERE attendance_id = <attendance_id>;
-- Expected: 1 (not 2)
```

## Debugging

### Check Trigger Status

```sql
-- List all triggers on attendance table
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'attendance';
```

### Check Function Definition

```sql
-- View function source
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_working_day';
```

### View Recent Changes

```sql
-- Check records with is_compoff_session = TRUE
SELECT id, date, employee_email, is_compoff_session, created_at
FROM attendance
WHERE is_compoff_session = TRUE
ORDER BY created_at DESC
LIMIT 10;

-- Check overtime records created
SELECT attendance_id, emp_code, work_date, status, created_at
FROM overtime_records
ORDER BY created_at DESC
LIMIT 10;
```

## Migration Details

**File**: `database/migrations/001_add_compoff_trigger.sql`

**Size**: ~170 lines

**Execution Time**: < 1 second

**Tables Affected**:
- attendance (adds column)
- overtime_records (auto-populates)
- organization_holidays (reads)

**Functions Created**:
1. `is_working_day(DATE, VARCHAR) → BOOLEAN`
2. `mark_compoff_session() → TRIGGER`
3. `populate_compoff_on_clockout() → TRIGGER`

**Triggers Created**:
1. `trigger_mark_compoff_on_insert`
2. `trigger_mark_compoff_on_update`
3. `trigger_populate_compoff_on_clockout`

## Related Code

**Application Layer** (uses trigger-set data):
- `services/attendance_service.py::clock_in()` - Creates attendance, trigger sets flag
- `services/attendance_service.py::clock_out()` - Updates attendance, trigger creates overtime record
- `services/CompLeaveService.py::is_working_day()` - Mirrors trigger logic (for validation)

**API Response** (includes overtime data):
- `POST /api/attendance/logout` - Returns `overtime_records` and `existing_overtime_records`

**Database** (source of truth):
- Trigger ensures flag accuracy
- Overtime records automatically linked
- No duplicate records possible

## Future Enhancements

1. **Add audit logging** to triggers (track flag changes)
2. **Add email notification** trigger when overtime record expires
3. **Add automatic comp-off status update** trigger based on expiry
4. **Add performance tracking** for trigger execution time
