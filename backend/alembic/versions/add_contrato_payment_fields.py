"""Add dia_vencimento and pagamento_recebido to contratos

Revision ID: add_contrato_payment_fields
Revises: 3e83b8c3969e
Create Date: 2026-04-07 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "add_contrato_payment_fields"
down_revision = "3e83b8c3969e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contratos", sa.Column("dia_vencimento", sa.Integer(), nullable=True))
    op.add_column(
        "contratos",
        sa.Column(
            "pagamento_recebido", sa.Boolean(), nullable=False, server_default="false"
        ),
    )


def downgrade() -> None:
    op.drop_column("contratos", "pagamento_recebido")
    op.drop_column("contratos", "dia_vencimento")
