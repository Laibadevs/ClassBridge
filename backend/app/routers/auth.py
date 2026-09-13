from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import generate_csrf_token
from app.dependencies.auth import CSRF_COOKIE, SESSION_COOKIE, get_current_profile, verify_csrf
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
)
from app.services import auth_service, parent_link_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

GENERIC_ERROR = "Something went wrong. Please try again."


def _set_auth_cookies(response: Response, session_token: str) -> None:
    max_age = settings.SESSION_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )
    # Readable by JS on purpose — the double-submit CSRF check compares this
    # against an X-CSRF-Token header the frontend echoes back.
    response.set_cookie(
        key=CSRF_COOKIE,
        value=generate_csrf_token(),
        httponly=False,
        secure=settings.is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


@router.post("/signup", response_model=MeResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: DBSession = Depends(get_db)):
    try:
        user = auth_service.create_user_with_profile(
            db, full_name=payload.full_name, email=payload.email, password=payload.password, role=payload.role
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from None

    if payload.role == "parent":
        # Server-side only — never relies on the frontend to perform this.
        # Picks up every student a teacher already entered this exact email
        # against, however long ago, and is safe to no-op if there are none.
        parent_link_service.auto_link_students_by_email(db, parent_user_id=user.id, email=user.email)

    session_token = auth_service.create_session(db, user)
    _set_auth_cookies(response, session_token)

    return MeResponse(
        id=user.id, email=user.email, full_name=user.profile.full_name, role=user.profile.role,
        created_at=user.created_at,
    )


@router.post("/login", response_model=MeResponse)
def login(payload: LoginRequest, response: Response, db: DBSession = Depends(get_db)):
    try:
        user = auth_service.authenticate_user(
            db, email=payload.email, password=payload.password, expected_role=payload.role
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from None

    session_token = auth_service.create_session(db, user)
    _set_auth_cookies(response, session_token)

    return MeResponse(
        id=user.id, email=user.email, full_name=user.profile.full_name, role=user.profile.role,
        created_at=user.created_at,
    )


@router.get("/me", response_model=MeResponse)
def me(profile=Depends(get_current_profile)):
    return MeResponse(
        id=profile.user_id, email=profile.email, full_name=profile.full_name, role=profile.role,
        created_at=profile.created_at,
    )


@router.post("/logout", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
def logout(
    response: Response,
    db: DBSession = Depends(get_db),
    cb_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
):
    # Logout must succeed even for an already-expired/missing cookie, so this
    # reads the cookie directly rather than requiring get_current_user.
    if cb_session:
        auth_service.revoke_session(db, cb_session)
    _clear_auth_cookies(response)
    return MessageResponse(message="Logged out.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: DBSession = Depends(get_db)):
    neutral = MessageResponse(
        message="If an account exists for this email, we'll send instructions to reset your password."
    )
    user = auth_service.get_user_by_email(db, payload.email)
    if not user:
        # Same response either way — never reveal whether the email exists.
        return neutral

    raw_token = auth_service.create_password_reset_token(db, user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

    # No email provider configured for the hackathon: log the link so the
    # flow is testable end-to-end. Swap this for a real email send later —
    # nothing else about the flow needs to change.
    print(f"[dev] Password reset link for {user.email}: {reset_link}")

    return neutral


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: DBSession = Depends(get_db)):
    try:
        auth_service.reset_password_with_token(db, raw_token=payload.token, new_password=payload.password)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from None
    return MessageResponse(message="Password updated. Please log in with your new password.")
