import uuid
from typing import Optional
from datetime import datetime

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.schemas import CondominioCreate, CondominioUpdate, CondominioResponse, FaturaResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/condominios", tags=["Condomínios"])


def _escape_like(value: str) -> str:
    """Escapes SQL LIKE metacharacters."""
    return value.replace("%", r"\%").replace("_", r"\_")


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
        safe = _escape_like(search)
        stmt = stmt.where(
            Condominio.nome.ilike(f"%{safe}%")
            | Condominio.numero.ilike(f"%{safe}%")
            | Condominio.cnpj.ilike(f"%{safe}%")
        )
    stmt = stmt.order_by(Condominio.nome).offset(skip).limit(limit)
    result = await db.execute(stmt)
    condominios = result.scalars().all()

    # Count faturas received THIS MONTH for all condominios in one query
    now = datetime.now()
    fatura_counts_result = await db.execute(
        select(Fatura.condominio_id, func.count(Fatura.id))
        .where(
            extract("year", Fatura.created_at) == now.year,
            extract("month", Fatura.created_at) == now.month,
        )
        .group_by(Fatura.condominio_id)
    )
    fatura_counts = dict(fatura_counts_result.all())

    responses = []
    for c in condominios:
        count_exp = len(c.concessionarias)
        resp = CondominioResponse.model_validate(c)
        resp.contas_esperadas = count_exp
        resp.contas_recebidas = fatura_counts.get(c.id, 0)
        responses.append(resp)
    return responses


@router.post("/", response_model=CondominioResponse, status_code=201)
async def create_condominio(
    body: CondominioCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Creates a new condominio and its Gmail label."""
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

    # Create Gmail label in background
    background_tasks.add_task(_create_gmail_label_for_condo, condominio.nome, condominio.numero)

    return condominio


def _create_gmail_label_for_condo(condo_nome: str, condo_numero: str):
    """Background task: creates Gmail label Datacron/{condo_numero} - {condo_nome}."""
    try:
        from app.services.email_monitor import get_imap_connection, ensure_gmail_label
        mail = get_imap_connection()
        if mail:
            numero_pad = str(condo_numero).zfill(4)
            label_name = f"Datacron/{numero_pad} - {condo_nome}"
            ensure_gmail_label(mail, label_name)
            try:
                mail.logout()
            except:
                pass
            logger.info(f"Label Gmail '{label_name}' criado para novo condomínio.")
    except Exception as e:
        logger.error(f"Erro ao criar label Gmail para condomínio '{condo_nome}': {e}")


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


@router.get("/{id}/faturas", response_model=list[FaturaResponse])
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


@router.post("/{id}/ata-eleicao")
async def upload_ata_eleicao(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Uploads and saves the ATA de Eleição PDF in base64."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    # Relax validation to allow common PDF variants
    valid_pdf_mimes = ["application/pdf", "application/x-pdf", "binary/octet-stream"]
    is_pdf_extension = (pdf_file.filename or "").lower().endswith(".pdf")
    
    if pdf_file.content_type not in valid_pdf_mimes and not is_pdf_extension:
        raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")

    import base64
    pdf_bytes = await pdf_file.read()
    b64_data = base64.b64encode(pdf_bytes).decode('utf-8')

    with open("upload_debug.log", "a") as f:
        f.write(f"[{datetime.now()}] Uploading for condo {id}: Bytes read={len(pdf_bytes)}, B64 len={len(b64_data)}\n")

    condo.ata_eleicao_base64 = b64_data
    condo.ata_eleicao_nome = pdf_file.filename or 'ata_eleicao.pdf'
    
    try:
        await db.commit()
        with open("upload_debug.log", "a") as f:
            f.write(f"[{datetime.now()}] Commit successful for condo {id}\n")
    except Exception as e:
        with open("upload_debug.log", "a") as f:
            f.write(f"[{datetime.now()}] Commit FAILED for condo {id}: {str(e)}\n")
        raise e

    await db.refresh(condo)

    return {"mensagem": "ATA de Eleição salva com sucesso", "ata_eleicao_nome": condo.ata_eleicao_nome}


@router.get("/{id}/ata-eleicao")
async def download_ata_eleicao(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads the ATA de Eleição PDF."""
    import io
    import base64
    
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
        
    if not condo.ata_eleicao_base64:
        raise HTTPException(status_code=404, detail="Este condomínio não possui ATA de eleição cadastrada")

    pdf_bytes = base64.b64decode(condo.ata_eleicao_base64)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{condo.ata_eleicao_nome}"'},
    )
