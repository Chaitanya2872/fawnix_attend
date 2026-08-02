"""
Logging Middleware
Request/response logging
"""

import logging
import time
from logging.handlers import RotatingFileHandler
import os
from flask import g, request
from config import Config
from services.api_log_service import record_api_log


def setup_logging(app):
    """Setup logging configuration"""
    
    # Create logs directory if not exists
    os.makedirs('logs', exist_ok=True)
    
    # File handler with UTF-8 encoding
    file_handler = RotatingFileHandler(
        Config.LOG_FILE,
        maxBytes=Config.LOG_MAX_BYTES,
        backupCount=Config.LOG_BACKUP_COUNT,
        encoding='utf-8'  # Fix Unicode errors on Windows
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # Console handler with UTF-8 encoding
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, Config.LOG_LEVEL))
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    ))
    
    # Set console encoding to UTF-8 if on Windows
    import sys
    if sys.platform == 'win32':
        try:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
        except:
            pass
    
    # Configure app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(getattr(logging, Config.LOG_LEVEL))
    
    # Configure root logger
    logging.root.setLevel(getattr(logging, Config.LOG_LEVEL))
    logging.root.addHandler(file_handler)
    logging.root.addHandler(console_handler)


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
