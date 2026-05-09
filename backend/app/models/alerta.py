import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, func, Uuid as UUID, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.condominio import Condominio
    from app.models.fatura import Fatura


class Alerta(Base):
    __tablename__ = "alertas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    condominio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id"), nullable=True
    )
    fatura_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("faturas.id", ondelete="SET NULL"), nullable=True
    )

    # variacao_valor | conta_nao_recebida | pdf_erro | email_nao_identificado
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # alta | media | baixa
    gravidade: Mapped[str] = mapped_column(String(10), nullable=False, default="media")
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    lido: Mapped[bool] = mapped_column(Boolean, default=False)
    resolvido: Mapped[bool] = mapped_column(Boolean, default=False)

    # Email Metadata for traceability
    email_remetente: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email_assunto: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    email_data: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    condominio: Mapped[Optional["Condominio"]] = relationship("Condominio", back_populates="alertas")
    fatura: Mapped[Optional["Fatura"]] = relationship("Fatura", back_populates="alertas")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    gmail_message_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    remetente: Mapped[str] = mapped_column(String(255), nullable=False)
    assunto: Mapped[str] = mapped_column(String(500), nullable=False)
    recebido_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # identificado | nao_identificado | processado | erro
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="identificado")
    condominio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id"), nullable=True
    )
    codigo_identificacao: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fatura_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("faturas.id", ondelete="SET NULL"), nullable=True
    )
    erro_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dados_extraidos: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # Stored as JSON
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
