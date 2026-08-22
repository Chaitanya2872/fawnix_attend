"""
Public Stats Service
====================

Aggregate, company-wide metrics for the PUBLIC marketing surfaces
(landing "overview" page + product tour page).

Design rules for this module:

1. **Aggregate only — never PII.** Every query returns counts, averages or
   percentages. No names, emails, employee codes or addresses are ever
   selected, so the payload is safe to serve unauthenticated.
2. **Never break the marketing page.** Each metric is computed in its own
   guarded block. A missing table or a failed query degrades that single
   metric to a neutral default instead of 500-ing the whole response.
3. **Cheap.** Results are memo-cached for a short TTL so a burst of public
   traffic cannot hammer the database.
"""

from datetime import date, datetime, timedelta
import logging
import threading

from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

# ── cache ────────────────────────────────────────────────────────────────────

CACHE_TTL_SECONDS = 60

_cache_lock = threading.Lock()
_cache = {"payload": None, "expires_at": None}

TREND_DAYS = 7
HEATMAP_WEEKS = 5


def _scalar(cursor, sql, params=None, default=0):
    """Run a single-value aggregate query, returning `default` on any failure."""
    try:
        cursor.execute(sql, params or ())
        row = cursor.fetchone()
        if not row:
            return default
        value = list(row.values())[0] if hasattr(row, "values") else row[0]
        return default if value is None else value
    except Exception as exc:
        logger.warning("public stats: aggregate failed (%s): %s", sql.split()[0], exc)
        try:
            cursor.connection.rollback()
        except Exception:
            pass
        return default


def _rate(part, whole):
    """Percentage of `part` within `whole`, rounded to 1dp, clamped to 0-100."""
    try:
        if not whole:
            return 0.0
        return round(max(0.0, min(100.0, (float(part) / float(whole)) * 100.0)), 1)
    except (TypeError, ValueError, ZeroDivisionError):
        return 0.0


def _heat_level(rate):
    """Map an attendance rate onto the 0-4 heatmap intensity scale."""
    if rate <= 0:
        return 0
    if rate < 55:
        return 1
    if rate < 75:
        return 2
    if rate < 90:
        return 3
    return 4


def _collect(cursor, today):
    """Build the full stats payload from one cursor."""

    # ── workforce ────────────────────────────────────────────────────────────
    total_employees = _scalar(cursor, "SELECT COUNT(*) FROM employees")
    active_users = _scalar(cursor, "SELECT COUNT(*) FROM users WHERE is_active = true")
    departments = _scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT NULLIF(TRIM(COALESCE(emp_department, '')), ''))
        FROM employees
        """,
    )

    # Headcount baseline: prefer real employee rows, fall back to active users
    # so the percentages stay meaningful on a freshly seeded database.
    headcount = total_employees or active_users

    # ── today ────────────────────────────────────────────────────────────────
    present_today = _scalar(
        cursor,
        "SELECT COUNT(DISTINCT employee_email) FROM attendance WHERE date = %s",
        (today,),
    )
    in_field_today = _scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT employee_email)
        FROM attendance
        WHERE date = %s
          AND LOWER(COALESCE(attendance_type, 'office')) <> 'office'
        """,
        (today,),
    )
    avg_hours_today = _scalar(
        cursor,
        """
        SELECT ROUND(AVG(working_hours)::numeric, 2)
        FROM attendance
        WHERE date = %s AND COALESCE(working_hours, 0) > 0
        """,
        (today,),
    )
    late_today = _scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM attendance_exceptions
        WHERE exception_date = %s
          AND LOWER(COALESCE(exception_type, '')) = 'late_arrival'
        """,
        (today,),
    )

    # ── pending approvals (sum of the three review queues) ───────────────────
    pending_leaves = _scalar(
        cursor,
        "SELECT COUNT(*) FROM leaves WHERE LOWER(COALESCE(status, '')) = 'pending'",
    )
    pending_exceptions = _scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM attendance_exceptions
        WHERE LOWER(COALESCE(status, '')) = 'pending'
        """,
    )
    pending_compoffs = _scalar(
        cursor,
        "SELECT COUNT(*) FROM comp_offs WHERE LOWER(COALESCE(status, '')) = 'pending'",
    )
    pending_approvals = pending_leaves + pending_exceptions + pending_compoffs

    # ── lifetime totals (nice "we have receipts" numbers) ────────────────────
    total_attendance_records = _scalar(cursor, "SELECT COUNT(*) FROM attendance")
    total_field_visits = _scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT employee_email)
        FROM attendance
        WHERE LOWER(COALESCE(attendance_type, 'office')) <> 'office'
        """,
    )
    decisions_recorded = (
        _scalar(
            cursor,
            """
        SELECT COUNT(*)
        FROM leaves
        WHERE LOWER(COALESCE(status, '')) IN ('approved', 'rejected', 'cancelled')
        """,
        )
        + _scalar(
            cursor,
            """
        SELECT COUNT(*)
        FROM attendance_exceptions
        WHERE LOWER(COALESCE(status, '')) IN ('approved', 'rejected', 'cancelled')
        """,
        )
    )

    # ── 7-day trend ──────────────────────────────────────────────────────────
    trend = []
    try:
        window_start = today - timedelta(days=TREND_DAYS - 1)
        cursor.execute(
            """
            SELECT date AS day, COUNT(DISTINCT employee_email) AS present
            FROM attendance
            WHERE date BETWEEN %s AND %s
            GROUP BY date
            """,
            (window_start, today),
        )
        by_day = {}
        for row in cursor.fetchall() or []:
            day = row["day"] if hasattr(row, "keys") else row[0]
            count = row["present"] if hasattr(row, "keys") else row[1]
            if isinstance(day, datetime):
                day = day.date()
            by_day[day] = int(count or 0)
    except Exception as exc:
        logger.warning("public stats: trend query failed: %s", exc)
        try:
            cursor.connection.rollback()
        except Exception:
            pass
        by_day = {}

    for offset in range(TREND_DAYS - 1, -1, -1):
        day = today - timedelta(days=offset)
        present = by_day.get(day, 0)
        trend.append(
            {
                "date": day.isoformat(),
                "label": "Today" if offset == 0 else day.strftime("%a"),
                "present": present,
                "rate": _rate(present, headcount),
                "is_today": offset == 0,
                "is_weekend": day.weekday() >= 5,
            }
        )

    # ── heatmap: 5 weeks x 7 days of intensity levels ────────────────────────
    heatmap = []
    try:
        # Anchor on the Monday of the current week so columns line up Mon-Sun.
        week_monday = today - timedelta(days=today.weekday())
        grid_start = week_monday - timedelta(weeks=HEATMAP_WEEKS - 1)
        cursor.execute(
            """
            SELECT date AS day, COUNT(DISTINCT employee_email) AS present
            FROM attendance
            WHERE date BETWEEN %s AND %s
            GROUP BY date
            """,
            (grid_start, week_monday + timedelta(days=6)),
        )
        heat_by_day = {}
        for row in cursor.fetchall() or []:
            day = row["day"] if hasattr(row, "keys") else row[0]
            count = row["present"] if hasattr(row, "keys") else row[1]
            if isinstance(day, datetime):
                day = day.date()
            heat_by_day[day] = int(count or 0)

        for week in range(HEATMAP_WEEKS):
            row_levels = []
            for weekday in range(7):
                day = grid_start + timedelta(weeks=week, days=weekday)
                if day > today:
                    row_levels.append(0)
                    continue
                row_levels.append(
                    _heat_level(_rate(heat_by_day.get(day, 0), headcount))
                )
            heatmap.append(row_levels)
    except Exception as exc:
        logger.warning("public stats: heatmap query failed: %s", exc)
        try:
            cursor.connection.rollback()
        except Exception:
            pass
        heatmap = [[0] * 7 for _ in range(HEATMAP_WEEKS)]

    # ── week-over-week delta ─────────────────────────────────────────────────
    this_week_rates = [day["rate"] for day in trend if not day["is_weekend"]]
    this_week_avg = (
        round(sum(this_week_rates) / len(this_week_rates), 1)
        if this_week_rates
        else 0.0
    )
    prior_present = _scalar(
        cursor,
        """
        SELECT COUNT(DISTINCT (employee_email, date))
        FROM attendance
        WHERE date BETWEEN %s AND %s
        """,
        (
            today - timedelta(days=TREND_DAYS * 2 - 1),
            today - timedelta(days=TREND_DAYS),
        ),
    )
    prior_avg = _rate(prior_present / TREND_DAYS if prior_present else 0, headcount)

    attendance_rate = _rate(present_today, headcount)

    return {
        "workforce": {
            "total_employees": int(total_employees),
            "active_users": int(active_users),
            "departments": int(departments),
            "headcount": int(headcount),
        },
        "today": {
            "date": today.isoformat(),
            "present": int(present_today),
            "headcount": int(headcount),
            "attendance_rate": attendance_rate,
            "late_arrivals": int(late_today),
            "in_field": int(in_field_today),
            "not_in": max(0, int(headcount) - int(present_today)),
            "avg_working_hours": float(avg_hours_today or 0),
            "pending_approvals": int(pending_approvals),
            "pending_leaves": int(pending_leaves),
            "pending_exceptions": int(pending_exceptions),
            "pending_compoffs": int(pending_compoffs),
        },
        "totals": {
            "attendance_records": int(total_attendance_records),
            "field_participants": int(total_field_visits),
            "decisions_recorded": int(decisions_recorded),
        },
        "trend": trend,
        "heatmap": heatmap,
        "comparison": {
            "week_average": this_week_avg,
            "previous_week_average": prior_avg,
            "delta": round(this_week_avg - prior_avg, 1),
        },
    }


def get_public_stats(force_refresh=False):
    """
    Return cached aggregate stats for the public marketing pages.

    Always returns a dict. On total database failure it returns
    ``{"available": False, ...}`` so the frontend can fall back to its
    static copy rather than rendering an error.
    """
    now = datetime.utcnow()

    if not force_refresh:
        with _cache_lock:
            if (
                _cache["payload"]
                and _cache["expires_at"]
                and _cache["expires_at"] > now
            ):
                return _cache["payload"]

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        payload = _collect(cursor, date.today())
        payload["available"] = True
        payload["generated_at"] = now.isoformat() + "Z"
        payload["cache_seconds"] = CACHE_TTL_SECONDS

        with _cache_lock:
            _cache["payload"] = payload
            _cache["expires_at"] = now + timedelta(seconds=CACHE_TTL_SECONDS)

        return payload
    except Exception as exc:
        logger.error("public stats: unavailable: %s", exc)
        # Serve a stale cache entry if we have one — better than nothing.
        with _cache_lock:
            if _cache["payload"]:
                stale = dict(_cache["payload"])
                stale["stale"] = True
                return stale
        return {
            "available": False,
            "generated_at": now.isoformat() + "Z",
            "message": "Live statistics are temporarily unavailable.",
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            return_connection(conn)
