"""fixed accountcreated 1to1 user and accound and created relationship for account and service

Revision ID: 22760cb69ede
Revises: 4dac59cd1a93
Create Date: 2026-01-03 12:56:06.580523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '22760cb69ede'
down_revision: Union[str, Sequence[str], None] = '4dac59cd1a93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Используем batch mode для SQLite
    with op.batch_alter_table('services', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('account_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Используем batch mode для SQLite
    with op.batch_alter_table('services', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('account_id', sa.INTEGER(), nullable=False))
        batch_op.create_foreign_key(None, 'accounts', ['account_id'], ['id'])
