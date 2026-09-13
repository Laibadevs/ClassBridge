import hashlib
import hmac
import json

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from whatsapp_helpers import FakeWhatsAppProvider, use_fake_provider


def _teacher_client(email: str) -> TestClient:
    c = TestClient(app)
    res = c.post(
        "/api/auth/signup",
        json={"full_name": "Teacher", "email": email, "password": "password123", "role": "teacher"},
    )
    assert res.status_code == 201
    return c


def _parent_client(email: str) -> TestClient:
    c = TestClient(app)
    res = c.post(
        "/api/auth/signup",
        json={"full_name": "Parent", "email": email, "password": "password123", "role": "parent"},
    )
    assert res.status_code == 201
    return c


def _student_payload(**overrides) -> dict:
    payload = {
        "full_name": "Ali Khan",
        "class_name": "Grade 8",
        "grade_level": "8",
        "roll_number": "023",
        "section": "A",
        "parent_name": "Nasreen Khan",
        "whatsapp_number": "+923001234567",
        "preferred_language": "english",
    }
    payload.update(overrides)
    return payload


def _approved_update_with_provider_message_id(client: TestClient, email_suffix: str) -> tuple[dict, str]:
    _parent_client(f"wh-parent-{email_suffix}@example.com")
    student = client.post("/api/teacher/students", json=_student_payload()).json()
    client.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": f"wh-parent-{email_suffix}@example.com", "relationship": "mother"},
    )
    update = client.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Ali is doing well.",
            "roman_urdu_text": "Ali theek kar raha hai.",
            "urdu_text": "علی ٹھیک کر رہا ہے۔",
        },
    ).json()
    approved = client.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    sent = client.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp").json()
    return sent, sent["provider_message_id"]


def _status_event(provider_message_id: str, new_status: str) -> dict:
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "statuses": [
                                {"id": provider_message_id, "status": new_status, "timestamp": "1700000000"}
                            ]
                        }
                    }
                ]
            }
        ]
    }


def _post_webhook(anon: TestClient, payload: dict) -> "TestClient.Response":
    settings = get_settings()
    body = json.dumps(payload).encode()
    headers = {}
    if settings.WHATSAPP_APP_SECRET:
        signature = hmac.new(settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
        headers["X-Hub-Signature-256"] = f"sha256={signature}"
    return anon.post("/api/webhooks/whatsapp", content=body, headers={**headers, "Content-Type": "application/json"})


# 17. webhook updates sent -> delivered
def test_webhook_updates_sent_to_delivered():
    teacher = _teacher_client("wh-sent-delivered@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "sent-delivered")
    assert delivery["status"] == "sent"

    anon = TestClient(app)
    res = _post_webhook(anon, _status_event(provider_message_id, "delivered"))
    assert res.status_code == 200

    updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
    assert updated[0]["status"] == "delivered"


# 18. webhook updates delivered -> read
def test_webhook_updates_delivered_to_read():
    teacher = _teacher_client("wh-delivered-read@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "delivered-read")

    anon = TestClient(app)
    _post_webhook(anon, _status_event(provider_message_id, "delivered"))
    _post_webhook(anon, _status_event(provider_message_id, "read"))

    updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
    assert updated[0]["status"] == "read"


# 19. webhook updates to failed
def test_webhook_updates_to_failed():
    teacher = _teacher_client("wh-failed@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "failed")

    anon = TestClient(app)
    res = _post_webhook(anon, _status_event(provider_message_id, "failed"))
    assert res.status_code == 200

    updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
    assert updated[0]["status"] == "failed"


# 20. duplicate webhook is safe
def test_duplicate_webhook_is_safe():
    teacher = _teacher_client("wh-duplicate@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "duplicate")

    anon = TestClient(app)
    _post_webhook(anon, _status_event(provider_message_id, "delivered"))
    res = _post_webhook(anon, _status_event(provider_message_id, "delivered"))
    assert res.status_code == 200

    updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
    assert updated[0]["status"] == "delivered"  # unchanged, not corrupted


# Status never moves backwards (read -> sent must never happen).
def test_webhook_status_never_moves_backwards():
    teacher = _teacher_client("wh-backwards@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "backwards")

    anon = TestClient(app)
    _post_webhook(anon, _status_event(provider_message_id, "delivered"))
    _post_webhook(anon, _status_event(provider_message_id, "read"))
    # A stale/out-of-order "sent" event arrives after "read" — must be ignored.
    _post_webhook(anon, _status_event(provider_message_id, "sent"))

    updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
    assert updated[0]["status"] == "read"


# 21. invalid webhook verification rejected
def test_invalid_webhook_verification_rejected():
    anon = TestClient(app)
    res = anon.get(
        "/api/webhooks/whatsapp",
        params={"hub.mode": "subscribe", "hub.verify_token": "wrong-token", "hub.challenge": "12345"},
    )
    assert res.status_code == 403


def test_valid_webhook_verification_echoes_challenge(monkeypatch):
    from app.core import config

    monkeypatch.setenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "test-verify-token")
    config.get_settings.cache_clear()
    try:
        anon = TestClient(app)
        res = anon.get(
            "/api/webhooks/whatsapp",
            params={"hub.mode": "subscribe", "hub.verify_token": "test-verify-token", "hub.challenge": "12345"},
        )
        assert res.status_code == 200
        assert res.text == "12345"
    finally:
        config.get_settings.cache_clear()


def test_invalid_webhook_signature_rejected(monkeypatch):
    from app.core import config

    teacher = _teacher_client("wh-badsig@example.com")
    _, provider_message_id = _approved_update_with_provider_message_id(teacher, "badsig")

    monkeypatch.setenv("WHATSAPP_APP_SECRET", "test-app-secret")
    config.get_settings.cache_clear()
    try:
        anon = TestClient(app)
        body = json.dumps(_status_event(provider_message_id, "delivered")).encode()
        res = anon.post(
            "/api/webhooks/whatsapp",
            content=body,
            headers={"Content-Type": "application/json", "X-Hub-Signature-256": "sha256=deadbeef"},
        )
        assert res.status_code == 403
    finally:
        config.get_settings.cache_clear()


def test_valid_webhook_signature_accepted(monkeypatch):
    from app.core import config

    teacher = _teacher_client("wh-goodsig@example.com")
    delivery, provider_message_id = _approved_update_with_provider_message_id(teacher, "goodsig")

    monkeypatch.setenv("WHATSAPP_APP_SECRET", "test-app-secret")
    config.get_settings.cache_clear()
    try:
        anon = TestClient(app)
        res = _post_webhook(anon, _status_event(provider_message_id, "delivered"))
        assert res.status_code == 200
        updated = teacher.get(f"/api/teacher/parent-updates/{delivery['parent_update_id']}/whatsapp-deliveries").json()
        assert updated[0]["status"] == "delivered"
    finally:
        config.get_settings.cache_clear()
