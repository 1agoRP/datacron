"""add created_by_id to contratos

Revision ID: 2c68c9b80e80
Revises: e966405a99f2
Create Date: 2026-04-13 14:08:31.229339

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2c68c9b80e80'
down_revision: Union[str, Sequence[str], None] = 'e966405a99f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add created_by_id to contratos
    op.add_column('contratos', sa.Column('created_by_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(None, 'contratos', 'users', ['created_by_id'], ['id'])
    
    # Optional: ensure role length is consistent
    op.alter_column('users', 'role',
               existing_type=sa.VARCHAR(length=20),
               type_=sa.String(length=30),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'contratos', type_='foreignkey')
    op.drop_column('contratos', 'created_by_id')
    op.alter_column('users', 'role',
               existing_type=sa.String(length=30),
               type_=sa.VARCHAR(length=20),
               existing_nullable=False)
    # ### end Alembic commands ###
