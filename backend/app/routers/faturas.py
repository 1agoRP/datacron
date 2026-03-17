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

@router.get("/relatorio-analitico/download")
async def download_relatorio_analitico(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Endpoint que gera e retorna um PDF de relatório analítico do NotebookLM sobre a base."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    import io

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    Story = []

    text = """<font size=14><b>RELATÓRIO EXECUTIVO: ANÁLISE DE PORTFÓLIO DE CONDOMÍNIOS E CUSTOS OPERACIONAIS</b></font><br/>
<br/>
<b>1. Visão Geral do Portfólio (Escopo de Gestão)</b><br/>
A base de dados atual demonstra a gestão de um portfólio complexo composto por diversos condomínios localizados, em sua esmagadora maioria, na cidade de São Paulo (abrangendo bairros como Perdizes, Jardim América, Vila Mariana, Brooklin, Itaim Bibi, entre outros). O banco de dados exige o controle individualizado do CNPJ de cada edifício, atrelado aos dados de seus respectivos síndicos e representantes legais.<br/>
<br/>
<b>2. Composição dos Centros de Custo (Concessionárias)</b><br/>
A operação financeira lida com uma esteira de pagamentos fragmentada em múltiplas provedoras de serviços de uso contínuo e essencial:<br/>
• Fornecimento de Energia: ENEL.<br/>
• Saneamento e Água: SABESP.<br/>
• Gás Encanado: COMGÁS.<br/>
• Telecomunicações e Conectividade: VIVO, CLARO, NET e TIM.<br/>
<br/>
<b>3. Principais Desafios Operacionais e Financeiros Inferidos (Foco Estratégico)</b><br/>
Através da auditoria analítica dos dados apresentados, destacam-se os seguintes gargalos e desafios críticos que demandam atenção imediata da Diretoria:<br/>
<br/>
<i>A. Risco Financeiro em Despesas Críticas (High-Ticket)</i><br/>
O portfólio possui faturas de consumo básico com valores altíssimos, o que exige um provisionamento de caixa rigoroso por parte de cada condomínio e monitoramento para evitar cortes de serviço. Destacam-se as seguintes anomalias e altos custos:<br/>
• SABESP: Contas que atingem o patamar de R$ 29.001,00 no Condomínio Blanc Campo Belo e R$ 24.871,00 no Condomínio Belas Artes.<br/>
• COMGÁS: Picos de faturamento chegando a R$ 29.001,00 também no Condomínio Belas Artes.<br/>
• ENEL: Despesas de até R$ 25.500,00 em regiões específicas.<br/>
• Desafio para a Diretoria: A falta de auditoria de consumo pode esconder vazamentos ou ineficiências energéticas. O não pagamento de uma única fatura neste patamar compromete seriamente a governança corporativa.<br/>
<br/>
<i>B. Alta Complexidade no Faturamento e Fragmentação de Medidores</i><br/>
A análise revela uma extrema pulverização de contas dentro de um mesmo cliente (condomínio), dificultando a consolidação financeira.<br/>
• Múltiplas instalações: Condomínios como o Fit Jardim Botânico I, possuem rateios separados na ENEL para "ADM TOR 1" (R$ 2.300,00), "ADM TOR 2" (R$ 1.900,00), além de medidores exclusivos para bombas.<br/>
• Desmembramento por blocos: Medições divididas em vários blocos diferentes, totalizando altas montas fragmentadas.<br/>
• Desafio para a Diretoria: Há uma ampla variação nas datas de vencimento. Controlar esse volume massivo de linhas de pagamento manualmente eleva drasticamente o risco de erros humanos e multas.<br/>
<br/>
<i>C. Controle de Contratos Menores e Telecomunicações</i><br/>
Observa-se a gestão de pequenas contas de telefonia atreladas a funções específicas (ex: Zelador, Sala de Ginástica, Eventos).<br/>
• Desafio para a Diretoria: É necessário estabelecer uma governança rígida para evitar o pagamento de linhas ociosas ou redundância na contratação de pacotes de telecomunicações corporativas.<br/>
<br/>
<b>Conclusão e Parecer Estratégico</b><br/>
Através de inteligência processada no banco de dados, o principal desafio elencado é a integração, auditoria contínua e automação de pagamentos. A estrutura é altamente vulnerável a falhas de controle devido à quantidade de CNPJs, medidores fragmentados e faturas de alto impacto. A Diretoria deve focar na centralização inteligente dessas métricas pelo Datacron para mitigar riscos operacionais de alta gravidade.<br/>
<br/>
<i>* Relatório processado por IA (Notebook LM / Gemini Engine) - Datacron Analytics System *</i>
"""
    p = Paragraph(text, styles["Normal"])
    Story.append(p)
    doc.build(Story)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio_analitico_ia.pdf"},
    )
