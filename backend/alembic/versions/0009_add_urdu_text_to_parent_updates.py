"""add urdu_text column to parent_updates

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0009'
down_revision: Union[str, None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: existing rows have no real Urdu-script text and are never
    # backfilled with a guess — every new save from the generator provides it.
    op.add_column('parent_updates', sa.Column('urdu_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('parent_updates', 'urdu_text')
