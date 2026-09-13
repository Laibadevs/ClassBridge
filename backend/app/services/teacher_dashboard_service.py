"""Class-wide rollups for the Teacher Dashboard that can't be derived from
the per-student /api/teacher/students response — per-subject averages
across the whole roster, and the most recent parent updates across every
student this teacher owns. Everything else the dashboard needs (total
students, attendance, doing-well/needs-support counts) it already gets
from that per-student list and computes client-side, so this stays scoped
to only the two rollups that are actually missing.

Both queries here are single, batched, and scoped to teacher_id — never
one query per student, matching student_service.list_students_with_stats
and parent_dashboard_service's existing pattern."""

import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.grade import Grade
from app.models.parent_update import ParentUpdate
from app.models.student import Student
from app.schemas.teacher import RecentUpdateOut, SubjectPerformanceOut, TeacherDashboardStatsOut

RECENT_UPDATES_LIMIT = 5
SUBJECT_LIMIT = 6


def get_dashboard_stats(db: DBSession, *, teacher_id: uuid.UUID) -> TeacherDashboardStatsOut:
    grade_rows = db.execute(
        select(Grade.subject, Grade.score, Grade.max_score)
        .join(Student, Grade.student_id == Student.id)
        .where(Student.teacher_id == teacher_id)
    ).all()

    pcts_by_subject: dict[str, list[float]] = defaultdict(list)
    for subject, score, max_score in grade_rows:
        if max_score:
            pcts_by_subject[subject].append(float(score) / float(max_score) * 100)

    subject_performance = sorted(
        (
            SubjectPerformanceOut(subject=subject, average_pct=sum(pcts) / len(pcts))
            for subject, pcts in pcts_by_subject.items()
        ),
        key=lambda s: s.average_pct,
        reverse=True,
    )[:SUBJECT_LIMIT]

    update_rows = db.execute(
        select(ParentUpdate.student_id, Student.full_name, ParentUpdate.created_at)
        .join(Student, ParentUpdate.student_id == Student.id)
        .where(ParentUpdate.teacher_id == teacher_id)
        .order_by(ParentUpdate.created_at.desc())
        .limit(RECENT_UPDATES_LIMIT)
    ).all()
    recent_updates = [
        RecentUpdateOut(student_id=student_id, student_name=full_name, created_at=created_at)
        for student_id, full_name, created_at in update_rows
    ]

    return TeacherDashboardStatsOut(subject_performance=subject_performance, recent_updates=recent_updates)
