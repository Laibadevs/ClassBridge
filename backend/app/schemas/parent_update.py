import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

UpdateStatus = Literal["draft", "approved", "sent"]
WhatsAppDeliveryStatus = Literal["pending", "sent", "delivered", "read", "failed"]


class GeneratedUpdateOut(BaseModel):
    """Response for the generate-update endpoint — not persisted yet, just
    what the teacher sees to review/edit before choosing Save Draft."""

    english_text: str
    roman_urdu_text: str
    urdu_text: str


class ParentUpdateCreate(BaseModel):
    english_text: str = Field(min_length=1, max_length=4000)
    roman_urdu_text: str = Field(min_length=1, max_length=4000)
    urdu_text: str = Field(min_length=1, max_length=4000)
    status: UpdateStatus = "draft"

    @field_validator("english_text", "roman_urdu_text", "urdu_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Update text cannot be blank.")
        return v


class ParentUpdateEdit(BaseModel):
    english_text: str | None = Field(default=None, min_length=1, max_length=4000)
    roman_urdu_text: str | None = Field(default=None, min_length=1, max_length=4000)
    urdu_text: str | None = Field(default=None, min_length=1, max_length=4000)
    status: UpdateStatus | None = None

    @field_validator("english_text", "roman_urdu_text", "urdu_text")
    @classmethod
    def not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Update text cannot be blank.")
        return v


class ParentUpdateOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    english_text: str
    roman_urdu_text: str
    urdu_text: str | None = None
    status: UpdateStatus
    ai_model: str | None = None
    source_snapshot: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ParentUpdateForParentOut(BaseModel):
    """What a parent is allowed to see for one of their child's updates —
    deliberately excludes teacher_id, ai_model and source_snapshot, none of
    which are the parent's business."""

    id: uuid.UUID
    student_id: uuid.UUID
    english_text: str
    roman_urdu_text: str
    urdu_text: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ParentUpdateDeliveryOut(BaseModel):
    """What the teacher sees about a WhatsApp send attempt — deliberately
    excludes whatsapp_number_snapshot; the teacher already sees the number on
    the student record and doesn't need it echoed back here."""

    id: uuid.UUID
    parent_update_id: uuid.UUID
    student_id: uuid.UUID
    parent_user_id: uuid.UUID | None
    provider_message_id: str | None
    status: WhatsAppDeliveryStatus
    error_code: str | None
    error_message: str | None
    sent_at: datetime | None
    delivered_at: datetime | None
    read_at: datetime | None
    failed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
