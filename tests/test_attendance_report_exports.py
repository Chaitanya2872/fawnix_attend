from datetime import date, datetime

from services import admin_service


def test_build_daily_attendance_report_rows_formats_duration_and_incomplete_values():
    records = [
        {
            "date": date(2026, 4, 3),
            "emp_code": "EMP001",
            "emp_full_name": "Alice Smith",
            "employee_email": "alice@example.com",
            "employee_name": "Alice Smith",
            "login_time": datetime(2026, 4, 3, 9, 0),
            "logout_time": datetime(2026, 4, 3, 18, 45),
        },
        {
            "date": date(2026, 4, 3),
            "emp_code": "EMP002",
            "emp_full_name": "Bob Green",
            "employee_email": "bob@example.com",
            "employee_name": "Bob Green",
            "login_time": datetime(2026, 4, 3, 9, 30),
            "logout_time": None,
        },
    ]

    daily_rows = admin_service.build_daily_attendance_report_rows(records)

    assert len(daily_rows) == 2

    assert daily_rows[0]["employee_id"] == "EMP001"
    assert daily_rows[0]["employee_name"] == "Alice Smith"
    assert daily_rows[0]["clock_in_display"] == "09:00 AM"
    assert daily_rows[0]["clock_out_display"] == "06:45 PM"
    assert daily_rows[0]["duration_minutes"] == 585
    assert daily_rows[0]["duration_display"] == "9h 45m"
    assert daily_rows[0]["overtime_minutes"] == 105
    assert daily_rows[0]["overtime_display"] == "1h 45m"

    assert daily_rows[1]["employee_id"] == "EMP002"
    assert daily_rows[1]["clock_out_display"] == "Incomplete"
    assert daily_rows[1]["duration_minutes"] is None
    assert daily_rows[1]["duration_display"] == "Incomplete"
    assert daily_rows[1]["overtime_display"] == "Incomplete"


def test_build_monthly_attendance_report_rows_summarizes_from_daily_rows():
    daily_rows = [
        {
            "date": date(2026, 4, 1),
            "employee_id": "EMP001",
            "employee_name": "Alice Smith",
            "duration_minutes": 540,
            "overtime_minutes": 60,
        },
        {
            "date": date(2026, 4, 2),
            "employee_id": "EMP001",
            "employee_name": "Alice Smith",
            "duration_minutes": None,
            "overtime_minutes": None,
        },
        {
            "date": date(2026, 4, 3),
            "employee_id": "EMP001",
            "employee_name": "Alice Smith",
            "duration_minutes": 495,
            "overtime_minutes": 15,
        },
        {
            "date": date(2026, 4, 1),
            "employee_id": "EMP002",
            "employee_name": "Bob Green",
            "duration_minutes": 420,
            "overtime_minutes": 0,
        },
    ]

    monthly_rows = admin_service.build_monthly_attendance_report_rows(daily_rows)

    assert [row["employee_id"] for row in monthly_rows] == ["EMP001", "EMP002"]

    alice_summary = monthly_rows[0]
    assert alice_summary["total_working_days"] == 2
    assert alice_summary["total_hours_minutes"] == 1035
    assert alice_summary["total_hours_display"] == "17h 15m"
    assert alice_summary["average_minutes_per_day"] == 518
    assert alice_summary["average_hours_display"] == "8h 38m"
    assert alice_summary["total_overtime_minutes"] == 75
    assert alice_summary["total_overtime_display"] == "1h 15m"

    bob_summary = monthly_rows[1]
    assert bob_summary["total_working_days"] == 1
    assert bob_summary["total_hours_display"] == "7h 00m"
    assert bob_summary["average_hours_display"] == "7h 00m"
    assert bob_summary["total_overtime_display"] == "0h 00m"


def test_build_monthly_attendance_report_rows_counts_unique_worked_dates_for_multiple_sessions():
    daily_rows = [
        {
            "date": date(2026, 4, 5),
            "employee_id": "EMP003",
            "employee_name": "Cara Wells",
            "duration_minutes": 240,
            "overtime_minutes": 0,
        },
        {
            "date": date(2026, 4, 5),
            "employee_id": "EMP003",
            "employee_name": "Cara Wells",
            "duration_minutes": 300,
            "overtime_minutes": 0,
        },
        {
            "date": date(2026, 4, 6),
            "employee_id": "EMP003",
            "employee_name": "Cara Wells",
            "duration_minutes": 600,
            "overtime_minutes": 120,
        },
    ]

    monthly_rows = admin_service.build_monthly_attendance_report_rows(daily_rows)

    assert len(monthly_rows) == 1
    cara_summary = monthly_rows[0]
    assert cara_summary["employee_id"] == "EMP003"
    assert cara_summary["total_working_days"] == 2
    assert cara_summary["total_hours_minutes"] == 1140
    assert cara_summary["total_hours_display"] == "19h 00m"
    assert cara_summary["average_minutes_per_day"] == 570
    assert cara_summary["average_hours_display"] == "9h 30m"
    assert cara_summary["total_overtime_minutes"] == 120
    assert cara_summary["total_overtime_display"] == "2h 00m"
