"""Seeds real students/attendance/grades/notes for the demo teacher account,
through the real service layer (same code path the API uses) — never as a
frontend-only fake. Mirrors the original mock-data narrative (same five
names, similar attendance/grade figures) purely so the existing Students /
Student Detail UI has real, non-empty backend data to render after the
frontend switched from static mock data to live API calls.

Usage (from backend/, with your venv active and .env configured):
    python -m scripts.seed_demo_students
"""

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.schemas.teacher import AttendanceCreate, GradeCreate, NoteCreate, StudentCreate
from app.services import student_service
from app.services.auth_service import get_user_by_email

TEACHER_EMAIL = "sarah.teacher@classbridge.ai"

# (full_name, class_name, grade_level, attendance pattern over the last 10
# school days as P/A/L, note, {subject: (previous_score, current_score)})
DEMO_STUDENTS = [
    (
        "Ali Khan",
        "Grade 8 - Blue",
        "8",
        "PPPLPAPPPP",
        "Ali participates well in class but needs additional practice with algebraic equations.",
        {"Math": (52, 58), "Science": (70, 76), "English": (81, 84), "Computer": (87, 91)},
    ),
    (
        "Ayesha Malik",
        "Grade 8 - Blue",
        "8",
        "PPPPPPPPPP",
        "Consistently strong across all subjects. Could take on more challenging enrichment work.",
        {"Math": (78, 82), "Science": (85, 88), "English": (87, 90), "Computer": (92, 94)},
    ),
    (
        "Hamza Ahmed",
        "Grade 8 - Green",
        "8",
        "PAPAPPAPPA",
        "Attendance has been inconsistent this month, which is affecting his progress across subjects.",
        {"Math": (60, 65), "Science": (66, 70), "English": (68, 72), "Computer": (70, 75)},
    ),
    (
        "Sara Noor",
        "Grade 8 - Green",
        "8",
        "PPPPPLPPPP",
        "Doing great overall. Shows strong effort and is a positive presence in group work.",
        {"Math": (84, 88), "Science": (89, 91), "English": (82, 85), "Computer": (86, 89)},
    ),
    (
        "Zain Ali",
        "Grade 8 - Blue",
        "8",
        "PPAPPPPAPP",
        "Needs encouragement with reading comprehension in English, but showing good effort in class discussions.",
        {"Math": (55, 60), "Science": (64, 68), "English": (70, 74), "Computer": (76, 80)},
    ),
]

STATUS_BY_LETTER = {"P": "present", "A": "absent", "L": "late"}


def main() -> None:
    db = SessionLocal()
    try:
        teacher = get_user_by_email(db, TEACHER_EMAIL)
        if not teacher:
            print(f"Teacher {TEACHER_EMAIL} not found — run scripts.seed_demo_users first.")
            return

        existing_names = {
            s.full_name for s in student_service.list_students_with_stats(db, teacher_id=teacher.id)
        }

        today = date.today()

        for full_name, class_name, grade_level, attendance_pattern, note_text, subjects in DEMO_STUDENTS:
            if full_name in existing_names:
                print(f"Skipping {full_name} — already exists for this teacher.")
                continue

            student = student_service.create_student(
                db,
                teacher_id=teacher.id,
                data=StudentCreate(full_name=full_name, class_name=class_name, grade_level=grade_level),
            )

            for offset, letter in enumerate(reversed(attendance_pattern)):
                student_service.add_attendance(
                    db,
                    student.id,
                    AttendanceCreate(date=today - timedelta(days=offset), status=STATUS_BY_LETTER[letter]),
                )

            for subject, (previous_score, current_score) in subjects.items():
                student_service.add_grade(
                    db,
                    student.id,
                    GradeCreate(
                        subject=subject,
                        score=previous_score,
                        max_score=100,
                        assessment_name="Term progress check",
                        assessment_date=today - timedelta(days=14),
                    ),
                )
                student_service.add_grade(
                    db,
                    student.id,
                    GradeCreate(
                        subject=subject,
                        score=current_score,
                        max_score=100,
                        assessment_name="Term progress check",
                        assessment_date=today,
                    ),
                )

            student_service.add_note(db, student.id, teacher.id, NoteCreate(note=note_text))

            print(f"Created {full_name} with attendance, grades and a note.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
