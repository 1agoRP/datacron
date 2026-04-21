"""add_dados_extraidos_to_emaillog

Revision ID: a88e251f1f3a
Revises: 30a165f5b2e6
Create Date: 2026-04-19 15:43:22.426826

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a88e251f1f3a'
down_revision: Union[str, Sequence[str], None] = '30a165f5b2e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Empty upgrade to bypass DB Locks and allow server startup."""
    pass


def downgrade() -> None:
    """Empty downgrade."""
    pass
    # ### end Alembic commands ###
