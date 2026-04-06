import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, Float, ForeignKey, func, Boolean, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.condominio import Condominio
    from app.models.fatura import Fatura


class Concessionaria(Base):
    __tablename__ = "concessionarias_vinculadas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    condominio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # Enel | Sabesp | Comgás | Outros
    instalacao: Mapped[str] = mapped_column(String(100), nullable=False)
    email_esperado: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Regra: "5_primeiros_cnpj" | "3_primeiros_cnpj" | "cnpj_completo" | "manual"
    regra_senha: Mapped[str] = mapped_column(String(50), nullable=False, default="5_primeiros_cnpj")
    senha_manual: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dia_vencimento: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_medio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    nome_personalizado: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    condominio: Mapped["Condominio"] = relationship("Condominio", back_populates="concessionarias")
    faturas: Mapped[list["Fatura"]] = relationship("Fatura", back_populates="concessionaria")

    def gerar_senha_pdf(self, cnpj_digits: str) -> str:
        """
        Generates the PDF unlock password based on the configured rule.

        Rules:
        - "5_primeiros_cnpj": 5 first digits of CNPJ (Enel)
        - "3_primeiros_cnpj": 3 first digits of CNPJ (Sabesp, Comgás)
        - "cnpj_completo": all CNPJ digits
        - "manual": use senha_manual field
        """
        if self.regra_senha == "manual":
            return self.senha_manual or ""
        elif self.regra_senha == "3_primeiros_cnpj":
            return cnpj_digits[:3]
        elif self.regra_senha == "cnpj_completo":
            return cnpj_digits
        else:  # default: 5_primeiros_cnpj
            return cnpj_digits[:5]

    def __repr__(self) -> str:
        return f"<Concessionaria {self.tipo} – Instalação {self.instalacao}>"
