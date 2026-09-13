"""FastAPI dependency that resolves which WhatsAppProvider implementation to
use. A real deployment configures WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID
and gets the real Meta Cloud API provider; leaving them unset (the default,
and what the test suite runs against) falls back to the mock provider so
nothing here ever makes a network call unless explicitly configured to.

Because this is a normal FastAPI dependency (not a module-level singleton),
tests can override it with `app.dependency_overrides[get_whatsapp_provider]`
to inject a fake that simulates success/failure without touching Meta.
"""

from app.core.config import get_settings
from app.services.whatsapp.meta_cloud import MetaCloudWhatsAppProvider
from app.services.whatsapp.mock import MockWhatsAppProvider
from app.services.whatsapp.provider import WhatsAppProvider


def get_whatsapp_provider() -> WhatsAppProvider:
    settings = get_settings()
    if settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
        return MetaCloudWhatsAppProvider(
            access_token=settings.WHATSAPP_ACCESS_TOKEN,
            phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
            api_version=settings.WHATSAPP_API_VERSION,
        )
    return MockWhatsAppProvider()
