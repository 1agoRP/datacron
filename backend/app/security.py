import hmac
import os
from pathlib import Path

from fastapi import Header, HTTPException, UploadFile, status

from app.config import settings

PDF_MAGIC = b"%PDF"
ZIP_MAGIC = b"PK\x03\x04"
OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _constant_time_equals(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


async def require_inbound_webhook_secret(
    x_webhook_secret: str | None = Header(default=None),
) -> None:
    try:
        expected = settings.require_secret("INBOUND_WEBHOOK_SECRET", settings.INBOUND_WEBHOOK_SECRET)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    if not x_webhook_secret or not _constant_time_equals(x_webhook_secret, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook nao autorizado. Envie o header X-Webhook-Secret.",
        )


async def require_cron_secret(
    x_cron_secret: str | None = Header(default=None),
) -> None:
    try:
        expected = settings.require_secret("CRON_SECRET", settings.CRON_SECRET)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    if not x_cron_secret or not _constant_time_equals(x_cron_secret, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="CRON nao autorizado")


def validate_pdf_bytes(content: bytes, filename: str | None = None) -> None:
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo PDF muito grande (máx. 10MB)")
    if filename and not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Apenas arquivos PDF são permitidos")
    if not content.startswith(PDF_MAGIC):
        raise HTTPException(status_code=415, detail="Conteúdo inválido: o arquivo não parece ser um PDF")


def validate_spreadsheet_bytes(content: bytes, filename: str | None = None) -> None:
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máx. 10MB)")
    lower_name = (filename or "").lower()
    if lower_name.endswith(".csv"):
        return
    if lower_name.endswith(".xlsx") and content.startswith(ZIP_MAGIC):
        return
    if lower_name.endswith(".xls") and content.startswith(OLE_MAGIC):
        return
    raise HTTPException(status_code=415, detail="Conteúdo inválido: envie CSV ou XLSX válido")


async def read_pdf_upload(file: UploadFile) -> bytes:
    content = await file.read()
    validate_pdf_bytes(content, file.filename)
    return content


def resolve_storage_path(file_path: str) -> Path:
    storage_root = Path(os.environ.get("PDF_STORAGE_PATH", settings.PDF_STORAGE_PATH)).resolve()
    candidate = Path(file_path)
    if not candidate.is_absolute():
        candidate = storage_root / candidate.name
    resolved = candidate.resolve()
    if storage_root not in (resolved, *resolved.parents):
        raise HTTPException(status_code=403, detail="Caminho de arquivo fora do storage permitido")
    return resolved
