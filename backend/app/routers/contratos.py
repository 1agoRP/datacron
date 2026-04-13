import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids
from app.models.user import User
from app.models.contrato import Contrato
from app.models.condominio import Condominio
from app.schemas import ContratoCreate, ContratoUpdate, ContratoResponse
from app.services.contract_processor import extract_contract_data
from app.storage import save_file, get_file_content

router = APIRouter(prefix="/contratos", tags=["Contratos"])

@router.get("/tipos")
async def get_unique_contract_types(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns a unique list of contract types already in the database."""
    # Get types and personalized types
    stmt = select(Contrato.tipo_contrato).distinct()
    result = await db.execute(stmt)
    types = result.scalars().all()

    stmt_p = select(Contrato.tipo_personalizado).distinct().where(Contrato.tipo_personalizado.isnot(None))
    result_p = await db.execute(stmt_p)
    p_types = result_p.scalars().all()

    # Combine and clean
    all_types = set(types) | set(p_types)
    
    # Defined defaults if some are missing
    defaults = {"Elevadores", "Bombas", "Gerador", "Limpeza", "Portaria", "CFTV/Portões/Interfone", "Segurança", "Jardim", "Piscina", "Controle de Acesso", "Outros"}
    final_list = sorted(list(all_types | defaults))
    # Remove "Outros" from the main list if we want it to be separate or just keep it
    return final_list


def _compute_status(data_fim: Optional[date]) -> str:
    """Compute contract status based on end date."""
    if data_fim is None:
        return "ativo"
    today = date.today()
    if data_fim < today:
        return "vencido"
    if (data_fim - today).days <= 60:
        return "a_vencer"
    return "ativo"


@router.get("/stats")
async def contratos_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Returns KPI stats for contracts using SQL aggregation (no full table load)."""
    today = date.today()
    sixty_days = today.replace(day=1)  # approximate
    from datetime import timedelta
    sixty_days_from_now = today + timedelta(days=60)

    stmt = select(
        func.count(Contrato.id).label("total"),
        func.count(
            case(
                (or_(Contrato.data_fim.is_(None), Contrato.data_fim >= sixty_days_from_now), Contrato.id),
                else_=None,
            )
        ).label("ativos"),
        func.count(
            case(
                (Contrato.data_fim.isnot(None) & (Contrato.data_fim >= today) & (Contrato.data_fim < sixty_days_from_now), Contrato.id),
                else_=None,
            )
        ).label("a_vencer"),
        func.count(
            case(
                (Contrato.data_fim.isnot(None) & (Contrato.data_fim < today), Contrato.id),
                else_=None,
            )
        ).label("vencidos"),
    )
    if allowed_condo_ids is not None:
        stmt = stmt.where(Contrato.condominio_id.in_(allowed_condo_ids))

    result = await db.execute(stmt)
    row = result.one()

    return {
        "total": row.total,
        "ativos": row.ativos,
        "a_vencer": row.a_vencer,
        "vencidos": row.vencidos,
    }


@router.get("/", response_model=list[ContratoResponse])
async def list_contratos(
    condominio_id: Optional[uuid.UUID] = None,
    tipo_contrato: Optional[str] = None,
    status: Optional[str] = None,
    empresa: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.condominio))
        .join(Condominio, Contrato.condominio_id == Condominio.id)
    )
    # RBAC: filter by user's assigned condominios
    if allowed_condo_ids is not None:
        stmt = stmt.where(Contrato.condominio_id.in_(allowed_condo_ids))

    if condominio_id:
        stmt = stmt.where(Contrato.condominio_id == condominio_id)
    if tipo_contrato:
        stmt = stmt.where(Contrato.tipo_contrato == tipo_contrato)
    if empresa:
        stmt = stmt.where(Contrato.empresa.ilike(f"%{empresa}%"))
    if search:
        q = f"%{search}%"
        stmt = stmt.where(
            or_(
                Contrato.empresa.ilike(q),
                Contrato.tipo_contrato.ilike(q),
                Condominio.nome.ilike(q),
            )
        )

    result = await db.execute(stmt.order_by(Contrato.created_at.desc()))
    contratos = result.scalars().all()

    # Filter by computed status if needed
    if status:
        contratos = [c for c in contratos if c.status == status]

    # Enrich with condominio name (now loaded via selectinload — no N+1)
    responses = []
    for c in contratos:
        resp = ContratoResponse.model_validate(c)
        resp.status = c.status
        resp.condominio_nome = c.condominio.nome if c.condominio else None
        responses.append(resp)

    return responses


@router.post("/", response_model=ContratoResponse, status_code=201)
async def create_contrato(
    body: ContratoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
):
    # Validate condominio exists
    result = await db.execute(select(Condominio).where(Condominio.id == body.condominio_id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    data = body.model_dump()
    data["created_by_id"] = current_user.id
    contrato = Contrato(**data)
    db.add(contrato)
    await db.commit()
    await db.refresh(contrato)

    resp = ContratoResponse.model_validate(contrato)
    resp.status = contrato.status
    resp.condominio_nome = condo.nome
    return resp


@router.get("/{id}", response_model=ContratoResponse)
async def get_contrato(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Contrato).where(Contrato.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este contrato")

    condo_result = await db.execute(select(Condominio.nome).where(Condominio.id == c.condominio_id))
    condo_nome = condo_result.scalar_one_or_none()

    resp = ContratoResponse.model_validate(c)
    resp.status = c.status
    resp.condominio_nome = condo_nome
    return resp


@router.put("/{id}", response_model=ContratoResponse)
async def update_contrato(
    id: uuid.UUID,
    body: ContratoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Contrato).where(Contrato.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este contrato")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    await db.commit()
    await db.refresh(c)

    condo_result = await db.execute(select(Condominio.nome).where(Condominio.id == c.condominio_id))
    condo_nome = condo_result.scalar_one_or_none()

    resp = ContratoResponse.model_validate(c)
    resp.status = c.status
    resp.condominio_nome = condo_nome
    return resp


@router.delete("/{id}", status_code=204)
async def delete_contrato(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Contrato).where(Contrato.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    
    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este contrato")
    await db.delete(c)
    await db.commit()


@router.post("/upload-pdf")
async def upload_contract_pdf(
    pdf_file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a contract PDF and extract data using AI/heuristics."""
    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF são permitidos")
    pdf_bytes = await pdf_file.read()
    extracted = extract_contract_data(pdf_bytes)
    return {"campos": extracted}


@router.post("/{id}/arquivo")
async def upload_contrato_arquivo(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
):
    """Upload and save the contract PDF file."""
    result = await db.execute(select(Contrato).where(Contrato.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="O anexo deve ser um arquivo PDF")

    import base64
    from app.models.contract_file import ContractFile

    pdf_bytes = await pdf_file.read()
    b64_data = base64.b64encode(pdf_bytes).decode('utf-8')

    cf = ContractFile(
        contract_id=id,
        file_name=pdf_file.filename or 'contrato.pdf',
        file_type="application/pdf",
        file_base64=b64_data
    )
    db.add(cf)

    c.arquivo_path = "base64"
    await db.commit()
    await db.refresh(c)

    return {"arquivo_path": c.arquivo_path, "mensagem": "Arquivo salvo com sucesso no banco em Base64"}


@router.get("/{id}/arquivo")
async def download_contrato_arquivo(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Download the contract PDF file."""
    import io
    import base64
    from app.models.contract_file import ContractFile

    # Check for new base64 storage first
    result_cf = await db.execute(
        select(ContractFile)
        .where(ContractFile.contract_id == id)
        .order_by(ContractFile.created_at.desc())
        .limit(1)
    )
    cf = result_cf.scalar_one_or_none()

    if cf:
        pdf_bytes = base64.b64decode(cf.file_base64)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{cf.file_name}"'},
        )

    # Fallback to old storage
    result = await db.execute(select(Contrato).where(Contrato.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if not c.arquivo_path or c.arquivo_path == "base64":
        raise HTTPException(status_code=404, detail="Nenhum arquivo associado a este contrato")

    content = await get_file_content(c.arquivo_path)
    if content is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no armazenamento")

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contrato_{id}.pdf"},
    )
