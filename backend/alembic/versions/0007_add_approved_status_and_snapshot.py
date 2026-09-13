"""add approved status and traceability fields to parent_updates

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_parent_updates_status', 'parent_updates', type_='check')
    op.create_check_constraint(
        'ck_parent_updates_status', 'parent_updates', "status in ('draft', 'approved', 'sent')"
    )
    op.add_column('parent_updates', sa.Column('ai_model', sa.String(length=50), nullable=True))
    op.add_column('parent_updates', sa.Column('source_snapshot', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('parent_updates', 'source_snapshot')
    op.drop_column('parent_updates', 'ai_model')
    op.drop_constraint('ck_parent_updates_status', 'parent_updates', type_='check')
    op.create_check_constraint('ck_parent_updates_status', 'parent_updates', "status in ('draft', 'sent')")
