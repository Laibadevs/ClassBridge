"""Sends an approved parent_update over WhatsApp. Every read/write here is
scoped to a student/update the router has already verified belongs to the
authenticated teacher (see teacher.py) — this module trusts what it's given
rather than re-checking ownership itself.

The message text is sent exactly as approved — never regenerated, edited, or
retranslated here. Which of the two stored variants goes out is decided only
by the student's own preferred_language (set in earlier phases).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.parent_student_link import ParentStudentLink
from app.models.parent_update import ParentUpdate
from app.models.parent_update_delivery import ParentUpdateDelivery
from app.models.student import Student
from app.services.whatsapp.phone import InvalidPhoneNumberError, normalize_whatsapp_number
from app.services.whatsapp.provider import WhatsAppProvider
from app.services.whatsapp.sender import send_whatsapp_text

# A delivery in any of these states means a message already went out
# successfully — sending again would duplicate it.
ALREADY_SENT_STATUSES = ("sent", "delivered", "read")


class UpdateNotApprovedError(Exception):
    """Only an approved update can be sent — never a draft."""


class NoLinkedParentError(Exception):
    pass


class MissingWhatsAppNumberError(Exception):
    def __init__(self, message: str):
        super().__init__(message)


class AlreadySentError(Exception):
    def __init__(self, delivery: ParentUpdateDelivery):
        super().__init__("This update has already been sent.")
        self.delivery = delivery


def _latest_delivery(db: DBSession, parent_update_id: uuid.UUID) -> ParentUpdateDelivery | None:
    return db.execute(
        select(ParentUpdateDelivery)
        .where(ParentUpdateDelivery.parent_update_id == parent_update_id)
        .order_by(ParentUpdateDelivery.created_at.desc())
    ).scalars().first()


def _message_text(update: ParentUpdate, student: Student) -> str:
    # Older rows saved before real Urdu-script generation existed have no
    # urdu_text — fall back to roman_urdu_text rather than sending nothing.
    if student.preferred_language == "urdu" and update.urdu_text:
        return update.urdu_text
    if student.preferred_language in ("roman_urdu", "urdu"):
        return update.roman_urdu_text
    return update.english_text


def list_deliveries(db: DBSession, parent_update_id: uuid.UUID) -> list[ParentUpdateDelivery]:
    return db.execute(
        select(ParentUpdateDelivery)
        .where(ParentUpdateDelivery.parent_update_id == parent_update_id)
        .order_by(ParentUpdateDelivery.created_at.desc())
    ).scalars().all()


def send_parent_update_whatsapp(
    db: DBSession, *, update: ParentUpdate, student: Student, provider: WhatsAppProvider
) -> ParentUpdateDelivery:
    if update.status == "draft":
        raise UpdateNotApprovedError()

    existing = _latest_delivery(db, update.id)
    if existing and existing.status in ALREADY_SENT_STATUSES:
        raise AlreadySentError(existing)

    link = db.execute(
        select(ParentStudentLink).where(ParentStudentLink.student_id == student.id)
    ).scalars().first()
    if not link:
        raise NoLinkedParentError()

    try:
        normalized_number = normalize_whatsapp_number(student.whatsapp_number)
    except InvalidPhoneNumberError as exc:
        raise MissingWhatsAppNumberError(str(exc)) from None

    delivery = ParentUpdateDelivery(
        parent_update_id=update.id,
        student_id=student.id,
        parent_user_id=link.parent_user_id,
        whatsapp_number_snapshot=normalized_number,
        status="pending",
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    outcome = send_whatsapp_text(provider, phone_number=normalized_number, message=_message_text(update, student))

    if outcome.success:
        delivery.status = "sent"
        delivery.provider_message_id = outcome.provider_message_id
        delivery.sent_at = datetime.now(timezone.utc)
        update.status = "sent"
    else:
        delivery.status = "failed"
        delivery.error_code = outcome.error_code
        delivery.error_message = outcome.error_message
        delivery.failed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(delivery)
    return delivery
