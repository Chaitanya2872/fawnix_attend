import csv
from datetime import date, datetime, time
from io import StringIO

from routes import admin


class _SchemaCursor:
    """Stands in for a DB cursor answering only the information_schema probe."""

    def __init__(self, column_names, table_name='attendance_exceptions'):
        self.column_names = column_names
        self.table_name = table_name

    def execute(self, query, params):
        assert 'information_schema.columns' in query
        assert params == (self.table_name,)

    def fetchall(self):
        return [{'column_name': name} for name in self.column_names]


MODERN_EXCEPTION_COLUMNS = [
    'id', 'emp_code', 'emp_name', 'emp_email', 'attendance_id', 'exception_type',
    'exception_date', 'exception_time', 'planned_arrival_time', 'planned_leave_time',
    'late_by_minutes', 'early_by_minutes', 'reason', 'notes', 'status', 'manager_code',
    'manager_email', 'requested_at', 'reviewed_by', 'reviewed_at', 'manager_remarks',
    'created_at', 'updated_at',
]

LEGACY_EXCEPTION_COLUMNS = [
    'id', 'attendance_id', 'exception_type', 'reason', 'status',
    'approved_by', 'approved_at', 'created_at',
]


MODERN_OVERTIME_COLUMNS = [
    'id', 'attendance_id', 'emp_code', 'emp_email', 'emp_name', 'work_date',
    'day_of_week', 'day_type', 'clock_in_sequence', 'standard_hours', 'actual_hours',
    'extra_hours', 'comp_off_days', 'status', 'recording_deadline', 'expires_at',
    'expired_at', 'approval_completed_at', 'utilized_at', 'compoff_request_id',
    'created_at', 'updated_at',
]

LEGACY_OVERTIME_COLUMNS = [
    'id', 'attendance_id', 'emp_code', 'emp_email', 'work_date',
    'standard_hours', 'actual_hours', 'extra_hours', 'status',
    'recording_deadline', 'expires_at',
]


def _export_csv_rows(report_type, rows, **kwargs):
    config = admin.RANGE_REPORT_CONFIG[report_type]
    response = admin._export_range_report(
        report_type, 'csv', date(2026, 4, 1), date(2026, 4, 30), rows, config, **kwargs
    )
    parsed = list(csv.reader(StringIO(response.get_data(as_text=True))))
    return response, parsed[0], parsed[1:]


def test_exceptions_report_uses_hr_readable_headers_and_values():
    rows = [{
        'emp_code': 'EMP001',
        'employee_name': 'Alice Smith',
        'emp_email': 'alice@example.com',
        'emp_department': 'Finance',
        'emp_designation': 'Analyst',
        'exception_date': date(2026, 4, 3),
        'exception_type': 'late_arrival',
        'actual_time': time(10, 22),
        'planned_arrival_time': time(9, 30),
        'planned_leave_time': None,
        'late_by_minutes': 52,
        'early_by_minutes': None,
        'reason': 'Traffic delay',
        'notes': 'Informed manager',
        'status': 'approved',
        'manager_code': 'MGR007',
        'manager_email': 'manager@example.com',
        'requested_at': datetime(2026, 4, 3, 8, 15),
        'reviewed_by': 'MGR007',
        'reviewed_at': datetime(2026, 4, 3, 11, 0),
        'manager_remarks': 'Approved',
    }]

    _response, headers, data_rows = _export_csv_rows('exceptions', rows)

    assert headers == [
        'Employee ID', 'Employee Name', 'Employee Email', 'Department', 'Designation',
        'Exception Date', 'Exception Type', 'Actual Time', 'Planned Arrival Time',
        'Planned Leave Time', 'Late By (Minutes)', 'Early By (Minutes)', 'Reason',
        'Employee Notes', 'Approval Status', 'Manager ID', 'Manager Email',
        'Requested On', 'Reviewed By', 'Reviewed On', 'Manager Remarks',
    ]

    row = dict(zip(headers, data_rows[0]))
    assert row['Exception Date'] == '03-Apr-2026'
    assert row['Exception Type'] == 'Late Arrival'
    assert row['Actual Time'] == '10:22 AM'
    assert row['Planned Arrival Time'] == '09:30 AM'
    assert row['Planned Leave Time'] == ''
    assert row['Late By (Minutes)'] == '52'
    assert row['Early By (Minutes)'] == ''
    assert row['Approval Status'] == 'Approved'
    assert row['Requested On'] == '03-Apr-2026 08:15 AM'
    assert row['Reviewed On'] == '03-Apr-2026 11:00 AM'


def test_leaves_report_uses_hr_readable_headers_and_values():
    rows = [{
        'emp_code': 'EMP002',
        'employee_name': 'Bob Green',
        'emp_email': 'bob@example.com',
        'emp_department': 'Sales',
        'emp_designation': 'Executive',
        'leave_type': 'casual',
        'from_date': date(2026, 4, 6),
        'to_date': date(2026, 4, 7),
        'duration': 'first_half',
        'leave_count': 1.5,
        'notes': 'Family function',
        'status': 'pending',
        'applied_at': datetime(2026, 4, 1, 18, 40),
        'manager_code': 'MGR007',
        'manager_email': 'manager@example.com',
        'reviewed_by': None,
        'reviewed_at': None,
        'remarks': None,
    }]

    _response, headers, data_rows = _export_csv_rows('leaves', rows)

    assert headers == [
        'Employee ID', 'Employee Name', 'Employee Email', 'Department', 'Designation',
        'Leave Type', 'From Date', 'To Date', 'Day Type', 'Leave Days', 'Reason',
        'Approval Status', 'Applied On', 'Manager ID', 'Manager Email',
        'Reviewed By', 'Reviewed On', 'Manager Remarks',
    ]

    row = dict(zip(headers, data_rows[0]))
    assert row['Leave Type'] == 'Casual'
    assert row['From Date'] == '06-Apr-2026'
    assert row['To Date'] == '07-Apr-2026'
    assert row['Day Type'] == 'First Half'
    assert row['Leave Days'] == '1.5'
    assert row['Approval Status'] == 'Pending'
    assert row['Applied On'] == '01-Apr-2026 06:40 PM'
    assert row['Reviewed By'] == ''
    assert row['Reviewed On'] == ''


def test_leave_days_drops_trailing_zero_decimal():
    rows = [{'leave_count': 2.0}, {'leave_count': 0.5}, {'leave_count': None}]

    _response, headers, data_rows = _export_csv_rows('leaves', rows)

    days_index = headers.index('Leave Days')
    assert [row[days_index] for row in data_rows] == ['2', '0.5', '']


def test_attendance_report_renders_working_hours_as_hours_and_minutes():
    rows = [{
        'date': date(2026, 4, 3),
        'emp_code': 'EMP001',
        'employee_name': 'Alice Smith',
        'employee_email': 'alice@example.com',
        'present_absent_status': 'Present',
        'emp_department': 'Finance',
        'emp_designation': 'Analyst',
        'login_time': datetime(2026, 4, 3, 9, 0),
        'logout_time': datetime(2026, 4, 3, 18, 45),
        'working_hours': 9.25,
        'status': 'logged_out',
        'attendance_type': 'work_from_home',
    }]

    _response, headers, data_rows = _export_csv_rows('attendance', rows)

    row = dict(zip(headers, data_rows[0]))
    assert row['Date'] == '03-Apr-2026'
    assert row['Present / Absent Status'] == 'Present'
    assert row['Clock In'] == '09:00 AM'
    assert row['Clock Out'] == '06:45 PM'
    assert row['Working Hours'] == '9h 15m'
    assert row['Attendance Status'] == 'Logged Out'
    assert row['Work Mode'] == 'Work From Home'


def test_attendance_report_renders_absent_rows_with_blank_clock_times():
    rows = [{
        'date': date(2026, 4, 3),
        'emp_code': 'EMP002',
        'employee_name': 'Bob Green',
        'employee_email': 'bob@example.com',
        'present_absent_status': 'Absent',
        'emp_department': 'Finance',
        'emp_designation': 'Analyst',
        'login_time': None,
        'logout_time': None,
        'working_hours': None,
        'status': None,
        'attendance_type': None,
    }]

    _response, headers, data_rows = _export_csv_rows('attendance', rows)

    assert headers[:4] == ['Date', 'Employee ID', 'Employee Name', 'Present / Absent Status']
    row = dict(zip(headers, data_rows[0]))
    assert row['Present / Absent Status'] == 'Absent'
    assert row['Clock In'] == ''
    assert row['Clock Out'] == ''
    assert row['Working Hours'] == ''
    assert row['Attendance Status'] == ''


def test_empty_result_still_exports_full_header_row():
    _response, headers, data_rows = _export_csv_rows('exceptions', [])

    assert data_rows == []
    assert headers[0] == 'Employee ID'
    assert len(headers) == len(admin.EXCEPTIONS_RANGE_REPORT_COLUMNS)


def test_report_filename_is_hr_friendly():
    response, _headers, _data_rows = _export_csv_rows('leaves', [])

    assert 'Leave_Report_01-Apr-2026_to_30-Apr-2026.csv' in response.headers['Content-Disposition']


def test_exceptions_query_selects_every_configured_column_on_modern_schema():
    query = admin._build_exceptions_range_query(_SchemaCursor(MODERN_EXCEPTION_COLUMNS))

    for row_key, _label, _formatter in admin.EXCEPTIONS_RANGE_REPORT_COLUMNS:
        assert f'AS {row_key}' in query
    assert 'ae.exception_time AS actual_time' in query
    assert 'ae.reviewed_by AS reviewed_by' in query
    assert 'NULL AS' not in query


def test_exceptions_query_survives_legacy_schema_drift():
    query = admin._build_exceptions_range_query(_SchemaCursor(LEGACY_EXCEPTION_COLUMNS))

    # Every configured column is still present, so headers never shift.
    for row_key, _label, _formatter in admin.EXCEPTIONS_RANGE_REPORT_COLUMNS:
        assert f'AS {row_key}' in query
    # Legacy approval columns back-fill the modern review columns.
    assert 'ae.approved_by AS reviewed_by' in query
    assert 'ae.approved_at AS reviewed_at' in query
    assert 'NULL AS manager_remarks' in query


def test_overtime_report_uses_hr_readable_headers_and_values():
    rows = [{
        'work_date': date(2026, 4, 11),
        'emp_code': 'EMP003',
        'employee_name': 'Carol White',
        'emp_email': 'carol@example.com',
        'emp_department': 'Engineering',
        'emp_designation': 'Developer',
        'day_of_week': 'Saturday',
        'day_type': 'non_working',
        'standard_hours': 0,
        'actual_hours': 6.5,
        'extra_hours': 6.5,
        'comp_off_days': 1.0,
        'status': 'eligible',
        'recording_deadline': date(2026, 5, 11),
        'expires_at': date(2026, 7, 10),
        'approval_completed_at': None,
        'utilized_at': None,
        'created_at': datetime(2026, 4, 11, 19, 5),
    }]

    _response, headers, data_rows = _export_csv_rows('overtime', rows)

    assert headers == [
        'Work Date', 'Employee ID', 'Employee Name', 'Employee Email', 'Department',
        'Designation', 'Day', 'Day Type', 'Standard Hours', 'Actual Hours',
        'Overtime Hours', 'Comp-off Days', 'Status', 'Recording Deadline',
        'Expires On', 'Approved On', 'Utilized On', 'Recorded On',
    ]

    row = dict(zip(headers, data_rows[0]))
    assert row['Work Date'] == '11-Apr-2026'
    assert row['Day Type'] == 'Non Working'
    assert row['Standard Hours'] == '0h 00m'
    assert row['Overtime Hours'] == '6h 30m'
    assert row['Comp-off Days'] == '1'
    assert row['Status'] == 'Eligible'
    assert row['Recording Deadline'] == '11-May-2026'
    assert row['Approved On'] == ''
    assert row['Recorded On'] == '11-Apr-2026 07:05 PM'


def test_overtime_query_selects_every_configured_column_on_modern_schema():
    cursor = _SchemaCursor(MODERN_OVERTIME_COLUMNS, table_name='overtime_records')
    query = admin._build_overtime_range_query(cursor)

    for row_key, _label, _formatter in admin.OVERTIME_RANGE_REPORT_COLUMNS:
        assert f'AS {row_key}' in query
    assert 'NULL AS' not in query
    # Only the two date bounds bind when no employee is selected.
    assert query.count('%s') == 2


def test_overtime_query_survives_legacy_schema_drift():
    cursor = _SchemaCursor(LEGACY_OVERTIME_COLUMNS, table_name='overtime_records')
    query = admin._build_overtime_range_query(cursor)

    # Headers never shift: missing columns come back as NULL rather than failing.
    for row_key, _label, _formatter in admin.OVERTIME_RANGE_REPORT_COLUMNS:
        assert f'AS {row_key}' in query
    assert 'NULL AS day_of_week' in query
    assert 'NULL AS comp_off_days' in query
    assert 'e.emp_full_name AS employee_name' in query


def test_every_range_report_can_be_scoped_to_one_employee():
    """
    The employee predicate always trails the date predicate, so the route can
    bind (start, end, emp_code) uniformly across every report.
    """
    builder_cursors = {
        'exceptions': _SchemaCursor(MODERN_EXCEPTION_COLUMNS),
        'overtime': _SchemaCursor(MODERN_OVERTIME_COLUMNS, table_name='overtime_records'),
    }

    for report_type, config in admin.RANGE_REPORT_CONFIG.items():
        employee_filter = config['employee_filter']
        query_builder = config.get('query_builder')
        if query_builder:
            query = query_builder(builder_cursors[report_type], employee_filter)
        else:
            query = config['query'].format(employee_filter=employee_filter)

        assert query.count('%s') == 3, report_type
        assert employee_filter in query, report_type
        # The emp_code placeholder is the last one bound.
        assert query.rindex('%s') == query.rindex(employee_filter) + len(employee_filter) - 2


def test_unscoped_reports_bind_only_the_date_range():
    for report_type, config in admin.RANGE_REPORT_CONFIG.items():
        if config.get('query_builder'):
            continue
        assert config['query'].format(employee_filter='').count('%s') == 2, report_type


def test_employee_scoped_filename_names_the_employee():
    response, _headers, _data_rows = _export_csv_rows(
        'overtime', [], emp_code='EMP003', employee_name='Carol White'
    )

    disposition = response.headers['Content-Disposition']
    assert 'Overtime_Report_Carol_White_01-Apr-2026_to_30-Apr-2026.csv' in disposition


def test_employee_scoped_filename_falls_back_to_the_code():
    response, _headers, _data_rows = _export_csv_rows('leaves', [], emp_code='EMP/003')

    assert 'Leave_Report_EMP_003_01-Apr-2026_to_30-Apr-2026.csv' in response.headers['Content-Disposition']
