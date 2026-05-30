"""
Datacron Storage Service (Old Model - Local/Database)
=====================================================
Handles PDF file storage with a strict 10MB limit.
Prioritizes local disk or Base64 (implemented in routers).
Supabase Storage is disabled to avoid authentication issues on VPS.
"""

import os
import uuid
import logging
from typing import Optional
from fastapi import HTTPException

import aiofiles
from app.security import resolve_storage_path

logger = logging.getLogger(__name__)

# ─── Configuration ──────────────────────────────────────────
# Supabase is disabled per user request (returning to old model)
use_supabase_storage = False
supabase_client = None

# Local storage directory (Fallback for specific legacy flows)
LOCAL_STORAGE_DIR = os.environ.get("PDF_STORAGE_PATH", "./pdfs_storage")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ─── Upload ─────────────────────────────────────────────────
async def save_file(
    file_content: bytes,
    destination_path: Optional[str] = None,
    content_type: str = "application/pdf",
) -> str:
    """
    Saves a file to local disk (Base64 storage is handled directly in routers).
    Enforces a strict 10MB limit.
    """
    if len(file_content) > MAX_FILE_SIZE:
        logger.error(f"File size exceeds 10MB limit: {len(file_content)} bytes")
        raise HTTPException(status_code=413, detail="O arquivo excede o limite de 10MB")

    if not destination_path:
        destination_path = f"{uuid.uuid4()}.pdf"

    # ── Local File System ──
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
    
    # Ensure safe path
    safe_name = os.path.basename(destination_path.replace("/", os.sep))
    full_path = os.path.join(LOCAL_STORAGE_DIR, safe_name)
    
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(file_content)
    
    logger.info(f"Saved locally: {full_path}")
    return full_path


# ─── Download ───────────────────────────────────────────────
async def get_file_content(file_path: str) -> Optional[bytes]:
    """
    Reads file content from local disk.
    """
    safe_path = resolve_storage_path(file_path)
    if safe_path.exists():
        async with aiofiles.open(safe_path, "rb") as f:
            return await f.read()

    # Try relative to storage dir
    alt_path = resolve_storage_path(os.path.basename(file_path))
    if alt_path.exists():
        async with aiofiles.open(alt_path, "rb") as f:
            return await f.read()

    logger.warning(f"File not found: {file_path}")
    return None


# ─── Signed URL (Disabled) ──────────────────────────────────
def get_signed_url(file_path: str, expires_in: int = 3600) -> Optional[str]:
    """Supabase Signed URLs are disabled in the old model."""
    return None
