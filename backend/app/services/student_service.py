"""Teacher-owned student data: students, attendance, grades, notes.

Every read/write here is scoped to a teacher_id the router pulled from the
authenticated session (require_teacher) — never from the request body or a
path param — so a teacher can only ever see or touch their own students.
"""

import uuid
from datetime import date as date_

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.student import Student
from app.models.teacher_note import TeacherNote
from app.schemas.teacher import (
    AttendanceCreate,
    GradeCreate,
    NoteCreate,
    StudentCreate,
    StudentListItem,
    StudentUpdate,
)
from app.services import parent_link_service

MAX_STUDENT_KEY_ATTEMPTS = 5


class StudentsNotOwnedError(Exception):
    """One or more student ids in the request don't belong to this teacher —
    never trust a roster of ids handed in from the client without checking."""


class DuplicateRollNumberError(Exception):
    """A teacher's other student already occupies this (class, section, roll_number)."""


def _class_token(class_name: str | None, grade_level: str | None, section: str | None) -> str:
    base = "".join(ch for ch in (grade_level or class_name or "GEN") if ch.isalnum()).upper()[:4] or "GEN"
    if section:
        base += "".join(ch for ch in section if ch.isalnum()).upper()[:2]
    return base


def _generate_student_key(*, class_name: str | None, grade_level: str | None, section: str | None, roll_number: str) -> str:
    class_token = _class_token(class_name, grade_level, section)
    digits = "".join(ch for ch in roll_number if ch.isdigit())
    roll_token = digits[-3:].zfill(3) if digits else "000"
    suffix = uuid.uuid4().hex[:4].upper()
    return f"CB-{class_token}-{roll_token}-{suffix}"


def _roll_number_conflict(
    db: DBSession,
    *,
    teacher_id: uuid.UUID,
    class_name: str | None,
    section: str | None,
    roll_number: str | None,
    exclude_student_id: uuid.UUID | None = None,
) -> bool:
    if not (class_name and section and roll_number):
        return False
    query = select(Student.id).where(
        Student.teacher_id == teacher_id,
        Student.class_name == class_name,
        Student.section == section,
        Student.roll_number == roll_number,
    )
    if exclude_student_id is not None:
        query = query.where(Student.id != exclude_student_id)
    return db.execute(query).first() is not None


def create_student(db: DBSession, *, teacher_id: uuid.UUID, data: StudentCreate) -> Student:
    if _roll_number_conflict(
        db, teacher_id=teacher_id, class_name=data.class_name, section=data.section, roll_number=data.roll_number
    ):
        raise DuplicateRollNumberError()

    student: Student | None = None
    for _ in range(MAX_STUDENT_KEY_ATTEMPTS):
        student = Student(
            teacher_id=teacher_id,
            incharge_teacher_id=teacher_id,
            full_name=data.full_name,
            class_name=data.class_name,
            grade_level=data.grade_level,
            student_key=_generate_student_key(
                class_name=data.class_name,
                grade_level=data.grade_level,
                section=data.section,
                roll_number=data.roll_number,
            ),
            roll_number=data.roll_number,
            section=data.section,
            parent_name=data.parent_name,
            parent_email=data.parent_email,
            whatsapp_number=data.whatsapp_number,
            home_address=data.home_address,
            location=data.location,
            preferred_language=data.preferred_language,
        )
        db.add(student)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if _roll_number_conflict(
                db, teacher_id=teacher_id, class_name=data.class_name, section=data.section, roll_number=data.roll_number
            ):
                raise DuplicateRollNumberError() from None
            continue  # student_key collision — retry with a freshly generated suffix
        else:
            break
    else:
        raise RuntimeError("Could not generate a unique student key. Please try again.")

    db.refresh(student)

    if data.parent_email:
        parent_user = parent_link_service.find_parent_user_by_email(db, data.parent_email)
        if parent_user:
            try:
                parent_link_service.link_parent_to_student(
                    db, student_id=student.id, parent_user_id=parent_user.id, relationship="guardian"
                )
            except parent_link_service.ParentAlreadyLinkedError:
                pass  # not fatal to student creation
            db.refresh(student)

    return student


def get_owned_student(db: DBSession, *, teacher_id: uuid.UUID, student_id: uuid.UUID) -> Student | None:
    return db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == teacher_id)
    ).scalar_one_or_none()


def update_student(db: DBSession, student: Student, data: StudentUpdate) -> Student:
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(student, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateRollNumberError() from None
    db.refresh(student)

    # A parent_email added/edited after the student already exists gets the
    # same immediate-link attempt create_student does — otherwise correcting
    # a typo'd email would silently do nothing until the parent next signs up.
    if "parent_email" in changes and student.parent_email:
        parent_user = parent_link_service.find_parent_user_by_email(db, student.parent_email)
        if parent_user:
            try:
                parent_link_service.link_parent_to_student(
                    db, student_id=student.id, parent_user_id=parent_user.id, relationship="guardian"
                )
            except parent_link_service.ParentAlreadyLinkedError:
                pass
            db.refresh(student)

    return student


def delete_student(db: DBSession, student: Student) -> None:
    db.delete(student)
    db.commit()


def list_students_with_stats(db: DBSession, *, teacher_id: uuid.UUID) -> list[StudentListItem]:
    """One query for the roster, one for attendance, one for grades —
    regardless of how many students the teacher has — then merged in Python.
    Avoids the N+1 that a "stats per student" loop would otherwise cause."""
    students = db.execute(
        select(Student).where(Student.teacher_id == teacher_id).order_by(Student.full_name)
    ).scalars().all()
    if not students:
        return []

    student_ids = [s.id for s in students]

    attendance_counts: dict[uuid.UUID, list[int]] = {}  # id -> [total, present_or_late]
    for student_id, status in db.execute(
        select(Attendance.student_id, Attendance.status).where(Attendance.student_id.in_(student_ids))
    ).all():
        counts = attendance_counts.setdefault(student_id, [0, 0])
        counts[0] += 1
        if status in ("present", "late"):
            counts[1] += 1

    grade_pcts: dict[uuid.UUID, list[float]] = {}
    for student_id, score, max_score in db.execute(
        select(Grade.student_id, Grade.score, Grade.max_score).where(Grade.student_id.in_(student_ids))
    ).all():
        if max_score:
            grade_pcts.setdefault(student_id, []).append(float(score) / float(max_score) * 100)

    out: list[StudentListItem] = []
    for s in students:
        total, present = attendance_counts.get(s.id, [0, 0])
        pcts = grade_pcts.get(s.id, [])
        out.append(
            StudentListItem(
                id=s.id,
                full_name=s.full_name,
                class_name=s.class_name,
                grade_level=s.grade_level,
                student_key=s.student_key,
                roll_number=s.roll_number,
                section=s.section,
                incharge_teacher_id=s.incharge_teacher_id,
                parent_name=s.parent_name,
                parent_email=s.parent_email,
                whatsapp_number=s.whatsapp_number,
                home_address=s.home_address,
                location=s.location,
                preferred_language=s.preferred_language,
                created_at=s.created_at,
                updated_at=s.updated_at,
                parent_links=list(s.parent_links),
                attendance_rate=(present / total * 100) if total else None,
                average_grade=(sum(pcts) / len(pcts)) if pcts else None,
            )
        )
    return out


def add_attendance(db: DBSession, student_id: uuid.UUID, data: AttendanceCreate) -> Attendance:
    attendance = Attendance(student_id=student_id, date=data.date, status=data.status)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def list_attendance(db: DBSession, student_id: uuid.UUID) -> list[Attendance]:
    return db.execute(
        select(Attendance).where(Attendance.student_id == student_id).order_by(Attendance.date.desc())
    ).scalars().all()


def get_attendance_range(
    db: DBSession, *, teacher_id: uuid.UUID, start: date_, end: date_
) -> list[Attendance]:
    """Every attendance row across all of this teacher's own students within
    one date range — a single join query regardless of roster size, so a
    week-wide trend view never turns into one query per student."""
    return db.execute(
        select(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .where(Student.teacher_id == teacher_id, Attendance.date >= start, Attendance.date <= end)
    ).scalars().all()


def set_day_attendance(
    db: DBSession,
    *,
    teacher_id: uuid.UUID,
    date: date_,
    roster_student_ids: list[uuid.UUID],
    marks: dict[uuid.UUID, str],
) -> list[Attendance]:
    """Replaces one day's register for exactly `roster_student_ids`: a
    student in `marks` is created/updated to that status, and a roster
    student left out of `marks` has any existing record for this date
    removed — matching the register UI's "click the active status again to
    clear it" and "Clear attendance" actions. Never touches a student
    outside `roster_student_ids` or another teacher's records."""
    unique_ids = set(roster_student_ids)
    owned_count = db.execute(
        select(func.count()).select_from(Student).where(Student.teacher_id == teacher_id, Student.id.in_(unique_ids))
    ).scalar_one()
    if owned_count != len(unique_ids):
        raise StudentsNotOwnedError()

    existing = {
        row.student_id: row
        for row in db.execute(
            select(Attendance).where(Attendance.student_id.in_(unique_ids), Attendance.date == date)
        ).scalars().all()
    }

    for student_id in unique_ids:
        if student_id in marks:
            status = marks[student_id]
            if student_id in existing:
                existing[student_id].status = status
            else:
                db.add(Attendance(student_id=student_id, date=date, status=status))
        elif student_id in existing:
            db.delete(existing[student_id])

    db.commit()

    return db.execute(
        select(Attendance).where(Attendance.student_id.in_(unique_ids), Attendance.date == date)
    ).scalars().all()


def add_grade(db: DBSession, student_id: uuid.UUID, data: GradeCreate) -> Grade:
    grade = Grade(
        student_id=student_id,
        subject=data.subject,
        score=data.score,
        max_score=data.max_score,
        assessment_name=data.assessment_name,
        assessment_date=data.assessment_date,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def list_grades(db: DBSession, student_id: uuid.UUID) -> list[Grade]:
    return db.execute(
        select(Grade).where(Grade.student_id == student_id).order_by(Grade.assessment_date.desc())
    ).scalars().all()


def add_note(db: DBSession, student_id: uuid.UUID, teacher_id: uuid.UUID, data: NoteCreate) -> TeacherNote:
    note = TeacherNote(student_id=student_id, teacher_id=teacher_id, note=data.note)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def list_notes(db: DBSession, student_id: uuid.UUID) -> list[TeacherNote]:
    return db.execute(
        select(TeacherNote).where(TeacherNote.student_id == student_id).order_by(TeacherNote.created_at.desc())
    ).scalars().all()
