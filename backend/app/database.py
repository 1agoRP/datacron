import logging

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Engine Configuration ─────────────────────────────────────
# Supabase PgBouncer Transaction mode (port 6543) does NOT support
# PREPARE statements, which asyncpg's set_type_codec requires internally.
# Solution: Use Session mode (port 5432) which fully supports PREPARE.
# With NullPool, each request creates/destroys its own connection, so
# session mode works perfectly — server connections are released immediately.

db_url = settings.DATABASE_URL

# Ensure async driver
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Auto-switch from Transaction pooler (6543) to Session pooler (5432)
if "pooler.supabase.com:6543" in db_url:
    db_url = db_url.replace(
        "pooler.supabase.com:6543",
        "pooler.supabase.com:5432",
    )
    logger.info("Switched Supabase pooler from transaction mode (6543) to session mode (5432)")

engine = create_async_engine(
    db_url,
    poolclass=NullPool,
    connect_args={
        "server_settings": {
            "application_name": "datacron_api",
        },
    },
)

# ─── Session factory ─────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ─── Base Model ──────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ─── Dependency (used in routers) ────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
