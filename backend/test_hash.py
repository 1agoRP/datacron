import asyncio
from app.dependencies import hash_password

async def main():
    result = await hash_password('admin123')
    print(f"Hashed: {result}")

asyncio.run(main())
