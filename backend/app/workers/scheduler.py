"""
Background Scheduler
=====================
Uses APScheduler to run background jobs without requiring Celery:
  - Every N minutes: scan Gmail inbox
  - Daily at 08:00: check for missing bills
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.services.email_monitor import run_email_scan
from app.services.alert_manager import check_missing_bills
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")


async def _run_email_scan_job():
    """Wrapper for the email scan job with error handling."""
    try:
        await run_email_scan()
    except Exception as e:
        logger.error(f"Email scan job failed: {e}")


async def _run_missing_bills_check():
    """Wrapper for the daily missing bills check."""
    try:
        async with AsyncSessionLocal() as db:
            await check_missing_bills(db)
    except Exception as e:
        logger.error(f"Missing bills check failed: {e}")


def start_scheduler():
    """
    Registers all background jobs and starts the scheduler.
    Called once on application startup.
    """
    # Email scan — every N minutes
    scheduler.add_job(
        _run_email_scan_job,
        trigger=IntervalTrigger(minutes=settings.EMAIL_POLL_INTERVAL_MINUTES),
        id="email_scan",
        name="Gmail Inbox Scan",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # Missing bills check — daily at 08:00 BRT
    scheduler.add_job(
        _run_missing_bills_check,
        trigger=CronTrigger(hour=8, minute=0),
        id="missing_bills_check",
        name="Missing Bills Daily Check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started. Email scan every {settings.EMAIL_POLL_INTERVAL_MINUTES} minutes."
    )


def stop_scheduler():
    """Gracefully stops the scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
