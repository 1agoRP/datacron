import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.schemas import CondominioCreate, CondominioUpdate, CondominioResponse

router = APIRouter(prefix="/condominios", tags=["Condomínios"])


@router.get("/", response_model=list[CondominioResponse])
async def list_condominios(
    search: Optional[str] = Query(None, description="Busca por nome, número ou CNPJ"),
    ativo: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lists all condominios with optional search and pagination."""
    stmt = (
        select(Condominio)
        .options(selectinload(Condominio.concessionarias))
        .where(Condominio.ativo == ativo)
    )
    if search:
        stmt = stmt.where(
            Condominio.nome.ilike(f"%{search}%")
            | Condominio.numero.ilike(f"%{search}%")
            | Condominio.cnpj.ilike(f"%{search}%")
        )
    stmt = stmt.order_by(Condominio.nome).offset(skip).limit(limit)
    result = await db.execute(stmt)
    condominios = result.scalars().all()

    # Attach billing counts
    responses = []
    for c in condominios:
        # Count expected
        count_exp = len(c.concessionarias)
        
        # In a real app, we'd count current faturas here
        # For now, let's keep it simple or use a placeholder
        
        resp = CondominioResponse.model_validate(c)
        resp.contas_esperadas = count_exp
        # mock received for now
        resp.contas_recebidas = 0 
        
        responses.append(resp)
    return responses


@router.post("/", response_model=CondominioResponse, status_code=201)
async def create_condominio(
    body: CondominioCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Creates a new condominio."""
    # Check unique constraints
    existing = await db.execute(
        select(Condominio).where(
            (Condominio.cnpj == body.cnpj) | (Condominio.numero == body.numero)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Condomínio com este CNPJ ou número já existe")

    condominio = Condominio(**body.model_dump())
    db.add(condominio)
    await db.commit()
    await db.refresh(condominio)
    return condominio


@router.get("/{id}", response_model=CondominioResponse)
async def get_condominio(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns a single condominio by ID."""
    result = await db.execute(
        select(Condominio)
        .options(selectinload(Condominio.concessionarias))
        .where(Condominio.id == id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    return c


@router.put("/{id}", response_model=CondominioResponse)
async def update_condominio(
    id: uuid.UUID,
    body: CondominioUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Updates a condominio's data."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)

    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{id}", status_code=204)
async def delete_condominio(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Soft-deletes a condominio (sets ativo=False)."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    c.ativo = False
    await db.commit()


@router.get("/{id}/faturas", response_model=list)
async def get_condominio_faturas(
    id: uuid.UUID,
    referencia: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns all faturas for a specific condominio."""
    stmt = select(Fatura).where(Fatura.condominio_id == id)
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)
    stmt = stmt.order_by(Fatura.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
