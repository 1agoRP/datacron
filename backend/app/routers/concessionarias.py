import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.schemas import ConcessionariaCreate, ConcessionariaUpdate, ConcessionariaResponse
from app.services.pdf_processor import test_pdf_password, extract_data

router = APIRouter(prefix="/concessionarias", tags=["Concessionárias"])


@router.get("/", response_model=list[ConcessionariaResponse])
async def list_concessionarias(
    condominio_id: Optional[uuid.UUID] = None,
    tipo: Optional[str] = None,
    ativo: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Concessionaria).where(Concessionaria.ativo == ativo)
    if condominio_id:
        stmt = stmt.where(Concessionaria.condominio_id == condominio_id)
    if tipo:
        stmt = stmt.where(Concessionaria.tipo == tipo)
    result = await db.execute(stmt.order_by(Concessionaria.tipo))
    return result.scalars().all()


@router.post("/", response_model=ConcessionariaResponse, status_code=201)
async def create_concessionaria(
    body: ConcessionariaCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Validate condominio exists
    result = await db.execute(select(Condominio).where(Condominio.id == body.condominio_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    conc = Concessionaria(**body.model_dump())
    db.add(conc)
    await db.commit()
    await db.refresh(conc)
    return conc


@router.get("/{id}", response_model=ConcessionariaResponse)
async def get_concessionaria(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")
    return c


@router.put("/{id}", response_model=ConcessionariaResponse)
async def update_concessionaria(
    id: uuid.UUID,
    body: ConcessionariaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{id}", status_code=204)
async def delete_concessionaria(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")
    c.ativo = False
    await db.commit()


@router.post("/{id}/testar-senha")
async def test_password_rule(
    id: uuid.UUID,
    pdf_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tests the password rule against an uploaded PDF."""
    result = await db.execute(select(Concessionaria).where(Concessionaria.id == id))
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concessionária não encontrada")

    # Get condominio CNPJ
    condo_result = await db.execute(select(Condominio).where(Condominio.id == conc.condominio_id))
    condo = condo_result.scalar_one_or_none()

    password = conc.gerar_senha_pdf(condo.cnpj_digits if condo else "")
    pdf_bytes = await pdf_file.read()

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
