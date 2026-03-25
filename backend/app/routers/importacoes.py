import io
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.schemas import ImportPreviewResponse, ImportPreviewRow, ImportConfirmResponse, ImportConfirmRequest

router = APIRouter(prefix="/importacoes", tags=["Importações"])


def _parse_excel_or_csv(content: bytes, filename: str) -> list[dict]:
    """Parses Excel or CSV file and returns list of row dicts."""
    import pandas as pd

    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    else:
        df = pd.read_excel(io.BytesIO(content), dtype=str)

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df = df.where(df.notna(), None)
    return df.to_dict("records")


@router.get("/template/{tipo}")
async def download_template(
    tipo: Literal["condominios", "concessionarias"],
    _: User = Depends(get_current_user),
):
    """Returns a pre-formatted CSV template for the specified import type."""
    import csv as csv_mod

    if tipo == "condominios":
        headers = ["Nº Cond.", "Nome", "Endereço", "CNPJ", "Síndico(a)", "CPF Síndico"]
        sample = [["0006", "Residencial Exemplo", "Av. Paulista, 100", "12.345.678/0001-90", "João Silva", "123.456.789-00"]]
    else:
        headers = ["Nº Cond.", "Tipo", "Instalação", "E-mail Esperado", "Regra Senha", "Senha Manual", "Dia Vencimento", "Valor Médio"]
        sample = [
            ["0006", "Enel", "69858373", "fatura@enel.com.br", "5_primeiros_cnpj", "", "10", "1500.00"],
            ["0006", "Sabesp", "12345678", "fatura@sabesp.com.br", "manual", "MINHASENHA123", "15", "800.00"],
        ]

    output = io.BytesIO()
    # Write BOM for Excel UTF-8 compatibility
    output.write(b'\xef\xbb\xbf')
    wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
    writer = csv_mod.writer(wrapper, delimiter=';')
    writer.writerow(headers)
    for row in sample:
        writer.writerow(row)
    wrapper.detach()
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=template_{tipo}.csv"},
    )


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    tipo: Literal["condominios", "concessionarias"] = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Validates the uploaded file and returns a preview of what will be
    created, updated, or ignored — before committing anything.
    """
    content = await file.read()
    if not file.filename:
        raise HTTPException(status_code=422, detail="Arquivo sem nome")

    # Extra security: basic MIME type / extension validation
    ALLOWED_EXTENSIONS = (".csv", ".xls", ".xlsx")
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=415, detail="Apenas planilhas (CSV, XLS, XLSX) são permitidas")

    rows = _parse_excel_or_csv(content, file.filename)
    preview_rows: list[ImportPreviewRow] = []
    criar = atualizar = ignorar = erros = 0

    for raw in rows:
        if tipo == "condominios":
            numero = str(raw.get("nº_cond.", "") or raw.get("numero", "") or "").strip()
            nome   = str(raw.get("nome", "") or "").strip()
            cnpj   = str(raw.get("cnpj", "") or "").strip()

            if not numero or not nome or not cnpj:
                erros += 1
                preview_rows.append(ImportPreviewRow(
                    acao="ERRO", dados=raw, validacao=False,
                    mensagem="Campos obrigatórios: Nº Cond., Nome, CNPJ"
                ))
                continue

            # Check if exists
            existing = await db.execute(
                select(Condominio).where(
                    (Condominio.numero == numero) | (Condominio.cnpj == cnpj)
                )
            )
            exists = existing.scalar_one_or_none()
            if exists:
                atualizar += 1
                acao = "ATUALIZAR"
            else:
                criar += 1
                acao = "CRIAR"

        else:  # concessionarias
            numero = str(raw.get("nº_cond.", "") or raw.get("numero", "") or "").strip()
            tipo_conc = str(raw.get("tipo", "") or "").strip()
            instalacao = str(raw.get("instalação", "") or raw.get("instalacao", "") or "").strip()

            if not numero or not tipo_conc:
                erros += 1
                preview_rows.append(ImportPreviewRow(
                    acao="ERRO", dados=raw, validacao=False,
                    mensagem="Campos obrigatórios: Nº Cond., Tipo"
                ))
                continue

            # Check condominio exists
            condo_result = await db.execute(
                select(Condominio).where(Condominio.numero == numero)
            )
            if not condo_result.scalar_one_or_none():
                erros += 1
                preview_rows.append(ImportPreviewRow(
                    acao="ERRO", dados=raw, validacao=False,
                    mensagem=f"Condomínio Nº {numero} não encontrado. Importe os condomínios primeiro."
                ))
                continue

            criar += 1
            acao = "CRIAR"

        preview_rows.append(ImportPreviewRow(
            acao=acao,
            dados=raw,
            validacao=True,
        ))

    return ImportPreviewResponse(
        tipo=tipo,
        total_linhas=len(rows),
        criar=criar,
        atualizar=atualizar,
        ignorar=ignorar,
        erros=erros,
        rows=preview_rows,
    )


@router.post("/confirmar", response_model=ImportConfirmResponse)
async def confirm_import(
    payload: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Commits the import to the database.
    Re-runs the DB validation logic based on the passed JSON payload rows.
    """
    sucesso = erros = 0

    for row_obj in payload.rows:
        raw = row_obj.dados
        try:
            if payload.tipo == "condominios":
                numero  = str(raw.get("nº_cond.", "") or "").strip()
                nome    = str(raw.get("nome", "") or "").strip()
                cnpj    = str(raw.get("cnpj", "") or "").strip()
                sindico = str(raw.get("síndico(a)", "") or raw.get("sindico", "") or "").strip()
                endereco = str(raw.get("endereço", "") or raw.get("endereco", "") or "").strip()

                if not numero or not nome or not cnpj:
                    erros += 1
                    continue

                existing = await db.execute(
                    select(Condominio).where(
                        (Condominio.numero == numero) | (Condominio.cnpj == cnpj)
                    )
                )
                c = existing.scalar_one_or_none()
                if c:
                    c.nome = nome
                    c.sindico = sindico or c.sindico
                    c.endereco = endereco or c.endereco
                else:
                    db.add(Condominio(
                        nome=nome, numero=numero, cnpj=cnpj,
                        sindico=sindico or "Não informado",
                        endereco=endereco or "Não informado",
                    ))
                sucesso += 1

            else:  # concessionarias
                numero  = str(raw.get("nº_cond.", "") or "").strip()
                tipo_c  = str(raw.get("tipo", "") or "").strip()
                install = str(raw.get("instalação", "") or raw.get("instalacao", "") or "").strip()
                email   = str(raw.get("e-mail_esperado", "") or "").strip()
                regra   = str(raw.get("regra_senha", "") or "5_primeiros_cnpj").strip()
                senha_m = str(raw.get("senha_manual", "") or "").strip()
                venc    = int(float(raw.get("dia_vencimento", 10) or 10))
                valor_m = float(raw.get("valor_médio", 0) or raw.get("valor_medio", 0) or 0)

                condo_r = await db.execute(
                    select(Condominio).where(Condominio.numero == numero)
                )
                condo = condo_r.scalar_one_or_none()
                if not condo:
                    erros += 1
                    continue

                db.add(Concessionaria(
                    condominio_id=condo.id,
                    tipo=tipo_c,
                    instalacao=install or "000000",
                    email_esperado=email or f"fatura@{tipo_c.lower()}.com.br",
                    regra_senha=regra,
                    senha_manual=senha_m if regra == "manual" else None,
                    dia_vencimento=venc,
                    valor_medio=valor_m,
                ))
                sucesso += 1

        except Exception as e:
            erros += 1

    await db.commit()
    return ImportConfirmResponse(
        sucesso=sucesso,
        erros=erros,
        mensagem=f"Importação concluída: {sucesso} registro(s) salvos, {erros} erro(s).",
    )
