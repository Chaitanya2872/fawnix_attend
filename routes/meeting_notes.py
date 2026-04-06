"""
Meeting notes routes.
"""

import logging

from flask import Blueprint, jsonify, request

from middleware.auth_middleware import token_required
from services.meeting_notes_service import generate_meeting_notes

meeting_notes_bp = Blueprint("meeting_notes", __name__)
logger = logging.getLogger(__name__)


@meeting_notes_bp.route("/generate", methods=["POST"])
@token_required
def generate(current_user):
    """
    Generate meeting outputs from uploaded audio.

    Form fields:
    - audio: required audio file
    - meeting_title: optional title
    - language: optional language hint for transcription
    """
    audio_file = request.files.get("audio")
    meeting_title = (request.form.get("meeting_title") or "").strip() or None
    language = (request.form.get("language") or "").strip() or None

    response_body, status_code = generate_meeting_notes(
        audio_file,
        meeting_title=meeting_title,
        language=language,
    )

    if response_body.get("success"):
        logger.info(
            "Meeting notes generated for emp_code=%s file=%s",
            current_user.get("emp_code"),
            (audio_file.filename if audio_file else None),
        )

    return jsonify(response_body), status_code

