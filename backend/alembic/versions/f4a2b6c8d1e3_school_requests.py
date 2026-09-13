"""school signup requests

Revision ID: f4a2b6c8d1e3
Revises: d5b8c1e2f3a4
Create Date: 2026-09-13 00:00:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f4a2b6c8d1e3"
down_revision: Union[str, Sequence[str], None] = "d5b8c1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "school_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("school_name", sa.String(length=300), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("region", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("contact_name", sa.String(length=120), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_phone", sa.String(length=32), nullable=True),
        sa.Column("comment", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="school_request_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by", sa.Uuid(), nullable=True),
        sa.Column("result_school_id", sa.Uuid(), nullable=True),
        sa.Column("reject_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["decided_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["result_school_id"], ["schools.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_school_requests_status"), "school_requests", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_school_requests_status"), table_name="school_requests")
    op.drop_table("school_requests")
    sa.Enum(name="school_request_status").drop(op.get_bind(), checkfirst=True)
