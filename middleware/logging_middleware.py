"""
Logging Middleware
Request/response logging
"""

import io
import logging
import os
import sys
import time
from logging.handlers import RotatingFileHandler

from flask import g, request

from config import Config
from services.api_log_service import record_api_log


# Marker on the root logger so setup_logging is a no-op the second time it
# runs (Flask's reloader boots app.py twice; without this we stack duplicate
# handlers and every log line prints two or three times).
_LOG_SETUP_MARKER = "_fawnix_logging_configured"


def _make_formatter():
    """One formatter shared across every handler.

    Pinning `converter` explicitly is what stops the app logger and werkzeug's
    logger from disagreeing on the timestamp - the drift you saw between
    `19:26` and `18:26` lines came from two loggers using two different
    time sources.
    """
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    formatter.converter = time.localtime
    return formatter


def _ensure_utf8_streams():
    """Windows consoles default to cp1252 and choke on the emoji banner.

    Must run before the console StreamHandler is constructed, otherwise the
    handler keeps a reference to the pre-wrap stream and the wrap does nothing.
    """
    if sys.platform != 'win32':
        return
    for name in ('stdout', 'stderr'):
        stream = getattr(sys, name, None)
        if stream is None:
            continue
        if (getattr(stream, 'encoding', '') or '').lower() == 'utf-8':
            continue
        try:
            wrapped = io.TextIOWrapper(stream.buffer, encoding='utf-8', line_buffering=True)
            setattr(sys, name, wrapped)
        except Exception:
            pass


class _BackendOnlyAccessLogFilter(logging.Filter):
    """Drop werkzeug's per-request access log line for frontend traffic.

    The dev server logs every request it serves, including SPA routes and
    static assets (/assets/*.js, *.css, images). Those drown out the backend
    API calls we actually care about, so only /api/* and /health survive here.
    """

    _KEEP_PREFIXES = ("/api/", "/health")

    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        if not args or not isinstance(args[0], str):
            return True  # not a per-request log line (e.g. debugger banner)

        request_line = args[0]  # e.g. 'GET /assets/foo.js HTTP/1.1'
        parts = request_line.split(" ")
        if len(parts) < 2:
            return True

        path = parts[1].split("?", 1)[0]
        return path.startswith(self._KEEP_PREFIXES)


def setup_logging(app):
    """Configure logging so every logger writes through the same handlers
    with the same formatter, and API request/response logs start flowing as
    soon as the server accepts its first connection.

    Idempotent - safe under Flask's reloader.
    """
    if getattr(logging.root, _LOG_SETUP_MARKER, False):
        return

    os.makedirs('logs', exist_ok=True)

    # Wrap stdout FIRST, then build the StreamHandler against it. Order matters.
    _ensure_utf8_streams()

    formatter = _make_formatter()
    level = getattr(logging, Config.LOG_LEVEL)

    file_handler = RotatingFileHandler(
        Config.LOG_FILE,
        maxBytes=Config.LOG_MAX_BYTES,
        backupCount=Config.LOG_BACKUP_COUNT,
        encoding='utf-8',
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)

    # Handlers live on the root logger. Every other logger propagates up to
    # root by default, so adding handlers anywhere else would just duplicate
    # every message. Clear whatever was there before us.
    root_logger = logging.getLogger()
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
    root_logger.setLevel(level)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Flask's app.logger ships with its own default handler. Strip it and let
    # it propagate to root - otherwise every app.logger.info() lands twice.
    for handler in list(app.logger.handlers):
        app.logger.removeHandler(handler)
    app.logger.setLevel(level)
    app.logger.propagate = True

    # Werkzeug installs its own handler with its own formatter when Flask
    # starts. Take it over the same way so ` * Restarting`, ` * Debugger`,
    # and per-request lines use OUR formatter and OUR timestamp source.
    werkzeug_logger = logging.getLogger('werkzeug')
    for handler in list(werkzeug_logger.handlers):
        werkzeug_logger.removeHandler(handler)
    werkzeug_logger.setLevel(level)
    werkzeug_logger.propagate = True
    if not any(isinstance(f, _BackendOnlyAccessLogFilter) for f in werkzeug_logger.filters):
        werkzeug_logger.addFilter(_BackendOnlyAccessLogFilter())

    # APScheduler is chatty at INFO. Everything below WARNING is just noise
    # once you've confirmed jobs are scheduled at startup.
    logging.getLogger('apscheduler').setLevel(logging.WARNING)

    setattr(logging.root, _LOG_SETUP_MARKER, True)


def _extract_emp_code_from_request():
    """Best-effort, non-fatal decode of the bearer token to attach emp_code to a log row."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1].strip()
    if not token:
        return None

    try:
        import jwt
        payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        return payload.get('sub') or payload.get('emp_code')
    except Exception:
        return None


def _capture_request_payload():
    try:
        if request.is_json:
            return request.get_json(silent=True)
        if request.form:
            return {key: request.form.get(key) for key in request.form.keys()}
    except Exception:
        return None
    return None


def _capture_response_payload(response):
    try:
        if response.direct_passthrough:
            return None
        mimetype = (response.mimetype or '')
        if 'json' in mimetype:
            return response.get_json(silent=True)
    except Exception:
        return None
    return None


_SENSITIVE_FIELD_PARTS = ("password", "token", "secret", "authorization", "api_key", "apikey", "cookie")


def _sanitize_for_log(value, key: str = ""):
    """Keep useful request/response diagnostics without exposing credentials."""
    if any(part in key.lower() for part in _SENSITIVE_FIELD_PARTS):
        return "[redacted]"
    if isinstance(value, dict):
        return {str(item_key): _sanitize_for_log(item_value, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_log(item, key) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_for_log(item, key) for item in value]
    return value


def _request_body_for_log():
    payload = _capture_request_payload()
    if request.files:
        multipart_payload = {
            "files": [
                {
                    "field": field_name,
                    "filename": storage.filename,
                    "content_type": storage.mimetype,
                    "content": "[binary redacted]",
                }
                for field_name, storage in request.files.items()
            ]
        }
        if payload is not None:
            multipart_payload["form"] = _sanitize_for_log(payload)
        return multipart_payload
    if payload is not None:
        return _sanitize_for_log(payload)
    return None


def _response_body_for_log(response):
    payload = _capture_response_payload(response)
    if payload is not None:
        return _sanitize_for_log(payload)
    content_length = response.calculate_content_length()
    return {
        "body": "[non-JSON response omitted]",
        "content_type": response.mimetype,
        "content_length": content_length,
    }


def setup_api_log_capture(app):
    """Persist a sanitized record of every /api/* request and response."""

    @app.before_request
    def _start_api_log_timer():
        g.api_log_start = time.time()
        g.api_log_request_payload = _capture_request_payload() if request.path.startswith('/api/') else None
        g.backend_log_start = time.time()
        if Config.BACKEND_LOG_REQUEST_RESPONSE:
            logging.getLogger(__name__).info(
                "BACKEND REQUEST method=%s path=%s query=%s headers=%s body=%s remote_addr=%s",
                request.method,
                request.path,
                _sanitize_for_log(request.args.to_dict(flat=False)),
                _sanitize_for_log(dict(request.headers)),
                _request_body_for_log(),
                request.remote_addr,
            )

    @app.after_request
    def _finish_api_log(response):
        try:
            if Config.BACKEND_LOG_REQUEST_RESPONSE:
                start = getattr(g, 'backend_log_start', None)
                duration_ms = int((time.time() - start) * 1000) if start else None
                logging.getLogger(__name__).info(
                    "BACKEND RESPONSE method=%s path=%s status=%s duration_ms=%s headers=%s body=%s",
                    request.method,
                    request.path,
                    response.status_code,
                    duration_ms,
                    _sanitize_for_log(dict(response.headers)),
                    _response_body_for_log(response),
                )
            if not request.path.startswith('/api/'):
                return response

            start = getattr(g, 'api_log_start', None)
            duration_ms = int((time.time() - start) * 1000) if start else None

            record_api_log(
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                emp_code=_extract_emp_code_from_request(),
                remote_addr=request.remote_addr,
                request_payload=getattr(g, 'api_log_request_payload', None),
                response_payload=_capture_response_payload(response),
            )
        except Exception as exc:  # pragma: no cover - logging must never break a request
            logging.getLogger(__name__).warning("API log capture failed: %s", exc)

        return response