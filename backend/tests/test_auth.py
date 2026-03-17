import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_login_fail(client: AsyncClient):
    """Test login with wrong credentials."""
    resp = await client.post("/api/auth/login", json={"email": "wrong@email.com", "senha": "123"})
    assert resp.status_code == 401
    assert "E-mail ou senha" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_auth_register_and_login(client: AsyncClient):
    """Test an e2e registration and login flow."""
    # Register
    reg_payload = {
        "nome": "New User",
        "email": "newuser@test.com",
        "senha": "mysecurepassword"
    }
    # fastapi requires query params for register:
    resp_reg = await client.post(f"/api/auth/register?nome=New User&email=newuser@test.com&senha=mysecurepassword")
    assert resp_reg.status_code == 201
    assert resp_reg.json()["email"] == "newuser@test.com"

    # Login
    login_payload = {
        "email": "newuser@test.com",
        "senha": "mysecurepassword"
    }
    resp_login = await client.post("/api/auth/login", json=login_payload)
    assert resp_login.status_code == 200
    token = resp_login.json()["access_token"]

    # Get 'me'
    resp_me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["email"] == "newuser@test.com"
