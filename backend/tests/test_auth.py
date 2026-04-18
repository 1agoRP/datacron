import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_login_fail(client: AsyncClient):
    """Test login with wrong credentials."""
    resp = await client.post("/api/auth/login", json={"email": "wrong@email.com", "senha": "123"})
    assert resp.status_code == 401
    assert "E-mail ou senha" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_auth_register_by_admin(auth_client: AsyncClient):
    """Test that an admin can register a new user."""
    reg_payload = {
        "nome": "New User",
        "email": "newuser@test.com",
        "senha": "mysecurepassword",
        "role": "geral"
    }
    resp_reg = await auth_client.post("/api/auth/register", json=reg_payload)
    assert resp_reg.status_code == 201
    assert resp_reg.json()["email"] == "newuser@test.com"
