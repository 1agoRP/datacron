import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    e = create_async_engine(
        'postgresql+asyncpg://postgres:postgres@localhost:5432/postgres', 
        connect_args={
            'prepared_statement_name_func': lambda: "", 
            'statement_cache_size': 0
        }
    )
    try:
        async with e.begin() as conn:
            await conn.execute(text('SELECT 1'))
            print("SUCCESS")
    except Exception as ex:
        print(f"FAILED: {ex}")

asyncio.run(main())
