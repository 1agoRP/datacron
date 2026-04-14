import uuid
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids
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
    limit: int = Query(500, le=2000),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
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
    # RBAC: filter by user's assigned condominios
    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))

    stmt = stmt.order_by(Fatura.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/exportar")
async def export_faturas(
    referencia: Optional[str] = None,
    condominio_id: Optional[uuid.UUID] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    formato: str = Query("excel", pattern="^(excel|csv|pdf)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exports faturas as Excel, CSV or PDF."""
    import openpyxl
    import csv
    from datetime import datetime as dt

    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria),
    )
    if condominio_id:
        stmt = stmt.where(Fatura.condominio_id == condominio_id)
    if referencia:
        stmt = stmt.where(Fatura.referencia == referencia)
    if data_inicio:
        try:
            inicio = dt.strptime(data_inicio, "%Y-%m-%d")
            stmt = stmt.where(Fatura.created_at >= inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            fim = dt.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            stmt = stmt.where(Fatura.created_at <= fim)
        except ValueError:
            pass

    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))

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
        from fastapi.concurrency import run_in_threadpool
        
        def _build_faturas_pdf():
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
            return output

        output = await run_in_threadpool(_build_faturas_pdf)
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
    _: User = Depends(require_write()),
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

@router.get("/relatorio-analitico/download")
async def download_relatorio_analitico(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Gera um PDF contendo uma apresentação analítica e dinâmica dos dados atuais."""
    import io
    from sqlalchemy.sql import func
    from datetime import datetime
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    
    # 1. Obter todos os dados do BD até aquele momento
    stmt = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria)
    )
    result = await db.execute(stmt)
    faturas = result.scalars().all()
    
    if not faturas:
        raise HTTPException(status_code=404, detail="Não há faturas para compilar no relatório.")
        
    total_faturas = len(faturas)
    valor_total = sum(f.valor for f in faturas if f.valor)
    valor_medio = valor_total / total_faturas
    
    # Estatísticas por condomínio
    condos = {}
    concessionarias = {}
    status_counts = {"pendente": 0, "processada": 0, "erro": 0, "revisao": 0}
    
    # Dias médios até vencimento (aproximado, avaliando apenas boletos que possuem data)
    hoje = datetime.now().date()
    soma_dias_vencimento = 0
    faturas_com_vencimento = 0
    
    for f in faturas:
        if f.status in status_counts:
            status_counts[f.status] += 1
            
        c_nome = f.condominio.nome if f.condominio else "Desconhecido"
        if c_nome not in condos:
            condos[c_nome] = {"count": 0, "valor": 0}
        condos[c_nome]["count"] += 1
        condos[c_nome]["valor"] += (f.valor or 0)
        
        conc_nome = f.concessionaria.tipo if f.concessionaria else "Outra"
        if conc_nome not in concessionarias:
            concessionarias[conc_nome] = {"count": 0, "valor": 0}
        concessionarias[conc_nome]["count"] += 1
        concessionarias[conc_nome]["valor"] += (f.valor or 0)
        
        if f.vencimento:
            delta = (f.vencimento - hoje).days
            soma_dias_vencimento += delta
            faturas_com_vencimento += 1
            
    vencimento_medio_dias = (soma_dias_vencimento / faturas_com_vencimento) if faturas_com_vencimento > 0 else 0

    # 2. Construir PDF Apresentação (Offloaded to threadpool)
    from fastapi.concurrency import run_in_threadpool
    
    def _build_relatorio_pdf():
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(letter), rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(name="TitleStyle", parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor("#1e3a8a"), alignment=1, spaceAfter=20)
        sub_style = ParagraphStyle(name="SubStyle", parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor("#334155"), spaceAfter=15, spaceBefore=20)
        normal_style = ParagraphStyle(name="NormalStyle", parent=styles['Normal'], fontSize=12, textColor=colors.black, spaceAfter=10, leading=16)
        
        Story = []
        
        # Título
        Story.append(Paragraph(f"<b>Apresentação Analítica: Performance e Gestão de Contas (Até {hoje.strftime('%d/%m/%Y')})</b>", title_style))
        Story.append(Paragraph("Este documento consolida em tempo real todas as informações de leitura óptica das faturas geradas pela automação Datacron.", normal_style))
        
        # KPIs Globais
        Story.append(Paragraph("<b>1. Resumo Global de Faturamento</b>", sub_style))
        summary_data = [
            ["Total de Contas Recebidas", "Valor Total Mapeado", "Ticket Médio por Conta", "Dias Médios Vencimento"],
            [f"{total_faturas}", f"R$ {valor_total:,.2f}", f"R$ {valor_medio:,.2f}", f"{vencimento_medio_dias:.0f} dias"],
            ["Status Processadas", "Status Pendentes", "Status Erro OCR", "Status Revisão"],
            [f"{status_counts['processada']}", f"{status_counts['pendente']}", f"{status_counts['erro']}", f"{status_counts['revisao']}"]
        ]
        t_summary = Table(summary_data, colWidths=[180]*4)
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#0f172a")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (0,2), (-1,2), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 0.25, colors.lightgrey),
        ]))
        Story.append(t_summary)
        
        # Participação por Condomínio
        Story.append(Paragraph("<b>2. Distribuição e Volumes por Condomínio</b>", sub_style))
        Story.append(Paragraph("Abaixo é possível verificar a carga de contas segmentada por condomínio (% do portfólio) e seu ticket correspondente.", normal_style))
        
        condo_data = [["Condomínio", "Volume de Contas", "Participação (%)", "Gasto Total Mapeado"]]
        for c_nome, dados in sorted(condos.items(), key=lambda x: x[1]['count'], reverse=True):
            perc = (dados['count'] / total_faturas) * 100
            condo_data.append([
                c_nome,
                str(dados['count']),
                f"{perc:.1f}%",
                f"R$ {dados['valor']:,.2f}"
            ])
            
        t_condos = Table(condo_data, colWidths=[250, 150, 150, 150])
        t_condos.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2563eb")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (0,1), (0,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#2563eb")),
        ]))
        Story.append(t_condos)
        
        # Concessionárias
        Story.append(Paragraph("<b>3. Impacto de Centros de Custos (Concessionárias)</b>", sub_style))
        conc_data = [["Distribuidora/Serviço", "Nº de Faturas Capturadas", "Impacto Financeiro"]]
        for conc_nome, dados in sorted(concessionarias.items(), key=lambda x: x[1]['valor'], reverse=True):
            conc_data.append([
                conc_nome,
                str(dados['count']),
                f"R$ {dados['valor']:,.2f}"
            ])
        
        t_conc = Table(conc_data, colWidths=[300, 200, 200])
        t_conc.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0f172a")),
        ]))
        Story.append(t_conc)
        
        # Disclaimer
        Story.append(Spacer(1, 40))
        Story.append(Paragraph("<i>* Relatório gerado dinamicamente via Datacron Business Intelligence - Compilação Real-time do Banco de Dados. Substitui a necessidade do agente externo (NotebookLM) que apresenta falhas de autenticação de cookies na nuvem. *</i>", ParagraphStyle(name="Italic", fontSize=10, textColor=colors.gray, alignment=1)))

        doc.build(Story)
        output.seek(0)
        return output

    output = await run_in_threadpool(_build_relatorio_pdf)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio_analitico_apresentacao.pdf"},
    )
