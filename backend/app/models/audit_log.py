import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, JSON, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    usuario_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    usuario_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # 'inclusao' | 'exclusao' | 'edicao'
    acao: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # 'conta' | 'concessionaria' | 'condominio'
    entidade_tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    entidade_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    detalhes: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    usuario: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog {self.acao} {self.entidade_tipo} at {self.created_at}>"
