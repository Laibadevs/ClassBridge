"""create parent_student_links

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-12 21:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.models.types


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'parent_student_links',
        sa.Column('id', app.models.types.GUID(), nullable=False),
        sa.Column('parent_user_id', app.models.types.GUID(), nullable=False),
        sa.Column('student_id', app.models.types.GUID(), nullable=False),
        sa.Column('relationship', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "relationship in ('mother', 'father', 'guardian', 'other')",
            name='ck_parent_student_links_relationship',
        ),
        sa.ForeignKeyConstraint(['parent_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_user_id', 'student_id', name='uq_parent_student_links_parent_student'),
    )
    op.create_index(
        op.f('ix_parent_student_links_parent_user_id'), 'parent_student_links', ['parent_user_id'], unique=False
    )
    op.create_index(
        op.f('ix_parent_student_links_student_id'), 'parent_student_links', ['student_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_parent_student_links_student_id'), table_name='parent_student_links')
    op.drop_index(op.f('ix_parent_student_links_parent_user_id'), table_name='parent_student_links')
    op.drop_table('parent_student_links')
