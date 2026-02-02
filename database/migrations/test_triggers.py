#!/usr/bin/env python3
"""
Migration Test Script for Comp-Off Trigger System
Tests that the database trigger properly marks comp-off sessions and creates overtime records
"""

import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from config import Config
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TriggerTester:
    def __init__(self):
        """Initialize database connection"""
        try:
            self.conn = psycopg2.connect(
                host=Config.DATABASE_HOST,
                port=Config.DATABASE_PORT,
                database=Config.DATABASE_NAME,
                user=Config.DATABASE_USER,
                password=Config.DATABASE_PASSWORD,
                cursor_factory=RealDictCursor
            )
            logger.info("✓ Database connection established")
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            sys.exit(1)
    
    def execute_query(self, query, params=None):
        """Execute a query and return results"""
        cursor = self.conn.cursor()
        try:
            cursor.execute(query, params)
            results = cursor.fetchall()
            self.conn.commit()
            return results
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Query execution error: {e}")
            raise
        finally:
            cursor.close()
    
    def execute_update(self, query, params=None):
        """Execute an update query"""
        cursor = self.conn.cursor()
        try:
            cursor.execute(query, params)
            self.conn.commit()
            return cursor.rowcount
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Update execution error: {e}")
            raise
        finally:
            cursor.close()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def test_trigger_exists(self):
        """Test 1: Check if triggers are created"""
        logger.info("\n" + "="*80)
        logger.info("TEST 1: Verify Triggers Exist")
        logger.info("="*80)
        
        query = """
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table = 'attendance'
        ORDER BY trigger_name
        """
        
        triggers = self.execute_query(query)
        
        if not triggers:
            logger.error("✗ No triggers found on attendance table")
            return False
        
        expected_triggers = [
            'trigger_mark_compoff_on_insert',
            'trigger_mark_compoff_on_update',
            'trigger_populate_compoff_on_clockout'
        ]
        
        found_triggers = [t['trigger_name'] for t in triggers]
        
        for trigger in expected_triggers:
            if trigger in found_triggers:
                logger.info(f"✓ Trigger found: {trigger}")
            else:
                logger.error(f"✗ Trigger not found: {trigger}")
                return False
        
        logger.info(f"✓ All {len(expected_triggers)} triggers present")
        return True
    
    def test_function_exists(self):
        """Test 2: Check if functions are created"""
        logger.info("\n" + "="*80)
        logger.info("TEST 2: Verify Functions Exist")
        logger.info("="*80)
        
        query = """
        SELECT proname, prokind
        FROM pg_proc
        WHERE proname IN ('is_working_day', 'mark_compoff_session', 'populate_compoff_on_clockout')
        ORDER BY proname
        """
        
        functions = self.execute_query(query)
        
        if not functions:
            logger.error("✗ No functions found")
            return False
        
        expected_functions = ['is_working_day', 'mark_compoff_session', 'populate_compoff_on_clockout']
        found_functions = [f['proname'] for f in functions]
        
        for func in expected_functions:
            if func in found_functions:
                logger.info(f"✓ Function found: {func}")
            else:
                logger.error(f"✗ Function not found: {func}")
                return False
        
        logger.info(f"✓ All {len(expected_functions)} functions present")
        return True
    
    def test_column_exists(self):
        """Test 3: Check if is_compoff_session column exists"""
        logger.info("\n" + "="*80)
        logger.info("TEST 3: Verify is_compoff_session Column")
        logger.info("="*80)
        
        query = """
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'attendance' AND column_name = 'is_compoff_session'
        """
        
        result = self.execute_query(query)
        
        if not result:
            logger.error("✗ Column is_compoff_session not found in attendance table")
            return False
        
        col = result[0]
        logger.info(f"✓ Column found: {col['column_name']}")
        logger.info(f"  Type: {col['data_type']}")
        logger.info(f"  Default: {col['column_default']}")
        
        return True
    
    def test_is_working_day_function(self):
        """Test 4: Test is_working_day function"""
        logger.info("\n" + "="*80)
        logger.info("TEST 4: Test is_working_day() Function")
        logger.info("="*80)
        
        # Get a test employee
        emp_query = "SELECT emp_code FROM employees LIMIT 1"
        employees = self.execute_query(emp_query)
        
        if not employees:
            logger.warning("⚠ No employees found, skipping function test")
            return True
        
        emp_code = employees[0]['emp_code']
        
        # Test Monday (working day)
        monday_test = "SELECT is_working_day('2024-02-19'::DATE, %s) as is_working"
        result = self.execute_query(monday_test, (emp_code,))
        
        if result[0]['is_working']:
            logger.info("✓ Monday identified as working day")
        else:
            logger.warning("⚠ Monday not identified as working day")
        
        # Test Sunday (non-working day)
        sunday_test = "SELECT is_working_day('2024-02-18'::DATE, %s) as is_working"
        result = self.execute_query(sunday_test, (emp_code,))
        
        if not result[0]['is_working']:
            logger.info("✓ Sunday identified as non-working day")
        else:
            logger.warning("⚠ Sunday not identified as non-working day")
        
        return True
    
    def test_compoff_flag_on_insert(self):
        """Test 5: Test that is_compoff_session is set on INSERT"""
        logger.info("\n" + "="*80)
        logger.info("TEST 5: Test Comp-Off Flag on INSERT")
        logger.info("="*80)
        
        # Get a test employee
        emp_query = "SELECT emp_email FROM employees LIMIT 1"
        employees = self.execute_query(emp_query)
        
        if not employees:
            logger.warning("⚠ No employees found, skipping INSERT test")
            return True
        
        emp_email = employees[0]['emp_email']
        
        # Create organization holiday if it doesn't exist
        holiday_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        
        # Check if it's a holiday or non-working day
        check_query = """
        SELECT COUNT(*) as count FROM organization_holidays 
        WHERE holiday_date = %s
        """
        result = self.execute_query(check_query, (holiday_date.date(),))
        
        if result[0]['count'] == 0:
            # Insert a test holiday
            insert_holiday = """
            INSERT INTO organization_holidays (holiday_date, holiday_name, is_mandatory)
            VALUES (%s, 'Test Holiday for Trigger', true)
            """
            self.execute_update(insert_holiday, (holiday_date.date(),))
            logger.info(f"✓ Test holiday created: {holiday_date.date()}")
        
        # Insert attendance on non-working day
        insert_attendance = """
        INSERT INTO attendance (employee_email, date, login_time, is_compoff_session)
        VALUES (%s, %s, NOW(), false)
        RETURNING id, is_compoff_session
        """
        
        result = self.execute_query(insert_attendance, (emp_email, holiday_date.date()))
        
        if result and result[0]['is_compoff_session']:
            logger.info(f"✓ Comp-off flag automatically set on INSERT")
            logger.info(f"  Attendance ID: {result[0]['id']}")
            logger.info(f"  is_compoff_session: {result[0]['is_compoff_session']}")
            
            # Clean up
            cleanup = "DELETE FROM attendance WHERE id = %s"
            self.execute_update(cleanup, (result[0]['id'],))
            
            return True
        else:
            logger.error("✗ Comp-off flag was NOT set on INSERT")
            if result:
                logger.info(f"  Received: is_compoff_session = {result[0]['is_compoff_session']}")
            return False
    
    def test_overtime_record_creation(self):
        """Test 6: Test that overtime_records are created on clock-out"""
        logger.info("\n" + "="*80)
        logger.info("TEST 6: Test Overtime Record Creation on Clock-Out")
        logger.info("="*80)
        
        # Get a test employee
        emp_query = "SELECT emp_email, emp_code FROM employees LIMIT 1"
        employees = self.execute_query(emp_query)
        
        if not employees:
            logger.warning("⚠ No employees found, skipping overtime test")
            return True
        
        emp_email = employees[0]['emp_email']
        emp_code = employees[0]['emp_code']
        
        # Create organization holiday
        holiday_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=7)
        
        insert_holiday = """
        INSERT INTO organization_holidays (holiday_date, holiday_name, is_mandatory)
        VALUES (%s, 'Test Holiday for Overtime', true)
        ON CONFLICT (holiday_date) DO NOTHING
        """
        self.execute_update(insert_holiday, (holiday_date.date(),))
        
        # Insert attendance
        insert_attendance = """
        INSERT INTO attendance (employee_email, date, login_time)
        VALUES (%s, %s, NOW())
        RETURNING id
        """
        
        result = self.execute_query(insert_attendance, (emp_email, holiday_date.date()))
        attendance_id = result[0]['id']
        logger.info(f"✓ Test attendance created: {attendance_id}")
        
        # Clock out (update with logout_time and working_hours)
        update_attendance = """
        UPDATE attendance 
        SET logout_time = NOW(), working_hours = 8.5
        WHERE id = %s
        RETURNING id
        """
        
        self.execute_update(update_attendance, (attendance_id,))
        logger.info("✓ Attendance clocked out with working_hours")
        
        # Check if overtime_records was created
        check_overtime = """
        SELECT id, emp_code, work_date, day_type, status
        FROM overtime_records
        WHERE attendance_id = %s
        """
        
        overtime_records = self.execute_query(check_overtime, (attendance_id,))
        
        if overtime_records:
            rec = overtime_records[0]
            logger.info(f"✓ Overtime record created automatically")
            logger.info(f"  Record ID: {rec['id']}")
            logger.info(f"  Emp Code: {rec['emp_code']}")
            logger.info(f"  Work Date: {rec['work_date']}")
            logger.info(f"  Day Type: {rec['day_type']}")
            logger.info(f"  Status: {rec['status']}")
            
            # Clean up
            cleanup_overtime = "DELETE FROM overtime_records WHERE id = %s"
            self.execute_update(cleanup_overtime, (rec['id'],))
            
            cleanup_attendance = "DELETE FROM attendance WHERE id = %s"
            self.execute_update(cleanup_attendance, (attendance_id,))
            
            return True
        else:
            logger.error("✗ Overtime record was NOT created on clock-out")
            
            # Clean up
            cleanup_attendance = "DELETE FROM attendance WHERE id = %s"
            self.execute_update(cleanup_attendance, (attendance_id,))
            
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        logger.info("\n" + "="*80)
        logger.info("COMP-OFF TRIGGER SYSTEM - TEST SUITE")
        logger.info("="*80)
        
        tests = [
            ("Triggers exist", self.test_trigger_exists),
            ("Functions exist", self.test_function_exists),
            ("Column exists", self.test_column_exists),
            ("is_working_day function", self.test_is_working_day_function),
            ("Comp-off flag on INSERT", self.test_compoff_flag_on_insert),
            ("Overtime record on clock-out", self.test_overtime_record_creation),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                logger.error(f"✗ Test '{test_name}' failed with exception: {e}")
                import traceback
                logger.error(traceback.format_exc())
                results.append((test_name, False))
        
        # Print summary
        logger.info("\n" + "="*80)
        logger.info("TEST SUMMARY")
        logger.info("="*80)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✓ PASS" if result else "✗ FAIL"
            logger.info(f"{status}: {test_name}")
        
        logger.info("-" * 80)
        logger.info(f"Total: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("\n✓ All tests passed! Trigger system is working correctly.")
            return True
        else:
            logger.error(f"\n✗ {total - passed} test(s) failed. Please check the trigger system.")
            return False


def main():
    """Main test execution"""
    tester = TriggerTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"✗ Test execution failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
    finally:
        tester.close()


if __name__ == "__main__":
    main()
