import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import verify_password
from app.models.user import User

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


@pytest.mark.asyncio
async def test_forgot_password_updates_hash_and_sends_email(
    client: AsyncClient,
    auth_client: AsyncClient,
    db_session: AsyncSession,
):
    await auth_client.post("/api/auth/register", json={
        "nome": "Reset User",
        "email": "reset@test.com",
        "senha": "oldpassword123",
        "role": "geral",
    })

    with patch("app.routers.auth.send_notification_email", new_callable=AsyncMock) as send_email:
        send_email.return_value = True
        resp = await client.post("/api/auth/forgot-password", json={"email": "reset@test.com"})

    assert resp.status_code == 200
    assert "nova senha" in resp.json()["message"]
    send_email.assert_awaited_once()
    kwargs = send_email.await_args.kwargs
    assert kwargs["to"] == "reset@test.com"
    assert kwargs["tipo"] == "transacional"

    user = (await db_session.execute(select(User).where(User.email == "reset@test.com"))).scalar_one()
    assert not await verify_password("oldpassword123", user.senha_hash)
    temporary_password = kwargs["message_text"].split(": ", 1)[1]
    assert await verify_password(temporary_password, user.senha_hash)


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_is_generic(client: AsyncClient):
    with patch("app.routers.auth.send_notification_email", new_callable=AsyncMock) as send_email:
        resp = await client.post("/api/auth/forgot-password", json={"email": "missing@test.com"})

    assert resp.status_code == 200
    assert "nova senha" in resp.json()["message"]
    send_email.assert_not_awaited()


@pytest.mark.asyncio
async def test_forgot_password_database_unavailable_returns_503(
    client: AsyncClient,
    db_session: AsyncSession,
):
    with patch.object(
        db_session,
        "execute",
        new_callable=AsyncMock,
        side_effect=OSError("database unavailable"),
    ):
        resp = await client.post("/api/auth/forgot-password", json={"email": "reset@test.com"})

    assert resp.status_code == 503
    assert "temporariamente indisponivel" in resp.json()["detail"]
