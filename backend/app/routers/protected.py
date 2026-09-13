"""Minimal routes that exist to prove role-based authorization works end to
end. Real teacher/parent data endpoints (students, attendance, grades, ...)
plug into the same require_teacher / require_parent dependencies later."""

from fastapi import APIRouter, Depends

from app.dependencies.auth import require_parent, require_teacher

router = APIRouter(prefix="/api", tags=["Authorization demo"])


@router.get("/teacher/ping")
def teacher_ping(profile=Depends(require_teacher)):
    return {"ok": True, "role": profile.role}


@router.get("/parent/ping")
def parent_ping(profile=Depends(require_parent)):
    return {"ok": True, "role": profile.role}
