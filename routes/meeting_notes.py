"""
Meeting notes routes.
"""

import logging

from flask import Blueprint, jsonify, request

from middleware.auth_middleware import token_required
from services.meeting_notes_service import (
    generate_meeting_notes,
    generate_meeting_notes_from_saved,
    get_meeting_note_record,
    list_meeting_note_records,
    queue_meeting_notes_generation_from_saved,
    upload_meeting_note_audio,
)

meeting_notes_bp = Blueprint("meeting_notes", __name__)
logger = logging.getLogger(__name__)


@meeting_notes_bp.route("", methods=["GET"])
@token_required
def list_records(current_user):
    """
    List saved meeting-note records for the logged-in employee.

    Query params:
    - status: optional status filter
    - limit: optional max records, default 50, max 100
    """
    status = (request.args.get("status") or "").strip() or None
    try:
        limit = int(request.args.get("limit", 50))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "limit must be a valid integer"}), 400

    response_body, status_code = list_meeting_note_records(
        emp_code=current_user.get("emp_code"),
        status=status,
        limit=limit,
    )
    return jsonify(response_body), status_code


@meeting_notes_bp.route("/<meeting_note_id>", methods=["GET"])
@token_required
def get_record(current_user, meeting_note_id):
    """
    Fetch a single saved meeting-note record for the logged-in employee.
    """
    response_body, status_code = get_meeting_note_record(
        meeting_note_id,
        emp_code=current_user.get("emp_code"),
    )
    return jsonify(response_body), status_code


@meeting_notes_bp.route("/generate", methods=["POST"])
@token_required
def generate(current_user):
    """
    Generate meeting outputs from uploaded audio.

    JSON body for saved uploads:
    - meeting_note_id: required saved meeting note id
    - wait: optional boolean; when true, process synchronously in-request
    - force: optional boolean; when true, supersede an active queued job

    Form fields:
    - audio: required audio file
    - meeting_title: optional title
    - language: optional language hint for transcription
    - wait: optional boolean; when true, process synchronously in-request
      (defaults to false — uploads the audio, queues a background job, and
      returns immediately with a meeting_note_id to poll, since generation
      for a long recording can take several minutes)
    """
    logger.info(
        "Meeting notes upload request received content_type=%s files=%s form=%s",
        request.content_type,
        list(request.files.keys()),
        list(request.form.keys()),
    )

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        meeting_note_id = str(payload.get("meeting_note_id") or "").strip()
        if not meeting_note_id:
            return jsonify({"success": False, "message": "meeting_note_id is required"}), 400
        wait_for_completion = bool(payload.get("wait"))
        force_restart = bool(payload.get("force"))

        if wait_for_completion:
            response_body, status_code = generate_meeting_notes_from_saved(
                meeting_note_id,
                emp_code=current_user.get("emp_code"),
            )
        else:
            response_body, status_code = queue_meeting_notes_generation_from_saved(
                meeting_note_id,
                emp_code=current_user.get("emp_code"),
                force=force_restart,
            )
    else:
        audio_file = request.files.get("audio")
        meeting_title = (request.form.get("meeting_title") or "").strip() or None
        language = (request.form.get("language") or "").strip() or None
        wait_for_completion = (request.form.get("wait") or "").strip().lower() in {"true", "1", "yes"}

        if wait_for_completion:
            response_body, status_code = generate_meeting_notes(
                audio_file,
                meeting_title=meeting_title,
                language=language,
                emp_code=current_user.get("emp_code"),
            )
        else:
            upload_response_body, upload_status_code = upload_meeting_note_audio(
                audio_file,
                meeting_title=meeting_title,
                language=language,
                emp_code=current_user.get("emp_code"),
            )
            if not upload_response_body.get("success"):
                return jsonify(upload_response_body), upload_status_code

            meeting_note_id = upload_response_body.get("data", {}).get("meeting_note_id")
            response_body, status_code = queue_meeting_notes_generation_from_saved(
                meeting_note_id,
                emp_code=current_user.get("emp_code"),
            )

    if response_body.get("success"):
        logger.info(
            "Meeting notes generated for emp_code=%s",
            current_user.get("emp_code"),
        )

    return jsonify(response_body), status_code


@meeting_notes_bp.route("/upload", methods=["POST"])
@token_required
def upload(current_user):
    """
    Upload meeting audio to S3 and create a meeting note record.

    Form fields:
    - audio: required audio file
    - meeting_title: optional title
    - language: optional language hint
    """
    logger.info(
        "Meeting notes audio upload request received content_type=%s files=%s form=%s",
        request.content_type,
        list(request.files.keys()),
        list(request.form.keys()),
    )

    audio_file = request.files.get("audio")
    meeting_title = (request.form.get("meeting_title") or "").strip() or None
    language = (request.form.get("language") or "").strip() or None

    response_body, status_code = upload_meeting_note_audio(
        audio_file,
        meeting_title=meeting_title,
        language=language,
        emp_code=current_user.get("emp_code"),
    )

    if response_body.get("success"):
        logger.info(
            "Meeting notes audio uploaded for emp_code=%s file=%s meeting_note_id=%s",
            current_user.get("emp_code"),
            (audio_file.filename if audio_file else None),
            response_body.get("data", {}).get("meeting_note_id"),
        )

    return jsonify(response_body), status_code
