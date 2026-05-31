import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.security import require_cron_secret

from app.services.alert_manager import (
    check_missing_bills,
    check_mandate_expirations,
    check_document_expirations_and_clean
)
from app.services.alert_test_payloads import build_test_alert_payloads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cron", tags=["CRON"])
schedule_router = APIRouter(prefix="/schedule", tags=["CRON"])
scheduler_router = APIRouter(prefix="/scheduler", tags=["CRON"])

@router.get("/daily-checks")
@schedule_router.get("/daily-checks")
@scheduler_router.get("/daily-checks")
async def run_daily_checks(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_cron_secret),
    test_alerts: bool = Query(
        False,
        description="Gera payloads ficticios de todos os alertas com dados reais do banco para testar o n8n.",
    ),
):
    """
    Endpoint triggered by an external scheduler (like n8n) daily 
    to run routine checks (missing bills, mandate expirations, etc.).
    """
    logger.info("Starting daily CRON checks via webhook...")
    
    try:
        if test_alerts:
            alert_payloads = await build_test_alert_payloads(db)
            logger.info("Daily CRON test payloads generated successfully.")
            return {
                "status": "success",
                "mode": "test_alerts",
                "message": "Synthetic alert payloads generated from real database data.",
                "total_alertas": len(alert_payloads),
                "alertas": alert_payloads,
            }

        alert_payloads = []
        alert_payloads.extend(await check_missing_bills(db))
        alert_payloads.extend(await check_mandate_expirations(db))
        await check_document_expirations_and_clean(db)
        
        logger.info("Daily CRON checks completed successfully.")
        return {
            "status": "success",
            "message": "Daily checks completed.",
            "total_alertas": len(alert_payloads),
            "alertas": alert_payloads,
        }
    except Exception as e:
        logger.error(f"Error during daily CRON checks: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}
