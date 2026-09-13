"""Auth business logic. Routers stay thin; this is what actually touches
the database and enforces the rules (unique email, role is DB-truth, etc.)."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, joinedload

from app.core.config import get_settings
from app.core.security import generate_token, hash_password, hash_token, verify_password
from app.models.password_reset import PasswordResetToken
from app.models.profile import Profile
from app.models.session import Session
from app.models.user import User

settings = get_settings()


class AuthError(Exception):
    """Safe-to-display auth failure. Routers turn this into an HTTP response."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _as_aware_utc(dt: datetime) -> datetime:
    """SQLite (used in tests) drops tzinfo on DateTime(timezone=True) columns,
    while PostgreSQL preserves it. Normalize before comparing so the same
    code works against either."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def get_user_by_email(db: DBSession, email: str) -> User | None:
    return db.execute(select(User).where(User.email == normalize_email(email))).scalar_one_or_none()


def create_user_with_profile(db: DBSession, *, full_name: str, email: str, password: str, role: str) -> User:
    email = normalize_email(email)
    if get_user_by_email(db, email):
        raise AuthError("This email is already registered.", status_code=409)

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.flush()  # assigns user.id without committing yet

    profile = Profile(user_id=user.id, full_name=full_name.strip(), email=email, role=role)
    db.add(profile)

    # One transaction: either both rows land, or neither does — never a
    # user without a profile.
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: DBSession, *, email: str, password: str, expected_role: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        raise AuthError("Email or password is incorrect.", status_code=401)

    profile = user.profile
    if not profile:
        raise AuthError("We could not find a profile for this account. Please contact support.", status_code=500)

    if profile.role != expected_role:
        label = "Teacher" if profile.role == "teacher" else "Parent"
        raise AuthError(f"This account is registered as a {label}. Please select {label} to continue.", status_code=403)

    return user


def create_session(db: DBSession, user: User) -> str:
    """Creates a session row and returns the raw token to put in the cookie."""
    raw_token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)
    db.add(Session(user_id=user.id, token_hash=hash_token(raw_token), expires_at=expires_at))
    db.commit()
    return raw_token


def get_user_for_session_token(db: DBSession, raw_token: str) -> User | None:
    """
    Every authenticated request (/api/auth/me, every protected route) calls
    this. It used to be three sequential round trips — a session lookup,
    then a separate db.get() for the user, then a lazy-loaded query for
    user.profile the first time get_current_profile() touched it. Against a
    remote database each round trip pays full network latency, so three of
    them in sequence per request was the dominant cost of every navigation.
    One joined query with the profile eagerly loaded replaces all three.
    """
    token_hash = hash_token(raw_token)
    row = db.execute(
        select(Session, User)
        .join(User, User.id == Session.user_id)
        .options(joinedload(User.profile))
        .where(Session.token_hash == token_hash)
    ).first()

    if not row:
        return None
    session, user = row

    if session.revoked_at is not None:
        return None
    if _as_aware_utc(session.expires_at) < datetime.now(timezone.utc):
        return None

    return user


def revoke_session(db: DBSession, raw_token: str) -> None:
    token_hash = hash_token(raw_token)
    session = db.execute(
        select(Session).where(Session.token_hash == token_hash)
    ).scalar_one_or_none()
    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()


def create_password_reset_token(db: DBSession, user: User) -> str:
    raw_token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(raw_token), expires_at=expires_at))
    db.commit()
    return raw_token


def reset_password_with_token(db: DBSession, *, raw_token: str, new_password: str) -> None:
    token_hash = hash_token(raw_token)
    reset_token = db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if (
        not reset_token
        or reset_token.used_at is not None
        or _as_aware_utc(reset_token.expires_at) < now
    ):
        raise AuthError("This reset link has expired or was already used. Please request a new one.", status_code=400)

    user = db.get(User, reset_token.user_id)
    if not user:
        raise AuthError("This reset link is no longer valid.", status_code=400)

    user.password_hash = hash_password(new_password)
    reset_token.used_at = now

    # A password reset invalidates every existing session — otherwise a
    # stolen/leaked session survives the very reset meant to shut it down.
    for session in db.execute(select(Session).where(Session.user_id == user.id)).scalars():
        if session.revoked_at is None:
            session.revoked_at = now

    db.commit()
