import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import GUID


class ParentStudentLink(Base):
    """The only thing that grants a parent visibility into a student — never
    inferred from matching names or WhatsApp numbers."""

    __tablename__ = "parent_student_links"
    __table_args__ = (
        CheckConstraint(
            "relationship in ('mother', 'father', 'guardian', 'other')",
            name="ck_parent_student_links_relationship",
        ),
        UniqueConstraint("parent_user_id", "student_id", name="uq_parent_student_links_parent_student"),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    parent_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Mapped as `relationship_` because `relationship` is a reserved SQLAlchemy
    # class attribute name; the underlying DB column is still called "relationship".
    relationship_: Mapped[str] = mapped_column("relationship", String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    student: Mapped["Student"] = relationship(back_populates="parent_links")  # noqa: F821
