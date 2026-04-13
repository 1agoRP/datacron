"""
PDF Processing Service
=======================
Handles PDF unlocking (pikepdf), data extraction (pdfplumber), 
and OCR fallback (pytesseract) for scanned documents.
"""

import re
import io
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any

import pikepdf
import pdfplumber
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

from app.config import settings

logger = logging.getLogger(__name__)


def test_pdf_password(pdf_bytes: bytes, password: str) -> bool:
    """Tests whether the given password successfully unlocks the PDF."""
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password):
            return True
    except pikepdf.PasswordError:
        return False
    except Exception as e:
        logger.warning(f"Unexpected error testing PDF password: {e}")
        return False


def unlock_pdf(pdf_bytes: bytes, password: str) -> Optional[bytes]:
    """Attempts to unlock an encrypted PDF and returns the decrypted bytes."""
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
    """Saves PDF bytes to storage and returns the full path."""
    storage_dir = Path(settings.PDF_STORAGE_PATH)
    storage_dir.mkdir(parents=True, exist_ok=True)
    filepath = storage_dir / filename
    filepath.write_bytes(pdf_bytes)
    return str(filepath)


def extract_data(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Main extraction engine with OCR fallback.
    1. Try direct text extraction (fast, vector PDFs).
    2. If text is empty or minimal, run OCR (slower, scanned PDFs).
    """
    result = {
        "valor": None,
        "vencimento": None,
        "codigo_barras": None,
        "consumo_kwh": None,
        "referencia": None,
        "numero_instalacao": None,
        "debito_automatico": False,
        "texto_completo": None,
        "metodo": "direto"
    }


    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
            
            # Threshold check: if text is too small relative to pages, it's likely a scan
            if len(full_text.strip()) < 50:
                logger.info("Direct extraction returned minimal text. Attempting OCR fallback...")
                full_text = _run_ocr(pdf_bytes)
                result["metodo"] = "ocr"

            result["texto_completo"] = full_text[:5000]
            _parse_fields(full_text, result)

    except Exception as e:
        logger.error(f"PDF extraction error: {e}")

    # Clean results: remove None and text_completo from final dict for database storage optimization
    final_output = {k: v for k, v in result.items() if v is not None}
    return final_output


def _run_ocr(pdf_bytes: bytes) -> str:
    """Converts PDF to images and runs Tesseract OCR."""
    try:
        # Convert PDF pages to PIL images (300 DPI for better accuracy)
        images = convert_from_bytes(pdf_bytes, dpi=300)
        full_text = ""
        for img in images:
            # Use Portuguese and English languages
            page_text = pytesseract.image_to_string(img, lang='por+eng')
            full_text += page_text + "\n"
        return full_text
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return ""


def _parse_fields(text: str, result: Dict[str, Any]):
    """Regex engine for parsing standard Brazil utility bill fields."""
    
    # ─── Valor ──────────────────────────────────────────────
    # Matches: R$ 1.234,56 | Valor total R$ 123,45 | Total a pagar 45,67
    patterns_valor = [
        r"(?:R\$|TOTAL\s+A\s+PAGAR|VALOR\s+TOTAL|VALOR\s+A\s+PAGAR)[:\s]*R?\$?\s*([\d.,]+)",
        r"([\d.,]+)\s*(?:TOTAL\s+A\s+PAGAR|VALOR\s+A\s+PAGAR)", # Some layouts have amount before label
    ]
    for p in patterns_valor:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(".", "").replace(",", ".")
            try:
                # Ensure it's a valid float and not just a year (e.g. 2026)
                val = float(raw)
                if val > 1.0: # Filter out noise
                    result["valor"] = val
                    break
            except ValueError: continue

    # ─── Vencimento ─────────────────────────────────────────
    # Matches: dd/mm/yyyy | dd.mm.yyyy | dd-mm-yyyy
    patterns_venc = [
        r"VENCIMENTO[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})",
        r"PAG[AA]R\s+AT[EÉ][:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})",
    ]
    for p in patterns_venc:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            raw_date = m.group(1)
            parts = re.split(r"[/.-]", raw_date)
            if len(parts) == 3:
                d, m, y = parts
                result["vencimento"] = f"{y}-{m}-{d}"
                break

    # ─── Código de Barras ────────────────────────────────────
    # Digitable line: 12345.12345 12345.123456...
    patterns_barcode = [
        r"(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})", # Standard bank bill
        r"(\d{11}-\d\s+\d{11}-\d\s+\d{11}-\d\s+\d{11}-\d)", # Utility bill format
        r"(\d{44,48})", # Continuous numbers
    ]
    for p in patterns_barcode:
        m = re.search(p, text)
        if m:
            result["codigo_barras"] = re.sub(r"[\s.-]", "", m.group(1))
            break

    # ─── Consumo kWh ─────────────────────────────────────────
    kwh_match = re.search(r"(\d[\d.,]*)\s*(?:kWh|KWH)", text, re.IGNORECASE)
    if kwh_match:
        try:
            result["consumo_kwh"] = float(kwh_match.group(1).replace(".", "").replace(",", "."))
        except ValueError: pass

    # ─── Referência ──────────────────────────────────────────
    # Matches: JAN/2026 | MARÇO 2026 | 03/2026
    month_map = {
        "JAN": "01", "FEV": "02", "MAR": "03", "ABR": "04", "MAI": "05", "JUN": "06",
        "JUL": "07", "AGO": "08", "SET": "09", "OUT": "10", "NOV": "11", "DEZ": "12",
        "JANEIRO": "01", "FEVEREIRO": "02", "MARCO": "03", "MARÇO": "03", "ABRIL": "04", 
        "MAIO": "05", "JUNHO": "06", "JULHO": "07", "AGOSTO": "08", "SETEMBRO": "09", 
        "OUTUBRO": "10", "NOVEMBRO": "11", "DEZEMBRO": "12"
    }
    
    # ─── Special Logic: Sabesp ───
    if "SABESP" in text.upper() or "SANEAMENTO BASICO" in text.upper():
        emission_match = re.search(r"DATA\s+EMISS[AÃ]O[:\s]*(\d{2})/(\d{2})/(\d{4})", text, re.IGNORECASE)
        if emission_match:
            day = int(emission_match.group(1))
            month = int(emission_match.group(2))
            year = int(emission_match.group(3))
            
            ref_month = month
            ref_year = year
            
            if day <= 15:
                ref_month = month - 1
                if ref_month == 0:
                    ref_month = 12
                    ref_year = year - 1
            
            # Map back to month name
            month_name_map = {int(v): k for k, v in month_map.items() if len(k) > 3}
            # Fallback to Portuguese names
            month_name = month_name_map.get(ref_month, "Janeiro").capitalize()
            result["referencia"] = f"{month_name}/{ref_year}"
            logger.info(f"Sabesp reference calculated: {result['referencia']} (Emission: {day}/{month}/{year})")
            
    # Standard extraction if Sabesp logic didn't trigger or failed
    if not result["referencia"]:
        month_names = "|".join(month_map.keys())
        ref_match = re.search(rf"({month_names})[\s\/\-]+(\d{{4}})", text, re.IGNORECASE)
        if ref_match:
            m_name = ref_match.group(1).upper()
            year = ref_match.group(2)
            result["referencia"] = f"{m_name.capitalize()}/{year}"
        else:
            # Try numeric ref: mm/yyyy
            numeric_ref = re.search(r"(\d{2})\/(\d{4})", text)
            if numeric_ref:
                result["referencia"] = f"{numeric_ref.group(1)}/{numeric_ref.group(2)}"

    # ─── Débito Automático ────────────────────────────────────
    # Look for "DÉBITO AUTOMÁTICO" and analyze context
    if "DÉBITO AUTOMÁTICO" in text.upper():
        # High-confidence indicators for "Passive/Inactive" (Invitation to register)
        inactive_indicators = ["CADASTRE", "CADASTRAR", "USE O CÓDIGO", "PARA ADERIR"]
        # High-confidence indicators for "Active" (Notice of payment)
        active_indicators = ["CONSIDERAR ESTA FATURA QUITADA", "CADASTRADA EM DÉBITOautomático"]
        
        text_upper = text.upper()
        is_active = False
        
        # If it specifically says to consider it paid, it's active
        if any(ind in text_upper for ind in active_indicators):
            is_active = True
        # If it says "CADASTRE" or similar, and NOT the active indicators, it's likely inactive
        elif any(ind in text_upper for ind in inactive_indicators):
            is_active = False
        else:
            # Heuristic: if "Débito Automático" exists without invitation to join, we assume it's mention of status
            # But let's be conservative. If we find "Quitada" near it, it's active.
            is_active = False # Default to false for safety
            
        result["debito_automatico"] = is_active


    # ─── Número de Instalação ────────────────────────────────
    patterns_install = [
        r"INSTALA[ÇC][ÃA]O[:\s]*(\d{6,12})",
        r"N[UÚ]MERO\s+DO\s+CLIENTE[:\s]*(\d{6,15})",
        r"FORNECIMENTO[:\s]*(\d{6,15})",
        r"C[OÓ]DIGO\s+DO\s+USU[AÁ]RIO[:\s]*(\d{6,15})",
    ]
    for p in patterns_install:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            result["numero_instalacao"] = m.group(1)
            break
