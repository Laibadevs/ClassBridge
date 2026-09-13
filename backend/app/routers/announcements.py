import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.dependencies.auth import require_teacher
from app.dependencies.whatsapp import get_whatsapp_provider
from app.models.announcement import Announcement
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementOut,
    AnnouncementUpdate,
    AnnouncementWithRecipientsOut,
)
from app.services import announcement_delivery_service, announcement_service
from app.services.whatsapp.provider import WhatsAppProvider

router = APIRouter(prefix="/api/teacher/announcements", tags=["Announcements"])


def _owned_announcement_or_404(db: DBSession, teacher_id: uuid.UUID, announcement_id: uuid.UUID) -> Announcement:
    announcement = announcement_service.get_owned_announcement(db, teacher_id=teacher_id, announcement_id=announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    return announcement


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    try:
        return announcement_service.create_announcement(db, teacher_id=profile.user_id, data=payload)
    except announcement_service.InvalidTargetStudentsError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected students were not found."
        ) from None


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    return announcement_service.list_announcements(db, teacher_id=profile.user_id)


@router.get("/{announcement_id}", response_model=AnnouncementWithRecipientsOut)
def get_announcement(announcement_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    return _owned_announcement_or_404(db, profile.user_id, announcement_id)


@router.patch("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: uuid.UUID,
    payload: AnnouncementUpdate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    announcement = _owned_announcement_or_404(db, profile.user_id, announcement_id)
    try:
        return announcement_service.update_announcement(db, announcement, payload)
    except announcement_service.AnnouncementNotDraftError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Only draft announcements can be edited."
        ) from None
    except announcement_service.InvalidTargetStudentsError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected students were not found."
        ) from None


@router.post("/{announcement_id}/publish", response_model=AnnouncementWithRecipientsOut)
def publish_announcement(
    announcement_id: uuid.UUID,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
    provider: WhatsAppProvider = Depends(get_whatsapp_provider),
):
    """Publishing resolves the recipient list and immediately attempts
    WhatsApp delivery to each one — the teacher does not need a separate
    step. One recipient's failure never blocks the others (see
    announcement_delivery_service); the explicit send-whatsapp endpoint
    below exists to retry recipients that failed."""
    announcement = _owned_announcement_or_404(db, profile.user_id, announcement_id)
    try:
        announcement = announcement_service.publish_announcement(db, announcement)
    except announcement_service.AlreadyPublishedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This announcement has already been published."
        ) from None
    except announcement_service.TooManyRecipientsError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from None
    return announcement_delivery_service.send_pending_recipients(db, announcement, provider)


@router.post("/{announcement_id}/send-whatsapp", response_model=AnnouncementWithRecipientsOut)
def send_announcement_whatsapp(
    announcement_id: uuid.UUID,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
    provider: WhatsAppProvider = Depends(get_whatsapp_provider),
):
    """Retries WhatsApp delivery for any recipient still pending or failed.
    Never re-sends to a recipient already sent/delivered/read."""
    announcement = _owned_announcement_or_404(db, profile.user_id, announcement_id)
    if announcement.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Publish this announcement before sending it."
        )
    return announcement_delivery_service.send_pending_recipients(db, announcement, provider)
