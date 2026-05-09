import uuid
import base64
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File as FastAPIFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids
from app.models.user import User
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.schemas import FaturaResponse


router = APIRouter(prefix="/faturas", tags=["Faturas"])


@router.post("/manual", response_model=FaturaResponse)
async def create_fatura_manual(
    condominio_id: uuid.UUID = Form(...),
    concessionaria_id: uuid.UUID = Form(...),
    valor: float = Form(...),
    vencimento: date = Form(...),
    referencia: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = FastAPIFile(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Cria manualmente uma fatura para uma concessionária, opcionalmente com PDF."""

    # Verify access to the condominio
    if allowed_condo_ids is not None and condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # Verify condominio exists
    result = await db.execute(
        select(Condominio).where(Condominio.id == condominio_id)
    )
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    # Verify concessionaria exists and belongs to the condominio
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.id == concessionaria_id,
            Concessionaria.condominio_id == condominio_id,
        )
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(
            status_code=404,
            detail="Concessionária não encontrada ou não pertence a este condomínio",
        )

    # Generate reference if not provided (e.g., "Maio/2026")
    if not referencia:
        mes_nome = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
        ]
        mes = vencimento.month
        ano = vencimento.year
        referencia = f"{mes_nome[mes - 1]}/{ano}"

    # Check for existing duplicate in Fatura or HistoricoFatura
    # We join with Concessionaria to ensure the same 'instalacao' is checked, as requested by the user.
    from app.models.concessionaria import Concessionaria as ConcModel
    from app.models.historico_fatura import HistoricoFatura

    async def check_duplicate(model):
        stmt = select(model).join(ConcModel, model.concessionaria_id == ConcModel.id).where(
            model.condominio_id == condominio_id,
            ConcModel.instalacao == conc.instalacao,
            model.valor == valor,
            model.vencimento == vencimento
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    if await check_duplicate(Fatura) or await check_duplicate(HistoricoFatura):
        raise HTTPException(
            status_code=400,
            detail=f"Erro: Já existe uma fatura idêntica (Valor: R$ {valor}, Vencimento: {vencimento}, UC: {conc.instalacao}) registrada no sistema ou no histórico."
        )

    # Handle PDF upload
    pdf_base64 = None
    pdf_nome_original = None
    pdf_desbloqueado = False
    if pdf_file and pdf_file.filename:
        content = await pdf_file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="Arquivo PDF muito grande (máx. 10MB)")
        pdf_base64 = base64.b64encode(content).decode("utf-8")
        pdf_nome_original = pdf_file.filename
        pdf_desbloqueado = True

    # Create the fatura
    nova_fatura = Fatura(
        condominio_id=condominio_id,
        concessionaria_id=concessionaria_id,
        valor=valor,
        vencimento=vencimento,
        referencia=referencia,
        status="pendente",
        email_remetente=f"Manual - {user.email}",
        email_assunto=f"Entrada manual por {user.nome}",
        pdf_base64=pdf_base64,
        pdf_nome_original=pdf_nome_original,
        pdf_desbloqueado=pdf_desbloqueado,
    )

    db.add(nova_fatura)
    await db.commit()
    await db.refresh(nova_fatura)

    # Attach relationships for response
    nova_fatura.condominio = condo
    nova_fatura.concessionaria = conc

    return FaturaResponse.model_validate(nova_fatura)


@router.delete("/{fatura_id}")
async def delete_fatura(
    fatura_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exclui uma fatura. Apenas usuários admin, assistente ou gerencia podem excluir."""
    if user.role not in ["admin", "assistente", "gerencia"]:
        raise HTTPException(status_code=403, detail="Acesso negado para excluir faturas")

    result = await db.execute(select(Fatura).where(Fatura.id == fatura_id))
    fatura = result.scalar_one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    # Verify access to the condominio
    if allowed_condo_ids is not None and fatura.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # Set references to NULL before deleting to avoid FK violation (FK alertas.fatura_id, email_logs.fatura_id)
    from app.models.alerta import Alerta, EmailLog
    await db.execute(update(Alerta).where(Alerta.fatura_id == fatura_id).values(fatura_id=None))
    await db.execute(update(EmailLog).where(EmailLog.fatura_id == fatura_id).values(fatura_id=None))

    await db.delete(fatura)
    await db.commit()
    return {"message": "Fatura excluída com sucesso"}
