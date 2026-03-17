import asyncio
import asyncpg
from urllib.parse import urlparse

# Connect to the default 'postgres' database to create the test database
async def setup_test_db():
    try:
        conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
        # Check if database exists
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'datacron_test'")
        if not exists:
            await conn.execute('CREATE DATABASE datacron_test')
            print("Database datacron_test created.")
        else:
            print("Database datacron_test already exists.")
        await conn.close()
    except Exception as e:
        print(f"Error creating test database: {e}")

asyncio.run(setup_test_db())
