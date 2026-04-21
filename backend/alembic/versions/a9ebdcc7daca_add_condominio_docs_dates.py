"""add_condominio_docs_dates

Revision ID: a9ebdcc7daca
Revises: a88e251f1f3a
Create Date: 2026-04-21 19:39:51.559982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a9ebdcc7daca'
down_revision: Union[str, Sequence[str], None] = 'a88e251f1f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('condominios', sa.Column('ata_eleicao_inicio', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('ata_eleicao_fim', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('avcb_inicio', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('avcb_fim', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('apolice_seguro_inicio', sa.DateTime(timezone=True), nullable=True))
    op.add_column('condominios', sa.Column('apolice_seguro_fim', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('condominios', 'apolice_seguro_fim')
    op.drop_column('condominios', 'apolice_seguro_inicio')
    op.drop_column('condominios', 'avcb_fim')
    op.drop_column('condominios', 'avcb_inicio')
    op.drop_column('condominios', 'ata_eleicao_fim')
    op.drop_column('condominios', 'ata_eleicao_inicio')
