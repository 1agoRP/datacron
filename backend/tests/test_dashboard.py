"""
Dashboard API Tests
====================
Tests the dashboard statistics, chart data, and contas esperadas endpoints.
"""

import pytest
import uuid
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_stats_empty(auth_client: AsyncClient):
    """Dashboard stats should return valid structure even with no data."""
    resp = await auth_client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "condominios_count" in data
    assert "active_alerts" in data
    assert "recebidas_hoje" in data
    assert "total_faturado" in data
    assert data["condominios_count"] == 0


@pytest.mark.asyncio
async def test_dashboard_chart_empty(auth_client: AsyncClient):
    """Chart endpoint should return empty list with no data."""
    resp = await auth_client.get("/api/dashboard/chart?meses=6&agrupar=mes")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_dashboard_chart_invalid_params(auth_client: AsyncClient):
    """Chart endpoint should handle edge case params gracefully."""
    resp = await auth_client.get("/api/dashboard/chart?meses=0&agrupar=mes")
    assert resp.status_code in (200, 422)  # Either graceful empty or validation error


@pytest.mark.asyncio
async def test_dashboard_contas_esperadas(auth_client: AsyncClient):
    """Contas esperadas endpoint should return valid structure."""
    resp = await auth_client.get("/api/dashboard/contas-esperadas")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, (list, dict))


@pytest.mark.asyncio
async def test_dashboard_stats_with_data(auth_client: AsyncClient):
    """Dashboard stats should update after adding a condomínio."""
    # Create a condo
    uid = uuid.uuid4().hex[:4]
    resp_create = await auth_client.post("/api/condominios", json={
        "nome": f"Dashboard Test {uid}",
        "numero": f"DT{uid}",
        "endereco": "Av. Teste",
        "cnpj": "11.222.333/0001-81",
        "sindico": "Teste"
    })
    assert resp_create.status_code == 201

    # Check stats
    resp = await auth_client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["condominios_count"] >= 1
