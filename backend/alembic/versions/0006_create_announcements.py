"""create announcements and announcement_recipients

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-12 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.models.types


# revision identifiers, used by Alembic.
revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'announcements',
        sa.Column('id', app.models.types.GUID(), nullable=False),
        sa.Column('teacher_id', app.models.types.GUID(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('announcement_type', sa.String(length=30), nullable=False),
        sa.Column('target_type', sa.String(length=20), nullable=False),
        sa.Column('target_class', sa.String(length=100), nullable=True),
        sa.Column('target_section', sa.String(length=20), nullable=True),
        sa.Column('target_student_ids', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "announcement_type in ('attendance_alert','school_event','parent_meeting','holiday_notice',"
            "'exam_reminder','emergency','general')",
            name='ck_announcements_type',
        ),
        sa.CheckConstraint("target_type in ('all', 'class', 'section', 'students')", name='ck_announcements_target_type'),
        sa.CheckConstraint("status in ('draft', 'published', 'sent', 'failed')", name='ck_announcements_status'),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_announcements_teacher_id'), 'announcements', ['teacher_id'], unique=False)

    op.create_table(
        'announcement_recipients',
        sa.Column('id', app.models.types.GUID(), nullable=False),
        sa.Column('announcement_id', app.models.types.GUID(), nullable=False),
        sa.Column('parent_user_id', app.models.types.GUID(), nullable=True),
        sa.Column('student_id', app.models.types.GUID(), nullable=False),
        sa.Column('whatsapp_number', sa.String(length=20), nullable=True),
        sa.Column('language', sa.String(length=20), nullable=True),
        sa.Column('delivery_status', sa.String(length=10), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed')",
            name='ck_announcement_recipients_delivery_status',
        ),
        sa.ForeignKeyConstraint(['announcement_id'], ['announcements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_announcement_recipients_announcement_id'), 'announcement_recipients', ['announcement_id'], unique=False
    )
    op.create_index(
        op.f('ix_announcement_recipients_parent_user_id'), 'announcement_recipients', ['parent_user_id'], unique=False
    )
    op.create_index(
        op.f('ix_announcement_recipients_student_id'), 'announcement_recipients', ['student_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_announcement_recipients_student_id'), table_name='announcement_recipients')
    op.drop_index(op.f('ix_announcement_recipients_parent_user_id'), table_name='announcement_recipients')
    op.drop_index(op.f('ix_announcement_recipients_announcement_id'), table_name='announcement_recipients')
    op.drop_table('announcement_recipients')
    op.drop_index(op.f('ix_announcements_teacher_id'), table_name='announcements')
    op.drop_table('announcements')
