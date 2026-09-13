"""add parent_email to students for teacher-to-parent linking

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-13 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0010'
down_revision: Union[str, None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('parent_email', sa.String(length=255), nullable=True))
    # Functional index on the normalized (lowercased) email — every lookup
    # (student_service.create_student's immediate-link check, and
    # parent_link_service.auto_link_students_by_email at parent signup)
    # compares via lower(), so this is the index that actually gets used.
    op.execute("CREATE INDEX ix_students_parent_email_lower ON students (lower(parent_email))")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_students_parent_email_lower")
    op.drop_column('students', 'parent_email')
