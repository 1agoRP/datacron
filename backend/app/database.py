import logging

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger(__name__)

# ─── PgBouncer Transaction Mode Compatibility ────────────────
# Supabase uses PgBouncer in transaction mode (port 6543).
# asyncpg's set_type_codec() calls PREPARE internally to introspect
# JSON/JSONB types, which fails with PgBouncer transaction mode.
# Fix: monkey-patch the codec setup to skip PREPARE entirely.
# SQLAlchemy handles JSON serialization at the Python level, so this is safe.

from sqlalchemy.dialects.postgresql.asyncpg import PGDialect_asyncpg

async def _noop_json_codec(self, conn):
    """Skip asyncpg JSON codec setup to avoid PREPARE on PgBouncer."""
    pass

PGDialect_asyncpg.setup_asyncpg_json_codec = _noop_json_codec

# ─── Engine Configuration ─────────────────────────────────────

db_url = settings.DATABASE_URL

# Ensure async driver
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)


def _get_unnamed_statement():
    """Return empty string to use unnamed prepared statements (PgBouncer compatible)."""
    return ""


engine = create_async_engine(
    db_url,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": _get_unnamed_statement,
        "max_cached_statement_lifetime": 0,
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
