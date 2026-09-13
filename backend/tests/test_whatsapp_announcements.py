from fastapi.testclient import TestClient

from app.main import app
from app.services.whatsapp.provider import WhatsAppSendError, WhatsAppSendResult
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


def _announcement_payload(**overrides) -> dict:
    payload = {
        "title": "Parent-Teacher Meeting",
        "message": "Please join us this Friday at 4pm.",
        "announcement_type": "parent_meeting",
        "target_type": "all",
    }
    payload.update(overrides)
    return payload


# 11. announcement targeting all works
def test_publish_target_all_sends_to_every_students_parent():
    teacher = _teacher_client("wan-all@example.com")
    _parent_client("wan-all-p1@example.com")
    _parent_client("wan-all-p2@example.com")
    s1 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    s2 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="002")).json()
    teacher.post(f"/api/teacher/students/{s1['id']}/link-parent", json={"parent_email": "wan-all-p1@example.com", "relationship": "mother"})
    teacher.post(f"/api/teacher/students/{s2['id']}/link-parent", json={"parent_email": "wan-all-p2@example.com", "relationship": "mother"})
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert res.status_code == 200
    body = res.json()
    assert len(body["recipients"]) == 2
    assert all(r["delivery_status"] == "sent" for r in body["recipients"])
    assert body["status"] == "sent"
    assert len(provider.calls) == 2


# 12. announcement targeting class works
def test_publish_target_class_sends_only_to_matching_class():
    teacher = _teacher_client("wan-class@example.com")
    teacher.post("/api/teacher/students", json=_student_payload(roll_number="001", class_name="Grade 8"))
    teacher.post("/api/teacher/students", json=_student_payload(roll_number="002", class_name="Grade 9"))
    announcement = teacher.post(
        "/api/teacher/announcements", json=_announcement_payload(target_type="class", target_class="Grade 8")
    ).json()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert len(res.json()["recipients"]) == 1
    assert len(provider.calls) == 1


# 13. announcement targeting section works
def test_publish_target_section_sends_only_to_matching_section():
    teacher = _teacher_client("wan-section@example.com")
    teacher.post("/api/teacher/students", json=_student_payload(roll_number="001", class_name="Grade 8", section="A"))
    teacher.post("/api/teacher/students", json=_student_payload(roll_number="002", class_name="Grade 8", section="B"))
    announcement = teacher.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="section", target_class="Grade 8", target_section="A"),
    ).json()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert len(res.json()["recipients"]) == 1
    assert len(provider.calls) == 1


# 14. announcement targeting selected students works
def test_publish_target_students_sends_only_to_selected():
    teacher = _teacher_client("wan-students@example.com")
    s1 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    teacher.post("/api/teacher/students", json=_student_payload(roll_number="002"))
    announcement = teacher.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="students", target_student_ids=[s1["id"]]),
    ).json()

    provider = FakeWhatsAppProvider()
    use_fake_provider(provider)
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    recipients = res.json()["recipients"]
    assert len(recipients) == 1
    assert recipients[0]["student_id"] == s1["id"]


# 15. teacher cannot target another teacher's student
def test_cannot_target_another_teachers_student():
    owner = _teacher_client("wan-owner@example.com")
    intruder = _teacher_client("wan-intruder@example.com")
    student = owner.post("/api/teacher/students", json=_student_payload()).json()

    res = intruder.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="students", target_student_ids=[student["id"]]),
    )
    assert res.status_code == 404


# 16. unrelated parent does not receive announcement
def test_unrelated_parent_does_not_receive_announcement():
    teacher = _teacher_client("wan-unrelated-teacher@example.com")
    linked_parent = _parent_client("wan-unrelated-linked@example.com")
    unrelated_parent = _parent_client("wan-unrelated-other@example.com")
    student = teacher.post("/api/teacher/students", json=_student_payload()).json()
    teacher.post(f"/api/teacher/students/{student['id']}/link-parent", json={"parent_email": "wan-unrelated-linked@example.com", "relationship": "mother"})
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

    use_fake_provider(FakeWhatsAppProvider())
    teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")

    assert len(linked_parent.get("/api/parent/announcements").json()) == 1
    assert len(unrelated_parent.get("/api/parent/announcements").json()) == 0


# One failed recipient does not fail the others; announcement isn't marked
# fully failed either.
def test_one_failed_recipient_does_not_block_others():
    teacher = _teacher_client("wan-partial@example.com")
    _parent_client("wan-partial-p1@example.com")
    _parent_client("wan-partial-p2@example.com")
    s1 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="001", whatsapp_number="+923001111111")).json()
    s2 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="002", whatsapp_number="+923002222222")).json()
    teacher.post(f"/api/teacher/students/{s1['id']}/link-parent", json={"parent_email": "wan-partial-p1@example.com", "relationship": "mother"})
    teacher.post(f"/api/teacher/students/{s2['id']}/link-parent", json={"parent_email": "wan-partial-p2@example.com", "relationship": "mother"})
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

    class PartialFailProvider(FakeWhatsAppProvider):
        def send_text_message(self, *, phone_number, message):
            self.calls.append((phone_number, message))
            if phone_number == "+923002222222":
                raise WhatsAppSendError("nope", code="rejected", retryable=False)
            return WhatsAppSendResult(provider_message_id=f"wamid.fake.{len(self.calls)}")

    use_fake_provider(PartialFailProvider())
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert res.status_code == 200
    statuses = {r["delivery_status"] for r in res.json()["recipients"]}
    assert statuses == {"sent", "failed"}
    # Mixed outcome: not incorrectly marked fully "failed".
    assert res.json()["status"] != "failed"


# 26. max recipient limit enforced
def test_max_recipients_enforced(monkeypatch):
    from app.core import config

    config.get_settings.cache_clear()
    monkeypatch.setenv("WHATSAPP_MAX_RECIPIENTS", "1")
    config.get_settings.cache_clear()
    try:
        teacher = _teacher_client("wan-maxrecip@example.com")
        teacher.post("/api/teacher/students", json=_student_payload(roll_number="001"))
        teacher.post("/api/teacher/students", json=_student_payload(roll_number="002"))
        announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

        use_fake_provider(FakeWhatsAppProvider())
        res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
        assert res.status_code == 422
    finally:
        config.get_settings.cache_clear()


# Retry endpoint only touches pending/failed recipients — already-sent ones
# are never re-sent (idempotent retry).
def test_send_whatsapp_retry_only_resends_failed():
    teacher = _teacher_client("wan-retry@example.com")
    _parent_client("wan-retry-p1@example.com")
    _parent_client("wan-retry-p2@example.com")
    s1 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="001", whatsapp_number="+923001111111")).json()
    s2 = teacher.post("/api/teacher/students", json=_student_payload(roll_number="002", whatsapp_number="+923002222222")).json()
    teacher.post(f"/api/teacher/students/{s1['id']}/link-parent", json={"parent_email": "wan-retry-p1@example.com", "relationship": "mother"})
    teacher.post(f"/api/teacher/students/{s2['id']}/link-parent", json={"parent_email": "wan-retry-p2@example.com", "relationship": "mother"})
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

    class PartialFailProvider(FakeWhatsAppProvider):
        def send_text_message(self, *, phone_number, message):
            self.calls.append((phone_number, message))
            if phone_number == "+923002222222":
                raise WhatsAppSendError("nope", code="rejected", retryable=False)
            return WhatsAppSendResult(provider_message_id=f"wamid.fake.{len(self.calls)}")

    failing = PartialFailProvider()
    use_fake_provider(failing)
    teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert len(failing.calls) == 2

    succeeding = FakeWhatsAppProvider()
    use_fake_provider(succeeding)
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/send-whatsapp")
    assert res.status_code == 200
    assert all(r["delivery_status"] == "sent" for r in res.json()["recipients"])
    assert len(succeeding.calls) == 1  # only the previously-failed recipient was retried


# 22. parent cannot call teacher WhatsApp endpoints
def test_parent_cannot_call_announcement_send_whatsapp():
    teacher = _teacher_client("wan-parentblock@example.com")
    student = teacher.post("/api/teacher/students", json=_student_payload()).json()
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload()).json()
    parent = _parent_client("wan-parentblock-p@example.com")

    use_fake_provider(FakeWhatsAppProvider())
    res = parent.post(f"/api/teacher/announcements/{announcement['id']}/send-whatsapp")
    assert res.status_code == 403


# 23. unauthenticated requests rejected
def test_unauthenticated_announcement_send_whatsapp_rejected():
    teacher = _teacher_client("wan-anonblock@example.com")
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload()).json()
    anon = TestClient(app)

    use_fake_provider(FakeWhatsAppProvider())
    res = anon.post(f"/api/teacher/announcements/{announcement['id']}/send-whatsapp")
    assert res.status_code == 401


# draft announcement can't be sent via the explicit endpoint
def test_draft_announcement_cannot_be_sent():
    teacher = _teacher_client("wan-draftsend@example.com")
    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload()).json()

    use_fake_provider(FakeWhatsAppProvider())
    res = teacher.post(f"/api/teacher/announcements/{announcement['id']}/send-whatsapp")
    assert res.status_code == 409
