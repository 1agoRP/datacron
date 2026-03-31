"""add_contrato_contact_fields

Revision ID: 3e83b8c3969e
Revises: 2a8338c3969d
Create Date: 2026-03-31 12:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e83b8c3969e'
down_revision: Union[str, None] = '2a8338c3969d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to contratos table
    op.add_column('contratos', sa.Column('razao_social', sa.String(length=200), nullable=True))
    op.add_column('contratos', sa.Column('cnpj_empresa', sa.String(length=20), nullable=True))
    op.add_column('contratos', sa.Column('email_contato', sa.String(length=150), nullable=True))
    op.add_column('contratos', sa.Column('telefone_contato', sa.String(length=20), nullable=True))
    op.add_column('contratos', sa.Column('tipo_personalizado', sa.String(length=200), nullable=True))


def downgrade() -> None:
    # Remove columns from contratos table
    op.drop_column('contratos', 'tipo_personalizado')
    op.drop_column('contratos', 'telefone_contato')
    op.drop_column('contratos', 'email_contato')
    op.drop_column('contratos', 'cnpj_empresa')
    op.drop_column('contratos', 'razao_social')
