"""Provider-agnostic abstraction for sending a WhatsApp message.

Every caller (parent-update delivery, announcement delivery) depends only on
`WhatsAppProvider` — never on `httpx` or Meta's Graph API directly — so the
provider can be swapped (or replaced with the mock used in dev/tests) without
touching calling code. See meta_cloud.py for the real Meta Cloud API
implementation and mock.py for the no-network stand-in.
"""

from dataclasses import dataclass


@dataclass
class WhatsAppSendResult:
    provider_message_id: str


class WhatsAppSendError(Exception):
    """A send attempt failed. Callers must catch this and store a sanitized,
    human-readable message — never the raw provider response, which could
    contain implementation details that shouldn't reach a teacher.

    `retryable` marks transient failures (timeout, 5xx, rate limit) that are
    safe to retry once automatically; permanent failures (auth, rejection)
    are not retried.
    """

    def __init__(self, message: str, *, code: str = "provider_error", retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class WhatsAppProvider:
    def send_text_message(self, *, phone_number: str, message: str) -> WhatsAppSendResult:
        """Send a free-form text message to `phone_number` (already validated,
        E.164 format). Raises WhatsAppSendError on failure."""
        raise NotImplementedError
