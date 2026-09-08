"""test tags and short question type

Revision ID: b2d5e8f1a3c7
Revises: a1c4f7b9d2e0
Create Date: 2026-09-07 19:20:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2d5e8f1a3c7'
down_revision: Union[str, Sequence[str], None] = 'a1c4f7b9d2e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # новый тип вопроса "короткий ответ"
    op.execute("ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'short'")

    # теги теста из каталога-справочника
    op.add_column('tests', sa.Column('subject', sa.String(length=60), nullable=True))
    op.add_column('tests', sa.Column('grade', sa.Integer(), nullable=True))
    op.add_column('tests', sa.Column('topic', sa.String(length=200), nullable=True))
    op.add_column('tests', sa.Column('template_ref', sa.String(length=80), nullable=True))
    op.create_index(op.f('ix_tests_subject'), 'tests', ['subject'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tests_subject'), table_name='tests')
    op.drop_column('tests', 'template_ref')
    op.drop_column('tests', 'topic')
    op.drop_column('tests', 'grade')
    op.drop_column('tests', 'subject')
    # значение enum 'short' PostgreSQL не удаляет (нет DROP VALUE)
