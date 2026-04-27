import uuid
import base64
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user, require_write, require_role
from app.models.reajuste_mercado import ReajusteMercado
from app.schemas import ReajusteMercadoCreate, ReajusteMercadoResponse

router = APIRouter(prefix="/reajustes", tags=["Reajustes de Mercado"])


@router.get("/", response_model=list[ReajusteMercadoResponse])
async def list_reajustes(
    categoria: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lists history of market rate adjustments."""
    stmt = select(ReajusteMercado)
    if categoria:
        stmt = stmt.where(ReajusteMercado.categoria == categoria)
    stmt = stmt.order_by(ReajusteMercado.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{id}", response_model=ReajusteMercadoResponse)
async def get_reajuste(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns a single reajuste."""
    result = await db.execute(select(ReajusteMercado).where(ReajusteMercado.id == id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Reajuste nao encontrado")
    return r


@router.post("/", response_model=ReajusteMercadoResponse, status_code=201)
async def create_reajuste(
    categoria: str = Form(...),
    percentual: float = Form(...),
    vigencia: str = Form(...),
    descricao: Optional[str] = Form(None),
    categoria_personalizada: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Creates a new market rate adjustment with optional PDF."""
    
    pdf_base64 = None
    pdf_name = None
    if pdf_file:
        if pdf_file.content_type != "application/pdf":
            raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")
        
        pdf_bytes = await pdf_file.read()
        
        # 10MB limit
        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")
            
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        pdf_name = pdf_file.filename

    reajuste = ReajusteMercado(
        categoria=categoria,
        categoria_personalizada=categoria_personalizada,
        percentual=percentual,
        vigencia=vigencia,
        descricao=descricao,
        documento_base64=pdf_base64,
        documento_nome=pdf_name
    )
    
    db.add(reajuste)
    await db.commit()
    await db.refresh(reajuste)
    return reajuste


@router.delete("/{id}", status_code=204)
async def delete_reajuste(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Deletes a reajuste."""
    result = await db.execute(select(ReajusteMercado).where(ReajusteMercado.id == id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Reajuste nao encontrado")
    
    await db.delete(r)
    await db.commit()


@router.put("/{id}", response_model=ReajusteMercadoResponse)
async def update_reajuste(
    id: uuid.UUID,
    categoria: str = Form(...),
    percentual: float = Form(...),
    vigencia: str = Form(...),
    descricao: Optional[str] = Form(None),
    categoria_personalizada: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Updates an existing market rate adjustment."""
    result = await db.execute(select(ReajusteMercado).where(ReajusteMercado.id == id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Reajuste nao encontrado")

    r.categoria = categoria
    r.percentual = percentual
    r.vigencia = vigencia
    r.descricao = descricao
    r.categoria_personalizada = categoria_personalizada

    if pdf_file:
        if pdf_file.content_type != "application/pdf":
            raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")
        pdf_bytes = await pdf_file.read()
        r.documento_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        r.documento_nome = pdf_file.filename

    await db.commit()
    await db.refresh(r)
    return r


@router.get("/{id}/documento")
async def download_documento_reajuste(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads the attached PDF document."""
    result = await db.execute(select(ReajusteMercado).where(ReajusteMercado.id == id))
    r = result.scalar_one_or_none()
    
    if not r:
        raise HTTPException(status_code=404, detail="Reajuste não encontrado")
        
    if not r.documento_base64:
        raise HTTPException(status_code=404, detail="Este reajuste não possui documento anexo")

    pdf_bytes = base64.b64decode(r.documento_base64)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{r.documento_nome}"'},
    )
