import uuid
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Float, ForeignKey, func, Boolean, Uuid as UUID, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.condominio import Condominio
    from app.models.concessionaria import Concessionaria

class HistoricoFatura(Base):
    __tablename__ = "historico_faturas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    condominio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id"), nullable=True
    )
    concessionaria_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concessionarias_vinculadas.id"), nullable=True
    )
    referencia: Mapped[str] = mapped_column(String(50), nullable=False)
    vencimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valor: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    base_64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    debito_automatico: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    condominio: Mapped[Optional["Condominio"]] = relationship()
    concessionaria: Mapped[Optional["Concessionaria"]] = relationship()

    def __repr__(self) -> str:
        return f"<HistoricoFatura {self.referencia} – R$ {self.valor}>"
