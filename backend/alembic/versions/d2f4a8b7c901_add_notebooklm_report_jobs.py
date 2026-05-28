"""add notebooklm report jobs

Revision ID: d2f4a8b7c901
Revises: c4a1f2b8d9e7
Create Date: 2026-05-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2f4a8b7c901"
down_revision: Union[str, Sequence[str], None] = "c4a1f2b8d9e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("relatorios_gerados", sa.Column("data_inicio", sa.Date(), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("data_fim", sa.Date(), nullable=True))
    op.add_column(
        "relatorios_gerados",
        sa.Column("notebooklm_status", sa.String(length=20), nullable=False, server_default="skipped"),
    )
    op.add_column("relatorios_gerados", sa.Column("notebooklm_artifact_type", sa.String(length=20), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("notebooklm_notebook_id", sa.String(length=200), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("notebooklm_artifact_id", sa.String(length=200), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("notebooklm_export_url", sa.Text(), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("notebooklm_error", sa.Text(), nullable=True))
    op.add_column(
        "relatorios_gerados",
        sa.Column("notebooklm_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("relatorios_gerados", sa.Column("notebooklm_scope_condominio_ids", sa.JSON(), nullable=True))
    op.add_column("relatorios_gerados", sa.Column("notebooklm_processed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        op.f("ix_relatorios_gerados_notebooklm_status"),
        "relatorios_gerados",
        ["notebooklm_status"],
        unique=False,
    )
    op.alter_column("relatorios_gerados", "notebooklm_status", server_default=None)
    op.alter_column("relatorios_gerados", "notebooklm_attempts", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_relatorios_gerados_notebooklm_status"), table_name="relatorios_gerados")
    op.drop_column("relatorios_gerados", "notebooklm_processed_at")
    op.drop_column("relatorios_gerados", "notebooklm_scope_condominio_ids")
    op.drop_column("relatorios_gerados", "notebooklm_attempts")
    op.drop_column("relatorios_gerados", "notebooklm_error")
    op.drop_column("relatorios_gerados", "notebooklm_export_url")
    op.drop_column("relatorios_gerados", "notebooklm_artifact_id")
    op.drop_column("relatorios_gerados", "notebooklm_notebook_id")
    op.drop_column("relatorios_gerados", "notebooklm_artifact_type")
    op.drop_column("relatorios_gerados", "notebooklm_status")
    op.drop_column("relatorios_gerados", "data_fim")
    op.drop_column("relatorios_gerados", "data_inicio")
