from sqlalchemy.ext.asyncio import create_async_engine
import uuid

try:
    e = create_async_engine(
        'postgresql+asyncpg://postgres:pass@localhost/db',
        connect_args={'prepared_statement_name_func': lambda: f"__stmt_{uuid.uuid4().hex}__"}
    )
    from sqlalchemy.pool import NullPool
    import asyncio

    async def main():
        try:
            async with e.begin() as conn:
                await conn.execute("SELECT 1")
        except Exception as ex:
            print("EXEC ERROR:", type(ex), ex)
    asyncio.run(main())
except Exception as ex:
    print("ERROR prep:", type(ex), ex)
