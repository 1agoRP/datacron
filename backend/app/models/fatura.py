import uuid
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Float, ForeignKey, Date, Boolean, func, Text, Uuid as UUID, JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.condominio import Condominio
    from app.models.concessionaria import Concessionaria
    from app.models.alerta import Alerta


class Fatura(Base):
    __tablename__ = "faturas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    condominio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id"), nullable=True
    )
    concessionaria_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concessionarias_vinculadas.id"), nullable=True
    )

    # Invoice metadata
    referencia: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Março/2026"
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    vencimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # pendente | processada | erro | revisao
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")

    # Email origin
    email_remetente: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email_assunto: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    gmail_message_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)

    # PDF
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_desbloqueado: Mapped[bool] = mapped_column(Boolean, default=False)
    pdf_nome_original: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Extracted data (flexible JSONB)
    dados_extraidos: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # e.g. {"codigo_barras": "...", "consumo_kwh": 1234, "leitura_anterior": ..., "leitura_atual": ...}

    # Analysis
    variacao_percentual: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    debito_automatico: Mapped[bool] = mapped_column(Boolean, default=False)
    erro_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    condominio: Mapped["Condominio"] = relationship("Condominio", back_populates="faturas")
    concessionaria: Mapped["Concessionaria"] = relationship("Concessionaria", back_populates="faturas")
    alertas: Mapped[list["Alerta"]] = relationship("Alerta", back_populates="fatura")

    def __repr__(self) -> str:
        return f"<Fatura {self.referencia} – R$ {self.valor}>"
