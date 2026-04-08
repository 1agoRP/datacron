from sqlalchemy.ext.asyncio import create_async_engine
import uuid

try:
    e = create_async_engine(
        'postgresql+asyncpg://postgres:pass@localhost/db',
        client_encoding="utf8"
    )
    print("SUCCESS: other kwarg")
except Exception as ex:
    print("ERROR kw:", type(ex), ex)

try:
    e = create_async_engine(
        'postgresql+asyncpg://postgres:pass@localhost/db',
        prepared_statement_name_func=lambda: f"__stmt_{uuid.uuid4().hex}__"
    )
    print("SUCCESS: prepared_statement_name_func")
except Exception as ex:
    print("ERROR prep:", type(ex), ex)
