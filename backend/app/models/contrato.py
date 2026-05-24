import uuid
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    String,
    DateTime,
    Date,
    Float,
    Integer,
    Text,
    ForeignKey,
    UniqueConstraint,
    func,
    Uuid as UUID,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.condominio import Condominio
    from app.models.contract_file import ContractFile
    from app.models.user import User


class Contrato(Base):
    __tablename__ = "contratos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    condominio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("condominios.id", ondelete="CASCADE"),
        nullable=False,
    )
    empresa: Mapped[str] = mapped_column(String(200), nullable=False)
    razao_social: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cnpj_empresa: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email_contato: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    telefone_contato: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tipo_contrato: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_personalizado: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    assinado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_assinatura: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valor_inicial: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    valor_atual: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    data_reajuste: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    indice_reajuste: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ultimo_reajuste: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    periodicidade: Mapped[str] = mapped_column(
        String(50), nullable=False, default="mensal"
    )
    dia_vencimento: Mapped[Optional[int]] = mapped_column(nullable=True)
    pagamento_recebido: Mapped[bool] = mapped_column(default=False)
    arquivo_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    condominio: Mapped["Condominio"] = relationship(
        "Condominio", back_populates="contratos"
    )
    arquivos: Mapped[list["ContractFile"]] = relationship(
        "ContractFile", back_populates="contrato", cascade="all, delete-orphan"
    )
    pagamentos: Mapped[list["ContratoPagamento"]] = relationship(
        "ContratoPagamento", back_populates="contrato", cascade="all, delete-orphan"
    )
    created_by: Mapped[Optional["User"]] = relationship("User")

    @property
    def status(self) -> str:
        """Computed status based on end date."""
        if self.data_fim is None:
            return "ativo"
        today = date.today()
        if self.data_fim < today:
            return "vencido"
        days_remaining = (self.data_fim - today).days
        if days_remaining <= 60:
            return "a_vencer"
        return "ativo"

    def __repr__(self) -> str:
        return f"<Contrato {self.tipo_contrato} – {self.empresa}>"

class ContratoPagamento(Base):
    __tablename__ = "contrato_pagamentos"
    __table_args__ = (
        UniqueConstraint("contrato_id", "ano", "mes", name="uq_contrato_pagamento_mes"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    contrato_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contratos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ano: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_previsto: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    valor_recebido: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recebido: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_recebimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    contrato: Mapped["Contrato"] = relationship("Contrato", back_populates="pagamentos")
