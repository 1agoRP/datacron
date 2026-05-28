import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.relatorio import RelatorioGerado
from app.services.report_catalog import REPORTS


def _money(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _uuid_scope(raw_ids: list[str] | None) -> list[UUID] | None:
    if raw_ids is None:
        return None
    ids = []
    for raw_id in raw_ids:
        try:
            ids.append(UUID(str(raw_id)))
        except ValueError:
            continue
    return ids


async def _fetch_report_data(db: AsyncSession, report: RelatorioGerado):
    scope = _uuid_scope(report.notebooklm_scope_condominio_ids)
    faturas_stmt = (
        select(Fatura)
        .options(selectinload(Fatura.condominio), selectinload(Fatura.concessionaria))
        .order_by(Fatura.vencimento.desc().nullslast(), Fatura.created_at.desc())
    )
    if scope is not None:
        faturas_stmt = faturas_stmt.where(Fatura.condominio_id.in_(scope))
    if report.data_inicio:
        faturas_stmt = faturas_stmt.where(Fatura.vencimento >= report.data_inicio)
    if report.data_fim:
        faturas_stmt = faturas_stmt.where(Fatura.vencimento <= report.data_fim)
    if not report.data_inicio and not report.data_fim:
        today = datetime.now().date()
        faturas_stmt = faturas_stmt.where(
            extract("year", Fatura.vencimento) == today.year,
            extract("month", Fatura.vencimento) == today.month,
        )

    condominios_stmt = select(Condominio).where(Condominio.ativo == True).order_by(Condominio.nome)
    concessionarias_stmt = select(Concessionaria).where(Concessionaria.ativo == True)
    if scope is not None:
        condominios_stmt = condominios_stmt.where(Condominio.id.in_(scope))
        concessionarias_stmt = concessionarias_stmt.where(Concessionaria.condominio_id.in_(scope))

    faturas = list((await db.execute(faturas_stmt)).scalars().all())
    condominios = list((await db.execute(condominios_stmt)).scalars().all())
    concessionarias = list((await db.execute(concessionarias_stmt)).scalars().all())
    return faturas, condominios, concessionarias


def _period_label(report: RelatorioGerado) -> str:
    if report.data_inicio and report.data_fim:
        return f"{report.data_inicio:%d/%m/%Y} a {report.data_fim:%d/%m/%Y}"
    if report.data_inicio:
        return f"A partir de {report.data_inicio:%d/%m/%Y}"
    if report.data_fim:
        return f"Ate {report.data_fim:%d/%m/%Y}"
    return "Mes vigente"


def _build_source_text(
    report: RelatorioGerado,
    faturas: Iterable[Fatura],
    condominios: Iterable[Condominio],
    concessionarias: Iterable[Concessionaria],
) -> str:
    faturas = list(faturas)
    condominios = list(condominios)
    concessionarias = list(concessionarias)
    meta = REPORTS.get(report.tipo_relatorio, {})
    total = sum(float(f.valor or 0) for f in faturas)
    distinct_received = len({f.concessionaria_id for f in faturas if f.concessionaria_id})
    expected = len(concessionarias)
    completion = round((distinct_received / expected) * 100, 1) if expected else 0
    status_count = Counter(f.status or "sem_status" for f in faturas)
    by_condo = defaultdict(lambda: {"qtd": 0, "valor": 0.0, "pendencias": 0})
    by_utility = defaultdict(lambda: {"qtd": 0, "valor": 0.0})

    for fatura in faturas:
        condo = fatura.condominio.nome if fatura.condominio else "Nao identificado"
        utility = fatura.concessionaria.tipo if fatura.concessionaria else "Nao identificada"
        by_condo[condo]["qtd"] += 1
        by_condo[condo]["valor"] += float(fatura.valor or 0)
        if fatura.status in {"pendente", "erro", "revisao"}:
            by_condo[condo]["pendencias"] += 1
        by_utility[utility]["qtd"] += 1
        by_utility[utility]["valor"] += float(fatura.valor or 0)

    lines = [
        f"# {meta.get('title', report.nome)}",
        f"Periodo: {_period_label(report)}",
        f"Artefato esperado no NotebookLM: {report.notebooklm_artifact_type or 'slides'}",
        "",
        "## Indicadores",
        f"- Condominios ativos: {len(condominios)}",
        f"- Concessionarias esperadas: {expected}",
        f"- Concessionarias com fatura recebida: {distinct_received}",
        f"- Aderencia: {completion}%",
        f"- Faturas no periodo: {len(faturas)}",
        f"- Valor monitorado: {_money(total)}",
        f"- Status: {dict(status_count)}",
        "",
        "## Ranking por condominio",
        "| Condominio | Faturas | Pendencias | Valor |",
        "| --- | ---: | ---: | ---: |",
    ]
    for name, data in sorted(by_condo.items(), key=lambda x: (x[1]["pendencias"], x[1]["valor"]), reverse=True)[:30]:
        lines.append(f"| {name} | {data['qtd']} | {data['pendencias']} | {_money(data['valor'])} |")

    lines.extend(["", "## Concentracao por tipo de concessionaria", "| Tipo | Faturas | Valor |", "| --- | ---: | ---: |"])
    for utility, data in sorted(by_utility.items(), key=lambda x: x[1]["valor"], reverse=True):
        lines.append(f"| {utility} | {data['qtd']} | {_money(data['valor'])} |")

    lines.extend([
        "",
        "## Instrucao para o NotebookLM",
        "Use apenas os dados desta fonte. Se o artefato for slides, crie uma apresentacao executiva curta com decisoes, riscos e proximos passos. "
        "Se o artefato for tabela, crie uma tabela priorizada com colunas de acao, evidencia, risco, prioridade e responsavel sugerido.",
    ])
    return "\n".join(lines)


async def process_pending_notebooklm_reports(db: AsyncSession, limit: int = 3) -> int:
    if not settings.NOTEBOOKLM_ENABLED:
        return 0

    stmt = (
        select(RelatorioGerado)
        .where(
            RelatorioGerado.notebooklm_status.in_(["pending", "failed"]),
            RelatorioGerado.notebooklm_attempts < settings.NOTEBOOKLM_MAX_ATTEMPTS,
        )
        .order_by(RelatorioGerado.created_at.asc())
        .limit(limit)
    )
    reports = list((await db.execute(stmt)).scalars().all())
    processed = 0
    for report in reports:
        await _process_one(db, report)
        processed += 1
    return processed


async def _process_one(db: AsyncSession, report: RelatorioGerado) -> None:
    now = datetime.now(timezone.utc)
    report.notebooklm_status = "processing"
    report.notebooklm_attempts += 1
    report.notebooklm_error = None
    await db.commit()

    try:
        if not settings.NOTEBOOKLM_AUTH_JSON and not settings.NOTEBOOKLM_STORAGE_PATH:
            raise RuntimeError("Configure NOTEBOOKLM_AUTH_JSON ou NOTEBOOKLM_STORAGE_PATH para ativar o NotebookLM.")

        if settings.NOTEBOOKLM_AUTH_JSON:
            os.environ["NOTEBOOKLM_AUTH_JSON"] = settings.NOTEBOOKLM_AUTH_JSON

        from notebooklm import NotebookLMClient

        faturas, condominios, concessionarias = await _fetch_report_data(db, report)
        source_text = _build_source_text(report, faturas, condominios, concessionarias)
        title = f"Datacron - {report.nome}"

        storage_arg = settings.NOTEBOOKLM_STORAGE_PATH or None
        client_ctx = NotebookLMClient.from_storage(storage_arg) if storage_arg else NotebookLMClient.from_storage()
        async with client_ctx as client:
            notebook = await client.notebooks.create(title[:120])
            report.notebooklm_notebook_id = notebook.id
            await client.sources.add_text(
                notebook.id,
                f"Fonte Datacron - {_period_label(report)}",
                source_text,
                wait=True,
                wait_timeout=180.0,
            )

            instructions = (
                "Crie um artefato em portugues do Brasil, objetivo e orientado a decisao. "
                "Use somente os dados da fonte Datacron."
            )
            if report.notebooklm_artifact_type == "tabela":
                status = await client.artifacts.generate_data_table(
                    notebook.id,
                    source_ids=None,
                    instructions=instructions,
                    language="pt_BR",
                )
            else:
                status = await client.artifacts.generate_slide_deck(
                    notebook.id,
                    source_ids=None,
                    instructions=instructions,
                    language="pt_BR",
                )
            final_status = await client.artifacts.wait_for_completion(
                notebook.id,
                status.task_id,
                timeout=600.0,
            )
            if final_status.is_failed:
                raise RuntimeError(final_status.error or "Falha ao gerar artefato no NotebookLM.")

            report.notebooklm_artifact_id = final_status.task_id
            report.notebooklm_status = "completed"
            report.notebooklm_processed_at = now
    except Exception as exc:
        report.notebooklm_status = "failed"
        report.notebooklm_error = str(exc)[:2000]
        report.notebooklm_processed_at = now
    finally:
        await db.commit()
