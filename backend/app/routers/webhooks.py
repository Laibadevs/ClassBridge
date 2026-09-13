"""Meta WhatsApp Business Cloud API webhook — receives delivery-status events
(sent/delivered/read/failed) for messages this backend sent. This is the only
thing that may ever advance a delivery status past "sent"; nothing else in
the app writes delivered/read.

Security: the GET handshake requires WHATSAPP_WEBHOOK_VERIFY_TOKEN to match
(Meta's documented verification mechanism). The POST body, when
WHATSAPP_APP_SECRET is configured, must carry a valid HMAC-SHA256 signature
in X-Hub-Signature-256 — this is what stops a random caller from forging
delivery-status updates. Status transitions never move backwards (read can't
become sent again) and repeated/duplicate events are a no-op, so a redelivered
webhook can never corrupt state.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.announcement import AnnouncementRecipient
from app.models.parent_update_delivery import ParentUpdateDelivery

router = APIRouter(prefix="/api/webhooks/whatsapp", tags=["WhatsApp Webhook"])
logger = logging.getLogger("classbridge.whatsapp.webhook")

_STATUS_RANK = {"pending": 0, "sent": 1, "delivered": 2, "read": 3}


@router.get("")
def verify_webhook(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
):
    settings = get_settings()
    expected_token = settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    if hub_mode != "subscribe" or not expected_token or hub_verify_token != expected_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook verification failed.")
    return PlainTextResponse(hub_challenge)


def _verify_signature(raw_body: bytes, header_value: str | None, app_secret: str) -> bool:
    if not header_value or not header_value.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    provided = header_value.split("=", 1)[1]
    return hmac.compare_digest(expected, provided)


@router.post("")
async def receive_webhook_event(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
    db: DBSession = Depends(get_db),
):
    settings = get_settings()
    raw_body = await request.body()

    if settings.WHATSAPP_APP_SECRET:
        if not _verify_signature(raw_body, x_hub_signature_256, settings.WHATSAPP_APP_SECRET):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook signature.")

    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload.") from None

    for entry in payload.get("entry", []) if isinstance(payload, dict) else []:
        for change in entry.get("changes", []):
            for event in change.get("value", {}).get("statuses", []):
                _apply_status_event(db, event)

    return {"status": "ok"}


def _apply_status_event(db: DBSession, event: dict) -> None:
    provider_message_id = event.get("id")
    new_status = event.get("status")
    if not provider_message_id or new_status not in ("sent", "delivered", "read", "failed"):
        return

    delivery = db.execute(
        select(ParentUpdateDelivery).where(ParentUpdateDelivery.provider_message_id == provider_message_id)
    ).scalar_one_or_none()
    if delivery:
        _advance_parent_update_delivery(db, delivery, new_status, event)
        return

    recipient = db.execute(
        select(AnnouncementRecipient).where(AnnouncementRecipient.provider_message_id == provider_message_id)
    ).scalar_one_or_none()
    if recipient:
        _advance_announcement_recipient(db, recipient, new_status, event)
        return

    # Not necessarily an error — could be a status event for a message this
    # backend didn't send (a customer-initiated conversation, a stale test).
    logger.info("whatsapp webhook: no delivery row found for provider_message_id")


def _error_title(event: dict) -> str | None:
    errors = event.get("errors") or []
    return errors[0].get("title") if errors else None


def _advance_parent_update_delivery(db: DBSession, delivery: ParentUpdateDelivery, new_status: str, event: dict) -> None:
    if delivery.status == "failed":
        return  # terminal — a stale/duplicate event can't revive it
    if new_status == "failed":
        delivery.status = "failed"
        delivery.failed_at = datetime.now(timezone.utc)
        delivery.error_message = _error_title(event) or delivery.error_message or "WhatsApp reported a delivery failure."
        db.commit()
        return

    if _STATUS_RANK.get(new_status, 0) <= _STATUS_RANK.get(delivery.status, 0):
        return  # duplicate or out-of-order event — never move status backwards

    delivery.status = new_status
    now = datetime.now(timezone.utc)
    if new_status == "sent":
        delivery.sent_at = delivery.sent_at or now
    elif new_status == "delivered":
        delivery.delivered_at = now
    elif new_status == "read":
        delivery.read_at = now
    db.commit()


def _advance_announcement_recipient(db: DBSession, recipient: AnnouncementRecipient, new_status: str, event: dict) -> None:
    if recipient.delivery_status == "failed":
        return
    if new_status == "failed":
        recipient.delivery_status = "failed"
        recipient.failed_at = datetime.now(timezone.utc)
        recipient.error_message = _error_title(event) or recipient.error_message or "WhatsApp reported a delivery failure."
        db.commit()
        return

    if _STATUS_RANK.get(new_status, 0) <= _STATUS_RANK.get(recipient.delivery_status, 0):
        return

    recipient.delivery_status = new_status
    now = datetime.now(timezone.utc)
    if new_status == "sent":
        recipient.sent_at = recipient.sent_at or now
    elif new_status == "delivered":
        recipient.delivered_at = now
    elif new_status == "read":
        recipient.read_at = now
    db.commit()
