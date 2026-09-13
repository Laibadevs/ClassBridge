"""add parent_update_deliveries table and whatsapp tracking columns on announcement_recipients

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.models.types


# revision identifiers, used by Alembic.
revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'parent_update_deliveries',
        sa.Column('id', app.models.types.GUID(), nullable=False),
        sa.Column('parent_update_id', app.models.types.GUID(), nullable=False),
        sa.Column('student_id', app.models.types.GUID(), nullable=False),
        sa.Column('parent_user_id', app.models.types.GUID(), nullable=True),
        sa.Column('whatsapp_number_snapshot', sa.String(length=20), nullable=False),
        sa.Column('provider_message_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status in ('pending', 'sent', 'delivered', 'read', 'failed')",
            name='ck_parent_update_deliveries_status',
        ),
        sa.ForeignKeyConstraint(['parent_update_id'], ['parent_updates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_parent_update_deliveries_parent_update_id'), 'parent_update_deliveries', ['parent_update_id'], unique=False
    )
    op.create_index(
        op.f('ix_parent_update_deliveries_student_id'), 'parent_update_deliveries', ['student_id'], unique=False
    )
    op.create_index(
        op.f('ix_parent_update_deliveries_parent_user_id'), 'parent_update_deliveries', ['parent_user_id'], unique=False
    )
    op.create_index(
        op.f('ix_parent_update_deliveries_provider_message_id'),
        'parent_update_deliveries',
        ['provider_message_id'],
        unique=False,
    )
    op.create_index(
        'ix_parent_update_deliveries_update_created', 'parent_update_deliveries', ['parent_update_id', 'created_at']
    )

    op.add_column('announcement_recipients', sa.Column('provider_message_id', sa.String(length=100), nullable=True))
    op.add_column('announcement_recipients', sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        op.f('ix_announcement_recipients_provider_message_id'),
        'announcement_recipients',
        ['provider_message_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_announcement_recipients_provider_message_id'), table_name='announcement_recipients')
    op.drop_column('announcement_recipients', 'failed_at')
    op.drop_column('announcement_recipients', 'provider_message_id')

    op.drop_index('ix_parent_update_deliveries_update_created', table_name='parent_update_deliveries')
    op.drop_index(op.f('ix_parent_update_deliveries_provider_message_id'), table_name='parent_update_deliveries')
    op.drop_index(op.f('ix_parent_update_deliveries_parent_user_id'), table_name='parent_update_deliveries')
    op.drop_index(op.f('ix_parent_update_deliveries_student_id'), table_name='parent_update_deliveries')
    op.drop_index(op.f('ix_parent_update_deliveries_parent_update_id'), table_name='parent_update_deliveries')
    op.drop_table('parent_update_deliveries')
