#!/usr/bin/env python3
"""
Persistent worker for meeting-notes generation jobs.

This uses PostgreSQL as a durable queue so jobs survive web-worker restarts.
"""

import logging
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import Config
from database.connection import close_connection_pool, init_database, initialize_connection_pool, run_migrations
from services.meeting_notes_service import claim_next_meeting_note_job, process_meeting_note_job


LOGGER_NAME = "meeting_notes_worker"


def configure_logging():
    os.chdir(PROJECT_ROOT)
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

    file_handler = logging.FileHandler("logs/meeting_notes_worker.log", encoding="utf-8")
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def run():
    configure_logging()
    logger = logging.getLogger(LOGGER_NAME)
    poll_seconds = max(1.0, float(Config.MEETING_NOTES_QUEUE_POLL_SECONDS))
    run_once = os.getenv("MEETING_NOTES_WORKER_RUN_ONCE", "false").lower() == "true"

    logger.info("Starting meeting-notes worker poll_seconds=%s run_once=%s", poll_seconds, run_once)
    init_database()
    run_migrations()
    initialize_connection_pool()

    try:
        while True:
            job = claim_next_meeting_note_job()
            if not job:
                if run_once:
                    logger.info("No meeting-notes job available; exiting run-once worker.")
                    return 0
                time.sleep(poll_seconds)
                continue

            logger.info(
                "Processing meeting-notes job job_id=%s meeting_note_id=%s attempt=%s/%s",
                job.get("job_id"),
                job.get("meeting_note_id"),
                job.get("attempt_count"),
                job.get("max_attempts"),
            )

            try:
                process_meeting_note_job(job)
                logger.info(
                    "Completed meeting-notes job job_id=%s meeting_note_id=%s",
                    job.get("job_id"),
                    job.get("meeting_note_id"),
                )
            except Exception:
                logger.exception(
                    "Meeting-notes job failed job_id=%s meeting_note_id=%s",
                    job.get("job_id"),
                    job.get("meeting_note_id"),
                )

            if run_once:
                return 0
    finally:
        close_connection_pool()


if __name__ == "__main__":
    sys.exit(run())
