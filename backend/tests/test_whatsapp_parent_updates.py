import itertools
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.models.student import Student
from app.services.whatsapp.provider import WhatsAppSendError
from whatsapp_helpers import FakeWhatsAppProvider, use_fake_provider

_roll_numbers = itertools.count(1)


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


def _create_student(client: TestClient, **overrides) -> dict:
    payload = {
        "full_name": "Ali Khan",
        "class_name": "Blue",
        "grade_level": "Grade 8",
        "roll_number": str(next(_roll_numbers)),
        "section": "A",
        "parent_name": "Nasreen Khan",
        "whatsapp_number": "+923001234567",
        "preferred_language": "english",
    }
    payload.update(overrides)
    res = client.post("/api/teacher/students", json=payload)
    assert res.status_code == 201
    return res.json()


def _link_parent(teacher: TestClient, student_id: str, parent_email: str):
    res = teacher.post(
        f"/api/teacher/students/{student_id}/link-parent",
        json={"parent_email": parent_email, "relationship": "mother"},
    )
    assert res.status_code == 201


def _saved_update(client: TestClient, student_id: str, **overrides) -> dict:
    payload = {
        "english_text": "Ali is doing well.",
        "roman_urdu_text": "Ali theek kar raha hai.",
        "urdu_text": "علی ٹھیک کر رہا ہے۔",
    }
    payload.update(overrides)
    res = client.post(f"/api/teacher/students/{student_id}/updates", json=payload)
    assert res.status_code == 201
    return res.json()


def _approved_update_with_parent(email_suffix: str) -> tuple[TestClient, dict, dict]:
    teacher = _teacher_client(f"wa-{email_suffix}@example.com")
    _parent_client(f"wa-parent-{email_suffix}@example.com")
    student = _create_student(teacher)
    _link_parent(teacher, student["id"], f"wa-parent-{email_suffix}@example.com")
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    return teacher, student, approved


# 1. approved parent update can be sent
def test_approved_update_can_be_sent():
    teacher, student, update = _approved_update_with_parent("send-ok")
    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 200
    assert res.json()["status"] == "sent"
    assert len(provider.calls) == 1


# 2. draft parent update cannot be sent
def test_draft_update_cannot_be_sent():
    teacher = _teacher_client("wa-draft@example.com")
    student = _create_student(teacher)
    draft = _saved_update(teacher, student["id"])
    use_fake_provider(FakeWhatsAppProvider())

    res = teacher.post(f"/api/teacher/parent-updates/{draft['id']}/send-whatsapp")
    assert res.status_code == 409


# 3. teacher cannot send another teacher's update
def test_teacher_cannot_send_another_teachers_update():
    owner, _, update = _approved_update_with_parent("cross-owner")
    intruder = _teacher_client("wa-cross-intruder@example.com")
    use_fake_provider(FakeWhatsAppProvider())

    res = intruder.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 404


# 4. missing WhatsApp number handled
def test_missing_whatsapp_number_handled(db_session):
    teacher = _teacher_client("wa-nonumber@example.com")
    _parent_client("wa-nonumber-parent@example.com")
    student = _create_student(teacher)
    _link_parent(teacher, student["id"], "wa-nonumber-parent@example.com")
    # StudentCreate/StudentUpdate both require a WhatsApp number if one is
    # sent at all — the only way to reach a NULL number (still allowed by
    # the DB column) is a direct write, e.g. a pre-Phase-5 record.
    row = db_session.get(Student, uuid.UUID(student["id"]))
    row.whatsapp_number = None
    db_session.commit()
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    use_fake_provider(FakeWhatsAppProvider())

    res = teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    assert res.status_code == 422
    assert "whatsapp number" in res.json()["detail"].lower()


# 5. missing parent link handled
def test_missing_parent_link_handled():
    teacher = _teacher_client("wa-nolink@example.com")
    student = _create_student(teacher)
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    use_fake_provider(FakeWhatsAppProvider())

    res = teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    assert res.status_code == 422
    assert "no parent is linked" in res.json()["detail"].lower()


# 6. successful send creates provider message ID
# 7. successful send becomes sent
def test_successful_send_creates_provider_message_id_and_sent_status():
    teacher, student, update = _approved_update_with_parent("provider-id")
    use_fake_provider(FakeWhatsAppProvider())

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    body = res.json()
    assert body["status"] == "sent"
    assert body["provider_message_id"]

    saved = teacher.get(f"/api/teacher/students/{student['id']}/updates").json()[0]
    assert saved["status"] == "sent"


# 8. duplicate send is prevented
def test_duplicate_send_is_prevented():
    teacher, _, update = _approved_update_with_parent("dup-send")
    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)

    first = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert first.status_code == 200
    second = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert second.status_code == 409
    assert len(provider.calls) == 1  # never sent twice


# 9. failed send becomes failed
def test_failed_send_becomes_failed():
    teacher, _, update = _approved_update_with_parent("fail-send")
    provider = FakeWhatsAppProvider(fail=True, error=WhatsAppSendError("nope", code="rejected", retryable=False))
    use_fake_provider(provider)

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 200
    assert res.json()["status"] == "failed"
    assert res.json()["error_code"] == "rejected"


# 10. retry after failure works
def test_retry_after_failure_works():
    teacher, _, update = _approved_update_with_parent("retry-send")
    failing = FakeWhatsAppProvider(fail=True, error=WhatsAppSendError("nope", code="rejected", retryable=False))
    use_fake_provider(failing)
    first = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert first.json()["status"] == "failed"

    succeeding = FakeWhatsAppProvider()
    use_fake_provider(succeeding)
    second = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert second.status_code == 200
    assert second.json()["status"] == "sent"


# retryable (transient) failure is retried once automatically before being
# marked failed
def test_transient_failure_retried_once_automatically():
    class FlakyThenOkProvider(FakeWhatsAppProvider):
        def send_text_message(self, *, phone_number, message):
            self.calls.append((phone_number, message))
            if len(self.calls) == 1:
                raise WhatsAppSendError("timeout", code="timeout", retryable=True)
            from app.services.whatsapp.provider import WhatsAppSendResult

            return WhatsAppSendResult(provider_message_id="wamid.retry-ok")

    teacher, _, update = _approved_update_with_parent("transient")
    provider = FlakyThenOkProvider()
    use_fake_provider(provider)

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 200
    assert res.json()["status"] == "sent"
    assert len(provider.calls) == 2  # one failure + one automatic retry


# 22. parent cannot call teacher WhatsApp endpoints
def test_parent_cannot_call_send_whatsapp():
    teacher, _, update = _approved_update_with_parent("parent-blocked")
    parent = _parent_client("wa-blocked-parent@example.com")
    use_fake_provider(FakeWhatsAppProvider())

    res = parent.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 403


# 23. unauthenticated requests rejected
def test_unauthenticated_send_whatsapp_rejected():
    _, _, update = _approved_update_with_parent("anon-blocked")
    anon = TestClient(app)
    use_fake_provider(FakeWhatsAppProvider())

    res = anon.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 401


# 24. provider timeout handled safely
def test_provider_timeout_handled_safely():
    teacher, _, update = _approved_update_with_parent("timeout")
    provider = FakeWhatsAppProvider(fail=True, error=WhatsAppSendError("timed out", code="timeout", retryable=True))
    use_fake_provider(provider)

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 200
    assert res.json()["status"] == "failed"
    assert res.json()["error_code"] == "timeout"
    assert len(provider.calls) == 2  # the one automatic retry was also attempted


# 25. provider error (auth) handled safely, no raw provider detail leaked
def test_provider_auth_error_handled_safely():
    teacher, _, update = _approved_update_with_parent("autherr")
    provider = FakeWhatsAppProvider(
        fail=True, error=WhatsAppSendError("WhatsApp provider authentication failed.", code="auth_error", retryable=False)
    )
    use_fake_provider(provider)

    res = teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert res.status_code == 200
    assert res.json()["status"] == "failed"
    assert res.json()["error_code"] == "auth_error"


# 27. phone numbers are normalized/validated
def test_invalid_phone_number_rejected():
    teacher = _teacher_client("wa-badphone@example.com")
    _parent_client("wa-badphone-parent@example.com")
    student = _create_student(teacher, whatsapp_number="03001234567")  # missing country code
    _link_parent(teacher, student["id"], "wa-badphone-parent@example.com")
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    use_fake_provider(FakeWhatsAppProvider())

    res = teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    assert res.status_code == 422
    assert "international format" in res.json()["detail"].lower()


# 28. no sensitive data sent to provider beyond what is required
def test_only_approved_text_and_number_sent_to_provider():
    teacher, student, update = _approved_update_with_parent("payload-scope")
    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)

    teacher.post(f"/api/teacher/parent-updates/{update['id']}/send-whatsapp")
    assert len(provider.calls) == 1
    phone, message = provider.calls[0]
    assert phone == student["whatsapp_number"]
    assert message == update["english_text"]


# Approved update sends the roman_urdu variant when that's the student's
# preferred_language, exactly as approved (no retranslation).
def test_sends_roman_urdu_variant_when_preferred():
    teacher = _teacher_client("wa-lang@example.com")
    _parent_client("wa-lang-parent@example.com")
    student = _create_student(teacher, preferred_language="roman_urdu")
    _link_parent(teacher, student["id"], "wa-lang-parent@example.com")
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)

    teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    _, message = provider.calls[0]
    assert message == approved["roman_urdu_text"]


# The real Urdu-script variant is sent (not the roman_urdu fallback) when the
# student's preferred_language is "urdu" and the update actually has one.
def test_sends_real_urdu_variant_when_preferred_and_available():
    teacher = _teacher_client("wa-urdu@example.com")
    _parent_client("wa-urdu-parent@example.com")
    student = _create_student(teacher, preferred_language="urdu")
    _link_parent(teacher, student["id"], "wa-urdu-parent@example.com")
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()
    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)

    teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    _, message = provider.calls[0]
    assert message == approved["urdu_text"]
    assert message != approved["roman_urdu_text"]


# A pre-Phase-6 update with no urdu_text still sends something sensible
# (roman_urdu) rather than an empty message.
def test_urdu_preference_falls_back_to_roman_urdu_when_urdu_text_missing(db_session):
    import uuid as uuid_mod

    from app.models.parent_update import ParentUpdate

    teacher = _teacher_client("wa-urdu-fallback@example.com")
    _parent_client("wa-urdu-fallback-parent@example.com")
    student = _create_student(teacher, preferred_language="urdu")
    _link_parent(teacher, student["id"], "wa-urdu-fallback-parent@example.com")
    update = _saved_update(teacher, student["id"])
    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{update['id']}/approve").json()

    row = db_session.get(ParentUpdate, uuid_mod.UUID(approved["id"]))
    row.urdu_text = None
    db_session.commit()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    teacher.post(f"/api/teacher/parent-updates/{approved['id']}/send-whatsapp")
    _, message = provider.calls[0]
    assert message == approved["roman_urdu_text"]
