import os
import io
import shutil
from datetime import datetime
import pytest

from services import bills_service


def test_parse_stage_from_comments_none():
    assert bills_service.parse_stage_from_comments(None) is None
    assert bills_service.parse_stage_from_comments("") is None


def test_parse_stage_from_comments_present():
    comments = "Some text [stage=hr_review] more"
    assert bills_service.parse_stage_from_comments(comments) == "hr_review"


def test_approval_stages_constant():
    assert isinstance(bills_service.APPROVAL_STAGES, list)
    assert bills_service.APPROVAL_STAGES[0] == "hr_review"


def test_save_upload_writes_file(tmp_path, monkeypatch):
    # Redirect uploads dir to temp path
    monkeypatch.setattr(bills_service, 'UPLOADS_DIR', str(tmp_path))
    content = b"hello-bill"
    meta = bills_service.save_upload(content, filename="tst.bin")
    assert os.path.exists(meta["file_path"]) is True
    with open(meta["file_path"], "rb") as fh:
        data = fh.read()
    assert data == content


def test_save_upload_auto_filename(tmp_path, monkeypatch):
    monkeypatch.setattr(bills_service, 'UPLOADS_DIR', str(tmp_path))
    meta = bills_service.save_upload(b"x")
    assert meta.get("filename")
    assert os.path.exists(meta["file_path"]) is True
