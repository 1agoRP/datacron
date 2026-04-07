import logging
import os
import fcntl
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.services.email_monitor import run_email_scan
from app.services.alert_manager import check_missing_bills
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

# Global flag to track if this process owns the scheduler lock
_scheduler_lock_fd = None


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
    Uses fcntl to ensure only ONE worker process runs the scheduler
    if multiple workers are active (e.g., Gunicorn/Uvicorn).
    """
    global _scheduler_lock_fd
    
    lock_file = "/tmp/datacron_scheduler.lock"
    try:
        # Create lock file if it doesn't exist
        if not os.path.exists(lock_file):
            open(lock_file, "w").close()
            
        _scheduler_lock_fd = open(lock_file, "r+")
        # Try to acquire an exclusive lock without blocking
        fcntl.flock(_scheduler_lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
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
        f"Scheduler started with lock. Email scan every {settings.EMAIL_POLL_INTERVAL_MINUTES} minutes."
    )


def stop_scheduler():
    """Gracefully stops the scheduler on application shutdown."""
    global _scheduler_lock_fd
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
    
    if _scheduler_lock_fd:
        try:
            fcntl.flock(_scheduler_lock_fd, fcntl.LOCK_UN)
            _scheduler_lock_fd.close()
        except:
            pass
        _scheduler_lock_fd = None
