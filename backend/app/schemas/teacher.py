import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

AttendanceStatus = Literal["present", "absent", "late"]
PreferredLanguage = Literal["english", "roman_urdu", "urdu"]
GuardianRelationship = Literal["mother", "father", "guardian", "other"]


def _required_not_blank(v: str, field_label: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError(f"{field_label} is required.")
    return v


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    roll_number: str = Field(min_length=1, max_length=20)
    section: str = Field(min_length=1, max_length=20)
    class_name: str | None = Field(default=None, max_length=100)
    grade_level: str | None = Field(default=None, max_length=50)

    parent_name: str = Field(min_length=1, max_length=200)
    whatsapp_number: str = Field(min_length=7, max_length=20)
    home_address: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=200)
    preferred_language: PreferredLanguage
    parent_email: EmailStr | None = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        return _required_not_blank(v, "Full name")

    @field_validator("roll_number")
    @classmethod
    def roll_number_not_blank(cls, v: str) -> str:
        return _required_not_blank(v, "Roll number")

    @field_validator("section")
    @classmethod
    def section_not_blank(cls, v: str) -> str:
        return _required_not_blank(v, "Section")

    @field_validator("parent_name")
    @classmethod
    def parent_name_not_blank(cls, v: str) -> str:
        return _required_not_blank(v, "Parent/guardian name")

    @field_validator("whatsapp_number")
    @classmethod
    def whatsapp_number_valid(cls, v: str) -> str:
        v = v.strip()
        digits = v.replace("+", "").replace(" ", "").replace("-", "")
        if not digits.isdigit() or not (7 <= len(digits) <= 15):
            raise ValueError("Enter a valid WhatsApp number, e.g. +923001234567.")
        return v


class StudentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    class_name: str | None = Field(default=None, max_length=100)
    grade_level: str | None = Field(default=None, max_length=50)
    roll_number: str | None = Field(default=None, min_length=1, max_length=20)
    section: str | None = Field(default=None, min_length=1, max_length=20)

    parent_name: str | None = Field(default=None, min_length=1, max_length=200)
    whatsapp_number: str | None = Field(default=None, min_length=7, max_length=20)
    home_address: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=200)
    preferred_language: PreferredLanguage | None = None
    parent_email: EmailStr | None = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be blank.")
        return v


class ParentLinkOut(BaseModel):
    id: uuid.UUID
    parent_user_id: uuid.UUID
    student_id: uuid.UUID
    # The ORM attribute is `relationship_` (SQLAlchemy reserves `relationship`);
    # accept either that attribute name or the plain field name on construction.
    relationship: GuardianRelationship = Field(validation_alias="relationship_")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class LinkParentRequest(BaseModel):
    parent_email: EmailStr
    relationship: GuardianRelationship = "guardian"


class StudentOut(BaseModel):
    id: uuid.UUID
    full_name: str
    class_name: str | None
    grade_level: str | None
    student_key: str | None
    roll_number: str | None
    section: str | None
    incharge_teacher_id: uuid.UUID | None
    parent_name: str | None
    parent_email: str | None
    whatsapp_number: str | None
    home_address: str | None
    location: str | None
    preferred_language: str | None
    created_at: datetime
    updated_at: datetime
    parent_links: list[ParentLinkOut] = []

    model_config = {"from_attributes": True}


class StudentListItem(StudentOut):
    """Same as StudentOut, plus cheap rollups computed from real attendance/
    grade rows (see student_service.list_students_with_stats) so the teacher
    students list can render without a follow-up call per student."""

    attendance_rate: float | None = None
    average_grade: float | None = None


class AttendanceCreate(BaseModel):
    date: date
    status: AttendanceStatus


class AttendanceOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    date: date
    status: AttendanceStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceDayMark(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus


class AttendanceDaySet(BaseModel):
    """Replaces one day's register for exactly `roster_student_ids`: a
    student in `marks` is created/updated, a roster student left out of
    `marks` has any existing record for that date removed (an "unmark") —
    see student_service.set_day_attendance."""

    date: date
    roster_student_ids: list[uuid.UUID] = Field(min_length=1)
    marks: list[AttendanceDayMark] = []

    @model_validator(mode="after")
    def marks_within_roster(self) -> "AttendanceDaySet":
        roster = set(self.roster_student_ids)
        seen: set[uuid.UUID] = set()
        for mark in self.marks:
            if mark.student_id not in roster:
                raise ValueError("Every mark must reference a student in roster_student_ids.")
            if mark.student_id in seen:
                raise ValueError("Duplicate student in marks.")
            seen.add(mark.student_id)
        return self


class GradeCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    score: Decimal = Field(ge=0)
    max_score: Decimal = Field(gt=0)
    assessment_name: str | None = Field(default=None, max_length=200)
    assessment_date: date

    @model_validator(mode="after")
    def score_within_max(self) -> "GradeCreate":
        if self.score > self.max_score:
            raise ValueError("Score cannot exceed max score.")
        return self


class GradeOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    subject: str
    score: Decimal
    max_score: Decimal
    assessment_name: str | None
    assessment_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=4000)

    @field_validator("note")
    @classmethod
    def note_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Note is required.")
        return v


class NoteOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubjectPerformanceOut(BaseModel):
    subject: str
    average_pct: float


class RecentUpdateOut(BaseModel):
    student_id: uuid.UUID
    student_name: str
    created_at: datetime


class TeacherDashboardStatsOut(BaseModel):
    """Only the two rollups that genuinely can't be derived from the
    per-student /api/teacher/students response — everything else (total
    students, attendance, doing-well/needs-support counts) the dashboard
    already has from that call and computes client-side."""

    subject_performance: list[SubjectPerformanceOut]
    recent_updates: list[RecentUpdateOut]
