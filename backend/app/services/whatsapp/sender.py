"""Shared send-with-one-retry logic used by both delivery flows (parent
updates and announcements) so the "no more than 1 controlled retry for
transient provider failures" rule lives in exactly one place.
"""

from dataclasses import dataclass

from app.services.whatsapp.provider import WhatsAppProvider, WhatsAppSendError


@dataclass
class SendOutcome:
    success: bool
    provider_message_id: str | None = None
    error_code: str | None = None
    error_message: str | None = None


def send_whatsapp_text(provider: WhatsAppProvider, *, phone_number: str, message: str) -> SendOutcome:
    try:
        result = provider.send_text_message(phone_number=phone_number, message=message)
        return SendOutcome(success=True, provider_message_id=result.provider_message_id)
    except WhatsAppSendError as exc:
        if not exc.retryable:
            return SendOutcome(success=False, error_code=exc.code, error_message=str(exc))
        try:
            result = provider.send_text_message(phone_number=phone_number, message=message)
            return SendOutcome(success=True, provider_message_id=result.provider_message_id)
        except WhatsAppSendError as retry_exc:
            return SendOutcome(success=False, error_code=retry_exc.code, error_message=str(retry_exc))
