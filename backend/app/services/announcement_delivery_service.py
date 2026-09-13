"""Sends a published announcement's pending/failed recipients over WhatsApp.
Called right after publish_announcement (see announcements.py's publish
route) and also exposed as an explicit retry endpoint. One recipient failing
never aborts the others — each is sent and persisted independently.

The announcement's own `message` is sent as-is; announcements are
teacher-authored and are never translated or regenerated here.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.announcement import Announcement, AnnouncementRecipient
from app.services.whatsapp.phone import InvalidPhoneNumberError, normalize_whatsapp_number
from app.services.whatsapp.provider import WhatsAppProvider
from app.services.whatsapp.sender import send_whatsapp_text

# "pending" (never attempted) and "failed" (safe to retry) are the only
# statuses a send pass should touch — sent/delivered/read are left alone so
# a second call is idempotent and never duplicates a message.
_SENDABLE_STATUSES = ("pending", "failed")
_SUCCESS_STATUSES = ("sent", "delivered", "read")


def send_pending_recipients(db: DBSession, announcement: Announcement, provider: WhatsAppProvider) -> Announcement:
    recipients = db.execute(
        select(AnnouncementRecipient).where(
            AnnouncementRecipient.announcement_id == announcement.id,
            AnnouncementRecipient.delivery_status.in_(_SENDABLE_STATUSES),
        )
    ).scalars().all()

    attempted = False
    for recipient in recipients:
        attempted = True
        try:
            normalized_number = normalize_whatsapp_number(recipient.whatsapp_number)
        except InvalidPhoneNumberError as exc:
            recipient.delivery_status = "failed"
            recipient.error_message = str(exc)
            recipient.failed_at = datetime.now(timezone.utc)
            db.commit()
            continue

        outcome = send_whatsapp_text(provider, phone_number=normalized_number, message=announcement.message)
        if outcome.success:
            recipient.delivery_status = "sent"
            recipient.provider_message_id = outcome.provider_message_id
            recipient.sent_at = datetime.now(timezone.utc)
            recipient.error_message = None
        else:
            recipient.delivery_status = "failed"
            recipient.error_message = outcome.error_message
            recipient.failed_at = datetime.now(timezone.utc)
        db.commit()

    if attempted:
        _refresh_announcement_status(db, announcement)
    return announcement


def _refresh_announcement_status(db: DBSession, announcement: Announcement) -> None:
    statuses = db.execute(
        select(AnnouncementRecipient.delivery_status).where(AnnouncementRecipient.announcement_id == announcement.id)
    ).scalars().all()
    if not statuses:
        return

    has_success = any(s in _SUCCESS_STATUSES for s in statuses)
    has_failure = any(s == "failed" for s in statuses)
    has_pending = any(s == "pending" for s in statuses)

    if has_pending:
        return  # still mid-send (e.g. concurrent call) — leave status alone
    if has_success:
        announcement.status = "sent"  # at least one recipient got the message
    elif has_failure:
        announcement.status = "failed"  # nothing got through
    db.commit()
    db.refresh(announcement)
