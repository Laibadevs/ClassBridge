"""extend students with parent/guardian, roll number and student key fields

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-12 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.models.types


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ROLL_NUMBER_SCOPE_WHERE = "class_name IS NOT NULL AND section IS NOT NULL AND roll_number IS NOT NULL"


def upgrade() -> None:
    op.add_column('students', sa.Column('student_key', sa.String(length=32), nullable=True))
    op.add_column('students', sa.Column('roll_number', sa.String(length=20), nullable=True))
    op.add_column('students', sa.Column('section', sa.String(length=20), nullable=True))
    op.add_column('students', sa.Column('incharge_teacher_id', app.models.types.GUID(), nullable=True))
    op.add_column('students', sa.Column('parent_name', sa.String(length=200), nullable=True))
    op.add_column('students', sa.Column('whatsapp_number', sa.String(length=20), nullable=True))
    op.add_column('students', sa.Column('home_address', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('location', sa.String(length=200), nullable=True))
    op.add_column('students', sa.Column('preferred_language', sa.String(length=20), nullable=True))

    op.create_check_constraint(
        'ck_students_preferred_language',
        'students',
        "preferred_language IS NULL OR preferred_language IN ('english', 'roman_urdu', 'urdu')",
    )
    op.create_index('ix_students_student_key', 'students', ['student_key'], unique=True)
    op.create_index(
        'uq_students_teacher_class_section_roll',
        'students',
        ['teacher_id', 'class_name', 'section', 'roll_number'],
        unique=True,
        postgresql_where=sa.text(_ROLL_NUMBER_SCOPE_WHERE),
        sqlite_where=sa.text(_ROLL_NUMBER_SCOPE_WHERE),
    )
    op.create_index(
        op.f('ix_students_incharge_teacher_id'), 'students', ['incharge_teacher_id'], unique=False
    )
    op.create_foreign_key(
        'fk_students_incharge_teacher_id_users',
        'students',
        'users',
        ['incharge_teacher_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_students_incharge_teacher_id_users', 'students', type_='foreignkey')
    op.drop_index(op.f('ix_students_incharge_teacher_id'), table_name='students')
    op.drop_index('uq_students_teacher_class_section_roll', table_name='students')
    op.drop_index('ix_students_student_key', table_name='students')
    op.drop_constraint('ck_students_preferred_language', 'students', type_='checkconstraint')

    op.drop_column('students', 'preferred_language')
    op.drop_column('students', 'location')
    op.drop_column('students', 'home_address')
    op.drop_column('students', 'whatsapp_number')
    op.drop_column('students', 'parent_name')
    op.drop_column('students', 'incharge_teacher_id')
    op.drop_column('students', 'section')
    op.drop_column('students', 'roll_number')
    op.drop_column('students', 'student_key')
