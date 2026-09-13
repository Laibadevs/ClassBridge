import itertools

from fastapi.testclient import TestClient

from app.main import app

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
        "class_name": "Grade 8",
        "grade_level": "8",
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


def test_teacher_creates_student():
    c = _teacher_client("t-create@example.com")
    student = _create_student(c)
    assert student["full_name"] == "Ali Khan"
    assert student["class_name"] == "Grade 8"
    assert "id" in student


def test_teacher_lists_own_students():
    c = _teacher_client("t-list@example.com")
    _create_student(c, full_name="Ali Khan")
    _create_student(c, full_name="Zara Malik")
    res = c.get("/api/teacher/students")
    assert res.status_code == 200
    names = [s["full_name"] for s in res.json()]
    assert names == ["Ali Khan", "Zara Malik"]  # ordered by full_name


def test_teacher_views_own_student():
    c = _teacher_client("t-view@example.com")
    student = _create_student(c)
    res = c.get(f"/api/teacher/students/{student['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == student["id"]


def test_teacher_cannot_view_another_teachers_student():
    c1 = _teacher_client("t-owner@example.com")
    c2 = _teacher_client("t-intruder@example.com")
    student = _create_student(c1)
    res = c2.get(f"/api/teacher/students/{student['id']}")
    assert res.status_code == 404


def test_teacher_cannot_modify_another_teachers_student():
    c1 = _teacher_client("t-owner2@example.com")
    c2 = _teacher_client("t-intruder2@example.com")
    student = _create_student(c1)
    res = c2.patch(f"/api/teacher/students/{student['id']}", json={"full_name": "Hacked"})
    assert res.status_code == 404
    res = c2.delete(f"/api/teacher/students/{student['id']}")
    assert res.status_code == 404
    res = c2.post(
        f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"}
    )
    assert res.status_code == 404


def test_teacher_updates_own_student():
    c = _teacher_client("t-update@example.com")
    student = _create_student(c)
    res = c.patch(f"/api/teacher/students/{student['id']}", json={"full_name": "Ali K. Updated"})
    assert res.status_code == 200
    assert res.json()["full_name"] == "Ali K. Updated"


def test_teacher_deletes_own_student():
    c = _teacher_client("t-delete@example.com")
    student = _create_student(c)
    res = c.delete(f"/api/teacher/students/{student['id']}")
    assert res.status_code == 204
    assert c.get(f"/api/teacher/students/{student['id']}").status_code == 404


def test_attendance_creation():
    c = _teacher_client("t-att-create@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "present"


def test_attendance_duplicate_date_rejected():
    c = _teacher_client("t-att-dup@example.com")
    student = _create_student(c)
    c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"})
    res = c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "late"})
    assert res.status_code == 409


def test_attendance_invalid_status_rejected():
    c = _teacher_client("t-att-invalid@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "on-leave"}
    )
    assert res.status_code == 422


def test_attendance_retrieval():
    c = _teacher_client("t-att-list@example.com")
    student = _create_student(c)
    c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"})
    c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-02", "status": "absent"})
    res = c.get(f"/api/teacher/students/{student['id']}/attendance")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_grade_creation():
    c = _teacher_client("t-grade-create@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": 80, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    assert res.status_code == 201
    assert res.json()["subject"] == "Math"


def test_grade_score_exceeds_max_rejected():
    c = _teacher_client("t-grade-invalid@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": 120, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    assert res.status_code == 422


def test_grade_negative_score_rejected():
    c = _teacher_client("t-grade-negative@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": -5, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    assert res.status_code == 422


def test_grade_retrieval():
    c = _teacher_client("t-grade-list@example.com")
    student = _create_student(c)
    c.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": 80, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    res = c.get(f"/api/teacher/students/{student['id']}/grades")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_teacher_note_creation():
    c = _teacher_client("t-note-create@example.com")
    student = _create_student(c)
    res = c.post(f"/api/teacher/students/{student['id']}/notes", json={"note": "Doing well this week."})
    assert res.status_code == 201
    assert res.json()["note"] == "Doing well this week."


def test_teacher_note_blank_rejected():
    c = _teacher_client("t-note-blank@example.com")
    student = _create_student(c)
    res = c.post(f"/api/teacher/students/{student['id']}/notes", json={"note": "   "})
    assert res.status_code == 422


def test_teacher_note_retrieval():
    c = _teacher_client("t-note-list@example.com")
    student = _create_student(c)
    c.post(f"/api/teacher/students/{student['id']}/notes", json={"note": "First note."})
    c.post(f"/api/teacher/students/{student['id']}/notes", json={"note": "Second note."})
    res = c.get(f"/api/teacher/students/{student['id']}/notes")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_students_list_includes_computed_stats():
    c = _teacher_client("t-stats@example.com")
    student = _create_student(c)
    c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"})
    c.post(f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-02", "status": "absent"})
    c.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": 80, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    res = c.get("/api/teacher/students")
    body = res.json()[0]
    assert body["attendance_rate"] == 50.0
    assert body["average_grade"] == 80.0


def test_parent_cannot_access_teacher_endpoints():
    p = _parent_client("p-teacher-endpoints@example.com")
    res = p.get("/api/teacher/students")
    assert res.status_code == 403
    res = p.post("/api/teacher/students", json={"full_name": "Someone"})
    assert res.status_code == 403


def test_unauthenticated_receives_401():
    c = TestClient(app)
    assert c.get("/api/teacher/students").status_code == 401
    assert c.post("/api/teacher/students", json={"full_name": "Someone"}).status_code == 401
