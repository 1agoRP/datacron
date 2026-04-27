import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Float, Text, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReajusteConcessionaria(Base):
    __tablename__ = "reajustes_concessionarias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tipo_concessionaria: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Enel | Sabesp | Comgás | Claro | Vivo | TIM | Outros
    percentual: Mapped[float] = mapped_column(Float, nullable=False)
    mes_aplicacao: Mapped[str] = mapped_column(
        String(7), nullable=False
    )  # YYYY-MM
    documento_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documento_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aplicado_por: Mapped[str] = mapped_column(String(200), nullable=False, default="Operador")
    registros_afetados: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<ReajusteConcessionaria {self.tipo_concessionaria} {self.percentual}% em {self.mes_aplicacao}>"
