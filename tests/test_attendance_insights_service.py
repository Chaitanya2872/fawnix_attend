from datetime import date

from services import attendance_insights_service


class StubCursor:
    def close(self):
        pass


class StubConnection:
    def cursor(self):
        return StubCursor()


def _install_stubs(monkeypatch, employees, attendance, leaves, holidays, overrides):
    """
    Replaces the DB access in the insights service so the aggregation itself can
    be exercised without a database. The fetch helpers are shared with the
    heatmap service, and their shapes are pinned by the heatmap tests.
    """
    monkeypatch.setattr(attendance_insights_service, 'get_db_connection', StubConnection)
    monkeypatch.setattr(attendance_insights_service, 'return_connection', lambda conn: None)
    monkeypatch.setattr(attendance_insights_service, '_fetch_employees', lambda cursor: employees)
    monkeypatch.setattr(attendance_insights_service, '_fetch_attendance_by_day', lambda cursor, start, end: attendance)
    monkeypatch.setattr(attendance_insights_service, '_fetch_leave_days', lambda cursor, start, end: leaves)
    monkeypatch.setattr(attendance_insights_service, '_fetch_holidays', lambda cursor, start, end: holidays)
    monkeypatch.setattr(attendance_insights_service, '_fetch_overrides', lambda cursor, start, end: overrides)


def _sample_payload(monkeypatch):
    employees = [
        {"emp_code": "EMP1", "emp_full_name": "Asha Rao", "emp_joined_date": "2026-01-01"},
        {"emp_code": "EMP2", "emp_full_name": "Neel Shah", "emp_joined_date": "2026-07-08"},
    ]
    present = {"status": "P", "working_hours": 8.0}
    attendance = {
        # previous window (2026-06-27 .. 2026-07-03): four of five working days
        ("EMP1", date(2026, 6, 29)): present,
        ("EMP1", date(2026, 6, 30)): present,
        ("EMP1", date(2026, 7, 1)): present,
        ("EMP1", date(2026, 7, 2)): present,
        # current window (2026-07-04 .. 2026-07-10)
        ("EMP1", date(2026, 7, 4)): present,
        ("EMP1", date(2026, 7, 8)): present,
        ("EMP1", date(2026, 7, 9)): present,
        ("EMP1", date(2026, 7, 10)): present,
        ("EMP2", date(2026, 7, 9)): present,
    }
    leaves = {("EMP1", date(2026, 7, 7)): "Casual leave"}
    holidays = {date(2026, 7, 6): "Founders Day"}
    overrides = {("EMP2", date(2026, 7, 10)): {"status": "WFH", "remarks": "Approved remote"}}

    _install_stubs(monkeypatch, employees, attendance, leaves, holidays, overrides)
    payload, status_code = attendance_insights_service.get_attendance_insights(end_date='2026-07-10', window_days=7)
    assert status_code == 200
    return payload


def test_efficiency_ignores_holidays_week_offs_and_pre_joining_days(monkeypatch):
    payload = _sample_payload(monkeypatch)

    # Expected days: EMP1 works 04, 07, 08, 09, 10 (05 is a Sunday, 06 a holiday);
    # EMP2 joined on the 8th, so only 08, 09, 10 count for them.
    assert payload["efficiency"]["expected_days"] == 8
    # EMP1 attended four of those, EMP2 attended the 9th and is WFH on the 10th.
    assert payload["efficiency"]["present_days"] == 6
    assert payload["efficiency"]["score"] == 75.0
    assert payload["efficiency"]["rating"] == "Fair"


def test_previous_window_drives_the_delta(monkeypatch):
    payload = _sample_payload(monkeypatch)

    assert payload["previous_start_date"] == "2026-06-27"
    assert payload["previous_end_date"] == "2026-07-03"
    # 2026-06-27 is the fourth Saturday and the 28th a Sunday, so the previous
    # window only expects the five weekdays, four of which were attended.
    assert payload["efficiency"]["previous_score"] == 80.0
    assert payload["efficiency"]["delta"] == -5.0


def test_trend_marks_non_working_days_instead_of_reporting_zero(monkeypatch):
    payload = _sample_payload(monkeypatch)
    trend = {day["date"]: day for day in payload["trend"]}

    assert len(payload["trend"]) == 7
    assert trend["2026-07-05"]["is_working_day"] is False
    assert trend["2026-07-05"]["percentage"] is None
    assert trend["2026-07-06"]["percentage"] is None
    assert trend["2026-07-07"] == {
        "date": "2026-07-07", "label": "Tue", "present": 0, "leave": 1, "absent": 0,
        "expected": 1, "percentage": 0.0, "is_working_day": True,
    }
    assert trend["2026-07-08"]["percentage"] == 50.0
    assert trend["2026-07-10"]["percentage"] == 100.0


def test_totals_count_the_current_window_only(monkeypatch):
    payload = _sample_payload(monkeypatch)

    assert payload["totals"] == {
        "employees": 2,
        "present": 6,
        "leave": 1,
        "absent": 1,
        "holiday": 1,
        "week_off": 1,
        "manual": 1,
    }


def test_employee_scores_are_listed_weakest_first(monkeypatch):
    payload = _sample_payload(monkeypatch)

    assert payload["employees"] == [
        {"emp_code": "EMP2", "emp_full_name": "Neel Shah", "emp_department": "",
         "present_days": 2, "expected_days": 3, "score": 66.7},
        {"emp_code": "EMP1", "emp_full_name": "Asha Rao", "emp_department": "",
         "present_days": 4, "expected_days": 5, "score": 80.0},
    ]


def test_window_is_validated(monkeypatch):
    _install_stubs(monkeypatch, [], {}, {}, {}, {})

    _payload, status_code = attendance_insights_service.get_attendance_insights(window_days=0)
    assert status_code == 400

    _payload, status_code = attendance_insights_service.get_attendance_insights(end_date='not-a-date')
    assert status_code == 400
