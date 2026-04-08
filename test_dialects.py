from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
import asyncio

async def main():
    try:
        e = create_async_engine(
            'postgresql+asyncpg://postgres:pass@localhost/db?prepared_statement_cache_size=0',
            poolclass=NullPool,
            connect_args={
                "statement_cache_size": 0
            }
        )
        async with e.begin() as conn:
            await conn.execute("SELECT 1")
    except Exception as e:
        print("ERROR:", type(e), str(e))

asyncio.run(main())
