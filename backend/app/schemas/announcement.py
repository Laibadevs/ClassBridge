import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

AnnouncementType = Literal[
    "attendance_alert",
    "school_event",
    "parent_meeting",
    "holiday_notice",
    "exam_reminder",
    "emergency",
    "general",
]
TargetType = Literal["all", "class", "section", "students"]
AnnouncementStatus = Literal["draft", "published", "sent", "failed"]
DeliveryStatus = Literal["pending", "sent", "delivered", "read", "failed"]


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)
    announcement_type: AnnouncementType
    target_type: TargetType
    target_class: str | None = Field(default=None, max_length=100)
    target_section: str | None = Field(default=None, max_length=20)
    target_student_ids: list[uuid.UUID] | None = None

    @model_validator(mode="after")
    def validate_target(self) -> "AnnouncementCreate":
        if self.target_type == "class" and not self.target_class:
            raise ValueError("Select a class to target.")
        if self.target_type == "section" and not (self.target_class and self.target_section):
            raise ValueError("Select a class and section to target.")
        if self.target_type == "students" and not self.target_student_ids:
            raise ValueError("Select at least one student to target.")
        return self


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    message: str | None = Field(default=None, min_length=1, max_length=4000)
    announcement_type: AnnouncementType | None = None
    target_type: TargetType | None = None
    target_class: str | None = Field(default=None, max_length=100)
    target_section: str | None = Field(default=None, max_length=20)
    target_student_ids: list[uuid.UUID] | None = None


class AnnouncementRecipientOut(BaseModel):
    id: uuid.UUID
    announcement_id: uuid.UUID
    parent_user_id: uuid.UUID | None
    student_id: uuid.UUID
    whatsapp_number: str | None
    language: str | None
    delivery_status: DeliveryStatus
    sent_at: datetime | None
    delivered_at: datetime | None
    read_at: datetime | None
    failed_at: datetime | None
    error_message: str | None

    model_config = {"from_attributes": True}


class AnnouncementOut(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    title: str
    message: str
    announcement_type: AnnouncementType
    target_type: TargetType
    target_class: str | None
    target_section: str | None
    target_student_ids: list[uuid.UUID] | None
    status: AnnouncementStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementWithRecipientsOut(AnnouncementOut):
    recipients: list[AnnouncementRecipientOut] = []


class ParentAnnouncementOut(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    announcement_type: AnnouncementType
    created_at: datetime
    delivery_status: DeliveryStatus
    student_id: uuid.UUID
