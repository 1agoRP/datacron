"""add alert webhook deliveries

Revision ID: c4a1f2b8d9e7
Revises: b7c4d2e9a101
Create Date: 2026-05-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a1f2b8d9e7"
down_revision: Union[str, Sequence[str], None] = "b7c4d2e9a101"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_webhook_deliveries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alerta_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("target_url", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_status_code", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["alerta_id"], ["alertas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alert_webhook_deliveries_alerta_id"), "alert_webhook_deliveries", ["alerta_id"], unique=False)
    op.create_index(op.f("ix_alert_webhook_deliveries_idempotency_key"), "alert_webhook_deliveries", ["idempotency_key"], unique=True)
    op.create_index(op.f("ix_alert_webhook_deliveries_next_attempt_at"), "alert_webhook_deliveries", ["next_attempt_at"], unique=False)
    op.create_index(op.f("ix_alert_webhook_deliveries_status"), "alert_webhook_deliveries", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_alert_webhook_deliveries_status"), table_name="alert_webhook_deliveries")
    op.drop_index(op.f("ix_alert_webhook_deliveries_next_attempt_at"), table_name="alert_webhook_deliveries")
    op.drop_index(op.f("ix_alert_webhook_deliveries_idempotency_key"), table_name="alert_webhook_deliveries")
    op.drop_index(op.f("ix_alert_webhook_deliveries_alerta_id"), table_name="alert_webhook_deliveries")
    op.drop_table("alert_webhook_deliveries")
