"""create parent_updates

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-12 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.models.types


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'parent_updates',
        sa.Column('id', app.models.types.GUID(), nullable=False),
        sa.Column('student_id', app.models.types.GUID(), nullable=False),
        sa.Column('teacher_id', app.models.types.GUID(), nullable=False),
        sa.Column('english_text', sa.Text(), nullable=False),
        sa.Column('roman_urdu_text', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status in ('draft', 'sent')", name='ck_parent_updates_status'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_parent_updates_student_id'), 'parent_updates', ['student_id'], unique=False)
    op.create_index(op.f('ix_parent_updates_teacher_id'), 'parent_updates', ['teacher_id'], unique=False)
    op.create_index(
        'ix_parent_updates_student_created', 'parent_updates', ['student_id', 'created_at'], unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_parent_updates_student_created', table_name='parent_updates')
    op.drop_index(op.f('ix_parent_updates_teacher_id'), table_name='parent_updates')
    op.drop_index(op.f('ix_parent_updates_student_id'), table_name='parent_updates')
    op.drop_table('parent_updates')
