import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.condominio import Condominio


class AlertaAuditLog(Base):
    __tablename__ = "alertas_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    alerta_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    alerta_tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    alerta_gravidade: Mapped[str] = mapped_column(String(10), nullable=False)
    alerta_mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    condominio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id"), nullable=True
    )
    # 'resolvido' | 'descartado'
    acao: Mapped[str] = mapped_column(String(20), nullable=False)
    justificativa: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    usuario_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    usuario_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    condominio: Mapped[Optional["Condominio"]] = relationship("Condominio")
    usuario: Mapped["User"] = relationship("User")
