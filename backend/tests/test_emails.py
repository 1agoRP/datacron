import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_trigger_email_scan(auth_client: AsyncClient):
    """Test the manual trigger endpoint for email scanning."""
    resp = await auth_client.post("/api/emails/scan")
    # It might return a background task confirmation
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] == "Varredura iniciada em background"

@pytest.mark.asyncio
async def test_list_logs_empty(auth_client: AsyncClient):
    """Test listing email logs with an empty db."""
    resp = await auth_client.get("/api/emails/logs")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_reprocess_invalid_email(auth_client: AsyncClient):
    """Try to reprocess a non-existing email log."""
    invalid_id = str(uuid.uuid4())
    resp = await auth_client.post(f"/api/emails/{invalid_id}/reprocessar")
    assert resp.status_code == 404
    assert "Log não encontrado" in resp.json()["detail"]
