"""
Contract PDF Processing Service
================================
Extracts structured data from contract PDFs using pdfplumber + regex heuristics.
Returns field suggestions with confidence levels for auto-fill.
"""

import re
import io
import logging
from typing import Optional

import pdfplumber

logger = logging.getLogger(__name__)

# Mapping of contract type keywords
CONTRACT_TYPE_KEYWORDS = {
    "Manutenção de Elevadores": ["elevador", "elevadores", "atlas", "thyssenkrupp", "schindler", "otis"],
    "Bombas": ["bomba", "bombas", "hidráulica", "hidraulica", "motobomba"],
    "Portaria": ["portaria", "porteiro", "controle de acesso", "vigilância", "vigilancia"],
    "Limpeza": ["limpeza", "conservação", "conservacao", "faxina", "higienização"],
    "Segurança": ["segurança", "seguranca", "monitoramento", "cftv", "alarme", "vigilância"],
}

# Adjustment index keywords
INDEX_KEYWORDS = {
    "IGPM": ["igpm", "igp-m", "igp m"],
    "IPCA": ["ipca"],
    "INCC": ["incc", "incc-di"],
    "IGP-DI": ["igp-di", "igpdi"],
}

PERIODICITY_KEYWORDS = {
    "mensal": ["mensal", "mensalmente", "mês a mês", "mes a mes"],
    "bimestral": ["bimestral", "bimestralmente"],
    "trimestral": ["trimestral", "trimestralmente"],
    "semestral": ["semestral", "semestralmente"],
    "anual": ["anual", "anualmente", "ano a ano"],
}


def _make_suggestion(value, confidence: str = "media") -> dict:
    """Wrap a value with confidence metadata."""
    return {"valor": value, "confianca": confidence}


def extract_contract_data(pdf_bytes: bytes) -> dict:
    """
    Extracts structured data from a contract PDF.
    
    Returns a dict where each key maps to:
      { "valor": <extracted value>, "confianca": "alta"|"media"|"baixa" }
    """
    result = {}

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"

            text_lower = full_text.lower()

            # ─── Empresa Contratada ────────────────────────────
            # Look for "CONTRATADA:" pattern
            empresa_match = re.search(
                r"CONTRATAD[AO]\s*:?\s*([^\n,]{5,80})",
                full_text, re.IGNORECASE
            )
            if empresa_match:
                empresa = empresa_match.group(1).strip().rstrip(".,;")
                result["empresa"] = _make_suggestion(empresa, "alta")
            else:
                # Fallback: look for RAZÃO SOCIAL or company patterns
                razao_match = re.search(
                    r"RAZ[ÃA]O\s+SOCIAL\s*:?\s*([^\n,]{5,80})",
                    full_text, re.IGNORECASE
                )
                if razao_match:
                    result["empresa"] = _make_suggestion(razao_match.group(1).strip(), "media")

            # ─── Tipo de Contrato ──────────────────────────────
            for tipo, keywords in CONTRACT_TYPE_KEYWORDS.items():
                for kw in keywords:
                    if kw in text_lower:
                        result["tipo_contrato"] = _make_suggestion(tipo, "alta" if text_lower.count(kw) > 1 else "media")
                        break
                if "tipo_contrato" in result:
                    break

            # ─── Datas de Vigência ─────────────────────────────
            # Pattern: dd/mm/yyyy
            date_pattern = r"(\d{2}/\d{2}/\d{4})"
            all_dates = re.findall(date_pattern, full_text)

            # Look for explicit vigência section
            vigencia_match = re.search(
                r"VIG[ÊE]NCIA\s*:?\s*(?:de\s+)?(\d{2}/\d{2}/\d{4})\s*(?:a|até|à)\s*(\d{2}/\d{2}/\d{4})",
                full_text, re.IGNORECASE
            )
            if vigencia_match:
                result["data_inicio"] = _make_suggestion(
                    _parse_date_br(vigencia_match.group(1)), "alta"
                )
                result["data_fim"] = _make_suggestion(
                    _parse_date_br(vigencia_match.group(2)), "alta"
                )
            elif len(all_dates) >= 2:
                # Try to find dates near "início" and "término"
                inicio_match = re.search(
                    r"IN[ÍI]CIO\s*:?\s*(\d{2}/\d{2}/\d{4})", full_text, re.IGNORECASE
                )
                fim_match = re.search(
                    r"T[ÉE]RMINO\s*:?\s*(\d{2}/\d{2}/\d{4})|FIM\s*:?\s*(\d{2}/\d{2}/\d{4})",
                    full_text, re.IGNORECASE
                )
                if inicio_match:
                    result["data_inicio"] = _make_suggestion(
                        _parse_date_br(inicio_match.group(1)), "alta"
                    )
                if fim_match:
                    raw = fim_match.group(1) or fim_match.group(2)
                    result["data_fim"] = _make_suggestion(_parse_date_br(raw), "alta")

                # Fallback: use first two dates if nothing explicit found
                if "data_inicio" not in result and all_dates:
                    result["data_inicio"] = _make_suggestion(
                        _parse_date_br(all_dates[0]), "baixa"
                    )
                if "data_fim" not in result and len(all_dates) >= 2:
                    result["data_fim"] = _make_suggestion(
                        _parse_date_br(all_dates[-1]), "baixa"
                    )

            # ─── Valores ───────────────────────────────────────
            valor_matches = re.findall(
                r"R\$\s*([\d.,]+)", full_text
            )
            if valor_matches:
                values = []
                for raw in valor_matches:
                    try:
                        v = float(raw.replace(".", "").replace(",", "."))
                        if v > 0:
                            values.append(v)
                    except ValueError:
                        pass

                if values:
                    # Look for value near keywords
                    valor_contrato_match = re.search(
                        r"(?:VALOR\s+(?:DO\s+)?CONTRATO|VALOR\s+MENSAL|VALOR\s+TOTAL)\s*:?\s*R\$\s*([\d.,]+)",
                        full_text, re.IGNORECASE
                    )
                    if valor_contrato_match:
                        try:
                            v = float(valor_contrato_match.group(1).replace(".", "").replace(",", "."))
                            result["valor_inicial"] = _make_suggestion(v, "alta")
                            result["valor_atual"] = _make_suggestion(v, "alta")
                        except ValueError:
                            pass
                    else:
                        # Use the most common or largest value as a guess
                        main_value = max(values)
                        result["valor_inicial"] = _make_suggestion(main_value, "baixa")
                        result["valor_atual"] = _make_suggestion(main_value, "baixa")

            # ─── Índice de Reajuste ────────────────────────────
            for indice, keywords in INDEX_KEYWORDS.items():
                for kw in keywords:
                    if kw in text_lower:
                        result["indice_reajuste"] = _make_suggestion(indice, "alta")
                        break
                if "indice_reajuste" in result:
                    break

            # ─── Periodicidade ─────────────────────────────────
            for periodo, keywords in PERIODICITY_KEYWORDS.items():
                for kw in keywords:
                    if kw in text_lower:
                        result["periodicidade"] = _make_suggestion(periodo, "media")
                        break
                if "periodicidade" in result:
                    break

    except Exception as e:
        logger.error(f"Contract PDF extraction error: {e}")

    return result


def _parse_date_br(date_str: str) -> Optional[str]:
    """Converts dd/mm/yyyy to yyyy-mm-dd string."""
    try:
        parts = date_str.strip().split("/")
        if len(parts) == 3:
            d, m, y = parts
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except Exception:
        pass
    return date_str
