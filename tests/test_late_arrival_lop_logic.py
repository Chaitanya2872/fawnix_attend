from datetime import date, datetime

import services.attendance_exceptions_service as exceptions_service
import services.leaves_service as leaves_service


def test_auto_detect_late_arrival_uses_1015_cutoff(monkeypatch):
    monkeypatch.setattr(exceptions_service.Config, "LATE_LOGIN_CUTOFF", "10:15")

    on_time = exceptions_service.auto_detect_late_arrival(
        "EMP001",
        101,
        datetime(2026, 5, 27, 10, 15, 0),
    )
    late = exceptions_service.auto_detect_late_arrival(
        "EMP001",
        102,
        datetime(2026, 5, 27, 10, 16, 0),
    )

    assert on_time is None
    assert late is not None
    assert late["late_by_minutes"] == 1
    assert late["actual_login_time"] == "10:16"
    assert late["shift_start_time"] == "10:15"


def test_calculate_late_arrival_lop_deduction_uses_new_thresholds():
    assert leaves_service.calculate_late_arrival_lop_deduction(2) == 0.0
    assert leaves_service.calculate_late_arrival_lop_deduction(3) == 0.5
    assert leaves_service.calculate_late_arrival_lop_deduction(5) == 0.5
    assert leaves_service.calculate_late_arrival_lop_deduction(6) == 1.0


def test_send_lop_detected_notification_formats_dynamic_message(monkeypatch):
    captured = {}

    monkeypatch.setattr(
        exceptions_service,
        "get_monthly_late_arrival_lop_summary",
        lambda emp_code, reference_date=None, extra_late_arrivals=0: {
            "reference_date": "2026-05-27",
            "period_start": "2026-05-01",
            "period_end": "2026-05-27",
            "late_arrival_count": 4,
            "lop_deduction_days": 0.5,
        },
    )

    def fake_send(emp_code, title, body, data=None, latest_only=False):
        captured["emp_code"] = emp_code
        captured["title"] = title
        captured["body"] = body
        captured["data"] = data or {}
        captured["latest_only"] = latest_only
        return {"success": True, "message": "Push notification sent successfully"}

    monkeypatch.setattr(exceptions_service, "send_push_notification_to_employee", fake_send)

    result = exceptions_service.send_lop_detected_notification(
        "EMP001",
        reference_date=date(2026, 5, 27),
        trigger_source="late_clock_in",
    )

    assert result["success"] is True
    assert captured["emp_code"] == "EMP001"
    assert captured["title"] == "LOP detected"
    assert captured["body"] == "LOP detected — 4 late arrivals, 0.5 days deducted ,GooD Morning"
    assert captured["data"]["type"] == "lop_detected"
    assert captured["data"]["trigger_source"] == "late_clock_in"
    assert captured["data"]["late_arrival_count"] == 4
    assert captured["data"]["lop_deduction_days"] == 0.5
    assert captured["latest_only"] is True


def test_send_lop_detected_notification_uses_singular_day_for_one(monkeypatch):
    captured = {}

    monkeypatch.setattr(
        exceptions_service,
        "get_monthly_late_arrival_lop_summary",
        lambda emp_code, reference_date=None, extra_late_arrivals=0: {
            "reference_date": "2026-05-27",
            "period_start": "2026-05-01",
            "period_end": "2026-05-27",
            "late_arrival_count": 7,
            "lop_deduction_days": 1.0,
        },
    )

    def fake_send(emp_code, title, body, data=None, latest_only=False):
        captured["body"] = body
        return {"success": True, "message": "Push notification sent successfully"}

    monkeypatch.setattr(exceptions_service, "send_push_notification_to_employee", fake_send)

    result = exceptions_service.send_lop_detected_notification("EMP001")

    assert result["success"] is True
    assert captured["body"] == "LOP detected — 7 late arrivals, 1 day deducted ,GooD Morning"
