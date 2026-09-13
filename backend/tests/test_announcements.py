from fastapi.testclient import TestClient

from app.main import app


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


def test_create_and_list_announcement():
    c = _teacher_client("an-create@example.com")
    res = c.post("/api/teacher/announcements", json=_announcement_payload())
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "draft"

    res = c.get("/api/teacher/announcements")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_target_all_publish_recipients():
    c = _teacher_client("an-all@example.com")
    c.post("/api/teacher/students", json=_student_payload(roll_number="001"))
    c.post("/api/teacher/students", json=_student_payload(roll_number="002"))
    announcement = c.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()

    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert res.status_code == 200
    # Publish now also attempts WhatsApp delivery immediately (Phase 5) —
    # with the mock provider (default in tests) every send succeeds, so the
    # announcement's overall status advances straight to "sent".
    assert res.json()["status"] == "sent"
    assert len(res.json()["recipients"]) == 2


def test_target_class_publish_recipients_only_matching_class():
    c = _teacher_client("an-class@example.com")
    c.post("/api/teacher/students", json=_student_payload(roll_number="001", class_name="Grade 8"))
    c.post("/api/teacher/students", json=_student_payload(roll_number="002", class_name="Grade 9"))
    announcement = c.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="class", target_class="Grade 8"),
    ).json()

    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert len(res.json()["recipients"]) == 1


def test_target_section_publish_recipients():
    c = _teacher_client("an-section@example.com")
    c.post("/api/teacher/students", json=_student_payload(roll_number="001", class_name="Grade 8", section="A"))
    c.post("/api/teacher/students", json=_student_payload(roll_number="002", class_name="Grade 8", section="B"))
    announcement = c.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="section", target_class="Grade 8", target_section="A"),
    ).json()

    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert len(res.json()["recipients"]) == 1


def test_target_students_publish_recipients():
    c = _teacher_client("an-students@example.com")
    s1 = c.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    c.post("/api/teacher/students", json=_student_payload(roll_number="002"))
    announcement = c.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="students", target_student_ids=[s1["id"]]),
    ).json()

    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    recipients = res.json()["recipients"]
    assert len(recipients) == 1
    assert recipients[0]["student_id"] == s1["id"]


def test_cross_teacher_target_student_rejected_on_create():
    owner = _teacher_client("an-owner@example.com")
    intruder = _teacher_client("an-intruder@example.com")
    student = owner.post("/api/teacher/students", json=_student_payload()).json()

    res = intruder.post(
        "/api/teacher/announcements",
        json=_announcement_payload(target_type="students", target_student_ids=[student["id"]]),
    )
    assert res.status_code == 404


def test_publish_recipient_parent_user_id_null_when_unlinked():
    c = _teacher_client("an-unlinked@example.com")
    c.post("/api/teacher/students", json=_student_payload())
    announcement = c.post("/api/teacher/announcements", json=_announcement_payload()).json()
    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert res.json()["recipients"][0]["parent_user_id"] is None


def test_publish_idempotent_second_publish_409():
    c = _teacher_client("an-idempotent@example.com")
    c.post("/api/teacher/students", json=_student_payload())
    announcement = c.post("/api/teacher/announcements", json=_announcement_payload()).json()
    c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    res = c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    assert res.status_code == 409


def test_patch_after_publish_rejected_409():
    c = _teacher_client("an-patch@example.com")
    c.post("/api/teacher/students", json=_student_payload())
    announcement = c.post("/api/teacher/announcements", json=_announcement_payload()).json()
    c.post(f"/api/teacher/announcements/{announcement['id']}/publish")
    res = c.patch(f"/api/teacher/announcements/{announcement['id']}", json={"title": "Changed"})
    assert res.status_code == 409


def test_parent_sees_only_own_recipient_announcements():
    teacher = _teacher_client("an-parent-teacher@example.com")
    parent_a = _parent_client("an-parent-a@example.com")
    parent_b = _parent_client("an-parent-b@example.com")
    _parent_client("an-parent-c@example.com")

    student_a = teacher.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    student_b = teacher.post("/api/teacher/students", json=_student_payload(roll_number="002")).json()
    teacher.post(
        f"/api/teacher/students/{student_a['id']}/link-parent",
        json={"parent_email": "an-parent-a@example.com", "relationship": "mother"},
    )
    teacher.post(
        f"/api/teacher/students/{student_b['id']}/link-parent",
        json={"parent_email": "an-parent-b@example.com", "relationship": "mother"},
    )

    announcement = teacher.post("/api/teacher/announcements", json=_announcement_payload(target_type="all")).json()
    teacher.post(f"/api/teacher/announcements/{announcement['id']}/publish")

    assert len(parent_a.get("/api/parent/announcements").json()) == 1
    assert len(parent_b.get("/api/parent/announcements").json()) == 1
    assert parent_a.get("/api/parent/announcements").json()[0]["student_id"] == student_a["id"]


def test_draft_announcement_invisible_to_parent():
    teacher = _teacher_client("an-draft-teacher@example.com")
    parent = _parent_client("an-draft-parent@example.com")
    student = teacher.post("/api/teacher/students", json=_student_payload()).json()
    teacher.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "an-draft-parent@example.com", "relationship": "mother"},
    )
    teacher.post("/api/teacher/announcements", json=_announcement_payload())

    assert parent.get("/api/parent/announcements").json() == []
