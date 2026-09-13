import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.types import GUID


class ParentUpdateDelivery(Base):
    """One row per WhatsApp send attempt for a parent_update. Append-only: a
    retry after a failed attempt inserts a new row rather than mutating the
    failed one, so history stays auditable. The most recent row for a given
    parent_update_id is authoritative for idempotency checks (see
    parent_update_delivery_service.send_parent_update_whatsapp) and for what
    the teacher UI shows.

    whatsapp_number_snapshot is for delivery auditing only — never used to
    authenticate a parent or identify a user.
    """

    __tablename__ = "parent_update_deliveries"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending', 'sent', 'delivered', 'read', 'failed')",
            name="ck_parent_update_deliveries_status",
        ),
        Index("ix_parent_update_deliveries_update_created", "parent_update_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    parent_update_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("parent_updates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    whatsapp_number_snapshot: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="pending")
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
