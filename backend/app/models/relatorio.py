import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Integer, JSON, String, Text, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RelatorioGerado(Base):
    __tablename__ = "relatorios_gerados"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo_relatorio: Mapped[str] = mapped_column(String(50), nullable=False)
    formato: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf
    usuario: Mapped[str] = mapped_column(String(200), nullable=False, default="Operador")
    data_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notebooklm_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    notebooklm_artifact_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    notebooklm_notebook_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notebooklm_artifact_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notebooklm_export_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notebooklm_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notebooklm_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notebooklm_scope_condominio_ids: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    notebooklm_processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<RelatorioGerado {self.nome} - {self.formato}>"
