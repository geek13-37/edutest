"""admin role, school signup codes, school-scoped classes

Revision ID: 818b06dca1ce
Revises: fb07902c12fe
Create Date: 2026-09-06 19:28:35.233213+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '818b06dca1ce'
down_revision: Union[str, Sequence[str], None] = 'fb07902c12fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # роль admin в enum
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'")

    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('users', 'is_active', server_default=None)

    # signup_code: временный дефолт для существующих строк
    op.add_column(
        'schools',
        sa.Column('signup_code', sa.String(length=24), nullable=False,
                  server_default=sa.text("upper(left(md5(random()::text), 10))")),
    )
    op.alter_column('schools', 'signup_code', server_default=None)
    op.create_index(op.f('ix_schools_signup_code'), 'schools', ['signup_code'], unique=True)

    # school_id классов: бэкфилл из школы учителя-создателя
    op.add_column('classes', sa.Column('school_id', sa.Uuid(), nullable=True))
    op.execute(
        "UPDATE classes c SET school_id = u.school_id FROM users u WHERE u.id = c.teacher_id"
    )
    op.execute("DELETE FROM classes WHERE school_id IS NULL")
    op.alter_column('classes', 'school_id', nullable=False)
    op.create_index(op.f('ix_classes_school_id'), 'classes', ['school_id'], unique=False)
    op.create_foreign_key('fk_classes_school_id', 'classes', 'schools', ['school_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('fk_classes_school_id', 'classes', type_='foreignkey')
    op.drop_index(op.f('ix_classes_school_id'), table_name='classes')
    op.drop_column('classes', 'school_id')
    op.drop_index(op.f('ix_schools_signup_code'), table_name='schools')
    op.drop_column('schools', 'signup_code')
    op.drop_column('users', 'is_active')
    # значение enum 'admin' не удаляется (PostgreSQL не поддерживает DROP VALUE)
