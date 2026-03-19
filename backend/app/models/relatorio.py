import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RelatorioGerado(Base):
    __tablename__ = "relatorios_gerados"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo_relatorio: Mapped[str] = mapped_column(String(50), nullable=False)
    formato: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf | excel | csv
    usuario: Mapped[str] = mapped_column(String(200), nullable=False, default="Operador")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<RelatorioGerado {self.nome} – {self.formato}>"
