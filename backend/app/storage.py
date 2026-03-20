import os
import aiofiles
from fastapi import UploadFile
import structlog

logger = structlog.get_logger()

# Check if Supabase variables are present to use Storage
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "faturas")  # default bucket name

use_supabase_storage = bool(SUPABASE_URL and SUPABASE_KEY)

if use_supabase_storage:
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase storage enabled", bucket=SUPABASE_BUCKET)
    except Exception as e:
        logger.error("Failed to initialize Supabase client", error=str(e))
        use_supabase_storage = False

# Fallback local storage
LOCAL_STORAGE_DIR = os.environ.get("PDF_STORAGE_PATH", "./pdfs_storage")

async def save_file(file_content: bytes, destination_path: str | None, content_type: str = "application/pdf") -> str:
    """
    Saves a file to Supabase Storage if configured, or falls back to local disk.
    Returns the path/key where it was stored.
    """
    if not destination_path:
        import uuid
        destination_path = f"{uuid.uuid4()}.pdf"
        
    if use_supabase_storage:
        try:
            # Upload to Supabase
            res = supabase_client.storage.from_(SUPABASE_BUCKET).upload(
                path=destination_path,
                file=file_content,
                file_options={"content-type": content_type}
            )
            # If successful, return the path in the bucket
            return destination_path
        except Exception as e:
            logger.error("Error uploading to Supabase, falling back to local", error=str(e))
    
    # Local File System Fallback
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
    full_path = os.path.join(LOCAL_STORAGE_DIR, destination_path)
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(file_content)
    return full_path

async def get_file_content(file_path: str) -> bytes | None:
    """
    Retrieves file content. It determines if it's local or Supabase.
    """
    if use_supabase_storage and not file_path.startswith(LOCAL_STORAGE_DIR):
        try:
            res = supabase_client.storage.from_(SUPABASE_BUCKET).download(file_path)
            return res
        except Exception as e:
            logger.error("Error downloading from Supabase", error=str(e))
            return None
            
    # Local File System
    if os.path.exists(file_path):
        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()
    return None
