"""
Supabase Storage Service
========================
Handles PDF file upload and download via Supabase Storage buckets.
Falls back to local disk when Supabase credentials are not configured.
"""

import os
import uuid
import logging
from typing import Optional

import aiofiles

logger = logging.getLogger(__name__)

# ─── Configuration ──────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "faturas")

use_supabase_storage = bool(SUPABASE_URL and SUPABASE_KEY)
supabase_client = None

if use_supabase_storage:
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info(f"Supabase Storage enabled – bucket: {SUPABASE_BUCKET}")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        use_supabase_storage = False

# Fallback local storage
LOCAL_STORAGE_DIR = os.environ.get("PDF_STORAGE_PATH", "./pdfs_storage")


# ─── Upload ─────────────────────────────────────────────────
async def save_file(
    file_content: bytes,
    destination_path: Optional[str] = None,
    content_type: str = "application/pdf",
) -> str:
    """
    Saves a file to Supabase Storage (preferred) or local disk (fallback).

    Args:
        file_content: Raw file bytes.
        destination_path: The key/path inside the bucket (e.g. "condominios/0042/fatura_abc.pdf").
        content_type: MIME type of the file.

    Returns:
        The storage key (Supabase) or local file path (fallback).
    """
    if not destination_path:
        destination_path = f"{uuid.uuid4()}.pdf"

    if use_supabase_storage and supabase_client:
        try:
            supabase_client.storage.from_(SUPABASE_BUCKET).upload(
                path=destination_path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "upsert": "true",  # Overwrite if same path exists
                },
            )
            logger.info(f"Uploaded to Supabase Storage: {destination_path}")
            return destination_path
        except Exception as e:
            logger.error(f"Supabase upload failed, falling back to local: {e}")

    # ── Local File System Fallback ──
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
    full_path = os.path.join(LOCAL_STORAGE_DIR, destination_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(file_content)
    logger.info(f"Saved locally: {full_path}")
    return full_path


# ─── Download ───────────────────────────────────────────────
async def get_file_content(file_path: str) -> Optional[bytes]:
    """
    Downloads file content from Supabase Storage or local disk.

    Args:
        file_path: The storage key (Supabase) or local file path.

    Returns:
        File bytes or None if not found.
    """
    # Try Supabase first if enabled and path looks like a storage key (not a local path)
    if use_supabase_storage and supabase_client and not os.path.isabs(file_path):
        try:
            res = supabase_client.storage.from_(SUPABASE_BUCKET).download(file_path)
            logger.info(f"Downloaded from Supabase Storage: {file_path}")
            return res
        except Exception as e:
            logger.warning(f"Supabase download failed for '{file_path}': {e}")

    # Local File System
    if os.path.exists(file_path):
        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()

    logger.warning(f"File not found: {file_path}")
    return None


# ─── Signed URL (for direct browser downloads) ─────────────
def get_signed_url(file_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generates a temporary signed URL for direct download from Supabase Storage.

    Args:
        file_path: The storage key inside the bucket.
        expires_in: URL validity in seconds (default: 1 hour).

    Returns:
        Signed URL string or None.
    """
    if not use_supabase_storage or not supabase_client:
        return None

    try:
        result = supabase_client.storage.from_(SUPABASE_BUCKET).create_signed_url(
            file_path, expires_in
        )
        return result.get("signedURL") or result.get("signedUrl")
    except Exception as e:
        logger.error(f"Failed to create signed URL for '{file_path}': {e}")
        return None
