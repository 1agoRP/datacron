"""
Fornecedores Router
===================
API endpoints for querying and managing the database_fornecedores table.
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger("datacron.fornecedores")

router = APIRouter(prefix="/fornecedores", tags=["Fornecedores"])

# ─── Roles allowed to write (create/update) fornecedores ─────────────────────
WRITE_ROLES = {"admin", "gerencia", "assistente"}


class FornecedorCreate(BaseModel):
    documentoFornecedor: str
    nomeFornecedor: str
    emailFornecedor: Optional[str] = None
    whatsappFornecedor: Optional[str] = None
    categoriaFornecedor: Optional[str] = None


class FornecedorResponse(BaseModel):
    id: str
    documentoFornecedor: Optional[str] = None
    nomeFornecedor: Optional[str] = None
    emailFornecedor: Optional[str] = None
    whatsappFornecedor: Optional[str] = None
    categoriaFornecedor: Optional[str] = None
    administradora: Optional[str] = None
    status: Optional[str] = None


def _normalize_cnpj(cnpj: str) -> str:
    """Strip formatting characters from CNPJ for comparison."""
    return "".join(filter(str.isdigit, cnpj))


def _cnpj_matches(stored: Optional[str], query: str) -> bool:
    """Compare two CNPJs ignoring formatting."""
    if not stored:
        return False
    return _normalize_cnpj(stored) == _normalize_cnpj(query)


@router.get("/buscar-cnpj")
async def buscar_por_cnpj(
    cnpj: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search database_fornecedores by CNPJ.
    Returns the supplier data if found, or 404 if not.
    """
    if not cnpj:
        raise HTTPException(status_code=400, detail="CNPJ é obrigatório")

    digits = _normalize_cnpj(cnpj)
    if len(digits) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos")

    # Search with and without formatting variations
    result = await db.execute(
        text("""
            SELECT
                id::text,
                "documentoFornecedor",
                "nomeFornecedor",
                "e-mailFornecedor" AS "emailFornecedor",
                "whatsappFornecedor",
                "categoriaFornecedor",
                administradora,
                status
            FROM database_fornecedores
            WHERE regexp_replace("documentoFornecedor", '[^0-9]', '', 'g') = :digits
            LIMIT 1
        """),
        {"digits": digits},
    )
    row = result.mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    return dict(row)


@router.get("/categorias")
async def listar_categorias(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns a deduplicated list of all categoriaFornecedor codes."""
    result = await db.execute(
        text("""
            SELECT DISTINCT "categoriaFornecedor"
            FROM database_fornecedores
            WHERE "categoriaFornecedor" IS NOT NULL
            ORDER BY "categoriaFornecedor"
        """)
    )
    raw = [r[0] for r in result.fetchall() if r[0]]

    # Explode comma-separated values into individual unique codes
    codes: set[str] = set()
    for entry in raw:
        for code in entry.split(","):
            code = code.strip()
            if code:
                codes.add(code)

    return sorted(codes)


@router.post("/", status_code=201)
async def criar_fornecedor(
    body: FornecedorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new supplier in database_fornecedores.
    Restricted to admin, gerencia and assistente roles.
    """
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Apenas Admin, Gerente e Assistente podem cadastrar fornecedores.",
        )

    # Check if CNPJ already exists
    digits = _normalize_cnpj(body.documentoFornecedor)
    existing = await db.execute(
        text("""
            SELECT id FROM database_fornecedores
            WHERE regexp_replace("documentoFornecedor", '[^0-9]', '', 'g') = :digits
            LIMIT 1
        """),
        {"digits": digits},
    )
    if existing.one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Já existe um fornecedor cadastrado com este CNPJ.",
        )

    # Derive administradora from current user
    administradora = current_user.administradora or "Prop Starter"

    new_id = str(uuid.uuid4())

    await db.execute(
        text("""
            INSERT INTO database_fornecedores (
                id,
                "documentoFornecedor",
                "nomeFornecedor",
                "e-mailFornecedor",
                "whatsappFornecedor",
                "categoriaFornecedor",
                administradora,
                status,
                created_at
            ) VALUES (
                :id::uuid,
                :documento,
                :nome,
                :email,
                :whatsapp,
                :categoria,
                :administradora,
                'ATIVO',
                NOW()
            )
        """),
        {
            "id": new_id,
            "documento": body.documentoFornecedor,
            "nome": body.nomeFornecedor,
            "email": body.emailFornecedor,
            "whatsapp": body.whatsappFornecedor,
            "categoria": body.categoriaFornecedor,
            "administradora": administradora,
        },
    )
    await db.commit()

    return {
        "id": new_id,
        "documentoFornecedor": body.documentoFornecedor,
        "nomeFornecedor": body.nomeFornecedor,
        "emailFornecedor": body.emailFornecedor,
        "whatsappFornecedor": body.whatsappFornecedor,
        "categoriaFornecedor": body.categoriaFornecedor,
        "administradora": administradora,
        "status": "ATIVO",
    }
