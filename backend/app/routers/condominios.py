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
from app.config import settings
from app.storage import save_file, get_file_content
import io
import base64
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

    # Query 1: Fetch condominios
    stmt = (
        select(Condominio)
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
                extract("year", Fatura.vencimento) == now.year,
                extract("month", Fatura.vencimento) == now.month,
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


@router.get("/{id}/status-contas")
async def get_status_contas(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns concessionárias with matched faturas for the current month (single query)."""
    from app.models.concessionaria import Concessionaria

    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # 1. Get active concessionárias for this condo
    conc_result = await db.execute(
        select(Concessionaria)
        .where(Concessionaria.condominio_id == id, Concessionaria.ativo == True)
        .order_by(Concessionaria.tipo)
    )
    concs = conc_result.scalars().all()

    if not concs:
        return []

    # 2. Get faturas for this condo, current month
    now = datetime.now()
    fat_result = await db.execute(
        select(Fatura)
        .where(
            Fatura.condominio_id == id,
            extract("year", Fatura.vencimento) == now.year,
            extract("month", Fatura.vencimento) == now.month,
        )
        .order_by(Fatura.created_at.desc())
    )
    faturas = fat_result.scalars().all()

    # 3. Build a map: concessionaria_id -> first matching fatura
    fatura_map = {}
    for f in faturas:
        if f.concessionaria_id and f.concessionaria_id not in fatura_map:
            fatura_map[f.concessionaria_id] = f

    # 4. Build response
    items = []
    for c in concs:
        fat = fatura_map.get(c.id)
        items.append({
            "concessionaria": {
                "id": str(c.id),
                "tipo": c.tipo,
                "nome_personalizado": getattr(c, "nome_personalizado", None),
                "instalacao": c.instalacao,
                "dia_vencimento": c.dia_vencimento,
            },
            "fatura": {
                "id": str(fat.id),
                "valor": fat.valor,
                "vencimento": fat.vencimento.isoformat() if fat.vencimento else None,
                "created_at": fat.created_at.isoformat() if fat.created_at else None,
                "pdf_nome_original": fat.pdf_nome_original,
                "storage_path": fat.storage_path,
                "concessionaria_id": str(fat.concessionaria_id) if fat.concessionaria_id else None,
            } if fat else None,
        })

    # Sort: received first, then by tipo
    items.sort(key=lambda x: (0 if x["fatura"] else 1, x["concessionaria"]["tipo"] or ""))
    return items


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
        .options(
            selectinload(Condominio.concessionarias),
            defer(Condominio.ata_eleicao_base64)
        )
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


@router.get("/{id}/download/{file_type}")
async def download_condo_file(
    id: uuid.UUID,
    file_type: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads a condo document (ATA, AVCB, or Seguro) from Base64."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    
    b64_data = None
    filename = f"{file_type}.pdf"
    
    if file_type == "ata_eleicao":
        b64_data = condo.ata_eleicao_url
        filename = condo.ata_eleicao_nome or "ata_eleicao.pdf"
    elif file_type == "avcb":
        b64_data = condo.avcb_url
        filename = "avcb.pdf"
    elif file_type == "apolice":
        b64_data = condo.apolice_seguro_url
        filename = "apolice_seguro.pdf"
    else:
        raise HTTPException(status_code=400, detail="Tipo de arquivo inválido")
        
    if not b64_data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    import os
    from app.storage import LOCAL_STORAGE_DIR

    try:
        # Check if it's a file path
        if b64_data.startswith(LOCAL_STORAGE_DIR) or b64_data.endswith(".pdf"):
             # It's a path on disk
            if os.path.exists(b64_data):
                def file_iterator(path: str):
                    with open(path, "rb") as f:
                        while chunk := f.read(8192):
                            yield chunk
                return StreamingResponse(
                    file_iterator(b64_data),
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )
            # Try relative
            rel_path = os.path.join(LOCAL_STORAGE_DIR, os.path.basename(b64_data))
            if os.path.exists(rel_path):
                def file_iterator(path: str):
                    with open(path, "rb") as f:
                        while chunk := f.read(8192):
                            yield chunk
                return StreamingResponse(
                    file_iterator(rel_path),
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )

        # Fallback to legacy Base64
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
            
        pdf_bytes = base64.b64decode(b64_data)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.error(f"Error serving condo file: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar arquivo")


@router.post("/{id}/ata-eleicao")
async def save_ata_eleicao(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    data_inicio: Optional[str] = Form(None),
    data_fim: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Uploads and saves the ATA de Eleição in Base64 (max 10MB)."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF são permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")

    # Save file to disk
    filename = f"ata_eleicao_{id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = await save_file(pdf_bytes, filename)

    def parse_date(d_str):
        if not d_str or d_str.strip() == "": return None
        try: return datetime.fromisoformat(d_str.replace('Z', '+00:00'))
        except: return None

    try:
        condo.ata_eleicao_url = file_path
        condo.ata_eleicao_nome = pdf_file.filename
        condo.ata_eleicao_inicio = parse_date(data_inicio)
        condo.ata_eleicao_fim = parse_date(data_fim)
        
        await db.commit()
        return {"mensagem": "ATA de Eleição salva com sucesso", "ata_eleicao_nome": pdf_file.filename}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar ATA: {str(e)}")


@router.get("/{id}/ata-eleicao")
async def get_ata_eleicao_url(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns the ATA de Eleição Base64 data (or proxy URL)."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    
    if not condo or not condo.ata_eleicao_url:
        raise HTTPException(status_code=404, detail="ATA não encontrada")
        
    return {"url": condo.ata_eleicao_url, "filename": condo.ata_eleicao_nome}


@router.post("/{id}/avcb")
async def save_avcb(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    data_inicio: Optional[str] = Form(None),
    data_fim: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Uploads and saves the AVCB in Base64 (max 10MB)."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo: raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF são permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")

    # Save file to disk
    filename = f"avcb_{id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = await save_file(pdf_bytes, filename)

    def parse_date(d_str):
        if not d_str or d_str.strip() == "": return None
        try: return datetime.fromisoformat(d_str.replace('Z', '+00:00'))
        except: return None

    try:
        condo.avcb_url = file_path
        condo.avcb_inicio = parse_date(data_inicio)
        condo.avcb_fim = parse_date(data_fim)
        await db.commit()
        return {"mensagem": "AVCB salvo com sucesso"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar AVCB: {str(e)}")


@router.get("/{id}/avcb")
async def get_avcb_url(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns the AVCB Base64 data."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo or not condo.avcb_url:
        raise HTTPException(status_code=404, detail="AVCB não encontrado")
    return {"url": condo.avcb_url}


@router.post("/{id}/apolice")
async def save_apolice(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    data_inicio: Optional[str] = Form(None),
    data_fim: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Uploads and saves the Apólice de Seguro in Base64 (max 10MB)."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo: raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF são permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")

    # Save file to disk
    filename = f"apolice_{id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = await save_file(pdf_bytes, filename)

    def parse_date(d_str):
        if not d_str or d_str.strip() == "": return None
        try: return datetime.fromisoformat(d_str.replace('Z', '+00:00'))
        except: return None

    try:
        condo.apolice_seguro_url = file_path
        condo.apolice_seguro_inicio = parse_date(data_inicio)
        condo.apolice_seguro_fim = parse_date(data_fim)
        await db.commit()
        return {"mensagem": "Apólice salva com sucesso"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar Apólice: {str(e)}")


@router.get("/{id}/apolice")
async def get_apolice_url(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns the Apólice de Seguro Base64 data."""
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    condo = result.scalar_one_or_none()
    if not condo or not condo.apolice_seguro_url:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")
    return {"url": condo.apolice_seguro_url}

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
    
    condo.ata_eleicao_url = None
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
