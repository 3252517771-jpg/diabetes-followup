"""add patient auto push enabled

Revision ID: 20260708_0002
Revises: 20260707_0001
Create Date: 2026-07-08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260708_0002"
down_revision = "20260707_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "patient",
        sa.Column("auto_push_enabled", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("patient", "auto_push_enabled")
