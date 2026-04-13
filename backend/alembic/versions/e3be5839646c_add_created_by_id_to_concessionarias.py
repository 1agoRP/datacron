"""add created_by_id to concessionarias

Revision ID: e3be5839646c
Revises: 2c68c9b80e80
Create Date: 2026-04-13 14:29:14.332703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e3be5839646c'
down_revision: Union[str, Sequence[str], None] = '2c68c9b80e80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('concessionarias_vinculadas', sa.Column('created_by_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(None, 'concessionarias_vinculadas', 'users', ['created_by_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'concessionarias_vinculadas', type_='foreignkey')
    op.drop_column('concessionarias_vinculadas', 'created_by_id')
    # ### end Alembic commands ###
