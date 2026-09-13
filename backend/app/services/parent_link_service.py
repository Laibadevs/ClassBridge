"""Parent<->student linking. This is the ONLY thing that grants a parent
visibility into a student — never inferred from matching names or WhatsApp
numbers, and never created from anything the parent submits themselves."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.models.parent_student_link import ParentStudentLink
from app.models.profile import Profile
from app.models.student import Student
from app.models.user import User


class ParentNotFoundError(Exception):
    """No user with role='parent' exists for the given email."""


class ParentAlreadyLinkedError(Exception):
    """This parent is already linked to this student."""


def find_parent_user_by_email(db: DBSession, email: str) -> User | None:
    return db.execute(
        select(User)
        .join(Profile, Profile.user_id == User.id)
        .where(Profile.role == "parent", func.lower(User.email) == email.lower())
    ).scalar_one_or_none()


def link_parent_to_student(
    db: DBSession, *, student_id: uuid.UUID, parent_user_id: uuid.UUID, relationship: str
) -> ParentStudentLink:
    existing = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.parent_user_id == parent_user_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise ParentAlreadyLinkedError()

    link = ParentStudentLink(student_id=student_id, parent_user_id=parent_user_id, relationship_=relationship)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def link_parent_by_email(
    db: DBSession, *, student_id: uuid.UUID, parent_email: str, relationship: str
) -> ParentStudentLink:
    parent_user = find_parent_user_by_email(db, parent_email)
    if not parent_user:
        raise ParentNotFoundError()
    return link_parent_to_student(db, student_id=student_id, parent_user_id=parent_user.id, relationship=relationship)


def list_children_for_parent(db: DBSession, parent_user_id: uuid.UUID) -> list[Student]:
    return (
        db.execute(
            select(Student)
            .join(ParentStudentLink, ParentStudentLink.student_id == Student.id)
            .where(ParentStudentLink.parent_user_id == parent_user_id)
            .order_by(Student.full_name)
        )
        .scalars()
        .all()
    )


def get_linked_child(db: DBSession, parent_user_id: uuid.UUID, student_id: uuid.UUID) -> Student | None:
    return db.execute(
        select(Student)
        .join(ParentStudentLink, ParentStudentLink.student_id == Student.id)
        .where(ParentStudentLink.parent_user_id == parent_user_id, Student.id == student_id)
    ).scalar_one_or_none()


def auto_link_students_by_email(db: DBSession, *, parent_user_id: uuid.UUID, email: str) -> list[ParentStudentLink]:
    """Called once, right after a parent account is created (see the signup
    route). Finds every student whose teacher-entered parent_email matches
    this parent's own email — case-insensitively — and creates the
    parent_student_links row for each one that doesn't already exist.

    This is what makes Test B/Test C from the linking spec work: a teacher
    can enter a parent's email before that parent ever has an account, and
    the relationship completes itself the moment they sign up. Idempotent
    (skips a student already linked), so it's safe to call more than once."""
    normalized = email.strip().lower()
    students = db.execute(
        select(Student).where(
            Student.parent_email.isnot(None),
            func.lower(Student.parent_email) == normalized,
        )
    ).scalars().all()

    created: list[ParentStudentLink] = []
    for student in students:
        try:
            created.append(
                link_parent_to_student(
                    db, student_id=student.id, parent_user_id=parent_user_id, relationship="guardian"
                )
            )
        except ParentAlreadyLinkedError:
            continue
    return created
