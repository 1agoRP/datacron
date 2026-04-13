"""add_mandate_and_leitura_fields

Revision ID: e966405a99f2
Revises: add_contrato_payment_fields
Create Date: 2026-04-13 03:16:02.662983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e966405a99f2'
down_revision: Union[str, Sequence[str], None] = 'add_contrato_payment_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns to condominios
    op.add_column('condominios', sa.Column('mandato_inicio', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('mandato_fim', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('leitura_individualizada_ativa', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    
    # Add column to concessionarias_vinculadas
    op.add_column('concessionarias_vinculadas', sa.Column('leitura_individualizada', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('concessionarias_vinculadas', 'leitura_individualizada')
    op.drop_column('condominios', 'leitura_individualizada_ativa')
    op.drop_column('condominios', 'mandato_fim')
    op.drop_column('condominios', 'mandato_inicio')
