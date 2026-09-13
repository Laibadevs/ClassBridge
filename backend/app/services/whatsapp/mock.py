"""No-network stand-in for WhatsAppProvider. Used automatically whenever
WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID aren't configured (see
app/dependencies/whatsapp.py), and in every test — so nothing here ever
depends on reaching Meta's servers. It always "succeeds"; tests that need a
failure path override the FastAPI dependency with their own fake provider
instead of using this one.
"""

import uuid

from app.services.whatsapp.provider import WhatsAppProvider, WhatsAppSendResult


class MockWhatsAppProvider(WhatsAppProvider):
    def send_text_message(self, *, phone_number: str, message: str) -> WhatsAppSendResult:
        return WhatsAppSendResult(provider_message_id=f"mock-wamid-{uuid.uuid4().hex}")
