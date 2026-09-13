import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import GUID

_ROLL_NUMBER_SCOPE_WHERE = "class_name IS NOT NULL AND section IS NOT NULL AND roll_number IS NOT NULL"


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint(
            "preferred_language IS NULL OR preferred_language IN ('english', 'roman_urdu', 'urdu')",
            name="ck_students_preferred_language",
        ),
        Index("ix_students_student_key", "student_key", unique=True),
        Index(
            "uq_students_teacher_class_section_roll",
            "teacher_id",
            "class_name",
            "section",
            "roll_number",
            unique=True,
            postgresql_where=text(_ROLL_NUMBER_SCOPE_WHERE),
            sqlite_where=text(_ROLL_NUMBER_SCOPE_WHERE),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade_level: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Human-friendly public identifier — server-generated only, never client-supplied.
    student_key: Mapped[str | None] = mapped_column(String(32), nullable=True)
    roll_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    section: Mapped[str | None] = mapped_column(String(20), nullable=True)
    incharge_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    parent_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Not an authentication mechanism — only ever used to find/create the
    # matching parent_student_links row, either immediately (student_service
    # .create_student, if the parent account already exists) or later
    # (parent_link_service.auto_link_students_by_email, when the parent signs
    # up afterward). Matched case-insensitively; see the functional index in
    # the 0008 migration.
    parent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    home_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    attendance_records: Mapped[list["Attendance"]] = relationship(  # noqa: F821
        back_populates="student", cascade="all, delete-orphan"
    )
    grades: Mapped[list["Grade"]] = relationship(back_populates="student", cascade="all, delete-orphan")  # noqa: F821
    notes: Mapped[list["TeacherNote"]] = relationship(back_populates="student", cascade="all, delete-orphan")  # noqa: F821
    parent_updates: Mapped[list["ParentUpdate"]] = relationship(  # noqa: F821
        back_populates="student", cascade="all, delete-orphan"
    )
    parent_links: Mapped[list["ParentStudentLink"]] = relationship(  # noqa: F821
        back_populates="student", cascade="all, delete-orphan"
    )
