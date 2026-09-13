"""Password hashing, opaque session tokens, and CSRF token helpers.

Sessions are opaque random tokens, not JWTs: the raw token goes in the
httpOnly cookie, only its SHA-256 hash is stored in the database. That
means logout / revocation is a real database update, not just "let the
token expire" — a JWT can't be un-issued without a blocklist.
"""

import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_hasher = PasswordHasher()
settings = get_settings()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        # Malformed/legacy hash — never let this crash the login endpoint.
        return False


def generate_token() -> str:
    """A random, URL-safe opaque token (session id, password-reset id, ...)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """One-way hash of an opaque token, for storage/lookup in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(24)


def csrf_tokens_match(cookie_value: str | None, header_value: str | None) -> bool:
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(cookie_value, header_value)
