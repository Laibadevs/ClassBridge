"""Fake WhatsAppProvider for tests. Never makes a network call — tests
control success/failure explicitly instead of relying on the default mock
provider's always-succeeds behavior, so failure/retry paths are exercised
too. Installed via FastAPI's dependency_overrides, the same mechanism
conftest.py uses for get_db.
"""

from app.dependencies.whatsapp import get_whatsapp_provider
from app.main import app
from app.services.whatsapp.provider import WhatsAppProvider, WhatsAppSendError, WhatsAppSendResult


class FakeWhatsAppProvider(WhatsAppProvider):
    def __init__(self, *, fail: bool = False, error: WhatsAppSendError | None = None):
        self.fail = fail
        self.error = error
        self.calls: list[tuple[str, str]] = []

    def send_text_message(self, *, phone_number: str, message: str) -> WhatsAppSendResult:
        self.calls.append((phone_number, message))
        if self.fail:
            raise self.error or WhatsAppSendError("Simulated failure.", code="rejected", retryable=False)
        return WhatsAppSendResult(provider_message_id=f"wamid.fake.{len(self.calls)}")


def use_fake_provider(provider: FakeWhatsAppProvider) -> None:
    app.dependency_overrides[get_whatsapp_provider] = lambda: provider


def clear_fake_provider() -> None:
    app.dependency_overrides.pop(get_whatsapp_provider, None)
