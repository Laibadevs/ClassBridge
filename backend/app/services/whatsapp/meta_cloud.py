"""Real implementation of WhatsAppProvider against the official Meta WhatsApp
Business Cloud API (HTTPS Graph API) — no unofficial library, no browser
automation, no scraping. See docs/whatsapp-setup.md for how to obtain the
access token / phone number ID this needs.

Free-form text messages (`type: text`) are only deliverable to a recipient
within Meta's 24-hour customer service window (i.e. the recipient messaged
this WhatsApp Business number recently) or if session messaging is otherwise
permitted for the account. Outside that window, Meta requires a pre-approved
message template — send_template_message exists for that case; the caller
must have already created and gotten that exact template approved in Meta
Business Manager (WHATSAPP_TEMPLATE_NAME / WHATSAPP_TEMPLATE_LANGUAGE). This
module never assumes a template exists — it only sends one if explicitly
asked to.
"""

import httpx

from app.services.whatsapp.provider import WhatsAppProvider, WhatsAppSendError, WhatsAppSendResult

GRAPH_BASE_URL = "https://graph.facebook.com"


class MetaCloudWhatsAppProvider(WhatsAppProvider):
    def __init__(self, *, access_token: str, phone_number_id: str, api_version: str):
        self._access_token = access_token
        self._phone_number_id = phone_number_id
        self._api_version = api_version

    def _post(self, payload: dict) -> WhatsAppSendResult:
        url = f"{GRAPH_BASE_URL}/{self._api_version}/{self._phone_number_id}/messages"
        headers = {"Authorization": f"Bearer {self._access_token}"}
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        except httpx.TimeoutException as exc:
            raise WhatsAppSendError("The WhatsApp provider timed out.", code="timeout", retryable=True) from exc
        except httpx.HTTPError as exc:
            raise WhatsAppSendError(
                "Could not reach the WhatsApp provider.", code="network_error", retryable=True
            ) from exc

        if response.status_code in (401, 403):
            # Never include the raw response — it can echo back the token's
            # scope/app id, which is still more than a caller needs to see.
            raise WhatsAppSendError(
                "WhatsApp provider authentication failed.", code="auth_error", retryable=False
            )
        if response.status_code == 429:
            raise WhatsAppSendError(
                "WhatsApp provider rate limit exceeded.", code="rate_limited", retryable=True
            )
        if response.status_code >= 500:
            raise WhatsAppSendError(
                "WhatsApp provider is temporarily unavailable.", code="provider_unavailable", retryable=True
            )
        if response.status_code >= 400:
            raise WhatsAppSendError(_extract_error_message(response), code="rejected", retryable=False)

        try:
            data = response.json()
            message_id = data["messages"][0]["id"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise WhatsAppSendError(
                "WhatsApp provider returned an unexpected response.", code="bad_response", retryable=False
            ) from exc
        return WhatsAppSendResult(provider_message_id=message_id)

    def send_text_message(self, *, phone_number: str, message: str) -> WhatsAppSendResult:
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number.lstrip("+"),
            "type": "text",
            "text": {"body": message},
        }
        return self._post(payload)

    def send_template_message(self, *, phone_number: str, template_name: str, template_language: str) -> WhatsAppSendResult:
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number.lstrip("+"),
            "type": "template",
            "template": {"name": template_name, "language": {"code": template_language}},
        }
        return self._post(payload)


def _extract_error_message(response: httpx.Response) -> str:
    try:
        error = response.json().get("error", {})
        return error.get("message") or "WhatsApp provider rejected the message."
    except ValueError:
        return "WhatsApp provider rejected the message."
