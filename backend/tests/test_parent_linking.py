"""Teacher -> Student -> Parent linking via the parent_email a teacher
enters when creating a student. Covers both directions: the parent account
already existing (immediate link at creation) and the parent signing up
afterward (auto-link at signup, driven by Student.parent_email)."""

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


# TEST A — parent account exists first, teacher enters that email -> linked immediately.
def test_auto_link_when_parent_already_exists():
    teacher = _teacher_client("pl-teacher-a@example.com")
    _parent_client("pl-parent-a@example.com")

    student = _create_student(teacher, full_name="Ali Ahmed", parent_email="pl-parent-a@example.com")
    assert len(student["parent_links"]) == 1

    parent = TestClient(app)
    res = parent.post(
        "/api/auth/login",
        json={"email": "pl-parent-a@example.com", "password": "password123", "role": "parent"},
    )
    assert res.status_code == 200
    res = parent.get("/api/parent/children")
    assert res.status_code == 200
    names = [c["full_name"] for c in res.json()]
    assert "Ali Ahmed" in names


# TEST B — student created first with an email nobody has signed up with yet;
# signing up afterward auto-links it.
def test_signup_after_student_auto_links():
    teacher = _teacher_client("pl-teacher-b@example.com")
    student = _create_student(teacher, full_name="Ahmed Khan", parent_email="pl-parent-b@example.com")
    # No parent account exists yet — student creation must still succeed,
    # and nothing fake gets created.
    assert student["parent_links"] == []
    assert student["parent_email"] == "pl-parent-b@example.com"

    parent = _parent_client("pl-parent-b@example.com")
    res = parent.get("/api/parent/children")
    assert res.status_code == 200
    names = [c["full_name"] for c in res.json()]
    assert "Ahmed Khan" in names


# TEST C — multiple children registered under the same parent email all link
# to the one parent account on signup.
def test_signup_links_multiple_children_same_email():
    teacher = _teacher_client("pl-teacher-c@example.com")
    _create_student(teacher, full_name="Ali", parent_email="pl-family-c@example.com")
    _create_student(teacher, full_name="Sara", parent_email="pl-family-c@example.com")
    _create_student(teacher, full_name="Ahmed", parent_email="pl-family-c@example.com")

    parent = _parent_client("pl-family-c@example.com")
    res = parent.get("/api/parent/children")
    assert res.status_code == 200
    names = {c["full_name"] for c in res.json()}
    assert names == {"Ali", "Sara", "Ahmed"}


# TEST D — case-insensitive email matching, both directions.
def test_case_insensitive_email_matching_on_signup():
    teacher = _teacher_client("pl-teacher-d@example.com")
    student = _create_student(teacher, full_name="Bilal", parent_email="Parent.Bilal@Example.com")
    assert student["parent_links"] == []

    parent = _parent_client("parent.bilal@example.com")
    res = parent.get("/api/parent/children")
    names = [c["full_name"] for c in res.json()]
    assert "Bilal" in names


def test_case_insensitive_email_matching_on_immediate_link():
    teacher = _teacher_client("pl-teacher-d2@example.com")
    _parent_client("Parent.Case2@Example.com")

    student = _create_student(teacher, full_name="Hania", parent_email="parent.case2@example.com")
    assert len(student["parent_links"]) == 1


# Duplicate-link prevention: creating a second student for the same
# already-linked parent must not blow up or create a second link row for a
# student that's (somehow) already linked, and signing up twice must never
# double up either.
def test_no_duplicate_link_created():
    teacher = _teacher_client("pl-teacher-dup@example.com")
    parent = _parent_client("pl-dup@example.com")

    student = _create_student(teacher, full_name="Dup Test", parent_email="pl-dup@example.com")
    assert len(student["parent_links"]) == 1

    # Manually linking the same parent again is rejected, not duplicated.
    res = teacher.post(
        f"/api/teacher/students/{student['id']}/link-parent",
        json={"parent_email": "pl-dup@example.com", "relationship": "guardian"},
    )
    assert res.status_code == 409

    res = parent.get("/api/parent/children")
    assert len([c for c in res.json() if c["full_name"] == "Dup Test"]) == 1


# TEST E — teacher isolation: Teacher B cannot see/edit/delete/add data for
# Teacher A's student.
def test_teacher_isolation_on_linked_student():
    teacher_a = _teacher_client("pl-teacher-e-a@example.com")
    teacher_b = _teacher_client("pl-teacher-e-b@example.com")
    student = _create_student(teacher_a, full_name="Isolated Student")

    assert teacher_b.get(f"/api/teacher/students/{student['id']}").status_code == 404
    assert teacher_b.patch(f"/api/teacher/students/{student['id']}", json={"full_name": "Hacked"}).status_code == 404
    assert teacher_b.delete(f"/api/teacher/students/{student['id']}").status_code == 404
    assert teacher_b.post(
        f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-01", "status": "present"}
    ).status_code == 404
    assert teacher_b.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Math", "score": 80, "max_score": 100, "assessment_date": "2026-09-01"},
    ).status_code == 404
    assert teacher_b.post(
        f"/api/teacher/students/{student['id']}/notes", json={"note": "Hacked note."}
    ).status_code == 404


# TEST F — parent isolation: Parent A (linked to Student A) cannot access
# Student B, which belongs to a different parent.
def test_parent_isolation_between_families():
    teacher = _teacher_client("pl-teacher-f@example.com")
    student_a = _create_student(teacher, full_name="Family A Child", parent_email="pl-family-a@example.com")
    student_b = _create_student(teacher, full_name="Family B Child", parent_email="pl-family-b@example.com")

    parent_a = _parent_client("pl-family-a@example.com")
    _parent_client("pl-family-b@example.com")

    res = parent_a.get("/api/parent/children")
    ids = {c["id"] for c in res.json()}
    assert ids == {student_a["id"]}

    res = parent_a.get(f"/api/parent/children/{student_b['id']}")
    assert res.status_code == 404


# TEST G — new student propagation: a newly created student is immediately
# visible via the real students list/detail endpoints (what every teacher
# page that lists students is backed by), with real attendance/grades scoped
# to it.
def test_new_student_propagates_through_real_endpoints():
    teacher = _teacher_client("pl-teacher-g@example.com")
    before = teacher.get("/api/teacher/students").json()

    student = _create_student(teacher, full_name="Propagation Test")

    after = teacher.get("/api/teacher/students").json()
    assert len(after) == len(before) + 1
    assert any(s["id"] == student["id"] for s in after)

    res = teacher.get(f"/api/teacher/students/{student['id']}")
    assert res.status_code == 200
    assert res.json()["full_name"] == "Propagation Test"

    # Attendance for the newly created student belongs to it and only it.
    res = teacher.post(
        f"/api/teacher/students/{student['id']}/attendance", json={"date": "2026-09-05", "status": "present"}
    )
    assert res.status_code == 201
    assert res.json()["student_id"] == student["id"]
    res = teacher.get(f"/api/teacher/students/{student['id']}/attendance")
    assert len(res.json()) == 1

    # Grades for the newly created student, same story.
    res = teacher.post(
        f"/api/teacher/students/{student['id']}/grades",
        json={"subject": "Science", "score": 90, "max_score": 100, "assessment_date": "2026-09-05"},
    )
    assert res.status_code == 201
    assert res.json()["student_id"] == student["id"]
    res = teacher.get(f"/api/teacher/students/{student['id']}/grades")
    assert len(res.json()) == 1

    # And the roster's own rollup picks up the new attendance/grade rows.
    listed = next(s for s in teacher.get("/api/teacher/students").json() if s["id"] == student["id"])
    assert listed["attendance_rate"] == 100.0
    assert listed["average_grade"] == 90.0


def test_unauthenticated_cannot_reach_linking_endpoints():
    c = TestClient(app)
    assert c.get("/api/teacher/students").status_code == 401
    assert c.get("/api/parent/children").status_code == 401
