import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, Text, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.concessionaria import Concessionaria
    from app.models.fatura import Fatura
    from app.models.alerta import Alerta
    from app.models.contrato import Contrato


class Condominio(Base):
    __tablename__ = "condominios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    numero: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    endereco: Mapped[str] = mapped_column(String(500), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, nullable=False, index=True)
    sindico: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf_sindico: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    ata_eleicao_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ata_eleicao_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ata_eleicao_inicio: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ata_eleicao_fim: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    avcb_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avcb_inicio: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    avcb_fim: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    apolice_seguro_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    apolice_seguro_inicio: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    apolice_seguro_fim: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    gerente_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    assistente_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    administradora: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    mandato_inicio: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    mandato_fim: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    leitura_individualizada_ativa: Mapped[bool] = mapped_column(default=False)
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    concessionarias: Mapped[list["Concessionaria"]] = relationship(
        "Concessionaria", back_populates="condominio", cascade="all, delete-orphan"
    )
    faturas: Mapped[list["Fatura"]] = relationship(
        "Fatura", back_populates="condominio"
    )
    alertas: Mapped[list["Alerta"]] = relationship(
        "Alerta", back_populates="condominio"
    )
    contratos: Mapped[list["Contrato"]] = relationship(
        "Contrato", back_populates="condominio", cascade="all, delete-orphan"
    )

    @property
    def cnpj_digits(self) -> str:
        """Returns only the numeric digits of the CNPJ."""
        return "".join(filter(str.isdigit, self.cnpj))

    def __repr__(self) -> str:
        return f"<Condominio {self.numero} – {self.nome}>"
