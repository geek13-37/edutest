"""teacher lead role (завуч)

Revision ID: a7c2e4f6b8d0
Revises: f4a2b6c8d1e3
Create Date: 2026-09-13 12:00:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7c2e4f6b8d0"
down_revision: Union[str, Sequence[str], None] = "f4a2b6c8d1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_lead", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("users", "is_lead", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_lead")
