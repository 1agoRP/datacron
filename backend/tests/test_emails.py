import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_list_logs_empty(auth_client: AsyncClient):
    """Test listing email logs with an empty db."""
    resp = await auth_client.get("/api/emails/logs")
    assert resp.status_code == 200
    assert resp.json() == []
