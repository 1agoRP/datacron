import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, func, extract, text, or_, and_, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

# ─── Password hashing ────────────────────────────────────────
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"], 
    deprecated="auto"
)
bearer_scheme = HTTPBearer()


async def hash_password(password: str) -> str:
    """Hash password in a threadpool to avoid blocking the async event loop."""
    loop = asyncio.get_event_loop()
    encoded = password.encode("utf-8") if isinstance(password, str) else password
    return await loop.run_in_executor(None, pwd_context.hash, encoded)


async def verify_password(plain: str, hashed: str) -> bool:
    """Verify password in a threadpool to avoid blocking the async event loop."""
    loop = asyncio.get_event_loop()
    encoded = plain.encode("utf-8") if isinstance(plain, str) else plain
    return await loop.run_in_executor(None, pwd_context.verify, encoded, hashed)


# ─── JWT ─────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Dependency: current user ────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    try:
        user_uuid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user or not user.ativo:
        raise HTTPException(status_code=401, detail="Usuário não encontrado ou inativo")
    return user


def require_role(*roles: str):
    """Dependency factory for role-based access control."""
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Permissão insuficiente")
        return user
    return _check


def require_write():
    """Dependency that blocks read-only roles from write operations."""
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.is_read_only:
            raise HTTPException(status_code=403, detail="Seu perfil não permite edições")
        return user
    return _check


def require_module(module: str):
    """Dependency that blocks non-admin roles from restricted modules."""
    async def _check(user: User = Depends(get_current_user)) -> User:
        if not user.has_module_access(module):
            raise HTTPException(status_code=403, detail=f"Acesso ao módulo '{module}' restrito ao administrador")
        return user
    return _check


async def get_user_condo_ids(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[uuid.UUID] | None:
    """Returns list of condominio IDs the user can access.
    Returns None if the user is admin (unrestricted access)."""
    if user.role == "admin":
        return None

    from app.models.condominio import Condominio
    from app.models.user_condominio import UserCondominio
    
    final_ids = set()

    # 1. Tentar buscar da coluna unificada codigo_condominio (carteira)
    if user.codigo_condominio:
        try:
            codigo_str = user.codigo_condominio
            if "todos" in codigo_str.lower():
                return None
                
            codes = [c.strip() for c in codigo_str.split(",") if c.strip()]
            if codes:
                numeric_codes = []
                for c in codes:
                    try:
                        numeric_codes.append(int(c))
                    except ValueError:
                        pass
                
                # Query condominios that match either exact string or casted number
                # We use trim() to handle accidental whitespace
                trimmed_num = func.trim(Condominio.numero)
                stmt = select(Condominio.id).where(Condominio.ativo == True)
                
                # Match exact string (with padding if already padded in codes)
                filters = [trimmed_num.in_(codes)]
                
                if numeric_codes:
                    # Regex check for digits only (after trim) + cast match
                    # This handles cases where DB has "0006" and codes has "6"
                    filters.append(
                        and_(
                            trimmed_num.op('~')('^[0-9]+$'),
                            cast(trimmed_num, Integer).in_(numeric_codes)
                        )
                    )
                
                res = await db.execute(stmt.where(or_(*filters)))
                ids_found = res.scalars().all()
                final_ids.update(ids_found)
        except Exception as e:
            # Silent fail for carteira processing to avoid breaking login, but log if needed
            print(f"DEBUG: Error in get_user_condo_ids carteira: {e}")
            pass

    # 2. UNIÃO com a tabela user_condominios (Relacionamentos específicos)
    res_uc = await db.execute(
        select(UserCondominio.condominio_id).where(UserCondominio.user_id == user.id)
    )
    final_ids.update(res_uc.scalars().all())
    
    return list(final_ids)
