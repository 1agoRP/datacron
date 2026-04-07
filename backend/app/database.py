from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

# ─── Engine Configuration ─────────────────────────────────────
# For Supabase / PgBouncer in transaction mode, we MUST:
# 1. Disable the prepared statement cache (statement_cache_size=0)
# 2. Use NullPool to avoid keeping connections open in the pooler
# 3. Ensure the URL doesn't conflict with these settings

db_url = settings.DATABASE_URL

# Robust URL cleaning for PgBouncer
if "prepared_statement_cache_size" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url += f"{separator}prepared_statement_cache_size=0"

engine = create_async_engine(
    db_url,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_callback": lambda: "",
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
