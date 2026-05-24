import io
import re
from datetime import date
from typing import Any

MESES_PT = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


def _money_to_float(value: str | None) -> float:
    if not value:
        return 0.0
    normalized = value.replace(".", "").replace(",", ".")
    normalized = re.sub(r"[^0-9.-]", "", normalized)
    try:
        return round(float(normalized), 2)
    except ValueError:
        return 0.0


def _format_money(value: float | int | None) -> str:
    value = float(value or 0)
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"


def _format_percent(value: float | int | None) -> str:
    value = float(value or 0)
    formatted = f"{value:.2f}".replace(".", ",")
    return f"{formatted}%"


def _search_money(pattern: str, text: str, default: float = 0.0, flags: int = re.I | re.S) -> float:
    match = re.search(pattern, text, flags)
    return _money_to_float(match.group(1)) if match else default


def _extract_text(pdf_bytes: bytes) -> str:
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except ModuleNotFoundError:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_account_summary(text: str, account: str) -> dict[str, float] | None:
    pattern = rf"{account}\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)"
    matches = re.findall(pattern, text, re.I)
    if not matches:
        return None
    saldo_anterior, creditos, debitos, saldo_atual = matches[-1]
    return {
        "saldo_anterior": _money_to_float(saldo_anterior),
        "creditos": _money_to_float(creditos),
        "debitos": _money_to_float(debitos),
        "saldo_atual": _money_to_float(saldo_atual),
    }


def _extract_expense_highlights(text: str) -> list[dict[str, Any]]:
    section_match = re.search(
        r"Demonstrativo de Despesas(?P<body>.*?)(?:TOTAL DA CONTA ORDINARIA|TOTAL DAS DESPESAS)",
        text,
        re.I | re.S,
    )
    body = section_match.group("body") if section_match else text
    categories = []
    for line in body.splitlines():
        clean = line.strip()
        if not clean:
            continue
        match = re.search(r"([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ./()-]{4,})\s+([\d.]+,\d{2})$", clean)
        if not match:
            continue
        label = re.sub(r"\s+", " ", match.group(1)).strip()
        if label in {"TOTAL DA CONTA ORDINARIA", "TOTAL DAS DESPESAS", "ORDINARIA"}:
            continue
        value = _money_to_float(match.group(2))
        if value > 0:
            categories.append({"categoria": label.title(), "valor": value})
    return sorted(categories, key=lambda item: item["valor"], reverse=True)[:6]


def _build_text(data: dict[str, Any]) -> str:
    previsto = data["previsto"]
    realizado = data["despesas_ordinarias"]
    receita_boleto = data["receita_boleto_mes"]
    cotas_atrasadas = data["cotas_atrasadas_recebidas"]
    receita_total = data["receitas_ordinarias_totais"]
    saldo = data["saldo_ordinaria"]
    variacao = data["resultado_percentual"]
    deficit_superavit = "déficit" if variacao < 0 else "superávit"
    reducao_aumento = "redução" if variacao < 0 else "aumento"
    mes_ano = data["referencia"]
    recebimento_percentual = (receita_boleto / previsto * 100) if previsto else 0

    despesas_status = (
        "acima do previsto"
        if realizado >= previsto
        else "dentro do previsto"
    )
    receitas_status = "abaixo do previsto" if receita_total < previsto else "acima do previsto"
    total_emitido_status = (
        "acima do total emitido para o mês"
        if receita_boleto + cotas_atrasadas >= previsto
        else "abaixo do total emitido para o mês"
    )

    partes = [
        f"Em análise do balancete deste mês de {mes_ano}, foi possível observar que as despesas ordinárias, no cômputo geral, se realizaram {despesas_status}.",
        f"- Previsto: {_format_money(previsto)}",
        f"- Realizado: {_format_money(realizado)}",
    ]

    if data.get("justificativa_despesas"):
        partes.append(data["justificativa_despesas"])
    elif realizado > previsto:
        partes.append(
            "Esse aumento deve ser justificado com base nas principais despesas do período, especialmente nos grupos que mais pressionaram a conta ordinária."
        )

    partes.extend(
        [
            (
                f"No que se refere às receitas, o Condomínio recebeu {_format_percent(recebimento_percentual)} das cotas do mês "
                f"({_format_money(receita_boleto)}), "
                f"{'mais ' + _format_money(cotas_atrasadas) + ' de cotas atrasadas de períodos anteriores' if cotas_atrasadas else 'e não houve recebimento de cotas atrasadas de períodos anteriores'}, "
                f"de modo que essas receitas ordinárias se realizaram {total_emitido_status}."
            ),
            f"- Recebimento das cotas do mês: {_format_money(receita_boleto)}",
            f"- Recebimento de cotas em atraso: {_format_money(cotas_atrasadas)} (nominal)",
            f"- Recebido: {_format_money(receita_boleto + cotas_atrasadas)} | Emitido: {_format_money(previsto)}",
            f"As receitas ordinárias totais, englobando todos os créditos contabilizados na conta ordinária, se realizaram {receitas_status}.",
            f"- Total recebido: {_format_money(receita_total)} | Receita prevista: {_format_money(previsto)}",
            (
                f"É possível concluir, portanto, que as receitas ordinárias totalizaram {_format_money(receita_total)}, "
                f"frente às despesas de {_format_money(realizado)}, o que resulta em um {deficit_superavit} de {_format_percent(variacao)}, "
                f"de modo que o saldo da conta ordinária apresentou {reducao_aumento} em relação ao mês anterior, "
                f"encerrando{' negativo' if saldo < 0 else ''} em {_format_money(saldo)}."
            ),
        ]
    )

    if variacao < 0:
        partes.append(
            "Importante considerar que o déficit observado na conta ordinária ocorreu pois as despesas superaram as receitas efetivas do mês, exigindo acompanhamento próximo nos próximos balancetes."
        )
    else:
        partes.append(
            "Importante considerar que o superávit observado na conta ordinária reforça a capacidade de preservação do saldo, desde que mantido o controle das despesas recorrentes."
        )

    for account in data.get("contas_complementares", []):
        nome = account["nome"].title()
        saldo_atual = account["saldo_atual"]
        partes.append(
            f"Com relação à conta {nome}, foi recebida a arrecadação mensal e o saldo encerrou em {_format_money(saldo_atual)}."
        )

    return "\n\n".join(partes)


def analyze_balancete_pdf(pdf_bytes: bytes, filename: str | None = None) -> dict[str, Any]:
    text = _extract_text(pdf_bytes)

    period = re.search(r"Período:\s*(\d{2})/(\d{2})/(\d{4})\s*a\s*(\d{2})/(\d{2})/(\d{4})", text, re.I)
    month = int(period.group(2)) if period else date.today().month
    year = int(period.group(3)) if period else date.today().year
    referencia = f"{month:02d}/{year}"

    condo = re.search(r"Condomínio:\s*(\d+)\s*-\s*([^\n]+)", text, re.I)
    endereco = re.search(r"Endereço:\s*([^\n]+)", text, re.I)

    ordinary = _extract_account_summary(text, "ORDINARIA") or {}
    emissao = re.search(r"CONDOMINIO\s+([\d.]+,\d{2})([\d.]+,\d{2})", text, re.I)
    receita_boleto = _money_to_float(emissao.group(1)) if emissao else 0.0
    previsto = _money_to_float(emissao.group(2)) if emissao else 0.0
    cotas_aberto = _search_money(r"COTAS EM ABERTO EM\s+\d{2}/\d{2}/\d{4}\s+([\d.]+,\d{2})", text)
    total_despesas = _search_money(r"TOTAL DA CONTA ORDINARIA\s+([\d.]+,\d{2})", text)

    receitas_totais = float(ordinary.get("creditos") or 0)
    saldo_ordinaria = float(ordinary.get("saldo_atual") or 0)
    if not total_despesas:
        total_despesas = float(ordinary.get("debitos") or 0)

    contas = []
    for label in ["FUNDO DE RESERVA", "FUNDO FERIAS/13o. SALARIO", "OBRAS"]:
        summary = _extract_account_summary(text, label)
        if summary:
            contas.append({"nome": label, **summary})

    resultado_percentual = ((receitas_totais - total_despesas) * 100 / receitas_totais) if receitas_totais else 0
    highlights = _extract_expense_highlights(text)

    data = {
        "arquivo": filename,
        "referencia": referencia,
        "mes": month,
        "ano": year,
        "condominio_codigo": condo.group(1) if condo else "",
        "condominio_nome": condo.group(2).strip() if condo else "",
        "endereco": endereco.group(1).strip() if endereco else "",
        "previsto": previsto,
        "receita_boleto_mes": receita_boleto,
        "cotas_atrasadas_recebidas": 0.0,
        "cotas_em_aberto": cotas_aberto,
        "receitas_ordinarias_totais": receitas_totais,
        "despesas_ordinarias": total_despesas,
        "saldo_ordinaria": saldo_ordinaria,
        "resultado_percentual": round(resultado_percentual, 2),
        "contas_complementares": contas,
        "maiores_despesas": highlights,
        "flags": {
            "locacao": False,
            "despesas_rateadas": False,
            "receitas_rateadas": False,
            "transferencia_contabil": False,
            "cotas_antecipadas": False,
        },
        "justificativa_despesas": "",
    }
    data["sugestao_texto"] = _build_text(data)
    return data
