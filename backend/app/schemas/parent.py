import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class ChildGradeOut(BaseModel):
    subject: str
    score: Decimal
    max_score: Decimal
    assessment_name: str | None
    assessment_date: date

    model_config = {"from_attributes": True}


class ChildLatestUpdateOut(BaseModel):
    id: uuid.UUID
    english_text: str
    roman_urdu_text: str
    urdu_text: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChildSummaryOut(BaseModel):
    id: uuid.UUID
    full_name: str
    class_name: str | None
    grade_level: str | None
    section: str | None
    student_key: str | None
    teacher_name: str | None
    attendance_rate: float | None
    recent_grades: list[ChildGradeOut] = []
    latest_update: ChildLatestUpdateOut | None = None


class ChildDetailOut(ChildSummaryOut):
    grades: list[ChildGradeOut] = []
