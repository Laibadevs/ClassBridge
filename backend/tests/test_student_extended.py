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


def test_student_key_generated_on_create():
    c = _teacher_client("sk-create@example.com")
    res = c.post("/api/teacher/students", json=_student_payload())
    assert res.status_code == 201
    body = res.json()
    assert body["student_key"].startswith("CB-")
    assert body["student_key"].count("-") == 3


def test_student_key_unique_across_students():
    c = _teacher_client("sk-unique@example.com")
    s1 = c.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    s2 = c.post("/api/teacher/students", json=_student_payload(roll_number="002")).json()
    assert s1["student_key"] != s2["student_key"]


def test_create_student_missing_required_field_rejected():
    c = _teacher_client("sk-missing@example.com")
    for field in ["roll_number", "section", "parent_name", "whatsapp_number", "preferred_language"]:
        payload = _student_payload()
        del payload[field]
        res = c.post("/api/teacher/students", json=payload)
        assert res.status_code == 422, field


def test_invalid_preferred_language_rejected():
    c = _teacher_client("sk-lang@example.com")
    res = c.post("/api/teacher/students", json=_student_payload(preferred_language="french"))
    assert res.status_code == 422


def test_invalid_whatsapp_number_rejected():
    c = _teacher_client("sk-whatsapp@example.com")
    res = c.post("/api/teacher/students", json=_student_payload(whatsapp_number="abc"))
    assert res.status_code == 422


def test_duplicate_roll_number_same_class_section_rejected():
    c = _teacher_client("sk-dup@example.com")
    c.post("/api/teacher/students", json=_student_payload(full_name="Ali Khan"))
    res = c.post("/api/teacher/students", json=_student_payload(full_name="Sara Khan"))
    assert res.status_code == 409


def test_same_roll_number_different_section_allowed():
    c = _teacher_client("sk-diffsection@example.com")
    c.post("/api/teacher/students", json=_student_payload(section="A"))
    res = c.post("/api/teacher/students", json=_student_payload(section="B"))
    assert res.status_code == 201


def test_update_student_into_roll_conflict_rejected():
    c = _teacher_client("sk-updateconflict@example.com")
    s1 = c.post("/api/teacher/students", json=_student_payload(roll_number="001")).json()
    c.post("/api/teacher/students", json=_student_payload(roll_number="002"))
    res = c.patch(f"/api/teacher/students/{s1['id']}", json={"roll_number": "002"})
    assert res.status_code == 409


def test_create_student_with_existing_parent_email_auto_links():
    c = _teacher_client("sk-autolink-teacher@example.com")
    _parent_client("sk-autolink-parent@example.com")
    student = c.post(
        "/api/teacher/students", json=_student_payload(parent_email="sk-autolink-parent@example.com")
    ).json()
    assert len(student["parent_links"]) == 1
    assert student["parent_links"][0]["relationship"] == "guardian"

    # Proof the link really exists: linking the same parent again is a 409, not a fresh 201.
    res = c.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "sk-autolink-parent@example.com", "relationship": "mother"},
    )
    assert res.status_code == 409


def test_create_student_with_unknown_parent_email_creates_student_without_link():
    c = _teacher_client("sk-unknown-teacher@example.com")
    student = c.post(
        "/api/teacher/students", json=_student_payload(parent_email="nobody-yet@example.com")
    ).json()
    assert student["parent_links"] == []


def test_link_parent_success():
    c = _teacher_client("sk-link-teacher@example.com")
    _parent_client("sk-link-parent@example.com")
    student = c.post("/api/teacher/students", json=_student_payload()).json()
    res = c.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "sk-link-parent@example.com", "relationship": "father"},
    )
    assert res.status_code == 201
    assert res.json()["relationship"] == "father"


def test_link_parent_unknown_email_404():
    c = _teacher_client("sk-link-404@example.com")
    student = c.post("/api/teacher/students", json=_student_payload()).json()
    res = c.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "ghost@example.com", "relationship": "father"},
    )
    assert res.status_code == 404


def test_link_parent_already_linked_409():
    c = _teacher_client("sk-link-409@example.com")
    _parent_client("sk-link-409-parent@example.com")
    student = c.post("/api/teacher/students", json=_student_payload()).json()
    c.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "sk-link-409-parent@example.com", "relationship": "father"},
    )
    res = c.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "sk-link-409-parent@example.com", "relationship": "mother"},
    )
    assert res.status_code == 409


def test_link_parent_cross_teacher_ownership_404():
    owner = _teacher_client("sk-link-owner@example.com")
    intruder = _teacher_client("sk-link-intruder@example.com")
    _parent_client("sk-link-cross-parent@example.com")
    student = owner.post("/api/teacher/students", json=_student_payload()).json()
    res = intruder.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "sk-link-cross-parent@example.com", "relationship": "father"},
    )
    assert res.status_code == 404
