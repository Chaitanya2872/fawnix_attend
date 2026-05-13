from datetime import date

import services.admin_service as admin_service


class AdminCalendarCursor:
    def __init__(self, holiday_rows=None, employee_columns=None):
        self.holiday_rows = holiday_rows or []
        self.employee_columns = employee_columns or []
        self.fetchone_value = None
        self.fetchall_value = []

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM information_schema.columns" in normalized_sql:
            table_name = params[0]
            if table_name == "organization_holidays":
                self.fetchall_value = [
                    {"column_name": "holiday_date"},
                    {"column_name": "holiday_name"},
                    {"column_name": "holiday_type"},
                    {"column_name": "description"},
                    {"column_name": "status"},
                ]
            elif table_name == "employees":
                self.fetchall_value = [
                    {"column_name": column_name}
                    for column_name in self.employee_columns
                ]
            else:
                self.fetchall_value = []
            return

        if "FROM organization_holidays" in normalized_sql:
            self.fetchall_value = list(self.holiday_rows)
            return

        if "FROM attendance a" in normalized_sql:
            self.fetchall_value = []
            return

        if "FROM comp_offs c" in normalized_sql:
            self.fetchall_value = []
            return

        if "FROM leaves l" in normalized_sql:
            self.fetchall_value = []
            return

        if "birthday_mmdd" in normalized_sql:
            self.fetchall_value = []
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def fetchall(self):
        return self.fetchall_value

    def close(self):
        pass


class AdminCalendarConnection:
    def __init__(self, holiday_rows=None, employee_columns=None):
        self.cursor_obj = AdminCalendarCursor(
            holiday_rows=holiday_rows,
            employee_columns=employee_columns,
        )

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def test_get_admin_holidays_includes_fourth_saturday_and_half_day_entries(monkeypatch):
    connection = AdminCalendarConnection()
    monkeypatch.setattr(admin_service, "get_db_connection", lambda: connection)

    response, status_code = admin_service.get_admin_holidays(year=2026, month=4)

    assert status_code == 200
    holidays_by_date = {
        row["date"]: row for row in response["data"]["holidays"]
    }

    second_saturday = holidays_by_date["2026-04-11"]
    assert second_saturday["isHoliday"] is True
    assert second_saturday["isSecondSaturday"] is True
    assert second_saturday["dayType"] == "Second Saturday"

    fourth_saturday = holidays_by_date["2026-04-25"]
    assert fourth_saturday["isHoliday"] is True
    assert fourth_saturday["isFourthSaturday"] is True
    assert fourth_saturday["holidayName"] == "Fourth Saturday"
    assert fourth_saturday["dayType"] == "Fourth Saturday"

    first_saturday = holidays_by_date["2026-04-04"]
    assert first_saturday["isHoliday"] is False
    assert first_saturday["isSaturdayHalfDay"] is True
    assert first_saturday["holidayType"] == "Half Day"
    assert first_saturday["dayType"] == "Half Day Saturday"


def test_get_calendar_summary_marks_fourth_saturday_and_half_day_saturday(monkeypatch):
    connection = AdminCalendarConnection(employee_columns=[])
    monkeypatch.setattr(admin_service, "get_db_connection", lambda: connection)

    response, status_code = admin_service.get_calendar_summary(month=4, year=2026)

    assert status_code == 200
    summary_by_date = {
        row["date"]: row for row in response["data"]["summary"]
    }

    fourth_saturday = summary_by_date["2026-04-25"]
    assert fourth_saturday["isHoliday"] is True
    assert fourth_saturday["isFourthSaturday"] is True
    assert fourth_saturday["holidayName"] == "Fourth Saturday"
    assert fourth_saturday["dayType"] == "Fourth Saturday"

    half_day_saturday = summary_by_date["2026-04-18"]
    assert half_day_saturday["isHoliday"] is False
    assert half_day_saturday["isSaturdayHalfDay"] is True
    assert half_day_saturday["holidayType"] == "Half Day"
    assert half_day_saturday["dayType"] == "Half Day Saturday"
