import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids
from app.models.user import User
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.schemas import FaturaResponse
from pydantic import BaseModel

router = APIRouter(prefix="/faturas", tags=["Faturas"])


class FaturaManualCreate(BaseModel):
    condominio_id: uuid.UUID
    concessionaria_id: uuid.UUID
    valor: float
    vencimento: date
    referencia: Optional[str] = None


@router.post("/manual", response_model=FaturaResponse)
async def create_fatura_manual(
    body: FaturaManualCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Cria manualmente uma fatura para uma concessionária."""

    # Verify access to the condominio
    if allowed_condo_ids is not None and body.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # Verify condominio exists
    result = await db.execute(
        select(Condominio).where(Condominio.id == body.condominio_id)
    )
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    # Verify concessionaria exists and belongs to the condominio
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.id == body.concessionaria_id,
            Concessionaria.condominio_id == body.condominio_id,
        )
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(
            status_code=404,
            detail="Concessionária não encontrada ou não pertence a este condomínio",
        )

    # Generate reference if not provided (e.g., "Maio/2026")
    referencia = body.referencia
    if not referencia:
        mes_nome = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
        ]
        mes = body.vencimento.month
        ano = body.vencimento.year
        referencia = f"{mes_nome[mes - 1]}/{ano}"

    # Create the fatura
    nova_fatura = Fatura(
        condominio_id=body.condominio_id,
        concessionaria_id=body.concessionaria_id,
        valor=body.valor,
        vencimento=body.vencimento,
        referencia=referencia,
        status="pendente",
        email_remetente=f"Manual - {user.email}",
        email_assunto=f"Entrada manual por {user.nome}",
    )

    db.add(nova_fatura)
    await db.commit()
    await db.refresh(nova_fatura)

    # Attach relationships for response
    nova_fatura.condominio = condo
    nova_fatura.concessionaria = conc

    return FaturaResponse.model_validate(nova_fatura)
