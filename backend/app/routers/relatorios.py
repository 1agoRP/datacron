from collections import Counter, defaultdict
from datetime import date, datetime
import io
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids, require_module
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.relatorio import RelatorioGerado
from app.models.user import User
from app.schemas import RelatorioGeradoCreate, RelatorioGeradoResponse
from app.services.report_catalog import REPORTS

router = APIRouter(prefix="/relatorios", tags=["Relatorios"])


def _period_label(data_inicio: Optional[date], data_fim: Optional[date]) -> str:
    if data_inicio and data_fim:
        return f"{data_inicio.strftime('%d/%m/%Y')} a {data_fim.strftime('%d/%m/%Y')}"
    if data_inicio:
        return f"A partir de {data_inicio.strftime('%d/%m/%Y')}"
    if data_fim:
        return f"Ate {data_fim.strftime('%d/%m/%Y')}"
    today = date.today()
    return f"{today.strftime('%m/%Y')}"


async def _fetch_faturas(
    db: AsyncSession,
    allowed_condo_ids: list | None,
    data_inicio: Optional[date],
    data_fim: Optional[date],
) -> list[Fatura]:
    stmt = (
        select(Fatura)
        .options(selectinload(Fatura.condominio), selectinload(Fatura.concessionaria))
        .order_by(Fatura.vencimento.desc().nullslast(), Fatura.created_at.desc())
    )

    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    if data_inicio:
        stmt = stmt.where(Fatura.vencimento >= data_inicio)
    if data_fim:
        stmt = stmt.where(Fatura.vencimento <= data_fim)
    if not data_inicio and not data_fim:
        today = date.today()
        stmt = stmt.where(
            extract("year", Fatura.vencimento) == today.year,
            extract("month", Fatura.vencimento) == today.month,
        )

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _fetch_condominios(db: AsyncSession, allowed_condo_ids: list | None) -> list[Condominio]:
    stmt = select(Condominio).where(Condominio.ativo == True).order_by(Condominio.nome)
    if allowed_condo_ids is not None:
        stmt = stmt.where(Condominio.id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _fetch_concessionarias(db: AsyncSession, allowed_condo_ids: list | None) -> list[Concessionaria]:
    stmt = select(Concessionaria).where(Concessionaria.ativo == True)
    if allowed_condo_ids is not None:
        stmt = stmt.where(Concessionaria.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _money(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _build_pdf(report_type: str, faturas: list[Fatura], condominios: list[Condominio], concessionarias: list[Concessionaria], period: str) -> io.BytesIO:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    meta = REPORTS[report_type]
    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=32,
        leftMargin=32,
        topMargin=28,
        bottomMargin=28,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("DatacronTitle", parent=styles["Heading1"], fontSize=22, leading=26, textColor=colors.HexColor("#1e3a8a"), spaceAfter=8)
    subtitle = ParagraphStyle("DatacronSubtitle", parent=styles["Normal"], fontSize=10, leading=14, textColor=colors.HexColor("#475569"), spaceAfter=14)
    section = ParagraphStyle("DatacronSection", parent=styles["Heading2"], fontSize=14, leading=18, textColor=colors.HexColor("#0f172a"), spaceBefore=12, spaceAfter=8)
    small = ParagraphStyle("DatacronSmall", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#334155"))

    total = sum(float(f.valor or 0) for f in faturas)
    distinct_received = len({f.concessionaria_id for f in faturas if f.concessionaria_id})
    expected = len(concessionarias)
    completion = round((distinct_received / expected) * 100, 1) if expected else 0
    status_count = Counter(f.status or "sem_status" for f in faturas)
    by_condo = defaultdict(lambda: {"qtd": 0, "valor": 0.0, "pendencias": 0})
    by_utility = defaultdict(lambda: {"qtd": 0, "valor": 0.0})

    for f in faturas:
        condo = f.condominio.nome if f.condominio else "Nao identificado"
        utility = f.concessionaria.tipo if f.concessionaria else "Nao identificada"
        by_condo[condo]["qtd"] += 1
        by_condo[condo]["valor"] += float(f.valor or 0)
        if f.status in {"pendente", "erro", "revisao"}:
            by_condo[condo]["pendencias"] += 1
        by_utility[utility]["qtd"] += 1
        by_utility[utility]["valor"] += float(f.valor or 0)

    story = [
        Paragraph(meta["title"], title),
        Paragraph(f"{meta['subtitle']}<br/>Periodo-base: <b>{period}</b> | Destino NotebookLM sugerido: <b>{meta['notebooklm'].upper()}</b>", subtitle),
    ]

    summary = [
        ["Faturas", "Contas recebidas", "Contas esperadas", "Aderencia", "Valor monitorado"],
        [str(len(faturas)), str(distinct_received), str(expected), f"{completion}%", _money(total)],
    ]
    story.append(_table(summary, [110, 130, 130, 100, 150]))
    story.append(Spacer(1, 10))

    if report_type in {"briefing_executivo", "pacote_notebooklm"}:
        story.append(Paragraph("Narrativa executiva", section))
        bullets = [
            f"A carteira registrou {len(faturas)} faturas no periodo, somando {_money(total)}.",
            f"A cobertura operacional ficou em {completion}% das contas esperadas por concessionaria ativa.",
            f"Status criticos: {status_count.get('pendente', 0)} pendentes, {status_count.get('revisao', 0)} em revisao e {status_count.get('erro', 0)} com erro.",
            "Use este PDF no NotebookLM como fonte para gerar uma apresentacao de slides com decisoes, riscos e proximos passos.",
        ]
        for item in bullets:
            story.append(Paragraph(f"- {item}", small))
        story.append(Paragraph("Top condominios por valor", section))
        rows = [["Condominio", "Faturas", "Pendencias", "Valor"]]
        for name, data in sorted(by_condo.items(), key=lambda x: x[1]["valor"], reverse=True)[:12]:
            rows.append([name[:55], str(data["qtd"]), str(data["pendencias"]), _money(data["valor"])])
        story.append(_table(rows, [300, 80, 90, 130]))

    elif report_type == "mesa_operacional":
        story.append(Paragraph("Fila de ataque operacional", section))
        rows = [["Condominio", "Concessionaria", "Codigo", "Vencimento", "Valor", "Status"]]
        filtered = [f for f in faturas if f.status in {"pendente", "erro", "revisao"}]
        for f in filtered[:28]:
            rows.append([
                (f.condominio.nome if f.condominio else "N/A")[:38],
                f.concessionaria.tipo if f.concessionaria else "N/A",
                f.concessionaria.instalacao if f.concessionaria else "N/A",
                f.vencimento.strftime("%d/%m/%Y") if f.vencimento else "N/A",
                _money(float(f.valor or 0)),
                f.status,
            ])
        story.append(_table(rows, [230, 90, 110, 80, 90, 80]))

    elif report_type == "variacao_risco":
        story.append(Paragraph("Faturas com maior desvio de valor", section))
        rows = [["Condominio", "Concessionaria", "Vencimento", "Valor", "Media cadastro", "Desvio"]]
        ranked = []
        for f in faturas:
            avg = float(f.concessionaria.valor_medio or 0) if f.concessionaria else 0
            if avg > 0:
                ranked.append((abs(float(f.valor or 0) - avg) / avg, f, avg))
        for variation, f, avg in sorted(ranked, key=lambda x: x[0], reverse=True)[:26]:
            rows.append([
                (f.condominio.nome if f.condominio else "N/A")[:35],
                f.concessionaria.tipo if f.concessionaria else "N/A",
                f.vencimento.strftime("%d/%m/%Y") if f.vencimento else "N/A",
                _money(float(f.valor or 0)),
                _money(avg),
                f"{round(variation * 100, 1)}%",
            ])
        story.append(_table(rows, [220, 90, 85, 85, 95, 70]))

    elif report_type == "concessionarias_estrategicas":
        story.append(Paragraph("Concentracao por concessionaria", section))
        rows = [["Concessionaria", "Faturas", "Valor", "Participacao", "Proposta NotebookLM"]]
        for utility, data in sorted(by_utility.items(), key=lambda x: x[1]["valor"], reverse=True):
            share = (data["valor"] / total) * 100 if total else 0
            rows.append([utility, str(data["qtd"]), _money(data["valor"]), f"{share:.1f}%", "Slides: riscos, tendencia e alavancas"])
        story.append(_table(rows, [140, 80, 110, 90, 260]))

    elif report_type == "condominios_criticos":
        story.append(Paragraph("Ranking de condominios criticos", section))
        rows = [["Condominio", "Faturas", "Pendencias", "Valor", "Sinal de acao"]]
        for name, data in sorted(by_condo.items(), key=lambda x: (x[1]["pendencias"], x[1]["valor"]), reverse=True)[:26]:
            action = "Atacar primeiro" if data["pendencias"] > 0 else "Monitorar custo"
            rows.append([name[:42], str(data["qtd"]), str(data["pendencias"]), _money(data["valor"]), action])
        story.append(_table(rows, [260, 70, 80, 100, 130]))

    story.append(PageBreak())
    story.append(Paragraph("Fonte estruturada para NotebookLM", section))
    story.append(Paragraph(
        "Instrucao sugerida: use este PDF como fonte unica. Se o destino sugerido for SLIDES, crie uma apresentacao objetiva para diretoria. "
        "Se for TABELA, gere uma tabela priorizada com colunas de acao, responsavel sugerido, risco e evidencia.",
        small,
    ))
    doc.build(story)
    output.seek(0)
    return output


def _table(rows: list[list[str]], widths: list[int]) -> "Table":
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle

    table = Table(rows, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dbe3ef")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


@router.get("/historico", response_model=list[RelatorioGeradoResponse])
async def listar_historico(
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_module("relatorios")),
):
    stmt = select(RelatorioGerado).order_by(RelatorioGerado.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/registrar", response_model=RelatorioGeradoResponse, status_code=201)
async def registrar_relatorio(
    body: RelatorioGeradoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_module("relatorios")),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    meta = REPORTS.get(body.tipo_relatorio, {})
    relatorio = RelatorioGerado(
        nome=body.nome,
        tipo_relatorio=body.tipo_relatorio,
        formato="pdf",
        usuario=current_user.nome,
        data_inicio=body.data_inicio,
        data_fim=body.data_fim,
        notebooklm_status="pending" if body.tipo_relatorio in REPORTS else "skipped",
        notebooklm_artifact_type=meta.get("notebooklm"),
        notebooklm_scope_condominio_ids=[str(item) for item in allowed_condo_ids] if allowed_condo_ids is not None else None,
    )
    db.add(relatorio)
    await db.commit()
    await db.refresh(relatorio)
    return relatorio


@router.get("/tipos")
async def listar_tipos(_: User = Depends(require_module("relatorios"))):
    return [{"key": key, **value} for key, value in REPORTS.items()]


@router.get("/{tipo_relatorio}/download")
async def download_relatorio_pdf(
    tipo_relatorio: str,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_module("relatorios")),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    if tipo_relatorio not in REPORTS:
        raise HTTPException(status_code=404, detail="Tipo de relatorio nao encontrado")

    faturas = await _fetch_faturas(db, allowed_condo_ids, data_inicio, data_fim)
    condominios = await _fetch_condominios(db, allowed_condo_ids)
    concessionarias = await _fetch_concessionarias(db, allowed_condo_ids)
    period = _period_label(data_inicio, data_fim)

    output = _build_pdf(tipo_relatorio, faturas, condominios, concessionarias, period)
    filename = f"datacron_{tipo_relatorio}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/exportar")
async def exportar_dados(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_module("relatorios")),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    faturas = await _fetch_faturas(db, allowed_condo_ids, data_inicio, data_fim)
    condominios = await _fetch_condominios(db, allowed_condo_ids)
    concessionarias = await _fetch_concessionarias(db, allowed_condo_ids)
    output = _build_pdf("briefing_executivo", faturas, condominios, concessionarias, _period_label(data_inicio, data_fim))
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=datacron_briefing_executivo.pdf"},
    )


@router.post("/download-lote")
async def download_lote(
    ids: list[str],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    import base64
    import zipfile
    from app.storage import get_file_content

    stmt = select(Fatura).where(Fatura.id.in_(ids))
    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    faturas = result.scalars().all()
    if not faturas:
        raise HTTPException(status_code=404, detail="Nenhuma fatura encontrada")

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zip_file:
        for f in faturas:
            pdf_data = None
            if f.storage_path:
                try:
                    pdf_data = await get_file_content(f.storage_path)
                except Exception:
                    pdf_data = None
            if not pdf_data and f.pdf_base64:
                try:
                    pdf_data = base64.b64decode(f.pdf_base64)
                except Exception:
                    pdf_data = None
            if pdf_data:
                zip_file.writestr(f.pdf_nome_original or f"fatura_{f.id}.pdf", pdf_data)
    output.seek(0)
    return StreamingResponse(output, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=faturas_datacron.zip"})


@router.get("/faturas/{id}/pdf")
async def download_fatura_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    import base64
    import os
    from app.storage import get_file_content

    result = await db.execute(select(Fatura).where(Fatura.id == id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Fatura nao encontrada")
    if allowed_condo_ids is not None and f.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a esta fatura")

    filename = f.pdf_nome_original or f"fatura_{id}.pdf"
    if f.storage_path:
        try:
            content = await get_file_content(f.storage_path)
            return StreamingResponse(io.BytesIO(content), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
        except Exception:
            pass
    if f.pdf_base64:
        try:
            pdf_data = base64.b64decode(f.pdf_base64)
            return StreamingResponse(io.BytesIO(pdf_data), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
        except Exception:
            pass
    if f.pdf_path and os.path.exists(f.pdf_path):
        def file_iterator(path: str):
            with open(path, "rb") as file:
                while chunk := file.read(8192):
                    yield chunk

        return StreamingResponse(file_iterator(f.pdf_path), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    raise HTTPException(status_code=404, detail="PDF nao encontrado para esta fatura")
