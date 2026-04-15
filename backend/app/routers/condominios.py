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


@router.get("/", response_model=list[CondominioResponse])
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
    from sqlalchemy import text

    # Build filter conditions for the raw SQL
    where_clauses = ["c.ativo = :ativo"]
    params: dict = {"ativo": ativo, "skip": skip, "limit": limit}

    if allowed_condo_ids is not None:
        # Convert UUIDs to strings for the SQL IN clause
        if not allowed_condo_ids:
            return []  # No access to any condo
        params["condo_ids"] = [str(cid) for cid in allowed_condo_ids]
        where_clauses.append("c.id = ANY(:condo_ids::uuid[])")

    if search:
        safe = _escape_like(search)
        params["search"] = f"%{safe}%"
        where_clauses.append(
            "(c.nome ILIKE :search OR c.numero ILIKE :search OR c.cnpj ILIKE :search)"
        )

    now = datetime.now()
    params["year"] = now.year
    params["month"] = now.month

    where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT
            c.id, c.nome, c.numero, c.endereco, c.cnpj,
            c.sindico, c.cpf_sindico,
            c.ata_eleicao_nome,
            c.mandato_inicio, c.mandato_fim,
            c.leitura_individualizada_ativa, c.ativo,
            c.created_at, c.updated_at,
            COALESCE(cv.total, 0) AS contas_esperadas,
            COALESCE(fv.total, 0) AS contas_recebidas
        FROM condominios c
        LEFT JOIN (
            SELECT condominio_id, COUNT(id) AS total
            FROM concessionarias_vinculadas
            WHERE ativo = true
            GROUP BY condominio_id
        ) cv ON cv.condominio_id = c.id
        LEFT JOIN (
            SELECT condominio_id, COUNT(id) AS total
            FROM faturas
            WHERE EXTRACT(year FROM created_at) = :year
              AND EXTRACT(month FROM created_at) = :month
            GROUP BY condominio_id
        ) fv ON fv.condominio_id = c.id
        WHERE {where_sql}
        ORDER BY c.nome
        LIMIT :limit OFFSET :skip
    """)

    result = await db.execute(sql, params)
    rows = result.mappings().all()

    responses = []
    for row in rows:
        resp = CondominioResponse(
            id=row["id"],
            nome=row["nome"],
            numero=row["numero"],
            endereco=row["endereco"],
            cnpj=row["cnpj"],
            sindico=row["sindico"],
            cpf_sindico=row["cpf_sindico"],
            ata_eleicao_nome=row["ata_eleicao_nome"],
            mandato_inicio=row["mandato_inicio"],
            mandato_fim=row["mandato_fim"],
            leitura_individualizada_ativa=row["leitura_individualizada_ativa"],
            ativo=row["ativo"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            contas_esperadas=row["contas_esperadas"],
            contas_recebidas=row["contas_recebidas"],
        )
        responses.append(resp)
    return responses



@router.post("/", response_model=CondominioResponse, status_code=201)
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
        restricted = {"nome", "endereco", "cnpj", "numero", "ativo"}
        attempted_restricted = set(update_data.keys()) & restricted
        if attempted_restricted:
            raise HTTPException(
                status_code=403, 
                detail=f"Permissão insuficiente para editar os campos: {', '.join(attempted_restricted)}. Contate o administrador."
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
