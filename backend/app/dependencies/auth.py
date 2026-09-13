from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.security import csrf_tokens_match
from app.models.user import User
from app.services.auth_service import get_user_for_session_token

SESSION_COOKIE = "cb_session"
CSRF_COOKIE = "cb_csrf"
CSRF_HEADER = "x-csrf-token"


def get_current_user(
    db: DBSession = Depends(get_db),
    cb_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> User:
    if not cb_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    user = get_user_for_session_token(db, cb_session)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid.")

    return user


def get_current_profile(user: User = Depends(get_current_user)):
    if not user.profile:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profile not found.")
    return user.profile


def require_teacher(profile=Depends(get_current_profile)):
    if profile.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teachers only.")
    return profile


def require_parent(profile=Depends(get_current_profile)):
    if profile.role != "parent":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parents only.")
    return profile


def verify_csrf(
    request: Request,
    cb_csrf: str | None = Cookie(default=None, alias=CSRF_COOKIE),
) -> None:
    """Double-submit CSRF check for state-changing requests made with an
    existing session cookie (e.g. logout). This is the primary CSRF defense —
    the session cookie is SameSite=Lax only in local dev; in production it's
    SameSite=None (required for the frontend/backend's separate-host
    deployment, see auth.py::_set_auth_cookies), so it can't be relied on as
    a SameSite-based defense-in-depth there."""
    header_value = request.headers.get(CSRF_HEADER)
    if not csrf_tokens_match(cb_csrf, header_value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing CSRF token.")
