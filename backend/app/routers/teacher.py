import uuid
from datetime import date as date_

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.dependencies.auth import require_teacher
from app.dependencies.whatsapp import get_whatsapp_provider
from app.models.student import Student
from app.schemas.parent_update import (
    GeneratedUpdateOut,
    ParentUpdateCreate,
    ParentUpdateDeliveryOut,
    ParentUpdateEdit,
    ParentUpdateOut,
)
from app.schemas.teacher import (
    AttendanceCreate,
    AttendanceDaySet,
    AttendanceOut,
    GradeCreate,
    GradeOut,
    LinkParentRequest,
    NoteCreate,
    NoteOut,
    ParentLinkOut,
    StudentCreate,
    StudentListItem,
    StudentOut,
    StudentUpdate,
    TeacherDashboardStatsOut,
)
from app.services import (
    ai_update_service,
    parent_link_service,
    parent_update_delivery_service,
    parent_update_service,
    student_service,
    teacher_dashboard_service,
)
from app.services.ai_provider import AIProviderError
from app.services.whatsapp.provider import WhatsAppProvider

router = APIRouter(prefix="/api/teacher", tags=["Teacher"])


def _owned_student_or_404(db: DBSession, teacher_id: uuid.UUID, student_id: uuid.UUID) -> Student:
    # 404 (not 403) whether the student doesn't exist or just isn't this
    # teacher's — otherwise the response itself would leak which student IDs
    # are real.
    student = student_service.get_owned_student(db, teacher_id=teacher_id, student_id=student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


@router.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate, profile=Depends(require_teacher), db: DBSession = Depends(get_db)
):
    try:
        return student_service.create_student(db, teacher_id=profile.user_id, data=payload)
    except student_service.DuplicateRollNumberError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists in this class and section.",
        ) from None


@router.get("/students", response_model=list[StudentListItem])
def list_students(profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    return student_service.list_students_with_stats(db, teacher_id=profile.user_id)


@router.get("/dashboard-stats", response_model=TeacherDashboardStatsOut)
def dashboard_stats(profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    return teacher_dashboard_service.get_dashboard_stats(db, teacher_id=profile.user_id)


@router.get("/students/{student_id}", response_model=StudentOut)
def get_student(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    return _owned_student_or_404(db, profile.user_id, student_id)


@router.patch("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    student = _owned_student_or_404(db, profile.user_id, student_id)
    try:
        return student_service.update_student(db, student, payload)
    except student_service.DuplicateRollNumberError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists in this class and section.",
        ) from None


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    student = _owned_student_or_404(db, profile.user_id, student_id)
    student_service.delete_student(db, student)


@router.post("/students/{student_id}/link-parent", response_model=ParentLinkOut, status_code=status.HTTP_201_CREATED)
def link_parent(
    student_id: uuid.UUID,
    payload: LinkParentRequest,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    _owned_student_or_404(db, profile.user_id, student_id)
    try:
        link = parent_link_service.link_parent_by_email(
            db, student_id=student_id, parent_email=payload.parent_email, relationship=payload.relationship
        )
    except parent_link_service.ParentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No parent account found with that email.") from None
    except parent_link_service.ParentAlreadyLinkedError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This parent is already linked to this student.") from None
    return ParentLinkOut(
        id=link.id,
        parent_user_id=link.parent_user_id,
        student_id=link.student_id,
        relationship=link.relationship_,
        created_at=link.created_at,
    )


@router.post(
    "/students/{student_id}/attendance", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED
)
def add_attendance(
    student_id: uuid.UUID,
    payload: AttendanceCreate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    _owned_student_or_404(db, profile.user_id, student_id)
    try:
        return student_service.add_attendance(db, student_id, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Attendance for this date is already recorded."
        ) from None


@router.get("/students/{student_id}/attendance", response_model=list[AttendanceOut])
def list_attendance(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    _owned_student_or_404(db, profile.user_id, student_id)
    return student_service.list_attendance(db, student_id)


@router.get("/attendance", response_model=list[AttendanceOut])
def get_attendance_range(
    start: date_, end: date_, profile=Depends(require_teacher), db: DBSession = Depends(get_db)
):
    """Every attendance row for this teacher's own students within one date
    range — used to render the register/trend for a class without a
    request per student. `start`/`end` are inclusive."""
    if end < start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end must not be before start.")
    return student_service.get_attendance_range(db, teacher_id=profile.user_id, start=start, end=end)


@router.post("/attendance/day", response_model=list[AttendanceOut])
def set_attendance_day(
    payload: AttendanceDaySet, profile=Depends(require_teacher), db: DBSession = Depends(get_db)
):
    """Saves one day's register in one call: a student in `marks` is
    created/updated, a roster student left out has any existing record for
    that date removed. student_id ownership is verified server-side before
    anything is written — a client-supplied roster is never trusted."""
    marks = {mark.student_id: mark.status for mark in payload.marks}
    try:
        return student_service.set_day_attendance(
            db,
            teacher_id=profile.user_id,
            date=payload.date,
            roster_student_ids=payload.roster_student_ids,
            marks=marks,
        )
    except student_service.StudentsNotOwnedError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more students not found.") from None


@router.post("/students/{student_id}/grades", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
def add_grade(
    student_id: uuid.UUID,
    payload: GradeCreate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    _owned_student_or_404(db, profile.user_id, student_id)
    return student_service.add_grade(db, student_id, payload)


@router.get("/students/{student_id}/grades", response_model=list[GradeOut])
def list_grades(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    _owned_student_or_404(db, profile.user_id, student_id)
    return student_service.list_grades(db, student_id)


@router.post("/students/{student_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(
    student_id: uuid.UUID,
    payload: NoteCreate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    _owned_student_or_404(db, profile.user_id, student_id)
    return student_service.add_note(db, student_id, profile.user_id, payload)


@router.get("/students/{student_id}/notes", response_model=list[NoteOut])
def list_notes(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    _owned_student_or_404(db, profile.user_id, student_id)
    return student_service.list_notes(db, student_id)


@router.post("/students/{student_id}/generate-update", response_model=GeneratedUpdateOut)
def generate_update(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    """AI generation only ever runs on this explicit teacher action — never
    automatically when a student page loads. student_id ownership is verified
    server-side before any classroom data is read."""
    student = _owned_student_or_404(db, profile.user_id, student_id)
    try:
        result = ai_update_service.generate_parent_update(db, student)
    except AIProviderError:
        # Never leak the raw provider error to the teacher.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't generate the update right now. Please try again.",
        ) from None
    return GeneratedUpdateOut(
        english_text=result.english_text, roman_urdu_text=result.roman_urdu_text, urdu_text=result.urdu_text
    )


@router.post(
    "/students/{student_id}/updates", response_model=ParentUpdateOut, status_code=status.HTTP_201_CREATED
)
def save_update(
    student_id: uuid.UUID,
    payload: ParentUpdateCreate,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    student = _owned_student_or_404(db, profile.user_id, student_id)
    return parent_update_service.create_update(db, student=student, teacher_id=profile.user_id, data=payload)


@router.get("/students/{student_id}/updates", response_model=list[ParentUpdateOut])
def list_updates(student_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)):
    _owned_student_or_404(db, profile.user_id, student_id)
    return parent_update_service.list_updates(db, student_id)


@router.patch("/students/{student_id}/updates/{update_id}", response_model=ParentUpdateOut)
def edit_update(
    student_id: uuid.UUID,
    update_id: uuid.UUID,
    payload: ParentUpdateEdit,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    _owned_student_or_404(db, profile.user_id, student_id)
    update = parent_update_service.get_update(db, student_id, update_id)
    if not update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found.")
    return parent_update_service.edit_update(db, update, payload)


@router.post("/students/{student_id}/updates/{update_id}/approve", response_model=ParentUpdateOut)
def approve_update(
    student_id: uuid.UUID,
    update_id: uuid.UUID,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
):
    """The only action that makes an update visible to the linked parent —
    never triggered by generation or save, and never sends anything to
    WhatsApp (that's Phase 5)."""
    _owned_student_or_404(db, profile.user_id, student_id)
    update = parent_update_service.get_update(db, student_id, update_id)
    if not update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found.")
    return parent_update_service.approve_update(db, update)


@router.post("/parent-updates/{update_id}/send-whatsapp", response_model=ParentUpdateDeliveryOut)
def send_parent_update_whatsapp(
    update_id: uuid.UUID,
    profile=Depends(require_teacher),
    db: DBSession = Depends(get_db),
    provider: WhatsAppProvider = Depends(get_whatsapp_provider),
):
    """Sends an already-approved parent update over WhatsApp. Never
    regenerates or edits the text — sends exactly what the teacher approved.
    Idempotent: a second click after a successful send is rejected rather
    than sending the message again (see AlreadySentError below)."""
    update = parent_update_service.get_owned_update(db, teacher_id=profile.user_id, update_id=update_id)
    if not update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found.")
    student = _owned_student_or_404(db, profile.user_id, update.student_id)

    try:
        return parent_update_delivery_service.send_parent_update_whatsapp(
            db, update=update, student=student, provider=provider
        )
    except parent_update_delivery_service.UpdateNotApprovedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Only an approved update can be sent via WhatsApp."
        ) from None
    except parent_update_delivery_service.AlreadySentError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This update has already been sent.") from None
    except parent_update_delivery_service.NoLinkedParentError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No parent is linked to this student yet."
        ) from None
    except parent_update_delivery_service.MissingWhatsAppNumberError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from None


@router.get("/parent-updates/{update_id}/whatsapp-deliveries", response_model=list[ParentUpdateDeliveryOut])
def list_parent_update_whatsapp_deliveries(
    update_id: uuid.UUID, profile=Depends(require_teacher), db: DBSession = Depends(get_db)
):
    update = parent_update_service.get_owned_update(db, teacher_id=profile.user_id, update_id=update_id)
    if not update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found.")
    return parent_update_delivery_service.list_deliveries(db, update.id)
