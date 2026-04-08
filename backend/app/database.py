from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

# ─── Engine Configuration ─────────────────────────────────────
# For Supabase / PgBouncer in transaction mode, we MUST:
# 1. Disable the prepared statement cache (statement_cache_size=0)
# 2. Use NullPool to avoid keeping connections open in the pooler

db_url = settings.DATABASE_URL
if "prepared_statement_cache_size" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url += f"{separator}prepared_statement_cache_size=0"

engine = create_async_engine(
    db_url,
    poolclass=NullPool,
    connect_args={
        "server_settings": {
            "application_name": "datacron_api",
        },
        "statement_cache_size": 0,
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
