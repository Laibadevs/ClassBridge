import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.dependencies.auth import require_parent
from app.models.student import Student
from app.schemas.announcement import ParentAnnouncementOut
from app.schemas.parent import ChildDetailOut, ChildSummaryOut
from app.schemas.parent_update import ParentUpdateForParentOut
from app.services import announcement_service, parent_dashboard_service, parent_link_service, parent_update_service

router = APIRouter(prefix="/api/parent", tags=["Parent"])


def _linked_child_or_404(db: DBSession, parent_user_id: uuid.UUID, student_id: uuid.UUID) -> Student:
    # 404 (not 403) whether the student doesn't exist or just isn't linked to
    # this parent — mirrors teacher.py's _owned_student_or_404 for the same
    # "don't leak which IDs are real" reason.
    student = parent_link_service.get_linked_child(db, parent_user_id, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


@router.get("/children", response_model=list[ChildSummaryOut])
def list_children(profile=Depends(require_parent), db: DBSession = Depends(get_db)):
    return parent_dashboard_service.get_children_with_rollups(db, profile.user_id)


@router.get("/children/{student_id}", response_model=ChildDetailOut)
def get_child(student_id: uuid.UUID, profile=Depends(require_parent), db: DBSession = Depends(get_db)):
    student = _linked_child_or_404(db, profile.user_id, student_id)
    return parent_dashboard_service.get_child_detail(db, student)


@router.get("/announcements", response_model=list[ParentAnnouncementOut])
def list_announcements(profile=Depends(require_parent), db: DBSession = Depends(get_db)):
    return announcement_service.list_for_parent(db, profile.user_id)


@router.get("/children/{student_id}/updates", response_model=list[ParentUpdateForParentOut])
def list_child_updates(student_id: uuid.UUID, profile=Depends(require_parent), db: DBSession = Depends(get_db)):
    """Only ever approved (or sent) updates — a draft never reaches this
    response, no matter how recent."""
    _linked_child_or_404(db, profile.user_id, student_id)
    return parent_update_service.list_visible_updates(db, student_id)
