import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import GUID


class Announcement(Base):
    __tablename__ = "announcements"
    __table_args__ = (
        CheckConstraint(
            "announcement_type in ("
            "'attendance_alert','school_event','parent_meeting','holiday_notice',"
            "'exam_reminder','emergency','general')",
            name="ck_announcements_type",
        ),
        CheckConstraint("target_type in ('all', 'class', 'section', 'students')", name="ck_announcements_target_type"),
        CheckConstraint("status in ('draft', 'published', 'sent', 'failed')", name="ck_announcements_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    announcement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_class: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_section: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # List of student-id hex strings. Only ever read once at publish time and
    # re-verified against the teacher's real roster — never trusted as-is.
    target_student_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    recipients: Mapped[list["AnnouncementRecipient"]] = relationship(
        back_populates="announcement", cascade="all, delete-orphan"
    )


class AnnouncementRecipient(Base):
    __tablename__ = "announcement_recipients"
    __table_args__ = (
        CheckConstraint(
            "delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed')",
            name="ck_announcement_recipients_delivery_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    announcement_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    whatsapp_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Set once a WhatsApp send attempt is made — this is what the webhook
    # uses to map a Meta status event back to this exact row. Never identify
    # a delivery by phone number alone (a number can recur across students).
    provider_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    delivery_status: Mapped[str] = mapped_column(String(10), nullable=False, default="pending")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    announcement: Mapped["Announcement"] = relationship(back_populates="recipients")
