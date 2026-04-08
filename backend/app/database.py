from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

import uuid

# ─── Engine Configuration ─────────────────────────────────────
# For Supabase / PgBouncer in transaction mode, we MUST:
# 1. Disable the prepared statement cache (statement_cache_size=0)
# 2. Use NullPool to avoid keeping connections open in the pooler
# 3. Use prepared_statement_name_func to avoid naming collisions

engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    connect_args={
        "server_settings": {
            "application_name": "datacron_api",
        },
        "statement_cache_size": 0,
    },
    prepared_statement_name_func=lambda: f"__asyncpg_{uuid.uuid4().hex}__",
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
