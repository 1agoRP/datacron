import uuid
from typing import Optional
from datetime import datetime

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, defer

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids, require_role
from app.models.user import User
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.schemas import CondominioCreate, CondominioUpdate, CondominioResponse, FaturaResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/condominios", tags=["Condomínios"])


def _escape_like(value: str) -> str:
    """Escapes SQL LIKE metacharacters."""
    return value.replace("%", r"\%").replace("_", r"\_")


@router.get("", response_model=list[CondominioResponse])
async def list_condominios(
    search: Optional[str] = Query(None, description="Busca por nome, número ou CNPJ"),
    ativo: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Lists all condominios with optional search and pagination."""
    from app.models.concessionaria import Concessionaria

    # Query 1: Fetch condominios (no eager loading, exclude heavy base64 column)
    stmt = (
        select(Condominio)
        .options(defer(Condominio.ata_eleicao_base64))
        .where(Condominio.ativo == ativo)
    )
    if allowed_condo_ids is not None:
        stmt = stmt.where(Condominio.id.in_(allowed_condo_ids))
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

    if not condominios:
        return []

    condo_ids = [c.id for c in condominios]

    # Query 2: Count active concessionárias per condo
    try:
        conc_result = await db.execute(
            select(Concessionaria.condominio_id, func.count(Concessionaria.id))
            .where(
                Concessionaria.condominio_id.in_(condo_ids),
                Concessionaria.ativo == True,
            )
            .group_by(Concessionaria.condominio_id)
        )
        conc_counts = dict(conc_result.all())
    except Exception as e:
        logger.warning(f"Failed to count concessionárias: {e}")
        conc_counts = {}

    # Query 3: Count faturas received this month per condo
    try:
        now = datetime.now()
        fat_result = await db.execute(
            select(Fatura.condominio_id, func.count(Fatura.id))
            .where(
                Fatura.condominio_id.in_(condo_ids),
                extract("year", Fatura.created_at) == now.year,
                extract("month", Fatura.created_at) == now.month,
            )
            .group_by(Fatura.condominio_id)
        )
        fat_counts = dict(fat_result.all())
    except Exception as e:
        logger.warning(f"Failed to count faturas: {e}")
        fat_counts = {}

    # Build responses
    responses = []
    for c in condominios:
        resp = CondominioResponse.model_validate(c)
        resp.contas_esperadas = conc_counts.get(c.id, 0)
        resp.contas_recebidas = fat_counts.get(c.id, 0)
        responses.append(resp)
    return responses



@router.post("", response_model=CondominioResponse, status_code=201)
async def create_condominio(
    body: CondominioCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns a single condominio by ID."""
    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")
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
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Updates a condominio's data."""
    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")
    
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    
    # RBAC: Only admin can edit core fields
    update_data = body.model_dump(exclude_none=True)
    if not current_user.is_admin:
        allowed_for_manager = {"mandato_inicio", "mandato_fim", "leitura_individualizada_ativa", "sindico", "cpf_sindico"}
        attempted_to_edit = set(update_data.keys())
        not_allowed = attempted_to_edit - allowed_for_manager
        if not_allowed:
            raise HTTPException(
                status_code=403, 
                detail=f"Permissão insuficiente para editar os campos: {', '.join(not_allowed)}. Contate o administrador."
            )

    for field, value in update_data.items():
        setattr(c, field, value)

    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{id}", status_code=204)
async def delete_condominio(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Soft-deletes a condominio (sets ativo=False)."""
    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns all faturas for a specific condominio."""
    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")
    stmt = select(Fatura).where(Fatura.condominio_id == id)
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)
    stmt = stmt.order_by(Fatura.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{id}/gmail-history")
async def get_condominio_gmail_history(
    id: uuid.UUID,
    concessionaria_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Fetches list of invoices directly from the Condominio's Gmail label."""
    # 1. Obter Condomínio e Concessionária
    result = await db.execute(
        select(Condominio).where(Condominio.id == id)
    )
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    from app.models.concessionaria import Concessionaria as ConcModel
    res_conc = await db.execute(
        select(ConcModel).where(ConcModel.id == concessionaria_id)
    )
    conc = res_conc.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")

    # 2. Construir nome da Label (Padrão: Datacron/XXXX - Nome)
    numero_pad = str(condo.numero).zfill(4)
    label_name = f"Datacron/{numero_pad} - {condo.nome}"

    # 3. Chamar função de busca IMAP
    from app.services.email_monitor import get_gmail_history
    history = get_gmail_history(label_name, conc.instalacao)
    
    return history


@router.post("/{id}/ata-eleicao")
async def upload_ata_eleicao(
    id: uuid.UUID,
    data_inicio: Optional[datetime] = Form(None),
    data_fim: Optional[datetime] = Form(None),
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
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
    condo.ata_eleicao_inicio = data_inicio
    condo.ata_eleicao_fim = data_fim
    
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


@router.post("/{id}/avcb")
async def upload_avcb(
    id: uuid.UUID,
    data_inicio: Optional[datetime] = Form(None),
    data_fim: Optional[datetime] = Form(None),
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Uploads and saves the AVCB PDF in base64."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    valid_pdf_mimes = ["application/pdf", "application/x-pdf", "binary/octet-stream"]
    is_pdf_extension = (pdf_file.filename or "").lower().endswith(".pdf")
    if pdf_file.content_type not in valid_pdf_mimes and not is_pdf_extension:
        raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")

    import base64
    pdf_bytes = await pdf_file.read()
    b64_data = base64.b64encode(pdf_bytes).decode('utf-8')
    condo.avcb_url = b64_data
    condo.avcb_inicio = data_inicio
    condo.avcb_fim = data_fim
    
    await db.commit()
    await db.refresh(condo)
    return {"mensagem": "AVCB salvo com sucesso", "avcb_nome": pdf_file.filename}


@router.get("/{id}/avcb")
async def download_avcb(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads the AVCB PDF."""
    import io
    import base64
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    
    if not condo or not condo.avcb_url:
        raise HTTPException(status_code=404, detail="AVCB não encontrado")

    pdf_bytes = base64.b64decode(condo.avcb_url)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="AVCB_{condo.nome}.pdf"'},
    )


@router.post("/{id}/apolice")
async def upload_apolice(
    id: uuid.UUID,
    data_inicio: Optional[datetime] = Form(None),
    data_fim: Optional[datetime] = Form(None),
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Uploads and saves the Apolice PDF in base64."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    valid_pdf_mimes = ["application/pdf", "application/x-pdf", "binary/octet-stream"]
    is_pdf_extension = (pdf_file.filename or "").lower().endswith(".pdf")
    if pdf_file.content_type not in valid_pdf_mimes and not is_pdf_extension:
        raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")

    import base64
    pdf_bytes = await pdf_file.read()
    b64_data = base64.b64encode(pdf_bytes).decode('utf-8')
    condo.apolice_seguro_url = b64_data
    condo.apolice_seguro_inicio = data_inicio
    condo.apolice_seguro_fim = data_fim
    
    await db.commit()
    await db.refresh(condo)
    return {"mensagem": "Apólice salva com sucesso", "apolice_nome": pdf_file.filename}


@router.get("/{id}/apolice")
async def download_apolice(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads the Apolice PDF."""
    import io
    import base64
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    
    if not condo or not condo.apolice_seguro_url:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")

    pdf_bytes = base64.b64decode(condo.apolice_seguro_url)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Apolice_{condo.nome}.pdf"'},
    )

@router.delete("/{id}/ata-eleicao", status_code=204)
async def delete_ata_eleicao(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Exclui a ATA de Eleição do condomínio."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    
    condo.ata_eleicao_base64 = None
    condo.ata_eleicao_nome = None
    condo.ata_eleicao_inicio = None
    condo.ata_eleicao_fim = None
    await db.commit()

@router.delete("/{id}/avcb", status_code=204)
async def delete_avcb(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Exclui o AVCB do condomínio."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    
    condo.avcb_url = None
    condo.avcb_inicio = None
    condo.avcb_fim = None
    await db.commit()

@router.delete("/{id}/apolice", status_code=204)
async def delete_apolice(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Exclui a Apólice de Seguro do condomínio."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    
    condo.apolice_seguro_url = None
    condo.apolice_seguro_inicio = None
    condo.apolice_seguro_fim = None
    await db.commit()
