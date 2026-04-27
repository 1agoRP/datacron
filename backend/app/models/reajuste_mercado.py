import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Float, Text, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReajusteMercado(Base):
    __tablename__ = "reajustes_mercado"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    categoria: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # "Tarifa Enel", "Tarifa Sabesp", "Tarifa Comgás", "Dissídio de Funcionários", "Convenção Coletiva", "Outros"
    categoria_personalizada: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    percentual: Mapped[float] = mapped_column(Float, nullable=False)
    vigencia: Mapped[str] = mapped_column(
        String(7), nullable=False
    )  # YYYY-MM
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documento_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documento_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<ReajusteMercado {self.categoria} {self.percentual}% vigência {self.vigencia}>"
