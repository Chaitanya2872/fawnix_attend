"""
Attendance Insights Service

Powers the summary cards on the admin Reports page: the organisation-wide
attendance efficiency score (with its week-over-week delta) and the daily
attendance trend plotted beside it.

Everything is derived from the same per-employee/per-day status matrix the
heatmap renders, so a cell corrected by hand in the heatmap immediately moves
the score - the numbers on one page can never disagree with the other.
"""

from database.connection import get_db_connection, return_connection
from datetime import date, timedelta

from services.attendance_heatmap_service import (
    SOURCE_MANUAL,
    _coerce_date,
    _derive_cell,
    _fetch_attendance_by_day,
    _fetch_employees,
    _fetch_holidays,
    _fetch_leave_days,
    _fetch_overrides,
)

DEFAULT_WINDOW_DAYS = 7
MAX_WINDOW_DAYS = 31

# Statuses that count as the employee having worked that day.
PRESENT_STATUSES = ('P', 'S', 'WFH')
# Statuses where no attendance was expected, so the day is left out of the score.
NON_WORKING_STATUSES = ('H', 'O')

RATING_BANDS = (
    (95, 'Excellent'),
    (85, 'Good'),
    (70, 'Fair'),
    (0, 'Needs attention'),
)


def _rating_for(score):
    if score is None:
        return 'No data'
    for threshold, label in RATING_BANDS:
        if score >= threshold:
            return label
    return 'Needs attention'


def _percentage(numerator: int, denominator: int):
    """Rounded percentage, or None when nothing was expected (avoids a fake 0%)."""
    if not denominator:
        return None
    return round((numerator / denominator) * 100, 1)


def _daterange(start_date: date, end_date: date):
    current_date = start_date
    while current_date <= end_date:
        yield current_date
        current_date += timedelta(days=1)


def _resolve_status(emp_code, current_date, attendance_by_day, leave_days, holidays, overrides):
    """The same precedence the heatmap uses: a manual override beats everything."""
    override = overrides.get((emp_code, current_date))
    if override:
        return override['status'], SOURCE_MANUAL

    status, _working_hours, _remarks = _derive_cell(
        current_date,
        attendance_by_day.get((emp_code, current_date)),
        leave_days.get((emp_code, current_date)),
        holidays.get(current_date),
    )
    return status, 'auto'


def _empty_day_bucket():
    return {'present': 0, 'leave': 0, 'absent': 0, 'expected': 0, 'off': 0}


def get_attendance_insights(end_date=None, window_days: int = DEFAULT_WINDOW_DAYS):
    """
    Attendance efficiency and the daily trend for the `window_days` ending on
    `end_date`, alongside the immediately preceding window of the same length
    so the UI can show a week-over-week delta.

    Days in the future, days before an employee joined, holidays and week offs
    are never counted as expected attendance - otherwise every Sunday would
    drag the score down.
    """
    try:
        window_days = DEFAULT_WINDOW_DAYS if window_days in (None, '') else int(window_days)
    except (TypeError, ValueError):
        return ({"success": False, "message": "Invalid window. Use a number of days."}, 400)

    if window_days < 1 or window_days > MAX_WINDOW_DAYS:
        return ({
            "success": False,
            "message": "Invalid window. Use between 1 and {max_days} days.".format(max_days=MAX_WINDOW_DAYS),
        }, 400)

    today = date.today()
    resolved_end = _coerce_date(end_date) if end_date else today
    if end_date and not resolved_end:
        return ({"success": False, "message": "Invalid end_date. Use YYYY-MM-DD."}, 400)

    # Nothing is known about the future, so the window always ends today at the latest.
    resolved_end = min(resolved_end, today)
    current_start = resolved_end - timedelta(days=window_days - 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=window_days - 1)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        employees = _fetch_employees(cursor)
        attendance_by_day = _fetch_attendance_by_day(cursor, previous_start, resolved_end)
        leave_days = _fetch_leave_days(cursor, previous_start, resolved_end)
        holidays = _fetch_holidays(cursor, previous_start, resolved_end)
        overrides = _fetch_overrides(cursor, previous_start, resolved_end)

        day_buckets = {
            current_date: _empty_day_bucket()
            for current_date in _daterange(previous_start, resolved_end)
        }
        totals = {'present': 0, 'leave': 0, 'absent': 0, 'holiday': 0, 'week_off': 0, 'manual': 0}
        current_present = current_expected = 0
        previous_present = previous_expected = 0
        counted_employees = 0
        employee_scores = []

        for employee in employees:
            emp_code = (employee.get('emp_code') or '').strip()
            if not emp_code:
                continue
            counted_employees += 1
            joined_date = _coerce_date(employee.get('emp_joined_date'))
            employee_present = employee_expected = 0

            for current_date in _daterange(previous_start, resolved_end):
                if joined_date and current_date < joined_date:
                    continue

                status, source = _resolve_status(
                    emp_code, current_date, attendance_by_day, leave_days, holidays, overrides
                )
                bucket = day_buckets[current_date]
                is_current = current_date >= current_start
                is_present = status in PRESENT_STATUSES
                is_expected = status not in NON_WORKING_STATUSES

                if is_expected:
                    bucket['expected'] += 1
                    if is_present:
                        bucket['present'] += 1
                    elif status == 'L':
                        bucket['leave'] += 1
                    else:
                        bucket['absent'] += 1
                else:
                    bucket['off'] += 1

                if is_expected:
                    if is_current:
                        current_expected += 1
                        current_present += 1 if is_present else 0
                        employee_expected += 1
                        employee_present += 1 if is_present else 0
                    else:
                        previous_expected += 1
                        previous_present += 1 if is_present else 0

                if not is_current:
                    continue

                if source == SOURCE_MANUAL:
                    totals['manual'] += 1
                if is_present:
                    totals['present'] += 1
                elif status == 'L':
                    totals['leave'] += 1
                elif status == 'H':
                    totals['holiday'] += 1
                elif status == 'O':
                    totals['week_off'] += 1
                else:
                    totals['absent'] += 1

            employee_scores.append({
                "emp_code": emp_code,
                "emp_full_name": employee.get('emp_full_name') or emp_code,
                "emp_department": employee.get('emp_department') or '',
                "present_days": employee_present,
                "expected_days": employee_expected,
                "score": _percentage(employee_present, employee_expected),
            })

        # Weakest attendance first: this list exists to be acted on.
        employee_scores.sort(key=lambda row: (
            row['score'] if row['score'] is not None else 101,
            row['emp_full_name'].lower(),
        ))

        score = _percentage(current_present, current_expected)
        previous_score = _percentage(previous_present, previous_expected)
        delta = None
        if score is not None and previous_score is not None:
            delta = round(score - previous_score, 1)

        trend = []
        for current_date in _daterange(current_start, resolved_end):
            bucket = day_buckets[current_date]
            trend.append({
                "date": current_date.isoformat(),
                "label": current_date.strftime('%a'),
                "present": bucket['present'],
                "leave": bucket['leave'],
                "absent": bucket['absent'],
                "expected": bucket['expected'],
                "percentage": _percentage(bucket['present'], bucket['expected']),
                "is_working_day": bucket['expected'] > 0,
            })

        return ({
            "success": True,
            "start_date": current_start.isoformat(),
            "end_date": resolved_end.isoformat(),
            "previous_start_date": previous_start.isoformat(),
            "previous_end_date": previous_end.isoformat(),
            "window_days": window_days,
            "efficiency": {
                "score": score,
                "rating": _rating_for(score),
                "previous_score": previous_score,
                "delta": delta,
                "present_days": current_present,
                "expected_days": current_expected,
            },
            "totals": dict(totals, employees=counted_employees),
            "trend": trend,
            "employees": employee_scores,
        }, 200)

    finally:
        cursor.close()
        return_connection(conn)
