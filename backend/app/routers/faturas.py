import uuid
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.fatura import Fatura
from app.schemas import FaturaCreate, FaturaStatusUpdate, FaturaResponse

router = APIRouter(prefix="/faturas", tags=["Faturas"])

VALID_STATUSES = {"pendente", "processada", "erro", "revisao"}


@router.get("/", response_model=list[FaturaResponse])
async def list_faturas(
    condominio_id: Optional[uuid.UUID] = None,
    concessionaria_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    referencia: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria),
    )
    if condominio_id:
        stmt = stmt.where(Fatura.condominio_id == condominio_id)
    if concessionaria_id:
        stmt = stmt.where(Fatura.concessionaria_id == concessionaria_id)
    if status:
        stmt = stmt.where(Fatura.status == status)
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)

    stmt = stmt.order_by(Fatura.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/exportar")
async def export_faturas(
    referencia: Optional[str] = None,
    condominio_id: Optional[uuid.UUID] = None,
    formato: str = Query("excel", pattern="^(excel|csv|pdf)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exports faturas as Excel, CSV or PDF."""
    import openpyxl
    import csv

    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria),
    )
    if condominio_id:
        stmt = stmt.where(Fatura.condominio_id == condominio_id)
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)

    result = await db.execute(stmt.order_by(Fatura.created_at.desc()))
    faturas = result.scalars().all()

    headers = ["Condomínio", "Nº", "Concessionária", "Referência", "Vencimento", "Valor", "Status"]
    rows = [
        [
            f.condominio.nome if f.condominio else "",
            f.condominio.numero if f.condominio else "",
            f.concessionaria.tipo if f.concessionaria else "",
            f.referencia,
            str(f.vencimento) if f.vencimento else "",
            f.valor,
            f.status,
        ]
        for f in faturas
    ]

    if formato == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Faturas"
        ws.append(headers)
        for row in rows:
            ws.append(row)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"faturas_{referencia or 'todos'}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    elif formato == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=faturas.csv"},
        )
    else:  # pdf
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
        
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(letter))
        elements = []
        data = [headers] + rows
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        elements.append(t)
        doc.build(elements)
        output.seek(0)
        filename = f"faturas_{referencia or 'todos'}.pdf"
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@router.get("/{id}", response_model=FaturaResponse)
async def get_fatura(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Fatura).where(Fatura.id == id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    return f


@router.get("/{id}/pdf")
async def download_fatura_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Serves the processed (unlocked) PDF for download."""
    import os

    result = await db.execute(select(Fatura).where(Fatura.id == id))
    f = result.scalar_one_or_none()
    if not f or not f.pdf_path:
        raise HTTPException(status_code=404, detail="PDF não encontrado para esta fatura")

    if not os.path.exists(f.pdf_path):
        raise HTTPException(status_code=404, detail="Arquivo PDF não encontrado no servidor")

    def file_iterator(path: str):
        with open(path, "rb") as file:
            while chunk := file.read(8192):
                yield chunk

    filename = f.pdf_nome_original or f"fatura_{id}.pdf"
    return StreamingResponse(
        file_iterator(f.pdf_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.put("/{id}/status", response_model=FaturaResponse)
async def update_fatura_status(
    id: uuid.UUID,
    body: FaturaStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Status inválido. Use: {VALID_STATUSES}")

    result = await db.execute(select(Fatura).where(Fatura.id == id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    f.status = body.status
    await db.commit()
    await db.refresh(f)
    return f
