
#!/usr/bin/env python3
"""
Auto Clock-Out Debugging Script
Diagnoses issues with APScheduler, timezone, and auto-clockout job
"""

import sys
import os
from datetime import datetime, time
import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def print_section(title):
    """Print formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def check_timezone():
    """Check system and Python timezone settings"""
    print_section("TIMEZONE CONFIGURATION CHECK")
    
    # Check environment variable
    tz_env = os.environ.get('TZ', 'Not Set')
    print(f"1. Environment TZ variable: {tz_env}")
    
    # Check system time
    import time as time_module
    print(f"2. System timezone: {time_module.tzname}")
    
    # Check current time in different zones
    now_utc = datetime.now(pytz.UTC)
    now_ist = datetime.now(pytz.timezone('Asia/Kolkata'))
    now_local = datetime.now()
    
    print(f"3. Current UTC time: {now_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"4. Current IST time: {now_ist.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"5. Current Local time: {now_local.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"6. Time difference UTC->IST: {(now_ist.utcoffset().total_seconds() / 3600):.1f} hours")
    
    # Check if pytz is working correctly
    try:
        ist = pytz.timezone('Asia/Kolkata')
        print(f"7. Pytz Asia/Kolkata zone: {ist}")
        print(f"   ✅ Pytz is working correctly")
    except Exception as e:
        print(f"   ❌ Pytz error: {e}")
        return False
    
    return True

def check_scheduler_config():
    """Check APScheduler configuration"""
    print_section("APSCHEDULER CONFIGURATION CHECK")
    
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        print("1. ✅ APScheduler imports successful")
        
        # Create test scheduler
        scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        print("2. ✅ BackgroundScheduler created with Asia/Kolkata timezone")
        print(f"   Scheduler timezone: {scheduler.timezone}")
        
        # Test cron trigger
        trigger = CronTrigger(hour=0, minute=30, timezone="Asia/Kolkata")
        print("3. ✅ CronTrigger created for 00:30 IST")
        print(f"   Trigger: {trigger}")
        
        # Calculate next run time
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        next_run = trigger.get_next_fire_time(None, now)
        print(f"4. Next scheduled run: {next_run}")
        print(f"   Time until next run: {next_run - now}")
        
        return True
        
    except Exception as e:
        print(f"❌ Scheduler configuration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_auto_clockout_config():
    """Check auto clockout service configuration"""
    print_section("AUTO CLOCKOUT SERVICE CONFIGURATION")
    
    try:
        # Try to import the service
        from services.auto_clockout_service import AUTO_CLOCKOUT_TIME, auto_clockout_all_active_sessions
        
        print(f"1. ✅ Service imported successfully")
        print(f"2. Configured AUTO_CLOCKOUT_TIME: {AUTO_CLOCKOUT_TIME}")
        print(f"   Hour: {AUTO_CLOCKOUT_TIME.hour}")
        print(f"   Minute: {AUTO_CLOCKOUT_TIME.minute}")
        print(f"   Second: {AUTO_CLOCKOUT_TIME.second}")
        
        # Check current time vs configured time
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        current_time = now.time()
        
        print(f"3. Current IST time: {current_time}")
        print(f"4. Comparison:")
        print(f"   Current time: {current_time.hour:02d}:{current_time.minute:02d}:{current_time.second:02d}")
        print(f"   Config time:  {AUTO_CLOCKOUT_TIME.hour:02d}:{AUTO_CLOCKOUT_TIME.minute:02d}:{AUTO_CLOCKOUT_TIME.second:02d}")
        
        if current_time >= AUTO_CLOCKOUT_TIME:
            print(f"   ✅ Current time is PAST configured time (job should run)")
        else:
            time_until = datetime.combine(datetime.today(), AUTO_CLOCKOUT_TIME) - datetime.combine(datetime.today(), current_time)
            print(f"   ⏰ Current time is BEFORE configured time")
            print(f"   ⏰ Time until job runs: {time_until}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Cannot import service: {e}")
        print("   Make sure auto_clockout_service.py is in the services/ directory")
        return False
    except Exception as e:
        print(f"❌ Error checking service: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_database_connectivity():
    """Check database connection and table structure"""
    print_section("DATABASE CONNECTIVITY CHECK")
    
    try:
        from database.connection import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("1. ✅ Database connection successful")
        
        # Check if auto_clocked_out columns exist
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'attendance'
                AND column_name IN ('auto_clocked_out', 'auto_clockout_reason')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        
        if len(columns) == 2:
            print("2. ✅ Required columns exist in attendance table:")
            for col in columns:
                print(f"   • {col['column_name']}: {col['data_type']}")
        else:
            print(f"2. ❌ Missing columns! Found {len(columns)}/2")
            print("   Run the database migration script first!")
            return False
        
        # Check for active sessions
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM attendance
            WHERE logout_time IS NULL
                AND date = CURRENT_DATE
        """)
        
        result = cursor.fetchone()
        active_count = result['count']
        
        print(f"3. Active sessions today: {active_count}")
        
        if active_count > 0:
            print("   ✅ Found active sessions to clock out")
            
            # Show details
            cursor.execute("""
                SELECT 
                    employee_email,
                    login_time,
                    EXTRACT(EPOCH FROM (NOW() - login_time))/3600 as hours_since_login
                FROM attendance
                WHERE logout_time IS NULL
                    AND date = CURRENT_DATE
                LIMIT 5
            """)
            
            sessions = cursor.fetchall()
            print("   Active session details:")
            for session in sessions:
                print(f"     • {session['employee_email']}: logged in {session['hours_since_login']:.1f}h ago")
        else:
            print("   ⚠️  No active sessions found")
            print("   (Auto clock-out will skip when no sessions to process)")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_scheduler_running():
    """Check if scheduler is actually running in the Flask app"""
    print_section("SCHEDULER RUNTIME CHECK")
    
    print("⚠️  This check requires the Flask app to be running")
    print("    To verify scheduler is running, check Flask logs for:")
    print("    '🟢 APScheduler started successfully'")
    print("    '⏰ Auto clockout scheduled: Daily at 12:30 AM IST'")
    print()
    print("Common issues if scheduler not running:")
    print("  1. Flask in debug mode with reloader (scheduler starts twice)")
    print("  2. Scheduler not started (check if start_scheduler() is called)")
    print("  3. Import errors preventing scheduler initialization")
    print("  4. Timezone not set before scheduler starts")

def test_manual_trigger():
    """Test manual trigger of auto clockout"""
    print_section("MANUAL TRIGGER TEST")
    
    try:
        from services.auto_clockout_service import manual_trigger_auto_clockout
        
        print("Testing manual trigger (this will actually clock out active sessions)...")
        response = input("Do you want to proceed? (yes/no): ")
        
        if response.lower() != 'yes':
            print("Skipping manual trigger test")
            return True
        
        print("\n🔄 Running manual trigger...")
        result = manual_trigger_auto_clockout()
        
        print(f"\n📊 Result:")
        print(f"   Success: {result['success']}")
        print(f"   Message: {result['message']}")
        print(f"   Auto clocked out: {result['auto_clocked_out']}")
        
        if result.get('details'):
            print(f"\n   Details:")
            for detail in result['details']:
                print(f"     • {detail['employee_email']}")
                print(f"       Working hours: {detail['working_hours']}h")
                print(f"       Activities closed: {detail['activities_closed']}")
                print(f"       Field visits closed: {detail['field_visits_closed']}")
        
        return result['success']
        
    except Exception as e:
        print(f"❌ Manual trigger error: {e}")
        import traceback
        traceback.print_exc()
        return False

def provide_recommendations(results):
    """Provide recommendations based on check results"""
    print_section("RECOMMENDATIONS & FIXES")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("✅ All checks passed!")
        print("\nIf auto clock-out is still not working:")
        print("1. Restart your Flask application")
        print("2. Check Flask logs for scheduler start message")
        print("3. Verify current time is past 12:30 AM (00:30)")
        print("4. Try manual trigger test")
    else:
        print("❌ Some checks failed. Here's what to fix:")
        print()
        
        if not results.get('timezone'):
            print("🔧 TIMEZONE ISSUE:")
            print("   Add this to the top of app.py (before any imports):")
            print("   ```python")
            print("   import os")
            print("   import time")
            print("   os.environ['TZ'] = 'Asia/Kolkata'")
            print("   time.tzset()  # Only on Unix/Linux")
            print("   ```")
            print()
        
        if not results.get('scheduler'):
            print("🔧 SCHEDULER ISSUE:")
            print("   1. Install APScheduler: pip install apscheduler")
            print("   2. Make sure scheduler is started in app.py:")
            print("      if __name__ == '__main__':")
            print("          start_scheduler()")
            print()
        
        if not results.get('service'):
            print("🔧 SERVICE CONFIGURATION ISSUE:")
            print("   1. Make sure auto_clockout_service.py is in services/ folder")
            print("   2. Check AUTO_CLOCKOUT_TIME is set correctly")
            print("   3. Verify imports are working")
            print()
        
        if not results.get('database'):
            print("🔧 DATABASE ISSUE:")
            print("   1. Run database migration: python run_migration.py")
            print("   2. Or run migration_simple.sql directly")
            print("   3. Verify database connection settings")
            print()

def main():
    """Run all diagnostic checks"""
    print("=" * 80)
    print("  AUTO CLOCK-OUT DIAGNOSTIC TOOL")
    print("  Checking system configuration, timezone, scheduler, and database")
    print("=" * 80)
    
    results = {
        'timezone': False,
        'scheduler': False,
        'service': False,
        'database': False,
    }
    
    # Run all checks
    results['timezone'] = check_timezone()
    results['scheduler'] = check_scheduler_config()
    results['service'] = check_auto_clockout_config()
    results['database'] = check_database_connectivity()
    
    # Runtime check (informational only)
    check_scheduler_running()
    
    # Provide recommendations
    provide_recommendations(results)
    
    # Optional manual test
    print("\n" + "=" * 80)
    if all(results.values()):
        test_response = input("\nWould you like to test manual trigger? (yes/no): ")
        if test_response.lower() == 'yes':
            test_manual_trigger()
    
    print("\n" + "=" * 80)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 80)
    
    # Return exit code
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())