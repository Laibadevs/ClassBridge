import itertools

from fastapi.testclient import TestClient

from app.core.config import get_settings
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


def _seed_classroom_data(client: TestClient, student_id: str):
    client.post(f"/api/teacher/students/{student_id}/attendance", json={"date": "2026-09-01", "status": "present"})
    client.post(f"/api/teacher/students/{student_id}/attendance", json={"date": "2026-09-02", "status": "present"})
    client.post(f"/api/teacher/students/{student_id}/attendance", json={"date": "2026-09-03", "status": "absent"})
    client.post(
        f"/api/teacher/students/{student_id}/grades",
        json={"subject": "Mathematics", "score": 75, "max_score": 100, "assessment_date": "2026-09-01"},
    )
    client.post(
        f"/api/teacher/students/{student_id}/notes",
        json={"note": "Struggling with algebraic equations but stays engaged and asks good questions."},
    )


# 1. teacher can generate update for own student
def test_teacher_can_generate_update_for_own_student():
    c = _teacher_client("gen-owner@example.com")
    student = _create_student(c)
    _seed_classroom_data(c, student["id"])
    res = c.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert res.status_code == 200
    body = res.json()
    assert body["english_text"]
    assert body["roman_urdu_text"]
    assert body["urdu_text"]


# 2. teacher cannot generate update for another teacher's student
def test_teacher_cannot_generate_update_for_another_teachers_student():
    owner = _teacher_client("gen-owner2@example.com")
    intruder = _teacher_client("gen-intruder@example.com")
    student = _create_student(owner)
    _seed_classroom_data(owner, student["id"])
    res = intruder.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert res.status_code == 404


# 3. parent cannot call teacher AI endpoint
def test_parent_cannot_call_generate_update():
    owner = _teacher_client("gen-owner3@example.com")
    student = _create_student(owner)
    parent = _parent_client("gen-parent@example.com")
    res = parent.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert res.status_code == 403


# 4. unauthenticated request returns 401
def test_unauthenticated_generate_update_returns_401():
    owner = _teacher_client("gen-owner4@example.com")
    student = _create_student(owner)
    anon = TestClient(app)
    res = anon.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert res.status_code == 401


# 5. AI returns English, Roman Urdu, and real Urdu script
def test_generate_update_returns_all_three_languages():
    c = _teacher_client("gen-trilingual@example.com")
    student = _create_student(c)
    _seed_classroom_data(c, student["id"])
    res = c.post(f"/api/teacher/students/{student['id']}/generate-update")
    body = res.json()
    assert set(body.keys()) == {"english_text", "roman_urdu_text", "urdu_text"}
    assert body["english_text"] != body["roman_urdu_text"]
    assert body["urdu_text"] != body["roman_urdu_text"]
    # Real Urdu script, not another Latin-script transliteration.
    assert any("؀" <= ch <= "ۿ" for ch in body["urdu_text"])


# 6. insufficient data does not cause fabricated information
def test_insufficient_data_does_not_fabricate():
    c = _teacher_client("gen-empty@example.com")
    student = _create_student(c)
    # No attendance, no grades, no notes recorded at all.
    res = c.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert res.status_code == 200
    body = res.json()
    # Must not contain a percentage or score-like figure it was never given.
    assert "%" not in body["english_text"]
    assert "%" not in body["roman_urdu_text"]
    assert "%" not in body["urdu_text"]
    assert "enough" in body["english_text"].lower() or "kaafi" in body["roman_urdu_text"].lower()
    assert body["urdu_text"]  # a neutral message is still generated, never blank


# 7. generated update can be edited (before saving — teacher edits the text
# it received, then that edited text is what gets saved)
def test_generated_update_text_can_be_edited_then_saved():
    c = _teacher_client("gen-edit@example.com")
    student = _create_student(c)
    _seed_classroom_data(c, student["id"])
    generated = c.post(f"/api/teacher/students/{student['id']}/generate-update").json()

    edited_english = generated["english_text"] + " Edited by teacher."
    res = c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": edited_english,
            "roman_urdu_text": generated["roman_urdu_text"],
            "urdu_text": generated["urdu_text"],
            "status": "draft",
        },
    )
    assert res.status_code == 201
    assert res.json()["english_text"] == edited_english

    # And it can be edited again after being saved, via PATCH.
    update_id = res.json()["id"]
    res2 = c.patch(
        f"/api/teacher/students/{student['id']}/updates/{update_id}",
        json={"english_text": "Final edited text."},
    )
    assert res2.status_code == 200
    assert res2.json()["english_text"] == "Final edited text."
    assert res2.json()["roman_urdu_text"] == generated["roman_urdu_text"]  # untouched field preserved


# 8. update can be saved
def test_update_can_be_saved_as_draft():
    c = _teacher_client("gen-save@example.com")
    student = _create_student(c)
    res = c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Ali is doing well.",
            "roman_urdu_text": "Ali theek kar raha hai.",
            "urdu_text": "علی ٹھیک کر رہا ہے۔",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "draft"
    assert body["student_id"] == student["id"]
    assert body["urdu_text"] == "علی ٹھیک کر رہا ہے۔"


# 9. previous updates can be retrieved
def test_previous_updates_can_be_retrieved():
    c = _teacher_client("gen-list@example.com")
    student = _create_student(c)
    c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "First update.", "roman_urdu_text": "Pehla update.", "urdu_text": "پہلا اپڈیٹ۔"},
    )
    c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Second update.", "roman_urdu_text": "Doosra update.", "urdu_text": "دوسرا اپڈیٹ۔"},
    )
    res = c.get(f"/api/teacher/students/{student['id']}/updates")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    assert body[0]["english_text"] == "Second update."  # most recent first


# Ownership also enforced on save/list/edit, not just generate.
def test_teacher_cannot_save_or_list_or_edit_another_teachers_student_updates():
    owner = _teacher_client("gen-owner5@example.com")
    intruder = _teacher_client("gen-intruder5@example.com")
    student = _create_student(owner)

    res = intruder.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Hacked.", "roman_urdu_text": "Hacked.", "urdu_text": "ہیک شدہ۔"},
    )
    assert res.status_code == 404

    res = intruder.get(f"/api/teacher/students/{student['id']}/updates")
    assert res.status_code == 404

    saved = owner.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Original.", "roman_urdu_text": "Original.", "urdu_text": "اصل۔"},
    ).json()
    res = intruder.patch(
        f"/api/teacher/students/{student['id']}/updates/{saved['id']}",
        json={"english_text": "Hacked."},
    )
    assert res.status_code == 404


# 11. a saved draft can be approved by its owning teacher
def test_teacher_can_approve_own_update():
    c = _teacher_client("gen-approve@example.com")
    student = _create_student(c)
    saved = c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Ali is doing well.",
            "roman_urdu_text": "Ali theek kar raha hai.",
            "urdu_text": "علی ٹھیک کر رہا ہے۔",
        },
    ).json()
    assert saved["status"] == "draft"

    res = c.post(f"/api/teacher/students/{student['id']}/updates/{saved['id']}/approve")
    assert res.status_code == 200
    assert res.json()["status"] == "approved"


# 12. a teacher cannot approve another teacher's update
def test_teacher_cannot_approve_another_teachers_update():
    owner = _teacher_client("gen-approve-owner@example.com")
    intruder = _teacher_client("gen-approve-intruder@example.com")
    student = _create_student(owner)
    saved = owner.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={"english_text": "Original.", "roman_urdu_text": "Original.", "urdu_text": "اصل۔"},
    ).json()

    res = intruder.post(f"/api/teacher/students/{student['id']}/updates/{saved['id']}/approve")
    assert res.status_code == 404

    # And stayed a draft.
    still_draft = owner.get(f"/api/teacher/students/{student['id']}/updates").json()[0]
    assert still_draft["status"] == "draft"


# 13. a saved update carries traceability metadata but never sensitive data
def test_saved_update_has_sanitized_snapshot_and_ai_model():
    c = _teacher_client("gen-snapshot@example.com")
    student = _create_student(c)
    _seed_classroom_data(c, student["id"])
    saved = c.post(
        f"/api/teacher/students/{student['id']}/updates",
        json={
            "english_text": "Ali is doing well.",
            "roman_urdu_text": "Ali theek kar raha hai.",
            "urdu_text": "علی ٹھیک کر رہا ہے۔",
        },
    ).json()
    assert saved["ai_model"] == "mock"
    snapshot = saved["source_snapshot"]
    assert snapshot["attendance_rate"] is not None
    assert snapshot["recent_grades"][0]["subject"] == "Mathematics"
    assert "whatsapp" not in str(snapshot).lower()
    assert "password" not in str(snapshot).lower()


# 10. AI API key is never exposed to frontend
def test_api_key_never_exposed_in_responses():
    # The response schema for generate-update only ever has these three fields
    # (see GeneratedUpdateOut) — there is no field an API key could ride in,
    # and the literal key name never appears in the response body.
    c = _teacher_client("gen-nokey@example.com")
    student = _create_student(c)
    _seed_classroom_data(c, student["id"])
    res = c.post(f"/api/teacher/students/{student['id']}/generate-update")
    assert set(res.json().keys()) == {"english_text", "roman_urdu_text", "urdu_text"}
    assert "OPENAI_API_KEY" not in res.text
    assert "GEMINI_API_KEY" not in res.text
    assert get_settings().SECRET_KEY not in res.text
