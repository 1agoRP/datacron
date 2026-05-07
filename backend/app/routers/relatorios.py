from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date, datetime
import io
import pandas as pd

from app.database import get_db
from app.dependencies import get_current_user, require_module, get_user_condo_ids
from app.models.user import User
from app.models.relatorio import RelatorioGerado
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.schemas import RelatorioGeradoCreate, RelatorioGeradoResponse

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get("/historico", response_model=list[RelatorioGeradoResponse])
async def listar_historico(
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_module("relatorios")),
):
    """Returns the latest generated reports from the database."""
    stmt = (
        select(RelatorioGerado)
        .order_by(RelatorioGerado.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/registrar", response_model=RelatorioGeradoResponse, status_code=201)
async def registrar_relatorio(
    body: RelatorioGeradoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_module("relatorios")),
):
    """Records a new report generation event in the history."""
    relatorio = RelatorioGerado(
        nome=body.nome,
        tipo_relatorio=body.tipo_relatorio,
        formato=body.formato,
        usuario=current_user.nome,
    )
    db.add(relatorio)
    await db.commit()
    await db.refresh(relatorio)
    return relatorio


@router.get("/exportar")
async def exportar_dados(
    formato: str = Query("excel", enum=["excel", "csv", "pdf"]),
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Gera um arquivo (Excel/CSV/PDF) consolidando os dados de faturas processadas."""
    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria)
    ).order_by(Fatura.created_at.desc())

    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    
    if data_inicio:
        stmt = stmt.where(Fatura.vencimento >= data_inicio)
    if data_fim:
        stmt = stmt.where(Fatura.vencimento <= data_fim)

    result = await db.execute(stmt)
    faturas = result.scalars().all()

    if not faturas:
        raise HTTPException(status_code=404, detail="Nenhum dado encontrado para o período.")

    data = []
    for f in faturas:
        data.append({
            "Condominio": f.condominio.nome if f.condominio else "N/A",
            "CNPJ": f.condominio.cnpj if f.condominio else "N/A",
            "Concessionaria": f.concessionaria.tipo if f.concessionaria else "N/A",
            "Instalacao": f.concessionaria.instalacao if f.concessionaria else "N/A",
            "Referencia": f.referencia,
            "Vencimento": f.vencimento.strftime("%d/%m/%Y") if f.vencimento else "N/A",
            "Valor (R$)": float(f.valor) if f.valor else 0.0,
            "Status": f.status,
            "Data Recebimento": f.created_at.strftime("%d/%m/%Y %H:%M")
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()

    if formato == "csv":
        csv_data = df.to_csv(index=False, sep=";", encoding="utf-8-sig")
        return StreamingResponse(
            io.BytesIO(csv_data.encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=exportacao_datacron.csv"}
        )
    elif formato == "pdf":
        # Simplified PDF export using pandas to_html -> pdf if available, or just error for now
        # Actually I'll use the reportlab logic I found for the analitico for better quality
        raise HTTPException(status_code=400, detail="PDF export via general export is currently limited to Relatório Analítico.")
    else:
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Faturas")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=exportacao_datacron.xlsx"}
        )


@router.get("/relatorio-analitico/download")
async def download_relatorio_analitico(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Gera um PDF contendo uma apresentação analítica e dinâmica dos dados atuais."""
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from fastapi.concurrency import run_in_threadpool

    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria)
    )
    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
        
    result = await db.execute(stmt)
    faturas = result.scalars().all()
    
    if not faturas:
        raise HTTPException(status_code=404, detail="Não há faturas para compilar no relatório.")
        
    total_faturas = len(faturas)
    valor_total = sum(float(f.valor) for f in faturas if f.valor)
    valor_medio = valor_total / total_faturas if total_faturas > 0 else 0
    
    # Statistics
    condos = {}
    concessionarias = {}
    status_counts = {"pendente": 0, "processada": 0, "erro": 0, "revisao": 0}
    hoje = datetime.now().date()
    
    for f in faturas:
        if f.status in status_counts:
            status_counts[f.status] += 1
        
        c_nome = f.condominio.nome if f.condominio else "Desconhecido"
        if c_nome not in condos:
            condos[c_nome] = {"count": 0, "valor": 0}
        condos[c_nome]["count"] += 1
        condos[c_nome]["valor"] += float(f.valor or 0)
        
        conc_nome = f.concessionaria.tipo if f.concessionaria else "Outra"
        if conc_nome not in concessionarias:
            concessionarias[conc_nome] = {"count": 0, "valor": 0}
        concessionarias[conc_nome]["count"] += 1
        concessionarias[conc_nome]["valor"] += float(f.valor or 0)

    def _build_relatorio_pdf():
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(letter), rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(name="TitleStyle", parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor("#1e3a8a"), alignment=1, spaceAfter=20)
        sub_style = ParagraphStyle(name="SubStyle", parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor("#334155"), spaceAfter=15, spaceBefore=20)
        normal_style = ParagraphStyle(name="NormalStyle", parent=styles['Normal'], fontSize=12, textColor=colors.black, spaceAfter=10, leading=16)
        
        Story = []
        Story.append(Paragraph(f"<b>Apresentação Analítica: Performance e Gestão (Até {hoje.strftime('%d/%m/%Y')})</b>", title_style))
        Story.append(Paragraph("Este documento consolida em tempo real todas as informações de leitura óptica das faturas.", normal_style))
        
        # Table 1: Summary
        summary_data = [
            ["Total de Contas", "Valor Total Mapeado", "Ticket Médio", "Status Processadas"],
            [f"{total_faturas}", f"R$ {valor_total:,.2f}", f"R$ {valor_medio:,.2f}", f"{status_counts['processada']}"]
        ]
        t_summary = Table(summary_data, colWidths=[180]*4)
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 0.25, colors.lightgrey),
        ]))
        Story.append(t_summary)
        
        # Table 2: Condos
        Story.append(Paragraph("<b>Distribuição por Condomínio</b>", sub_style))
        condo_data = [["Condomínio", "Volume", "Participação (%)", "Gasto Total"]]
        for c_nome, dados in sorted(condos.items(), key=lambda x: x[1]['count'], reverse=True)[:10]: # Top 10
            perc = (dados['count'] / total_faturas) * 100
            condo_data.append([c_nome, str(dados['count']), f"{perc:.1f}%", f"R$ {dados['valor']:,.2f}"])
            
        t_condos = Table(condo_data, colWidths=[250, 100, 150, 150])
        t_condos.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2563eb")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
        ]))
        Story.append(t_condos)

        doc.build(Story)
        output.seek(0)
        return output

    output = await run_in_threadpool(_build_relatorio_pdf)
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio_analitico.pdf"},
    )


@router.post("/download-lote")
async def download_lote(
    ids: list[str],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Gera um arquivo ZIP contendo os PDFs das faturas selecionadas."""
    import zipfile
    import base64
    from app.storage import get_file_content

    stmt = select(Fatura).where(Fatura.id.in_(ids))
    result = await db.execute(stmt)
    faturas = result.scalars().all()

    if not faturas:
        raise HTTPException(status_code=404, detail="Nenhuma fatura encontrada")

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zip_file:
        for f in faturas:
            pdf_data = None
            # Try Supabase Storage first
            if f.storage_path:
                try:
                    pdf_data = await get_file_content(f.storage_path)
                except:
                    pdf_data = None
            
            # Fallback to legacy base64 if needed
            if not pdf_data and f.pdf_base64:
                try:
                    pdf_data = base64.b64decode(f.pdf_base64)
                except:
                    pass
            
            if pdf_data:
                filename = f.pdf_nome_original or f"fatura_{f.id}.pdf"
                zip_file.writestr(filename, pdf_data)
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=faturas_datacron.zip"},
    )


@router.get("/faturas/{id}/pdf")
async def download_fatura_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Serves the PDF for download. Priority: Supabase Storage → legacy base64 → local file."""
    import os
    import base64
    from app.storage import get_file_content

    result = await db.execute(select(Fatura).where(Fatura.id == id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    filename = f.pdf_nome_original or f"fatura_{id}.pdf"

    # 1. Try Supabase Storage first
    if f.storage_path:
        try:
            content = await get_file_content(f.storage_path)
            return StreamingResponse(
                io.BytesIO(content),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        except Exception as e:
            # Fall through to legacy methods if storage fails
            pass

    # 2. Try base64 from database
    if f.pdf_base64:
        try:
            pdf_data = base64.b64decode(f.pdf_base64)
            return StreamingResponse(
                io.BytesIO(pdf_data),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        except Exception as e:
            pass

    # 3. Fallback to local file on disk
    if f.pdf_path and os.path.exists(f.pdf_path):
        def file_iterator(path: str):
            with open(path, "rb") as file:
                while chunk := file.read(8192):
                    yield chunk

        return StreamingResponse(
            file_iterator(f.pdf_path),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    raise HTTPException(status_code=404, detail="PDF não encontrado para esta fatura")
