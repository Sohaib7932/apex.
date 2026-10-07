"""login attempts

Revision ID: 3b7e2c91a4d5
Revises: f0d9cfeab20d
Create Date: 2026-10-07 12:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '3b7e2c91a4d5'
down_revision: str | Sequence[str] | None = 'f0d9cfeab20d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('login_attempts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(length=320), nullable=False),
    sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_login_attempts_key_at', 'login_attempts', ['key', 'attempted_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_login_attempts_key_at', table_name='login_attempts')
    op.drop_table('login_attempts')
