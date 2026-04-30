"""
Advanced Auth & RBAC Tests
============================
Tests role-based access control, permission checks, password validation,
and JWT token handling beyond basic login/register.
"""

import pytest
import uuid
from httpx import AsyncClient
from unittest.mock import AsyncMock

from app.models.user import User, VALID_ROLES, ROLES_READ_ONLY, ROLES_FULL_ACCESS
from app.dependencies import get_current_user
from app.main import app


# ─── Role Model Tests ───────────────────────────────────────


class TestUserModel:

    def test_admin_is_admin(self):
        user = User(id=uuid.uuid4(), nome="Admin", email="admin@test.com",
                    senha_hash="hash", role="admin")
        assert user.is_admin is True
        assert user.can_write is True
        assert user.is_read_only is False

    def test_geral_is_read_only(self):
        user = User(id=uuid.uuid4(), nome="Geral", email="geral@test.com",
                    senha_hash="hash", role="geral")
        assert user.is_admin is False
        assert user.can_write is False
        assert user.is_read_only is True

    def test_gerencia_can_write(self):
        user = User(id=uuid.uuid4(), nome="Gerente", email="gerente@test.com",
                    senha_hash="hash", role="gerencia")
        assert user.is_admin is False
        assert user.can_write is True
        assert user.is_read_only is False

    def test_admin_has_all_module_access(self):
        user = User(id=uuid.uuid4(), nome="Admin", email="admin@test.com",
                    senha_hash="hash", role="admin")
        assert user.has_module_access("relatorios") is True
        assert user.has_module_access("importacoes") is True
        assert user.has_module_access("gmail") is True
        assert user.has_module_access("notificacoes") is True

    def test_geral_blocked_from_admin_modules(self):
        user = User(id=uuid.uuid4(), nome="User", email="user@test.com",
                    senha_hash="hash", role="geral")
        assert user.has_module_access("relatorios") is False
        assert user.has_module_access("importacoes") is False
        assert user.has_module_access("gmail") is False

    def test_gerencia_has_gmail_access(self):
        """Gerência and assistente should have gmail module access."""
        user = User(id=uuid.uuid4(), nome="Gerente", email="g@test.com",
                    senha_hash="hash", role="gerencia")
        assert user.has_module_access("gmail") is True

    def test_all_read_only_roles_are_correct(self):
        """Verify all read-only roles are consistent."""
        for role in ROLES_READ_ONLY:
            user = User(id=uuid.uuid4(), nome="Test", email=f"{role}@test.com",
                        senha_hash="hash", role=role)
            assert user.is_read_only is True
            assert user.can_write is False


# ─── API Auth Tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_403(client: AsyncClient):
    """Requests without token should be rejected."""
    resp = await client.get("/api/condominios")
    assert resp.status_code == 403  # Bearer scheme returns 403 when no token


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient):
    """Requests with invalid JWT should be rejected."""
    resp = await client.get(
        "/api/condominios",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_read_only_user_cannot_create(client: AsyncClient):
    """A read-only user should get 403 when trying to create resources."""
    read_only_user = User(
        id=uuid.uuid4(),
        nome="Read Only",
        email="readonly@test.com",
        senha_hash="dummy",
        role="geral",
        ativo=True,
    )

    async def override_auth():
        return read_only_user

    app.dependency_overrides[get_current_user] = override_auth

    resp = await client.post("/api/condominios", json={
        "nome": "Test", "numero": "001", "endereco": "R. Teste",
        "cnpj": "11.222.333/0001-81", "sindico": "Test"
    })
    # Should be blocked by require_write() dependency
    assert resp.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_register_requires_admin(client: AsyncClient):
    """Non-admin user should NOT be able to register new users."""
    non_admin_user = User(
        id=uuid.uuid4(),
        nome="Assistente",
        email="assist@test.com",
        senha_hash="dummy",
        role="assistente",
        ativo=True,
    )

    async def override_auth():
        return non_admin_user

    app.dependency_overrides[get_current_user] = override_auth

    resp = await client.post("/api/auth/register", json={
        "nome": "New User",
        "email": "new@test.com",
        "senha": "securepassword123",
        "role": "geral"
    })
    assert resp.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_password_too_short_rejected(auth_client: AsyncClient):
    """Passwords under 8 characters should be rejected."""
    resp = await auth_client.post("/api/auth/register", json={
        "nome": "Short Pass",
        "email": "short@test.com",
        "senha": "abc",  # Too short
        "role": "geral"
    })
    assert resp.status_code == 422
    assert "8 caracteres" in str(resp.json())


@pytest.mark.asyncio
async def test_duplicate_email_rejected(auth_client: AsyncClient):
    """Registering with the same email twice should fail."""
    payload = {
        "nome": "First User",
        "email": "duplicate@test.com",
        "senha": "securepassword123",
        "role": "geral"
    }
    resp1 = await auth_client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await auth_client.post("/api/auth/register", json=payload)
    assert resp2.status_code == 409
    assert "já cadastrado" in resp2.json()["detail"]
