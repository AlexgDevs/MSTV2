"""added_in_messages_models_sender_id

Revision ID: 8b757154d948
Revises: 0557a9025b34
Create Date: 2025-12-24 13:51:50.185367

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b757154d948'
down_revision: Union[str, Sequence[str], None] = '0557a9025b34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Используем batch operations для SQLite (copy-and-move strategy)
    with op.batch_alter_table('service_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sender_id', sa.Integer(), nullable=False))
        batch_op.create_foreign_key('fk_service_messages_sender_id', 'users', ['sender_id'], ['id'])
    
    with op.batch_alter_table('support_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sender_id', sa.Integer(), nullable=False))
        batch_op.create_foreign_key('fk_support_messages_sender_id', 'users', ['sender_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Используем batch operations для SQLite
    with op.batch_alter_table('support_messages', schema=None) as batch_op:
        batch_op.drop_constraint('fk_support_messages_sender_id', type_='foreignkey')
        batch_op.drop_column('sender_id')
    
    with op.batch_alter_table('service_messages', schema=None) as batch_op:
        batch_op.drop_constraint('fk_service_messages_sender_id', type_='foreignkey')
        batch_op.drop_column('sender_id')
