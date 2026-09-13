"""Persistence for parent_updates. Every read/write here is scoped to a
student the router has already verified belongs to the authenticated
teacher (see teacher.py's _owned_student_or_404) — this module trusts the
student_id/student it's given rather than re-checking ownership itself."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.models.parent_update import ParentUpdate
from app.models.student import Student
from app.schemas.parent_update import ParentUpdateCreate, ParentUpdateEdit
from app.services.ai_update_service import gather_context
from app.services.ai_types import UpdateContext

# Statuses that make an update visible to a linked parent (see
# parent_dashboard_service and the parent router). "sent" is reserved for a
# future WhatsApp-delivery phase but would still be a strict superset of
# "approved", so it stays visible too rather than hiding it again.
PARENT_VISIBLE_STATUSES = ("approved", "sent")


def _resolve_ai_model() -> str:
    settings = get_settings()
    provider = settings.AI_PROVIDER.lower()
    if provider == "openai" and settings.OPENAI_API_KEY:
        return f"openai:{settings.OPENAI_MODEL}"
    if provider == "gemini" and settings.GEMINI_API_KEY:
        return f"gemini:{settings.GEMINI_MODEL}"
    return "mock"


def _build_snapshot(context: UpdateContext) -> dict:
    """Only the sanitized facts actually used to generate the text — never
    passwords, session data, WhatsApp numbers, home addresses, or raw note
    text (kept to a count, not the wording, to limit what's retained)."""
    return {
        "attendance_rate": context.attendance_rate,
        "recent_grades": [
            {"subject": g.subject, "score_pct": round(g.score_pct, 1)} for g in context.grades
        ],
        "recent_notes_count": len(context.notes),
    }


def create_update(
    db: DBSession, *, student: Student, teacher_id: uuid.UUID, data: ParentUpdateCreate
) -> ParentUpdate:
    # Recomputed server-side from the student's real recorded data rather
    # than trusted from the client, so the snapshot can't be spoofed to claim
    # facts the generator was never actually given.
    context = gather_context(db, student)
    update = ParentUpdate(
        student_id=student.id,
        teacher_id=teacher_id,
        english_text=data.english_text,
        roman_urdu_text=data.roman_urdu_text,
        urdu_text=data.urdu_text,
        status=data.status,
        ai_model=_resolve_ai_model(),
        source_snapshot=_build_snapshot(context),
    )
    db.add(update)
    db.commit()
    db.refresh(update)
    return update


def approve_update(db: DBSession, update: ParentUpdate) -> ParentUpdate:
    """The only action that makes a draft visible to the linked parent.
    Never triggered automatically — only an explicit teacher action (see
    teacher.py's approve_update route). Never sends anything to WhatsApp."""
    update.status = "approved"
    db.commit()
    db.refresh(update)
    return update


def list_updates(db: DBSession, student_id: uuid.UUID) -> list[ParentUpdate]:
    return db.execute(
        select(ParentUpdate)
        .where(ParentUpdate.student_id == student_id)
        .order_by(ParentUpdate.created_at.desc())
    ).scalars().all()


def get_update(db: DBSession, student_id: uuid.UUID, update_id: uuid.UUID) -> ParentUpdate | None:
    return db.execute(
        select(ParentUpdate).where(ParentUpdate.id == update_id, ParentUpdate.student_id == student_id)
    ).scalar_one_or_none()


def get_owned_update(db: DBSession, *, teacher_id: uuid.UUID, update_id: uuid.UUID) -> ParentUpdate | None:
    """Looks an update up by id + teacher_id alone (no student_id needed) —
    used by the flat /api/teacher/parent-updates/{id}/... routes."""
    return db.execute(
        select(ParentUpdate).where(ParentUpdate.id == update_id, ParentUpdate.teacher_id == teacher_id)
    ).scalar_one_or_none()


def edit_update(db: DBSession, update: ParentUpdate, data: ParentUpdateEdit) -> ParentUpdate:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(update, field, value)
    db.commit()
    db.refresh(update)
    return update


def list_visible_updates(db: DBSession, student_id: uuid.UUID) -> list[ParentUpdate]:
    """Approved (or later, sent) updates for one student — never drafts. The
    caller (parent router) has already verified this student is one of the
    caller's linked children before calling this."""
    return db.execute(
        select(ParentUpdate)
        .where(
            ParentUpdate.student_id == student_id,
            ParentUpdate.status.in_(PARENT_VISIBLE_STATUSES),
        )
        .order_by(ParentUpdate.created_at.desc())
    ).scalars().all()
