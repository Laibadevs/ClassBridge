"""Gathers a student's real recorded data and turns it into a bilingual
parent update. Never touches the AI provider with anything the teacher
didn't actually record — see app.services.ai_provider for the generation
step and its no-fabrication rules.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.student import Student
from app.models.teacher_note import TeacherNote
from app.services.ai_provider import generate_bilingual_update
from app.services.ai_types import GeneratedUpdate, GradeFact, UpdateContext

RECENT_GRADES_LIMIT = 5
RECENT_NOTES_LIMIT = 3


def gather_context(db: DBSession, student: Student) -> UpdateContext:
    attendance_rows = db.execute(
        select(Attendance.status).where(Attendance.student_id == student.id)
    ).scalars().all()
    attendance_rate: float | None = None
    if attendance_rows:
        present_or_late = sum(1 for status in attendance_rows if status in ("present", "late"))
        attendance_rate = present_or_late / len(attendance_rows) * 100

    grade_rows = db.execute(
        select(Grade)
        .where(Grade.student_id == student.id)
        .order_by(Grade.assessment_date.desc())
        .limit(RECENT_GRADES_LIMIT)
    ).scalars().all()
    grades = [
        GradeFact(
            subject=g.subject,
            score_pct=float(g.score) / float(g.max_score) * 100,
            assessment_name=g.assessment_name,
        )
        for g in grade_rows
    ]

    note_rows = db.execute(
        select(TeacherNote.note)
        .where(TeacherNote.student_id == student.id)
        .order_by(TeacherNote.created_at.desc())
        .limit(RECENT_NOTES_LIMIT)
    ).scalars().all()

    class_label = " - ".join(part for part in [student.grade_level, student.class_name] if part) or None

    return UpdateContext(
        student_first_name=student.full_name.split(" ")[0],
        class_label=class_label,
        attendance_rate=attendance_rate,
        grades=grades,
        notes=list(note_rows),
    )


def _insufficient_data_update(context: UpdateContext) -> GeneratedUpdate:
    name = context.student_first_name
    return GeneratedUpdate(
        english_text=(
            f"There isn't enough classroom data recorded for {name} yet to generate a "
            "meaningful update. Add some attendance, a grade, or a note first, then try again."
        ),
        roman_urdu_text=(
            f"{name} ke liye abhi itna classroom data record nahi hua ke ek update banaya ja sake. "
            "Pehle attendance, grade, ya note add karein, phir dobara try karein."
        ),
        urdu_text=(
            f"{name} کے لیے ابھی اتنا کلاس روم ڈیٹا ریکارڈ نہیں ہوا کہ ایک اپڈیٹ بنایا جا سکے۔ "
            "پہلے حاضری، گریڈ، یا نوٹ شامل کریں، پھر دوبارہ کوشش کریں۔"
        ),
    )


def generate_parent_update(db: DBSession, student: Student) -> GeneratedUpdate:
    """The one entry point the router calls. Returns a ready-to-review
    English + Roman Urdu pair — never calls the AI provider at all when
    there's nothing real to summarize, so "insufficient data" can never
    turn into a fabricated update."""
    context = gather_context(db, student)
    if not context.has_any_data:
        return _insufficient_data_update(context)
    return generate_bilingual_update(context)
