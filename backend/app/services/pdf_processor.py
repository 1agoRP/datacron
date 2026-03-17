"""
PDF Processing Service
=======================
Handles PDF unlocking (pikepdf) and data extraction (pdfplumber).
"""

import re
import io
import os
import logging
from pathlib import Path
from typing import Optional

import pikepdf
import pdfplumber

from app.config import settings

logger = logging.getLogger(__name__)


def test_pdf_password(pdf_bytes: bytes, password: str) -> bool:
    """
    Tests whether the given password successfully unlocks the PDF.
    Returns True if the PDF can be opened with the password (or is not encrypted).
    """
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password):
            return True
    except pikepdf.PasswordError:
        return False
    except Exception as e:
        logger.warning(f"Unexpected error testing PDF password: {e}")
        return False


def unlock_pdf(pdf_bytes: bytes, password: str) -> Optional[bytes]:
    """
    Attempts to unlock an encrypted PDF using the given password.
    Returns the unlocked PDF as bytes, or None on failure.
    """
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            output = io.BytesIO()
            pdf.save(output)
            output.seek(0)
            return output.read()
    except pikepdf.PasswordError:
        logger.error("PDF unlock failed: wrong password")
        return None
    except Exception as e:
        logger.error(f"PDF unlock unexpected error: {e}")
        return None


def save_pdf(pdf_bytes: bytes, filename: str) -> str:
    """
    Saves PDF bytes to the configured storage directory.
    Returns the full file path.
    """
    storage_dir = Path(settings.PDF_STORAGE_PATH)
    storage_dir.mkdir(parents=True, exist_ok=True)
    filepath = storage_dir / filename
    filepath.write_bytes(pdf_bytes)
    return str(filepath)


def extract_data(pdf_bytes: bytes) -> dict:
    """
    Extracts structured data from a (unlocked) PDF using pdfplumber.

    Returns a dict with extracted fields. Fields may be None if not found.
    Fields extracted:
    - valor: bill amount (float)
    - vencimento: due date (string YYYY-MM-DD)
    - codigo_barras: barcode number string  
    - consumo_kwh: consumption in kWh (float, for energy bills)
    - referencia: billing reference period (string)
    - numero_instalacao: installation number (string)
    """
    result = {
        "valor": None,
        "vencimento": None,
        "codigo_barras": None,
        "consumo_kwh": None,
        "referencia": None,
        "numero_instalacao": None,
        "texto_completo": None,
    }

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"

            result["texto_completo"] = full_text[:5000]  # Limit for storage

            # ─── Valor ──────────────────────────────────────────────
            # Matches: R$ 1.234,56 or 1.234,56
            valor_match = re.search(
                r"R\$\s*([\d.,]+)|TOTAL\s+A\s+PAGAR\s*:?\s*R?\$?\s*([\d.,]+)",
                full_text, re.IGNORECASE
            )
            if valor_match:
                raw = (valor_match.group(1) or valor_match.group(2) or "").replace(".", "").replace(",", ".")
                try:
                    result["valor"] = float(raw)
                except ValueError:
                    pass

            # ─── Vencimento ─────────────────────────────────────────
            # Matches: dd/mm/yyyy or yyyy-mm-dd
            venc_match = re.search(
                r"VENCIMENTO\s*:?\s*(\d{2}/\d{2}/\d{4})|(\d{4}-\d{2}-\d{2})",
                full_text, re.IGNORECASE
            )
            if venc_match:
                raw_date = venc_match.group(1) or venc_match.group(2)
                if raw_date:
                    if "/" in raw_date:
                        d, m, y = raw_date.split("/")
                        result["vencimento"] = f"{y}-{m}-{d}"
                    else:
                        result["vencimento"] = raw_date

            # ─── Código de Barras ────────────────────────────────────
            barcode_match = re.search(r"(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})", full_text)
            if barcode_match:
                result["codigo_barras"] = barcode_match.group(1).replace(" ", "")
            else:
                # Alternative: long number sequence (44 or 47 digits)
                alt_barcode = re.search(r"(\d{44,48})", full_text.replace(" ", ""))
                if alt_barcode:
                    result["codigo_barras"] = alt_barcode.group(1)

            # ─── Consumo kWh ─────────────────────────────────────────
            kwh_match = re.search(r"(\d[\d.,]+)\s*kWh", full_text, re.IGNORECASE)
            if kwh_match:
                try:
                    result["consumo_kwh"] = float(kwh_match.group(1).replace(".", "").replace(",", "."))
                except ValueError:
                    pass

            # ─── Referência ──────────────────────────────────────────
            ref_match = re.search(
                r"(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*[\s\/\-]+(\d{4})",
                full_text, re.IGNORECASE
            )
            if ref_match:
                month_map = {
                    "JAN": "Janeiro", "FEV": "Fevereiro", "MAR": "Março",
                    "ABR": "Abril", "MAI": "Maio", "JUN": "Junho",
                    "JUL": "Julho", "AGO": "Agosto", "SET": "Setembro",
                    "OUT": "Outubro", "NOV": "Novembro", "DEZ": "Dezembro",
                }
                month_abbr = ref_match.group(1)[:3].upper()
                year = ref_match.group(2)
                month_name = month_map.get(month_abbr, month_abbr)
                result["referencia"] = f"{month_name}/{year}"

            # ─── Número de Instalação ────────────────────────────────
            install_match = re.search(
                r"INSTALA[ÇC][ÃA]O\s*:?\s*(\d{6,12})|N[uú]mero\s+de\s+Instala[çc][ãa]o\s*:?\s*(\d+)",
                full_text, re.IGNORECASE
            )
            if install_match:
                result["numero_instalacao"] = install_match.group(1) or install_match.group(2)

    except Exception as e:
        logger.error(f"PDF extraction error: {e}")

    # Remove None values and return
    return {k: v for k, v in result.items() if v is not None}
