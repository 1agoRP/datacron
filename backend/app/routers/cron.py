import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

from app.services.alert_manager import (
    check_missing_bills,
    check_mandate_expirations,
    check_document_expirations_and_clean
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cron", tags=["CRON"])

@router.get("/daily-checks")
async def run_daily_checks(db: AsyncSession = Depends(get_db)):
    """
    Endpoint triggered by an external scheduler (like n8n) daily 
    to run routine checks (missing bills, mandate expirations, etc.).
    """
    logger.info("Starting daily CRON checks via webhook...")
    
    try:
        await check_missing_bills(db)
        await check_mandate_expirations(db)
        await check_document_expirations_and_clean(db)
        
        logger.info("Daily CRON checks completed successfully.")
        return {"status": "success", "message": "Daily checks completed."}
    except Exception as e:
        logger.error(f"Error during daily CRON checks: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}
