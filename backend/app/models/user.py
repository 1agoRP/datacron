import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, BigInteger, func, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user_condominio import UserCondominio

# Valid roles for the system
VALID_ROLES = {"admin", "supervisor", "gerencia", "assistente", "concessionarias", "contabilidade", "orçamento", "emissao", "financeiro", "providencias", "geral"}

# Roles that have full read+write access (except admin-only modules)
ROLES_FULL_ACCESS = {"admin", "supervisor", "gerencia", "assistente"}

# Roles that are read-only (view + download only)
ROLES_READ_ONLY = {"concessionarias", "contabilidade", "orçamento", "emissao", "financeiro", "providencias", "geral"}

# Modules restricted to admin only
ADMIN_ONLY_MODULES = {"relatorios", "importacoes", "notificacoes", "gmail"}

# Modules available to supervisor in addition to unrestricted modules
SUPERVISOR_ALLOWED_MODULES = {"relatorios"}


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(30), nullable=False, default="geral"
    )  # admin | gerencia | assistente | contabilidade | financeiro | providencias | geral
    ativo: Mapped[bool] = mapped_column(default=True)
    codigo_usuario: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    whatsapp: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    administradora: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Unified fields from database_usuarios
    codigo_condominio: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "39,48,70" or "todos"
    gestor_usuarios: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    gestor_fornecedor: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    gestor_condominios: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    notificar_whatsapp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    notificar_email: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user_condominios: Mapped[list["UserCondominio"]] = relationship(
        "UserCondominio", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def can_write(self) -> bool:
        return self.role in ROLES_FULL_ACCESS

    @property
    def is_read_only(self) -> bool:
        return self.role in ROLES_READ_ONLY

    def has_module_access(self, module: str) -> bool:
        if self.role == "admin":
            return True
        if self.role == "supervisor" and module in SUPERVISOR_ALLOWED_MODULES:
            return True
        if module == "gmail" and self.role in ("gerencia", "assistente"):
            return True
        return module not in ADMIN_ONLY_MODULES

    def __repr__(self) -> str:
        return f"<User {self.email}>"
