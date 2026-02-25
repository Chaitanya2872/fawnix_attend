#!/usr/bin/env python3
"""
Cron runner for auto clock-out.

Best-practice behavior for production:
- Executes auto_clockout_all_active_sessions() directly
- Uses PostgreSQL advisory lock to prevent overlapping runs
- Returns non-zero exit code on failures for cron observability
"""

import logging
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import Config
from database.connection import get_db_connection, return_connection
from services.auto_clockout_service import auto_clockout_all_active_sessions


LOGGER_NAME = "auto_clockout_cron"
DEFAULT_LOCK_ID = 86420311


def configure_logging():
    """Configure logging for cron execution."""
    os.makedirs("logs", exist_ok=True)

    logger = logging.getLogger()
    logger.handlers.clear()
    level = getattr(logging, str(Config.LOG_LEVEL).upper(), logging.INFO)
    logger.setLevel(level)

    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    file_handler = logging.FileHandler("logs/auto_clockout_cron.log", encoding="utf-8")
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def get_scheduler_timezone():
    """Resolve scheduler timezone with safe fallback."""
    timezone_name = os.getenv("AUTO_CLOCKOUT_TIMEZONE", "Asia/Kolkata")
    try:
        return timezone_name, ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return "Asia/Kolkata", ZoneInfo("Asia/Kolkata")


def get_lock_id():
    """Get advisory lock id from env or use default."""
    raw = os.getenv("AUTO_CLOCKOUT_LOCK_ID", str(DEFAULT_LOCK_ID))
    try:
        return int(raw)
    except ValueError:
        logging.getLogger(LOGGER_NAME).warning(
            "Invalid AUTO_CLOCKOUT_LOCK_ID='%s'. Using default=%s",
            raw,
            DEFAULT_LOCK_ID,
        )
        return DEFAULT_LOCK_ID


def _extract_first_value(row):
    """Handle RealDictCursor and tuple cursor row shapes."""
    if row is None:
        return None
    if isinstance(row, dict):
        return next(iter(row.values()))
    if isinstance(row, (list, tuple)):
        return row[0] if row else None
    return row


def run():
    os.chdir(PROJECT_ROOT)
    configure_logging()
    logger = logging.getLogger(LOGGER_NAME)

    timezone_name, tz = get_scheduler_timezone()
    lock_id = get_lock_id()

    logger.info("=" * 80)
    logger.info("AUTO CLOCKOUT CRON RUN STARTED")
    logger.info(
        "Current time: %s (%s)",
        datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S"),
        timezone_name,
    )
    logger.info("Using advisory lock id: %s", lock_id)

    lock_conn = None
    lock_cursor = None

    try:
        lock_conn = get_db_connection()
        lock_cursor = lock_conn.cursor()
        lock_cursor.execute("SELECT pg_try_advisory_lock(%s)", (lock_id,))
        got_lock = bool(_extract_first_value(lock_cursor.fetchone()))

        if not got_lock:
            logger.warning("Skipped run: advisory lock already held by another process.")
            logger.info("=" * 80)
            return 0

        logger.info("Advisory lock acquired. Executing auto clock-out service...")
        result = auto_clockout_all_active_sessions()

        if result.get("success"):
            logger.info("Run successful: %s", result.get("message"))
            logger.info("Employees auto-clocked-out: %s", result.get("auto_clocked_out", 0))
            logger.info("=" * 80)
            return 0

        logger.error("Run failed: %s", result.get("message", "Unknown error"))
        logger.info("=" * 80)
        return 1

    except Exception:
        logger.exception("Cron runner failed unexpectedly")
        logger.info("=" * 80)
        return 1
    finally:
        if lock_cursor and lock_conn:
            try:
                lock_cursor.execute("SELECT pg_advisory_unlock(%s)", (lock_id,))
            except Exception:
                logger.exception("Failed to release advisory lock cleanly")

        if lock_cursor:
            lock_cursor.close()
        if lock_conn:
            return_connection(lock_conn)


if __name__ == "__main__":
    sys.exit(run())
