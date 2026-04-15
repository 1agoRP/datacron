from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

# ─── Engine Configuration ─────────────────────────────────────
# For Supabase / PgBouncer in transaction mode, we MUST:
# 1. Disable the prepared statement cache (statement_cache_size=0)
# 2. Use NullPool to avoid keeping connections open in the pooler

db_url = settings.DATABASE_URL
# For Supabase / PgBouncer, ensure the URL has the correct driver
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

def _get_unnamed_statement():
    return ""

engine = create_async_engine(
    db_url,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": _get_unnamed_statement,
        "max_cached_statement_lifetime": 0,
        "command_timeout": 30,
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
