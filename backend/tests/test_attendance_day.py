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


# 1. saving a day's register creates attendance rows for the marked students
def test_set_day_attendance_creates_rows():
    c = _teacher_client("day-create@example.com")
    s1 = _create_student(c)
    s2 = _create_student(c)

    res = c.post(
        "/api/teacher/attendance/day",
        json={
            "date": "2026-09-10",
            "roster_student_ids": [s1["id"], s2["id"]],
            "marks": [
                {"student_id": s1["id"], "status": "present"},
                {"student_id": s2["id"], "status": "late"},
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    by_student = {row["student_id"]: row["status"] for row in body}
    assert by_student[s1["id"]] == "present"
    assert by_student[s2["id"]] == "late"


# 2. saving the same day again updates status rather than erroring (upsert)
def test_set_day_attendance_upserts_existing_record():
    c = _teacher_client("day-upsert@example.com")
    s1 = _create_student(c)

    first = c.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s1["id"], "status": "present"}]},
    )
    assert first.status_code == 200
    assert first.json()[0]["status"] == "present"

    second = c.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s1["id"], "status": "absent"}]},
    )
    assert second.status_code == 200
    body = second.json()
    assert len(body) == 1
    assert body[0]["status"] == "absent"
    assert body[0]["id"] == first.json()[0]["id"]  # same row, updated in place


# 3. a roster student left out of marks has their existing record removed (unmark)
def test_set_day_attendance_clears_unmarked_roster_student():
    c = _teacher_client("day-unmark@example.com")
    s1 = _create_student(c)
    s2 = _create_student(c)

    c.post(
        "/api/teacher/attendance/day",
        json={
            "date": "2026-09-10",
            "roster_student_ids": [s1["id"], s2["id"]],
            "marks": [
                {"student_id": s1["id"], "status": "present"},
                {"student_id": s2["id"], "status": "present"},
            ],
        },
    )

    # Second save omits s2 from marks — its record should be deleted.
    res = c.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [s1["id"], s2["id"]], "marks": [{"student_id": s1["id"], "status": "present"}]},
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["student_id"] == s1["id"]


# 4. a teacher cannot save attendance for another teacher's student
def test_set_day_attendance_rejects_unowned_student():
    owner = _teacher_client("day-owner@example.com")
    intruder = _teacher_client("day-intruder@example.com")
    student = _create_student(owner)

    res = intruder.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [student["id"]], "marks": [{"student_id": student["id"], "status": "present"}]},
    )
    assert res.status_code == 404


# 5. a mark must reference a student in roster_student_ids
def test_set_day_attendance_rejects_mark_outside_roster():
    c = _teacher_client("day-outside-roster@example.com")
    s1 = _create_student(c)
    s2 = _create_student(c)

    res = c.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s2["id"], "status": "present"}]},
    )
    assert res.status_code == 422


# 6. unauthenticated requests are rejected
def test_set_day_attendance_requires_auth():
    owner = _teacher_client("day-auth-setup@example.com")
    student = _create_student(owner)
    anon = TestClient(app)
    res = anon.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [student["id"]], "marks": []},
    )
    assert res.status_code == 401


# 7. GET range returns only this teacher's students' rows within the window
def test_get_attendance_range_scoped_to_teacher_and_window():
    owner = _teacher_client("range-owner@example.com")
    other = _teacher_client("range-other@example.com")
    s1 = _create_student(owner)
    s2 = _create_student(other)

    owner.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-08", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s1["id"], "status": "present"}]},
    )
    owner.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-12", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s1["id"], "status": "late"}]},
    )
    # Outside the queried window — must not appear.
    owner.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-01", "roster_student_ids": [s1["id"]], "marks": [{"student_id": s1["id"], "status": "absent"}]},
    )
    other.post(
        "/api/teacher/attendance/day",
        json={"date": "2026-09-10", "roster_student_ids": [s2["id"]], "marks": [{"student_id": s2["id"], "status": "present"}]},
    )

    res = owner.get("/api/teacher/attendance", params={"start": "2026-09-08", "end": "2026-09-12"})
    assert res.status_code == 200
    body = res.json()
    student_ids = {row["student_id"] for row in body}
    assert student_ids == {s1["id"]}
    assert len(body) == 2


# 8. unauthenticated GET range is rejected
def test_get_attendance_range_requires_auth():
    anon = TestClient(app)
    res = anon.get("/api/teacher/attendance", params={"start": "2026-09-08", "end": "2026-09-12"})
    assert res.status_code == 401


# 9. end before start is rejected
def test_get_attendance_range_rejects_inverted_range():
    c = _teacher_client("range-inverted@example.com")
    res = c.get("/api/teacher/attendance", params={"start": "2026-09-12", "end": "2026-09-08"})
    assert res.status_code == 422
