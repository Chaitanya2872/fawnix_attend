from datetime import datetime

import services.attendance_notification_service as attendance_notification_service
import services.fcm_service as fcm_service
import services.notification_service as notification_service


class FakeStateCursor:
    def __init__(self, state_store):
        self.state_store = state_store
        self.fetchone_value = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "SELECT * FROM attendance_tracking_notification_state" in normalized_sql:
            attendance_id = params[0]
            row = self.state_store.get(attendance_id)
            self.fetchone_value = dict(row) if row else None
            return

        if "INSERT INTO attendance_tracking_notification_state" in normalized_sql:
            attendance_id, emp_code = params
            row = {
                "attendance_id": attendance_id,
                "emp_code": emp_code,
                "current_status": "unknown",
                "started_notified_at": None,
                "paused_notified_at": None,
                "resumed_notified_at": None,
                "stopped_notified_at": None,
                "created_at": datetime(2026, 4, 2, 9, 0, 0),
                "updated_at": datetime(2026, 4, 2, 9, 0, 0),
            }
            self.state_store[attendance_id] = row
            self.fetchone_value = dict(row)
            return

        if "UPDATE attendance_tracking_notification_state" in normalized_sql:
            next_status, event_time, updated_at, attendance_id = params
            row = self.state_store[attendance_id]
            row["current_status"] = next_status
            row["updated_at"] = updated_at

            if "started_notified_at" in normalized_sql:
                row["started_notified_at"] = event_time
            elif "paused_notified_at" in normalized_sql:
                row["paused_notified_at"] = event_time
            elif "resumed_notified_at" in normalized_sql:
                row["resumed_notified_at"] = event_time
            elif "stopped_notified_at" in normalized_sql:
                row["stopped_notified_at"] = event_time

            self.fetchone_value = None
            return

        raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class FakeStateConnection:
    def __init__(self, state_store):
        self.cursor_obj = FakeStateCursor(state_store)
        self.commit_count = 0
        self.rollback_count = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commit_count += 1

    def rollback(self):
        self.rollback_count += 1


def setup_attendance_notification_mocks(monkeypatch):
    state_store = {}
    sent_events = []
    connection = FakeStateConnection(state_store)

    monkeypatch.setattr(attendance_notification_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(attendance_notification_service, "return_connection", lambda conn: None)
    monkeypatch.setattr(
        attendance_notification_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 2, 10, 0, 0),
    )

    def fake_send_to_user_tokens(emp_code, title, body, data):
        sent_events.append(
            {
                "emp_code": emp_code,
                "title": title,
                "body": body,
                "data": data,
            }
        )
        return {
            "success": True,
            "message": "Push notification sent successfully",
            "token_count": 2,
            "sent_count": 2,
            "failure_count": 0,
        }

    monkeypatch.setattr(attendance_notification_service, "send_to_user_tokens", fake_send_to_user_tokens)
    return state_store, sent_events


def test_tracking_started_sends_once(monkeypatch):
    state_store, sent_events = setup_attendance_notification_mocks(monkeypatch)

    first_result = attendance_notification_service.notify_tracking_started("EMP001", 101)
    second_result = attendance_notification_service.notify_tracking_started("EMP001", 101)

    assert first_result["success"] is True
    assert first_result["sent_count"] == 2
    assert second_result["skipped"] is True
    assert second_result["message"] == "tracking already started"
    assert len(sent_events) == 1
    assert state_store[101]["current_status"] == "active"
    assert state_store[101]["started_notified_at"] is not None


def test_working_hours_paused_only_sends_on_transition(monkeypatch):
    state_store, sent_events = setup_attendance_notification_mocks(monkeypatch)

    attendance_notification_service.notify_tracking_started("EMP001", 102)
    first_pause = attendance_notification_service.notify_working_hours_paused("EMP001", 102)
    second_pause = attendance_notification_service.notify_working_hours_paused("EMP001", 102)

    assert first_pause["success"] is True
    assert second_pause["skipped"] is True
    assert second_pause["message"] == "working hours already paused"
    assert len(sent_events) == 2
    assert state_store[102]["current_status"] == "paused"
    assert state_store[102]["paused_notified_at"] is not None


def test_working_hours_resumed_only_sends_on_transition(monkeypatch):
    state_store, sent_events = setup_attendance_notification_mocks(monkeypatch)

    attendance_notification_service.notify_tracking_started("EMP001", 103)
    attendance_notification_service.notify_working_hours_paused("EMP001", 103)
    first_resume = attendance_notification_service.notify_working_hours_resumed("EMP001", 103)
    second_resume = attendance_notification_service.notify_working_hours_resumed("EMP001", 103)

    assert first_resume["success"] is True
    assert second_resume["skipped"] is True
    assert second_resume["message"] == "working hours not paused"
    assert len(sent_events) == 3
    assert state_store[103]["current_status"] == "active"
    assert state_store[103]["resumed_notified_at"] is not None


def test_tracking_stopped_sends_correctly(monkeypatch):
    state_store, sent_events = setup_attendance_notification_mocks(monkeypatch)

    attendance_notification_service.notify_tracking_started("EMP001", 104)
    stop_result = attendance_notification_service.notify_tracking_stopped("EMP001", 104)

    assert stop_result["success"] is True
    assert stop_result["payload"]["status"] == "stopped"
    assert len(sent_events) == 2
    assert state_store[104]["current_status"] == "stopped"
    assert state_store[104]["stopped_notified_at"] is not None


def test_send_to_user_tokens_supports_multiple_tokens(monkeypatch):
    captured = {}

    monkeypatch.setattr(fcm_service, "get_employee_device_tokens", lambda emp_code: ["token-1", "token-2"])

    def fake_send_push_to_tokens(tokens, title, body, data=None, context=None):
        captured["tokens"] = tokens
        captured["title"] = title
        captured["body"] = body
        captured["data"] = data
        captured["context"] = context
        return {
            "success": True,
            "message": "Push notification sent successfully",
            "sent_count": len(tokens),
            "failure_count": 0,
        }

    monkeypatch.setattr(fcm_service, "_send_push_to_tokens", fake_send_push_to_tokens)

    result = fcm_service.send_to_user_tokens(
        "EMP001",
        "Attendance tracking active",
        "Location tracking is running for working hours.",
        {"type": "tracking_started"},
    )

    assert result["success"] is True
    assert result["token_count"] == 2
    assert captured["tokens"] == ["token-1", "token-2"]
    assert captured["context"] == {"delivery_scope": "employee", "emp_code": "EMP001"}


def test_invalid_tokens_are_deactivated(monkeypatch):
    deactivated_tokens = []

    class FakeInvalidTokenError(Exception):
        pass

    FakeInvalidTokenError.__name__ = "UnregisteredError"

    class FakeSendResponse:
        def __init__(self, success, exception=None):
            self.success = success
            self.exception = exception

    class FakeBatchResponse:
        success_count = 1
        failure_count = 1
        responses = [
            FakeSendResponse(True),
            FakeSendResponse(False, FakeInvalidTokenError("token expired")),
        ]

    class FakeNotification:
        def __init__(self, title, body):
            self.title = title
            self.body = body

    class FakeMulticastMessage:
        def __init__(self, tokens, data=None, notification=None):
            self.tokens = tokens
            self.data = data
            self.notification = notification

    class FakeMessaging:
        Notification = FakeNotification
        MulticastMessage = FakeMulticastMessage

        @staticmethod
        def send_each_for_multicast(message, app=None):
            return FakeBatchResponse()

    monkeypatch.setattr(notification_service, "_get_firebase_app", lambda: object())
    monkeypatch.setattr(notification_service, "messaging", FakeMessaging)
    monkeypatch.setattr(notification_service, "_deactivate_tokens", lambda tokens: deactivated_tokens.extend(tokens))

    result = notification_service._send_push_to_tokens(
        ["valid-token", "invalid-token"],
        "Working hours paused",
        "You are outside the allowed work radius. Return to resume.",
        data={"type": "working_hours_paused"},
    )

    assert result["success"] is True
    assert result["sent_count"] == 1
    assert result["failure_count"] == 1
    assert result["deactivated_tokens"] == 1
    assert deactivated_tokens == ["invalid-token"]
