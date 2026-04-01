from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

# Append prepared_statement_cache_size=0 to disable SQLAlchemy's prepared statement cache for PgBouncer
db_url = settings.DATABASE_URL
if "?" in db_url:
    if "prepared_statement_cache_size" not in db_url:
        db_url += "&prepared_statement_cache_size=0"
else:
    db_url += "?prepared_statement_cache_size=0"

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    poolclass=NullPool,
    connect_args={
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
