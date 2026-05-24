"""contract_monthly_payments

Revision ID: b7c4d2e9a101
Revises: 9a12f4d83065
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa


revision = "b7c4d2e9a101"
down_revision = "9a12f4d83065"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_column("contratos", "assinado"):
        op.add_column(
            "contratos",
            sa.Column("assinado", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _has_column("contratos", "data_assinatura"):
        op.add_column("contratos", sa.Column("data_assinatura", sa.Date(), nullable=True))

    if not _has_table("contrato_pagamentos"):
        op.create_table(
            "contrato_pagamentos",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("contrato_id", sa.Uuid(), nullable=False),
            sa.Column("ano", sa.Integer(), nullable=False),
            sa.Column("mes", sa.Integer(), nullable=False),
            sa.Column("valor_previsto", sa.Float(), nullable=False, server_default="0"),
            sa.Column("valor_recebido", sa.Float(), nullable=True),
            sa.Column("recebido", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("data_recebimento", sa.Date(), nullable=True),
            sa.Column("observacoes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["contrato_id"], ["contratos.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("contrato_id", "ano", "mes", name="uq_contrato_pagamento_mes"),
        )
        op.create_index("ix_contrato_pagamentos_contrato_id", "contrato_pagamentos", ["contrato_id"])
        op.create_index("ix_contrato_pagamentos_ano", "contrato_pagamentos", ["ano"])


def downgrade() -> None:
    if _has_table("contrato_pagamentos"):
        op.drop_index("ix_contrato_pagamentos_ano", table_name="contrato_pagamentos")
        op.drop_index("ix_contrato_pagamentos_contrato_id", table_name="contrato_pagamentos")
        op.drop_table("contrato_pagamentos")
    if _has_column("contratos", "data_assinatura"):
        op.drop_column("contratos", "data_assinatura")
    if _has_column("contratos", "assinado"):
        op.drop_column("contratos", "assinado")
