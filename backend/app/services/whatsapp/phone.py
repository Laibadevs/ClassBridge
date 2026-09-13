"""Server-side WhatsApp number validation. Deliberately conservative: numbers
must already be stored in full international (E.164-ish) format, e.g.
+923001234567. This never guesses a country for a number that doesn't start
with a country-coded '+' — an ambiguous local-format number is rejected with
a clear error rather than silently assumed to be, say, Pakistan.
"""

import re

# '+' followed by 8-15 digits, the first digit non-zero (E.164: max 15 digits
# total including country code, and a country code never starts with 0).
_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")


class InvalidPhoneNumberError(Exception):
    pass


def normalize_whatsapp_number(raw: str | None) -> str:
    if not raw or not raw.strip():
        raise InvalidPhoneNumberError("No WhatsApp number is available.")

    candidate = re.sub(r"[\s\-()]", "", raw.strip())
    if not _E164_RE.match(candidate):
        raise InvalidPhoneNumberError(
            "The WhatsApp number is not in a valid international format (e.g. +923001234567)."
        )
    return candidate
