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


def _create_and_link(teacher: TestClient, parent_email: str, **overrides) -> dict:
    student = teacher.post("/api/teacher/students", json=_student_payload(**overrides)).json()
    res = teacher.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": parent_email, "relationship": "mother"},
    )
    assert res.status_code == 201
    return student


def test_parent_sees_linked_child():
    teacher = _teacher_client("pd-teacher1@example.com")
    parent = _parent_client("pd-parent1@example.com")
    student = _create_and_link(teacher, "pd-parent1@example.com")

    res = parent.get("/api/parent/children")
    assert res.status_code == 200
    ids = [c["id"] for c in res.json()]
    assert student["id"] in ids

    res = parent.get(f"/api/parent/children/{student['id']}")
    assert res.status_code == 200
    assert res.json()["full_name"] == "Ali Khan"


def test_parent_does_not_see_unlinked_child_404():
    teacher = _teacher_client("pd-teacher2@example.com")
    parent = _parent_client("pd-parent2@example.com")
    student = teacher.post("/api/teacher/students", json=_student_payload()).json()

    res = parent.get(f"/api/parent/children/{student['id']}")
    assert res.status_code == 404
    assert parent.get("/api/parent/children").json() == []


def test_parent_with_two_children_sees_both():
    teacher = _teacher_client("pd-teacher3@example.com")
    parent = _parent_client("pd-parent3@example.com")
    s1 = _create_and_link(teacher, "pd-parent3@example.com", roll_number="001", full_name="Child One")
    s2 = _create_and_link(teacher, "pd-parent3@example.com", roll_number="002", full_name="Child Two")

    res = parent.get("/api/parent/children")
    ids = {c["id"] for c in res.json()}
    assert ids == {s1["id"], s2["id"]}


def test_cross_parent_isolation():
    teacher = _teacher_client("pd-teacher4@example.com")
    parent_a = _parent_client("pd-parent4a@example.com")
    parent_b = _parent_client("pd-parent4b@example.com")
    student = _create_and_link(teacher, "pd-parent4a@example.com")

    res = parent_b.get(f"/api/parent/children/{student['id']}")
    assert res.status_code == 404
    assert parent_b.get("/api/parent/children").json() == []
    assert len(parent_a.get("/api/parent/children").json()) == 1


def test_require_teacher_blocks_parent_routes_403():
    teacher = _teacher_client("pd-teacher5@example.com")
    assert teacher.get("/api/parent/children").status_code == 403
    assert teacher.get("/api/parent/announcements").status_code == 403


def test_require_parent_blocks_teacher_routes_403():
    parent = _parent_client("pd-parent5@example.com")
    assert parent.get("/api/teacher/students").status_code == 403
    assert parent.post("/api/teacher/students", json=_student_payload()).status_code == 403


def test_unauthenticated_401():
    c = TestClient(app)
    assert c.get("/api/parent/children").status_code == 401
    assert c.get("/api/parent/announcements").status_code == 401


def test_parent_dashboard_excludes_draft_updates():
    teacher = _teacher_client("pd-teacher6@example.com")
    parent = _parent_client("pd-parent6@example.com")
    student = _create_and_link(teacher, "pd-parent6@example.com")

    draft = teacher.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Draft note.",
            "roman_urdu_text": "Draft note (RU).",
            "urdu_text": "ڈرافٹ نوٹ۔",
            "status": "draft",
        },
    )
    assert draft.status_code == 201

    res = parent.get(f"/api/parent/children/{student['id']}")
    assert res.status_code == 200
    assert res.json()["latest_update"] is None

    sent = teacher.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Sent note.",
            "roman_urdu_text": "Sent note (RU).",
            "urdu_text": "بھیجا گیا نوٹ۔",
            "status": "sent",
        },
    )
    assert sent.status_code == 201

    res = parent.get(f"/api/parent/children/{student['id']}")
    assert res.json()["latest_update"]["english_text"] == "Sent note."


def test_parent_sees_approved_update_after_teacher_approves():
    teacher = _teacher_client("pd-teacher7@example.com")
    parent = _parent_client("pd-parent7@example.com")
    student = _create_and_link(teacher, "pd-parent7@example.com")

    draft = teacher.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Draft note.", "roman_urdu_text": "Draft note (RU).", "urdu_text": "ڈرافٹ نوٹ۔"},
    ).json()
    assert parent.get(f"/api/parent/children/{student['id']}").json()["latest_update"] is None

    approved = teacher.post(f"/api/teacher/students/{student['id']}/updates/{draft['id']}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    res = parent.get(f"/api/parent/children/{student['id']}")
    assert res.json()["latest_update"]["english_text"] == "Draft note."


def test_parent_updates_endpoint_excludes_drafts_and_isolates_children():
    teacher = _teacher_client("pd-teacher8@example.com")
    parent_a = _parent_client("pd-parent8a@example.com")
    parent_b = _parent_client("pd-parent8b@example.com")
    student = _create_and_link(teacher, "pd-parent8a@example.com")

    draft = teacher.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Draft note.", "roman_urdu_text": "Draft note (RU).", "urdu_text": "ڈرافٹ نوٹ۔"},
    ).json()
    teacher.post(f"/api/teacher/students/{student['id']}/updates/{draft['id']}/approve")

    teacher.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Still a draft.", "roman_urdu_text": "Abhi bhi draft.", "urdu_text": "ابھی بھی ڈرافٹ۔"},
    )

    res = parent_a.get(f"/api/parent/children/{student['id']}/updates")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["english_text"] == "Draft note."
    assert "teacher_id" not in body[0]
    assert "ai_model" not in body[0]

    # An unlinked parent can't reach this student's updates at all.
    res = parent_b.get(f"/api/parent/children/{student['id']}/updates")
    assert res.status_code == 404
