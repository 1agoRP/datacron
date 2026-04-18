import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_trigger_email_scan(auth_client: AsyncClient):
    """Test the manual trigger endpoint for email scanning."""
    resp = await auth_client.post("/api/emails/forcar-varredura")
    # It might return a background task confirmation
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert "Varredura iniciada" in data["message"]

@pytest.mark.asyncio
async def test_list_logs_empty(auth_client: AsyncClient):
    """Test listing email logs with an empty db."""
    resp = await auth_client.get("/api/emails/logs")
    assert resp.status_code == 200
    assert resp.json() == []

