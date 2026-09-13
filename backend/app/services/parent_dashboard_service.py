"""Parent-facing rollups. Every query here is scoped through
parent_link_service (i.e. an actual parent_student_links row) — a parent can
never see a student they aren't linked to. Batched the same way
student_service.list_students_with_stats is: a fixed number of queries
regardless of how many children a parent has, never one query per child."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.grade import Grade
from app.models.parent_update import ParentUpdate
from app.models.profile import Profile
from app.models.student import Student
from app.schemas.parent import ChildDetailOut, ChildGradeOut, ChildLatestUpdateOut, ChildSummaryOut
from app.services import parent_link_service, parent_update_service

RECENT_GRADES_LIMIT = 3


def _attendance_rates(db: DBSession, student_ids: list[uuid.UUID]) -> dict[uuid.UUID, float]:
    from app.models.attendance import Attendance

    counts: dict[uuid.UUID, list[int]] = {}
    for student_id, status in db.execute(
        select(Attendance.student_id, Attendance.status).where(Attendance.student_id.in_(student_ids))
    ).all():
        c = counts.setdefault(student_id, [0, 0])
        c[0] += 1
        if status in ("present", "late"):
            c[1] += 1
    return {sid: (present / total * 100) for sid, (total, present) in counts.items() if total}


def _teacher_names(db: DBSession, teacher_ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not teacher_ids:
        return {}
    rows = db.execute(select(Profile.user_id, Profile.full_name).where(Profile.user_id.in_(teacher_ids))).all()
    return {user_id: full_name for user_id, full_name in rows}


def _grades_by_student(db: DBSession, student_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[Grade]]:
    out: dict[uuid.UUID, list[Grade]] = {}
    rows = db.execute(
        select(Grade).where(Grade.student_id.in_(student_ids)).order_by(Grade.assessment_date.desc())
    ).scalars().all()
    for grade in rows:
        out.setdefault(grade.student_id, []).append(grade)
    return out


def _latest_visible_update_by_student(db: DBSession, student_ids: list[uuid.UUID]) -> dict[uuid.UUID, ParentUpdate]:
    """Only "approved" (or "sent", reserved for Phase 5) updates ever reach a
    parent — a "draft" is never returned here, however recent."""
    out: dict[uuid.UUID, ParentUpdate] = {}
    rows = db.execute(
        select(ParentUpdate)
        .where(
            ParentUpdate.student_id.in_(student_ids),
            ParentUpdate.status.in_(parent_update_service.PARENT_VISIBLE_STATUSES),
        )
        .order_by(ParentUpdate.created_at.desc())
    ).scalars().all()
    for update in rows:
        out.setdefault(update.student_id, update)  # first row per id wins (already newest-first)
    return out


def _to_summary(
    student: Student,
    *,
    attendance_rate: float | None,
    grades: list[Grade],
    latest_update: ParentUpdate | None,
    teacher_name: str | None,
) -> ChildSummaryOut:
    return ChildSummaryOut(
        id=student.id,
        full_name=student.full_name,
        class_name=student.class_name,
        grade_level=student.grade_level,
        section=student.section,
        student_key=student.student_key,
        teacher_name=teacher_name,
        attendance_rate=attendance_rate,
        recent_grades=[ChildGradeOut.model_validate(g) for g in grades[:RECENT_GRADES_LIMIT]],
        latest_update=ChildLatestUpdateOut.model_validate(latest_update) if latest_update else None,
    )


def get_children_with_rollups(db: DBSession, parent_user_id: uuid.UUID) -> list[ChildSummaryOut]:
    students = parent_link_service.list_children_for_parent(db, parent_user_id)
    if not students:
        return []

    student_ids = [s.id for s in students]
    teacher_ids = [s.incharge_teacher_id or s.teacher_id for s in students]

    rates = _attendance_rates(db, student_ids)
    grades = _grades_by_student(db, student_ids)
    updates = _latest_visible_update_by_student(db, student_ids)
    teacher_names = _teacher_names(db, teacher_ids)

    return [
        _to_summary(
            s,
            attendance_rate=rates.get(s.id),
            grades=grades.get(s.id, []),
            latest_update=updates.get(s.id),
            teacher_name=teacher_names.get(s.incharge_teacher_id or s.teacher_id),
        )
        for s in students
    ]


def get_child_detail(db: DBSession, student: Student) -> ChildDetailOut:
    student_ids = [student.id]
    rate = _attendance_rates(db, student_ids).get(student.id)
    grades = _grades_by_student(db, student_ids).get(student.id, [])
    latest_update = _latest_visible_update_by_student(db, student_ids).get(student.id)
    teacher_id = student.incharge_teacher_id or student.teacher_id
    teacher_name = _teacher_names(db, [teacher_id]).get(teacher_id)

    summary = _to_summary(
        student, attendance_rate=rate, grades=grades, latest_update=latest_update, teacher_name=teacher_name
    )
    return ChildDetailOut(**summary.model_dump(), grades=[ChildGradeOut.model_validate(g) for g in grades])
