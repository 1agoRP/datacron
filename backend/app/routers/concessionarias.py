import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids, require_role
from app.models.user import User
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.models.reajuste_concessionaria import ReajusteConcessionaria
from app.schemas import (
    ConcessionariaCreate, ConcessionariaUpdate, ConcessionariaResponse,
    ReajusteConcessionariaCreate, ReajusteConcessionariaResponse
)
from app.services.pdf_processor import test_pdf_password, extract_data
from app.storage import save_file, get_file_content
import base64
import io
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/concessionarias", tags=["Concessionárias"])


@router.get("", response_model=list[ConcessionariaResponse])
async def list_concessionarias(
    condominio_id: Optional[uuid.UUID] = None,
    tipo: Optional[str] = None,
    ativo: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = (
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.ativo == ativo)
    )
    if condominio_id:
        stmt = stmt.where(Concessionaria.condominio_id == condominio_id)
    if tipo:
        stmt = stmt.where(Concessionaria.tipo == tipo)
    # RBAC: filter by user's assigned condominios
    if allowed_condo_ids is not None:
        stmt = stmt.where(Concessionaria.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt.order_by(Concessionaria.tipo))
    return result.scalars().all()


@router.post("", response_model=ConcessionariaResponse, status_code=201)
async def create_concessionaria(
    body: ConcessionariaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
):
    # Validate condominio exists and capture it
    result = await db.execute(select(Condominio).where(Condominio.id == body.condominio_id))
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    # Create concessionaria
    conc = Concessionaria(
        **body.model_dump(),
        created_by_id=current_user.id
    )
    db.add(conc)
    await db.commit()
    await db.refresh(conc)
    
    # Reload with condominio for response
    conc.condominio = condo
    return conc


@router.get("/{id}", response_model=ConcessionariaResponse)
async def get_concessionaria(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.id == id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")
    
    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a esta concessionária")
    
    return c


@router.put("/{id}", response_model=ConcessionariaResponse)
async def update_concessionaria(
    id: uuid.UUID,
    body: ConcessionariaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.id == id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")

    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a esta concessionária")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
        
    await db.commit()
    await db.refresh(c)
    
    # Ensure relationship is loaded for return
    condo_result = await db.execute(select(Condominio).where(Condominio.id == c.condominio_id))
    c.condominio = condo_result.scalar_one_or_none()
    return c


@router.delete("/{id}", status_code=204)
async def delete_concessionaria(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")
    
    # RBAC Check
    if allowed_condo_ids is not None and c.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a esta concessionária")
    c.ativo = False
    await db.commit()


@router.post("/{id}/testar-senha")
async def test_password_rule(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Tests the password rule against an uploaded PDF."""
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")

    # RBAC Check
    if allowed_condo_ids is not None and conc.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a esta concessionária")

    # Get condominio CNPJ
    condo_result = await db.execute(select(Condominio).where(Condominio.id == conc.condominio_id))
    condo = condo_result.scalar_one_or_none()

    password = conc.gerar_senha_pdf(condo.cnpj_digits if condo else "")
    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")

    success = test_pdf_password(pdf_bytes, password)
    return {
        "senha_testada": password,
        "regra": conc.regra_senha,
        "sucesso": success,
        "mensagem": "PDF desbloqueado com sucesso" if success else "Senha incorreta — verifique a regra configurada",
    }


@router.post("/extrair-dados")
async def extrair_dados_fatura(
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Parses an uploaded PDF invoice to suggest fields for the concessionária."""
    pdf_bytes = await pdf_file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")
    extracted = extract_data(pdf_bytes)

    full_text = extracted.get("texto_completo", "").upper()
    tipo = "Outros"
    if "ENEL" in full_text or "ELETROPAULO" in full_text:
        tipo = "Enel"
    elif "SABESP" in full_text:
        tipo = "Sabesp"
    elif "COMGÁS" in full_text or "COMGAS" in full_text:
        tipo = "Comgás"

    dia_vencimento = 10
    venc_date = extracted.get("vencimento")
    if venc_date:
        try:
            # Assuming format 'YYYY-MM-DD' returned by extract_data
            if "-" in venc_date:
                dia_vencimento = int(venc_date.split("-")[2][:2])
        except Exception:
            pass

    return {
        "tipo": tipo,
        "instalacao": extracted.get("numero_instalacao") or "",
        "dia_vencimento": dia_vencimento,
        "valor_medio": extracted.get("valor") or 0.0,
        "raw_data": extracted,
    }

@router.post("/reajuste", response_model=ReajusteConcessionariaResponse, status_code=201)
async def aplicar_reajuste(
    tipo_concessionaria: str = Form(...),
    percentual: float = Form(...),
    mes_aplicacao: str = Form(...),
    pdf_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Applies a rate percentage increase to all concessionárias of a given type."""
    
    # 1. Fetch all concessionarias of this type
    result = await db.execute(select(Concessionaria).where(Concessionaria.tipo == tipo_concessionaria))
    concs = result.scalars().all()
    
    # 2. Update their valor_medio
    for c in concs:
        # Increase by percentage
        if c.valor_medio:
            c.valor_medio = c.valor_medio * (1 + (percentual / 100.0))
            
    # 3. Handle PDF upload
    pdf_path = None
    pdf_name = None
    if pdf_file:
        pdf_bytes = await pdf_file.read()
        
        # 10MB limit
        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="O arquivo PDF não pode exceder 10MB")
            
        filename = f"reajuste_{tipo_concessionaria}_{mes_aplicacao}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = await save_file(pdf_bytes, filename)
        pdf_name = pdf_file.filename
        
    # 4. Create Reajuste record
    reajuste = ReajusteConcessionaria(
        tipo_concessionaria=tipo_concessionaria,
        percentual=percentual,
        mes_aplicacao=mes_aplicacao,
        storage_path=pdf_path,
        documento_nome=pdf_name,
        aplicado_por=user.nome,
        registros_afetados=len(concs)
    )
    
    db.add(reajuste)
    await db.commit()
    await db.refresh(reajuste)
    return reajuste


@router.get("/reajustes/{id}/documento")
async def download_reajuste_documento(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Downloads the attached PDF document."""
    result = await db.execute(select(ReajusteConcessionaria).where(ReajusteConcessionaria.id == id))
    r = result.scalar_one_or_none()
    
    if not r:
        raise HTTPException(status_code=404, detail="Reajuste não encontrado")
        
    filename = r.documento_nome or f"reajuste_{id}.pdf"

    # 1. Try storage path
    if r.storage_path:
        import os
        from app.storage import LOCAL_STORAGE_DIR
        
        path = r.storage_path
        if os.path.exists(path):
            def file_iterator(p: str):
                with open(p, "rb") as f:
                    while chunk := f.read(8192):
                        yield chunk
            return StreamingResponse(
                file_iterator(path),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        # Try relative
        rel_path = os.path.join(LOCAL_STORAGE_DIR, os.path.basename(path))
        if os.path.exists(rel_path):
            def file_iterator(p: str):
                with open(p, "rb") as f:
                    while chunk := f.read(8192):
                        yield chunk
            return StreamingResponse(
                file_iterator(rel_path),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

    # 2. Fallback to legacy base64
    if r.documento_base64:
        try:
            pdf_bytes = base64.b64decode(r.documento_base64)
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        except Exception as e:
            logger.error(f"Base64 decode failed for reajuste {id}: {e}")

    raise HTTPException(status_code=404, detail="Documento não encontrado")


@router.get("/reajustes/historico", response_model=list[ReajusteConcessionariaResponse])
async def listar_reajustes(
    tipo_concessionaria: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lists history of applied rate adjustments."""
    stmt = select(ReajusteConcessionaria)
    if tipo_concessionaria:
        stmt = stmt.where(ReajusteConcessionaria.tipo_concessionaria == tipo_concessionaria)
    stmt = stmt.order_by(ReajusteConcessionaria.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()
