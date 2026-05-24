import uuid
from typing import Optional
from datetime import datetime

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, extract, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, defer

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids, require_role
from app.models.user import User
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.models.audit_log import AuditLog
from app.schemas import CondominioCreate, CondominioUpdate, CondominioResponse, FaturaResponse
from app.config import settings
from app.storage import save_file, get_file_content
import io
import base64
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/condominios", tags=["CondomÃ­nios"])



def _escape_like(value: str) -> str:
    """Escapes SQL LIKE metacharacters."""
    return value.replace("%", r"\%").replace("_", r"\_")


def _normalized_cnpj_column():
    return func.replace(func.replace(func.replace(Condominio.cnpj, ".", ""), "/", ""), "-", "")


def _ensure_condo_access(condominio_id: uuid.UUID, allowed_condo_ids: list | None) -> None:
    if allowed_condo_ids is not None and condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomÃƒÂ­nio")


async def _get_condominio_or_404(
    db: AsyncSession,
    condominio_id: uuid.UUID,
    allowed_condo_ids: list | None = None,
) -> Condominio:
    _ensure_condo_access(condominio_id, allowed_condo_ids)
    result = await db.execute(select(Condominio).where(Condominio.id == condominio_id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="CondomÃƒÂ­nio nÃƒÂ£o encontrado")
    return condo


def _add_audit_log(
    db: AsyncSession,
    current_user: User,
    acao: str,
    entidade_id: uuid.UUID,
    detalhes: dict,
) -> None:
    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nome=current_user.nome,
            usuario_email=current_user.email,
            acao=acao,
            entidade_tipo="condominio",
            entidade_id=entidade_id,
            detalhes=detalhes,
        )
    )


@router.get("", response_model=list[CondominioResponse])
async def list_condominios(
    search: Optional[str] = Query(None, description="Busca por nome, nÃºmero ou CNPJ"),
    ativo: bool = Query(True),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000, le=2100),
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
        safe_digits = "".join(filter(str.isdigit, search))
        conditions = [
            Condominio.nome.ilike(f"%{safe}%"),
            Condominio.numero.ilike(f"%{safe}%"),
            Condominio.cnpj.ilike(f"%{safe}%"),
        ]
        if safe_digits:
            conditions.append(_normalized_cnpj_column().ilike(f"%{safe_digits}%"))
        stmt = stmt.where(or_(*conditions))
    stmt = stmt.order_by(Condominio.nome).offset(skip).limit(limit)
    result = await db.execute(stmt)
    condominios = result.scalars().all()

    if not condominios:
        return []

    condo_ids = [c.id for c in condominios]

    # Query 2: Count active concessionÃ¡rias per condo
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
        logger.warning(f"Failed to count concessionÃ¡rias: {e}")
        conc_counts = {}

    # Query 3: Count faturas received this month per condo
    try:
        now = datetime.now()
        ref_mes = mes or now.month
        ref_ano = ano or now.year
        fat_result = await db.execute(
            select(Fatura.condominio_id, func.count(func.distinct(Fatura.concessionaria_id)))
            .join(Concessionaria, and_(Fatura.concessionaria_id == Concessionaria.id, Concessionaria.ativo == True))
            .where(
                Fatura.condominio_id.in_(condo_ids),
                extract("year", Fatura.vencimento) == ref_ano,
                extract("month", Fatura.vencimento) == ref_mes,
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
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns concessionÃ¡rias with matched faturas for the current month (single query)."""
    from app.models.concessionaria import Concessionaria

    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomÃ­nio")

    # 1. Get active concessionÃ¡rias for this condo
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
    ref_mes = mes or now.month
    ref_ano = ano or now.year
    fat_result = await db.execute(
        select(Fatura)
        .where(
            Fatura.condominio_id == id,
            extract("year", Fatura.vencimento) == ref_ano,
            extract("month", Fatura.vencimento) == ref_mes,
        )
        .order_by(Fatura.created_at.desc())
    )
    faturas = fat_result.scalars().all()

    # 3. Group faturas by concessionaria_id
    faturas_by_conc = {}
    for f in faturas:
        if f.concessionaria_id:
            if f.concessionaria_id not in faturas_by_conc:
                faturas_by_conc[f.concessionaria_id] = []
            faturas_by_conc[f.concessionaria_id].append(f)

    # 4. Build response
    main_items = []
    extra_items = []
    
    for c in concs:
        c_faturas = faturas_by_conc.get(c.id, [])
        
        # Primary fatura (if any)
        primary_fat = c_faturas[0] if c_faturas else None
        
        main_items.append({
            "concessionaria": {
                "id": str(c.id),
                "tipo": c.tipo,
                "nome_personalizado": getattr(c, "nome_personalizado", None),
                "instalacao": c.instalacao,
                "dia_vencimento": c.dia_vencimento,
                "debito_automatico": c.debito_automatico,
            },
            "fatura": {
                "id": str(primary_fat.id),
                "valor": primary_fat.valor,
                "vencimento": primary_fat.vencimento.isoformat() if primary_fat.vencimento else None,
                "created_at": primary_fat.created_at.isoformat() if primary_fat.created_at else None,
                "pdf_nome_original": primary_fat.pdf_nome_original,
                "storage_path": primary_fat.storage_path,
                "concessionaria_id": str(primary_fat.concessionaria_id) if primary_fat.concessionaria_id else None,
            } if primary_fat else None,
        })
        
        # Extra billings (2nd, 3rd... in the same month)
        if len(c_faturas) > 1:
            for extra_fat in c_faturas[1:]:
                extra_items.append({
                    "concessionaria": {
                        "id": str(c.id),
                        "tipo": c.tipo,
                        "nome_personalizado": getattr(c, "nome_personalizado", None),
                        "instalacao": c.instalacao,
                    },
                    "fatura": {
                        "id": str(extra_fat.id),
                        "valor": extra_fat.valor,
                        "vencimento": extra_fat.vencimento.isoformat() if extra_fat.vencimento else None,
                        "pdf_nome_original": extra_fat.pdf_nome_original,
                    }
                })

    # Sort main: received first, then by tipo
    main_items.sort(key=lambda x: (0 if x["fatura"] else 1, x["concessionaria"]["tipo"] or ""))
    
    return {
        "items": main_items,
        "extras": extra_items,
        "referencia": f"{ref_ano}-{ref_mes:02d}"
    }


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
            (Condominio.numero == body.numero)
            | (_normalized_cnpj_column() == body.cnpj)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="CondomÃ­nio com este CNPJ ou nÃºmero jÃ¡ existe")

    condominio = Condominio(**body.model_dump())
    db.add(condominio)
    
    # Audit Log
    _add_audit_log(
        db,
        current_user,
        "inclusao",
        condominio.id,
        {"nome": condominio.nome, "numero": condominio.numero},
    )
    
    await db.commit()
    await db.refresh(condominio)

    return condominio


@router.get("/download-all", status_code=200)
async def download_all_faturas(
    referencia: Optional[str] = Query(None, description="ReferÃªncia (ex: Maio/2026)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Generates a ZIP file with all faturas for the month, organized by Condominio."""
    import zipfile
    from app.storage import get_file_content
    from sqlalchemy.orm import joinedload
    
    # 1. Base Query
    stmt = select(Fatura).options(
        joinedload(Fatura.condominio),
        joinedload(Fatura.concessionaria)
    )
    
    # 2. Filtering
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)
    else:
        # Fallback to current month if no reference provided
        now = datetime.now()
        stmt = stmt.where(
            extract("year", Fatura.vencimento) == now.year,
            extract("month", Fatura.vencimento) == now.month,
        )
    
    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    
    result = await db.execute(stmt)
    faturas = result.scalars().all()
    
    if not faturas:
        raise HTTPException(status_code=404, detail="Nenhuma fatura encontrada")

    # 3. Create ZIP in memory
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for fatura in faturas:
            content = None
            
            # Try Base64 first (Legacy/Small files)
            if fatura.pdf_base64:
                try:
                    b64 = fatura.pdf_base64
                    if "," in b64: b64 = b64.split(",")[1]
                    content = base64.b64decode(b64)
                except Exception:
                    pass
            
            # Try Storage Path second
            if not content and (fatura.storage_path or fatura.pdf_path):
                path = fatura.storage_path or fatura.pdf_path
                content = await get_file_content(path)
                
            if not content:
                continue # Skip faturas without file
                
            # Organize by Condominio
            condo_name = fatura.condominio.nome if fatura.condominio else "Desconhecido"
            safe_condo_name = "".join(c for c in condo_name if c.isalnum() or c in (" ", "-", "_")).strip()
            
            filename = fatura.pdf_nome_original or f"fatura_{fatura.id.hex[:8]}.pdf"
            zip_path = f"{safe_condo_name}/{filename}"
            
            zip_file.writestr(zip_path, content)

    buffer.seek(0)
    ref_label = referencia.replace("/", "_") if referencia else datetime.now().strftime("%m_%Y")
    return StreamingResponse(
        buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f'attachment; filename="Faturas_{ref_label}.zip"'},
    )


@router.get("/{id}", response_model=CondominioResponse)
async def get_condominio(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns a single condominio by ID."""
    if allowed_condo_ids is not None and id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomÃ­nio")

    result = await db.execute(
        select(Condominio)
        .options(
            selectinload(Condominio.concessionarias),
        )
        .where(Condominio.id == id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="CondomÃ­nio nÃ£o encontrado")
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
    c = await _get_condominio_or_404(db, id, allowed_condo_ids)

    update_data = body.model_dump(exclude_none=True)
    if not current_user.is_admin:
        allowed_for_manager = {
            "mandato_inicio",
            "mandato_fim",
            "leitura_individualizada_ativa",
            "sindico",
            "cpf_sindico",
        }
        attempted_to_edit = set(update_data.keys())
        not_allowed = attempted_to_edit - allowed_for_manager
        if not_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Permissao insuficiente para editar os campos: {', '.join(not_allowed)}. Contate o administrador.",
            )

    if current_user.is_admin and ("numero" in update_data or "cnpj" in update_data):
        duplicate_conditions = []
        if "numero" in update_data:
            duplicate_conditions.append(Condominio.numero == update_data["numero"])
        if "cnpj" in update_data:
            duplicate_conditions.append(_normalized_cnpj_column() == update_data["cnpj"])
        duplicate = await db.execute(
            select(Condominio).where(Condominio.id != id, or_(*duplicate_conditions))
        )
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Condominio com este CNPJ ou numero ja existe")

    for field, value in update_data.items():
        setattr(c, field, value)

    _add_audit_log(
        db,
        current_user,
        "alteracao",
        c.id,
        {"nome": c.nome, "numero": c.numero, "campos": list(update_data.keys())},
    )
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
        raise HTTPException(status_code=403, detail="Acesso negado a este condomÃ­nio")
    result = await db.execute(select(Condominio).where(Condominio.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="CondomÃ­nio nÃ£o encontrado")
    c.ativo = False
    
    # Audit Log
    log = AuditLog(
        usuario_id=current_user.id,
        usuario_nome=current_user.nome,
        usuario_email=current_user.email,
        acao="exclusao",
        entidade_tipo="condominio",
        entidade_id=c.id,
        detalhes={"nome": c.nome, "numero": c.numero}
    )
    db.add(log)
    
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
        raise HTTPException(status_code=403, detail="Acesso negado a este condomÃ­nio")
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Fetches list of invoices directly from the Condominio's Gmail label."""
    # 1. Obter CondomÃ­nio e ConcessionÃ¡ria
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)

    from app.models.concessionaria import Concessionaria as ConcModel
    res_conc = await db.execute(
        select(ConcModel).where(ConcModel.id == concessionaria_id)
    )
    conc = res_conc.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="ConcessionÃ¡ria nÃ£o encontrada")
    if conc.condominio_id != id:
        raise HTTPException(status_code=400, detail="ConcessionÃ¡ria nÃ£o pertence a este condomÃ­nio")

    # 2. Construir nome da Label (PadrÃ£o: Datacron/XXXX - Nome)
    numero_pad = str(condo.numero).zfill(4)
    label_name = f"Datacron/{numero_pad} - {condo.nome}"

    # 3. Chamar funÃ§Ã£o de busca IMAP
    from app.services.email_monitor import get_gmail_history
    history = get_gmail_history(label_name, conc.instalacao)
    return history


@router.get("/{id}/download/{file_type}")
async def download_condo_file(
    id: uuid.UUID,
    file_type: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Downloads a condo document (ATA, AVCB, or Seguro) from Base64."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    
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
        raise HTTPException(status_code=400, detail="Tipo de arquivo invÃ¡lido")
        
    if not b64_data:
        raise HTTPException(status_code=404, detail="Documento nÃ£o encontrado")

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
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Uploads and saves the ATA de EleiÃ§Ã£o in Base64 (max 10MB)."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF sÃ£o permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF nÃ£o pode exceder 10MB")

    # Save file to disk
    filename = f"ata_eleicao_{id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = await save_file(pdf_bytes, filename)

    def parse_date(d_str):
        if not d_str or d_str.strip() == "": return None
        try: return datetime.fromisoformat(d_str.replace('Z', '+00:00'))
        except: return None

    try:
        parsed_inicio = parse_date(data_inicio)
        parsed_fim = parse_date(data_fim)
        
        condo.ata_eleicao_url = file_path
        condo.ata_eleicao_nome = pdf_file.filename
        condo.ata_eleicao_inicio = parsed_inicio
        condo.ata_eleicao_fim = parsed_fim
        
        # Auto-preencher mandato
        condo.mandato_inicio = parsed_inicio
        condo.mandato_fim = parsed_fim

        _add_audit_log(
            db,
            current_user,
            "alteracao",
            condo.id,
            {"documento": "ata_eleicao", "arquivo": pdf_file.filename},
        )
        
        await db.commit()
        return {"mensagem": "ATA de EleiÃ§Ã£o salva com sucesso", "ata_eleicao_nome": pdf_file.filename}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar ATA: {str(e)}")


@router.get("/{id}/ata-eleicao")
async def get_ata_eleicao_url(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns the ATA de EleiÃ§Ã£o Base64 data (or proxy URL)."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    
    if not condo or not condo.ata_eleicao_url:
        raise HTTPException(status_code=404, detail="ATA nÃ£o encontrada")
        
    return {"url": condo.ata_eleicao_url, "filename": condo.ata_eleicao_nome}


@router.post("/{id}/avcb")
async def save_avcb(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    data_inicio: Optional[str] = Form(None),
    data_fim: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Uploads and saves the AVCB in Base64 (max 10MB)."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF sÃ£o permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF nÃ£o pode exceder 10MB")

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
        _add_audit_log(
            db,
            current_user,
            "alteracao",
            condo.id,
            {"documento": "avcb", "arquivo": pdf_file.filename},
        )
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns the AVCB Base64 data."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    if not condo or not condo.avcb_url:
        raise HTTPException(status_code=404, detail="AVCB nÃ£o encontrado")
    return {"url": condo.avcb_url}


@router.post("/{id}/apolice")
async def save_apolice(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    data_inicio: Optional[str] = Form(None),
    data_fim: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Uploads and saves the ApÃ³lice de Seguro in Base64 (max 10MB)."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF sÃ£o permitidos")

    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF nÃ£o pode exceder 10MB")

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
        _add_audit_log(
            db,
            current_user,
            "alteracao",
            condo.id,
            {"documento": "apolice", "arquivo": pdf_file.filename},
        )
        await db.commit()
        return {"mensagem": "ApÃ³lice salva com sucesso"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar ApÃ³lice: {str(e)}")


@router.get("/{id}/apolice")
async def get_apolice_url(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns the ApÃ³lice de Seguro Base64 data."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    if not condo or not condo.apolice_seguro_url:
        raise HTTPException(status_code=404, detail="ApÃ³lice nÃ£o encontrada")
    return {"url": condo.apolice_seguro_url}

@router.delete("/{id}/ata-eleicao", status_code=204)
async def delete_ata_eleicao(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exclui a ATA de EleiÃ§Ã£o do condomÃ­nio."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    
    condo.ata_eleicao_url = None
    condo.ata_eleicao_nome = None
    condo.ata_eleicao_inicio = None
    condo.ata_eleicao_fim = None
    _add_audit_log(db, current_user, "alteracao", condo.id, {"documento": "ata_eleicao", "acao": "remocao"})
    await db.commit()

@router.delete("/{id}/avcb", status_code=204)
async def delete_avcb(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exclui o AVCB do condomÃ­nio."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    
    condo.avcb_url = None
    condo.avcb_inicio = None
    condo.avcb_fim = None
    _add_audit_log(db, current_user, "alteracao", condo.id, {"documento": "avcb", "acao": "remocao"})
    await db.commit()

@router.delete("/{id}/apolice", status_code=204)
async def delete_apolice(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exclui a ApÃ³lice de Seguro do condomÃ­nio."""
    condo = await _get_condominio_or_404(db, id, allowed_condo_ids)
    
    condo.apolice_seguro_url = None
    condo.apolice_seguro_inicio = None
    condo.apolice_seguro_fim = None
    _add_audit_log(db, current_user, "alteracao", condo.id, {"documento": "apolice", "acao": "remocao"})
    await db.commit()
