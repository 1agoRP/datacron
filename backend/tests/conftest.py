import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
import uuid

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.dependencies import get_current_user

# Setup in-memory SQLite for testing
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    pool_pre_ping=True,
    pool_recycle=1800,
)
TestingSessionLocal = async_sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=AsyncSession
)

@pytest_asyncio.fixture(scope="function", autouse=True)
async def create_tables():
    """Create tables before the test suite runs and drop them after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Fixture to provide a database session for a single test."""
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """Fixture to provide an AsyncClient hooked up to the FastAPI app 
    with overridden get_db dependency."""
    async def override_get_db() -> AsyncSession:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    app.dependency_overrides.clear()

@pytest.fixture
def test_user():
    """Fixture representing a mocked test user."""
    return User(
        id=uuid.uuid4(),
        nome="Teste User",
        email="teste@propstarter.com.br",
        senha_hash="dummy_hash",
        role="admin",
        ativo=True,
    )

@pytest.fixture
def auth_client(client: AsyncClient, test_user: User):
    """Fixture that overrides auth dependency to bypass JWT checking and returns an authenticated client."""
    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    yield client
    # Overrides are cleared in the client fixture
