import uuid

from sqlalchemy import ForeignKey, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserCondominio(Base):
    """Junction table: which condominios each user can access."""
    __tablename__ = "user_condominios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    condominio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("condominios.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="user_condominios")
    condominio = relationship("Condominio")

    def __repr__(self) -> str:
        return f"<UserCondominio user={self.user_id} condo={self.condominio_id}>"
