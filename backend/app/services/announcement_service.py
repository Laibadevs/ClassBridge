"""Teacher-authored announcements. Targeting is always re-resolved from the
teacher's own roster at publish time — the client-supplied target fields are
never trusted as the final recipient list, only as a filter description."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.models.announcement import Announcement, AnnouncementRecipient
from app.models.parent_student_link import ParentStudentLink
from app.models.student import Student
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, ParentAnnouncementOut


class InvalidTargetStudentsError(Exception):
    """One or more target_student_ids don't belong to this teacher."""


class AnnouncementNotDraftError(Exception):
    """Announcement can only be edited while still a draft."""


class AlreadyPublishedError(Exception):
    """Announcement has already been published."""


class TooManyRecipientsError(Exception):
    """Resolved recipient count exceeds WHATSAPP_MAX_RECIPIENTS — a safeguard
    against accidental mass sends, not a hard product limit."""

    def __init__(self, count: int, limit: int):
        super().__init__(f"This announcement would reach {count} recipients, over the limit of {limit}.")
        self.count = count
        self.limit = limit


def _owned_student_ids(db: DBSession, *, teacher_id: uuid.UUID, ids: list[uuid.UUID]) -> set[uuid.UUID]:
    return set(
        db.execute(select(Student.id).where(Student.teacher_id == teacher_id, Student.id.in_(ids))).scalars().all()
    )


def create_announcement(db: DBSession, *, teacher_id: uuid.UUID, data: AnnouncementCreate) -> Announcement:
    target_student_ids: list[str] | None = None
    if data.target_type == "students":
        requested = data.target_student_ids or []
        owned = _owned_student_ids(db, teacher_id=teacher_id, ids=requested)
        if owned != set(requested):
            raise InvalidTargetStudentsError()
        target_student_ids = [str(i) for i in requested]

    announcement = Announcement(
        teacher_id=teacher_id,
        title=data.title,
        message=data.message,
        announcement_type=data.announcement_type,
        target_type=data.target_type,
        target_class=data.target_class,
        target_section=data.target_section,
        target_student_ids=target_student_ids,
        status="draft",
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def get_owned_announcement(db: DBSession, *, teacher_id: uuid.UUID, announcement_id: uuid.UUID) -> Announcement | None:
    return db.execute(
        select(Announcement).where(Announcement.id == announcement_id, Announcement.teacher_id == teacher_id)
    ).scalar_one_or_none()


def list_announcements(db: DBSession, *, teacher_id: uuid.UUID) -> list[Announcement]:
    return (
        db.execute(
            select(Announcement).where(Announcement.teacher_id == teacher_id).order_by(Announcement.created_at.desc())
        )
        .scalars()
        .all()
    )


def update_announcement(db: DBSession, announcement: Announcement, data: AnnouncementUpdate) -> Announcement:
    if announcement.status != "draft":
        raise AnnouncementNotDraftError()

    updates = data.model_dump(exclude_unset=True)
    if "target_student_ids" in updates:
        ids = updates["target_student_ids"]
        if ids is not None:
            owned = _owned_student_ids(db, teacher_id=announcement.teacher_id, ids=ids)
            if owned != set(ids):
                raise InvalidTargetStudentsError()
            updates["target_student_ids"] = [str(i) for i in ids]

    for field, value in updates.items():
        setattr(announcement, field, value)
    db.commit()
    db.refresh(announcement)
    return announcement


def _resolve_target_students(db: DBSession, announcement: Announcement) -> list[Student]:
    # Always re-filtered by teacher_id — never trusts stored target fields alone.
    query = select(Student).where(Student.teacher_id == announcement.teacher_id)
    if announcement.target_type == "class":
        query = query.where(Student.class_name == announcement.target_class)
    elif announcement.target_type == "section":
        query = query.where(Student.class_name == announcement.target_class, Student.section == announcement.target_section)
    elif announcement.target_type == "students":
        ids = [uuid.UUID(x) for x in (announcement.target_student_ids or [])]
        query = query.where(Student.id.in_(ids))
    return db.execute(query).scalars().all()


def publish_announcement(db: DBSession, announcement: Announcement) -> Announcement:
    if announcement.status != "draft":
        raise AlreadyPublishedError()

    students = _resolve_target_students(db, announcement)
    student_ids = [s.id for s in students]

    links_by_student: dict[uuid.UUID, list[ParentStudentLink]] = {}
    if student_ids:
        for link in db.execute(
            select(ParentStudentLink).where(ParentStudentLink.student_id.in_(student_ids))
        ).scalars():
            links_by_student.setdefault(link.student_id, []).append(link)

    # Count real recipient rows (one per parent link, or one per unlinked
    # student) rather than just students — that's what will actually be
    # dispatched, and is what the safety cap is meant to bound.
    recipient_count = sum(len(links_by_student.get(s.id) or [None]) for s in students)
    max_recipients = get_settings().WHATSAPP_MAX_RECIPIENTS
    if recipient_count > max_recipients:
        raise TooManyRecipientsError(recipient_count, max_recipients)

    for student in students:
        links = links_by_student.get(student.id) or [None]
        for link in links:
            db.add(
                AnnouncementRecipient(
                    announcement_id=announcement.id,
                    parent_user_id=link.parent_user_id if link else None,
                    student_id=student.id,
                    whatsapp_number=student.whatsapp_number,
                    language=student.preferred_language,
                    delivery_status="pending",
                )
            )

    announcement.status = "published"
    db.commit()
    db.refresh(announcement)
    return announcement


def list_for_parent(db: DBSession, parent_user_id: uuid.UUID) -> list[ParentAnnouncementOut]:
    rows = db.execute(
        select(Announcement, AnnouncementRecipient)
        .join(AnnouncementRecipient, AnnouncementRecipient.announcement_id == Announcement.id)
        .where(AnnouncementRecipient.parent_user_id == parent_user_id)
        .order_by(Announcement.created_at.desc())
    ).all()
    return [
        ParentAnnouncementOut(
            id=a.id,
            title=a.title,
            message=a.message,
            announcement_type=a.announcement_type,
            created_at=a.created_at,
            delivery_status=r.delivery_status,
            student_id=r.student_id,
        )
        for a, r in rows
    ]
