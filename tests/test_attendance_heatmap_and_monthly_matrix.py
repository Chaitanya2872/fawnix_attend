from datetime import date

from routes.admin import _build_monthly_attendance_workbook
from services import attendance_heatmap_service


class HolidayCursor:
    def __init__(self):
        self.rows = []
        self.queries = []

    def execute(self, sql, params=None):
        normalized = " ".join(sql.split())
        self.queries.append(normalized)
        if "information_schema.columns" in normalized:
            self.rows = [{"column_name": "holiday_date"}, {"column_name": "holiday_name"}]
        elif "FROM organization_holidays" in normalized:
            self.rows = [{"holiday_date": date(2026, 7, 4), "holiday_name": "Founders Day", "status": "Active"}]
        else:
            raise AssertionError(f"Unexpected SQL: {normalized}")

    def fetchall(self):
        return self.rows


def test_fetch_holidays_uses_active_fallback_for_legacy_schema():
    cursor = HolidayCursor()

    holidays = attendance_heatmap_service._fetch_holidays(cursor, date(2026, 7, 1), date(2026, 7, 31))

    holiday_query = next(query for query in cursor.queries if "FROM organization_holidays" in query)
    assert "'Active'::TEXT AS status" in holiday_query
    assert holidays == {date(2026, 7, 4): "Founders Day"}


def test_monthly_workbook_has_day_matrix_and_status_summaries():
    employees = [{
        "emp_code": "EMP001",
        "emp_full_name": "Asha Rao",
        "emp_department": "IoT",
        "emp_designation": "Engineer",
        "emp_joined_date": "2026-06-15",
        "days": [
            {"date": "2026-07-01", "status": "P", "remarks": None},
            {"date": "2026-07-02", "status": "S", "remarks": None},
            {"date": "2026-07-03", "status": "WFH", "remarks": "Approved remote"},
            {"date": "2026-07-04", "status": "H", "remarks": "Founders Day"},
            {"date": "2026-07-05", "status": "O", "remarks": None},
            {"date": "2026-07-06", "status": "L", "remarks": "Casual leave"},
            {"date": "2026-07-07", "status": "A", "remarks": None},
        ],
    }, {
        "emp_code": "EMP002",
        "emp_full_name": "Neel Shah",
        "emp_department": "Operations",
        "emp_designation": "Coordinator",
        "emp_joined_date": "2026-07-15",
        "days": [
            {"date": "2026-07-15", "status": "P", "remarks": None},
            {"date": "2026-07-16", "status": "H", "remarks": "Holiday"},
            {"date": "2026-07-17", "status": "L", "remarks": "Approved leave"},
            {"date": "2026-07-18", "status": "A", "remarks": None},
        ],
    }]

    workbook = _build_monthly_attendance_workbook(7, 2026, employees)
    sheet = workbook["Attendance"]
    headers = [sheet.cell(2, column).value for column in range(1, sheet.max_column + 1)]

    assert sheet.cell(1, 1).value == "MONTHLY ATTENDANCE REPORT - JULY 2026"
    assert headers[:7] == ["S#", "Employee ID", "Project / Department", "Employee Name", "Designation", "DOJ", date(2026, 7, 1)]
    assert headers[36] == date(2026, 7, 31)
    assert sheet.cell(2, 7).number_format == "d"
    assert headers[37:] == ["Working Days", "Holidays / Week Off", "Leave Availed", "Absent", "Total Days",
                            "Adjustments / LOP", "Final Attendance", "Calendar Days", "LOP", "Release Type", "Remarks"]
    assert [sheet.cell(3, column).value for column in range(7, 14)] == ["P", "S", "WFH", "H", "O", "L", "A"]
    assert [sheet.cell(3, column).value for column in range(38, 47)] == [3, 2, 1, 1, 7, 0, 6, 7, 1]
    # The mid-month joiner has no pre-DOJ statuses, so only four included days
    # are reconciled and exactly the one absence becomes LOP.
    assert [sheet.cell(4, column).value for column in range(38, 47)] == [1, 1, 1, 1, 4, 0, 3, 4, 1]
    assert sheet.freeze_panes == "G3"
    assert sheet.page_setup.orientation == "landscape"
