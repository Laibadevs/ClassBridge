import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import GUID


class ParentUpdate(Base):
    __tablename__ = "parent_updates"
    __table_args__ = (
        # "approved" is what makes an update visible to the parent (see
        # parent_dashboard_service). "sent" is reserved for Phase 5 (WhatsApp
        # delivery) and is not produced by anything in this phase.
        CheckConstraint("status in ('draft', 'approved', 'sent')", name="ck_parent_updates_status"),
        Index("ix_parent_updates_student_created", "student_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    english_text: Mapped[str] = mapped_column(Text, nullable=False)
    roman_urdu_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Nullable: rows saved before Phase 6 have no real Urdu-script text — never
    # backfilled with a guess. Every new save from the generator provides it.
    urdu_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="draft")
    # Traceability only — never used for authorization and never sent back to
    # the AI. Which provider produced the text, and the sanitized facts it was
    # given (see parent_update_service._build_snapshot).
    ai_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    student: Mapped["Student"] = relationship(back_populates="parent_updates")  # noqa: F821
