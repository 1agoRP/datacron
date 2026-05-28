import logging
import os
import tempfile
import sys

try:
    import fcntl
except ImportError:
    fcntl = None

try:
    import msvcrt
except ImportError:
    msvcrt = None

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.services.alert_manager import (
    check_missing_bills,
    check_mandate_expirations,
    check_document_expirations_and_clean,
    retry_pending_alert_webhooks,
)
from app.services.notebooklm_reports import process_pending_notebooklm_reports
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

# Global flag to track if this process owns the scheduler lock
_scheduler_lock_fd = None


async def _run_missing_bills_check():
    """Wrapper for the daily missing bills check."""
    try:
        async with AsyncSessionLocal() as db:
            await check_missing_bills(db)
    except Exception as e:
        logger.error(f"Missing bills check failed: {e}")


async def _run_mandate_check():
    """Wrapper for the mandate expiration check."""
    try:
        async with AsyncSessionLocal() as db:
            await check_mandate_expirations(db)
    except Exception as e:
        logger.error(f"Mandate check failed: {e}")

async def _run_document_clean_check():
    """Wrapper for the document expiration check."""
    try:
        async with AsyncSessionLocal() as db:
            await check_document_expirations_and_clean(db)
    except Exception as e:
        logger.error(f"Document expiration clean check failed: {e}")


async def _run_alert_webhook_retry():
    """Retries failed alert webhook deliveries."""
    try:
        async with AsyncSessionLocal() as db:
            await retry_pending_alert_webhooks(db)
    except Exception as e:
        logger.error(f"Alert webhook retry failed: {e}")


async def _run_notebooklm_report_worker():
    """Processes pending NotebookLM report artifacts outside the request flow."""
    try:
        async with AsyncSessionLocal() as db:
            processed = await process_pending_notebooklm_reports(db)
            if processed:
                logger.info("NotebookLM report worker processed %s report(s).", processed)
    except Exception as e:
        logger.error(f"NotebookLM report worker failed: {e}")


def start_scheduler():
    """
    Registers all background jobs and starts the scheduler.
    Uses file locking to ensure only ONE worker process runs the scheduler
    if multiple workers are active (e.g., Gunicorn/Uvicorn).
    """
    global _scheduler_lock_fd
    
    lock_file = os.path.join(tempfile.gettempdir(), "datacron_scheduler.lock")
    try:
        # Create lock file if it doesn't exist
        if not os.path.exists(lock_file):
            open(lock_file, "w").close()
            
        _scheduler_lock_fd = open(lock_file, "r+")
        
        if fcntl:
            # Unix-like locking
            fcntl.flock(_scheduler_lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        elif msvcrt:
            # Windows locking
            msvcrt.locking(_scheduler_lock_fd.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            logger.warning("No file locking mechanism available on this platform.")
            
    except (IOError, OSError):
        logger.info("Scheduler already running in another worker. Skipping start in this process.")
        if _scheduler_lock_fd:
            try:
                _scheduler_lock_fd.close()
            except:
                pass
            _scheduler_lock_fd = None
        return


    # If we got here, we own the lock
    # Missing bills check - daily at 06:00 BRT
    scheduler.add_job(
        _run_missing_bills_check,
        trigger=CronTrigger(hour=6, minute=0),
        id="missing_bills_check",
        name="Missing Bills Daily Check",
        replace_existing=True,
    )

    # Mandate check - daily at 06:00 BRT
    scheduler.add_job(
        _run_mandate_check,
        trigger=CronTrigger(hour=6, minute=0),
        id="mandate_check",
        name="Mandate Expiration Check",
        replace_existing=True,
    )

    # Document expiration cleaner - daily at 06:00 BRT
    scheduler.add_job(
        _run_document_clean_check,
        trigger=CronTrigger(hour=6, minute=0),
        id="document_clean_check",
        name="Document Expiration Cleaner",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_alert_webhook_retry,
        trigger=CronTrigger(hour=6, minute=0),
        id="alert_webhook_retry",
        name="Alert Webhook Retry",
        replace_existing=True,
        max_instances=1,
    )

    if settings.NOTEBOOKLM_ENABLED:
        scheduler.add_job(
            _run_notebooklm_report_worker,
            trigger=IntervalTrigger(minutes=max(1, settings.NOTEBOOKLM_WORKER_INTERVAL_MINUTES)),
            id="notebooklm_report_worker",
            name="NotebookLM Report Worker",
            replace_existing=True,
            max_instances=1,
        )

    scheduler.start()
    logger.info(
        "Scheduler started with lock. Daily jobs scheduled once a day at 06:00 BRT."
    )


def stop_scheduler():
    """Gracefully stops the scheduler on application shutdown."""
    global _scheduler_lock_fd
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
    
    if _scheduler_lock_fd:
        try:
            if fcntl:
                fcntl.flock(_scheduler_lock_fd, fcntl.LOCK_UN)
            elif msvcrt:
                # On Windows, just closing the file releases the lock if it was acquired via locking()
                pass
            _scheduler_lock_fd.close()
        except:
            pass
        _scheduler_lock_fd = None
