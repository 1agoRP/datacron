import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.relatorio import RelatorioGerado
from app.schemas import RelatorioGeradoCreate, RelatorioGeradoResponse

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get("/historico", response_model=list[RelatorioGeradoResponse])
async def listar_historico(
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns the latest generated reports from the database."""
    stmt = (
        select(RelatorioGerado)
        .order_by(RelatorioGerado.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/registrar", response_model=RelatorioGeradoResponse, status_code=201)
async def registrar_relatorio(
    body: RelatorioGeradoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Records a new report generation event in the history."""
    relatorio = RelatorioGerado(
        nome=body.nome,
        tipo_relatorio=body.tipo_relatorio,
        formato=body.formato,
        usuario=body.usuario,
    )
    db.add(relatorio)
    await db.commit()
    await db.refresh(relatorio)
    return relatorio
