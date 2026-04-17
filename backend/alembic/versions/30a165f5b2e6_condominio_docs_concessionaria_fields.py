"""condominio_docs_concessionaria_fields

Revision ID: 30a165f5b2e6
Revises: e3be5839646c
Create Date: 2026-04-17 01:40:30.220659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30a165f5b2e6'
down_revision: Union[str, Sequence[str], None] = 'e3be5839646c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Condominios
    op.add_column("condominios", sa.Column("avcb_url", sa.Text(), nullable=True))
    op.add_column("condominios", sa.Column("apolice_seguro_url", sa.Text(), nullable=True))

    # Concessionarias
    op.add_column("concessionarias_vinculadas", sa.Column("debito_automatico", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("concessionarias_vinculadas", sa.Column("senha_portal", sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Concessionarias
    op.drop_column("concessionarias_vinculadas", "senha_portal")
    op.drop_column("concessionarias_vinculadas", "debito_automatico")

    # Condominios
    op.drop_column("condominios", "apolice_seguro_url")
    op.drop_column("condominios", "avcb_url")
