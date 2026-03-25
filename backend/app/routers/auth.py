from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    hash_password, verify_password,
    create_access_token, get_current_user, require_role,
)
from app.models.user import User
from app.schemas import LoginRequest, TokenResponse, UserResponse, PasswordUpdate
from app.config import settings
from app.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])

MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: str = "operador"


def _validate_password(senha: str) -> None:
    if len(senha) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres",
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates the user and returns a JWT access token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not await verify_password(body.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada")

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the currently authenticated user's data."""
    return current_user


@router.post("/update-password")
async def update_password(
    body: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates the user's password."""
    _validate_password(body.nova_senha)

    if not await verify_password(body.senha_atual, current_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )
    
    current_user.senha_hash = await hash_password(body.nova_senha)
    db.add(current_user)
    await db.commit()
    
    return {"message": "Senha atualizada com sucesso"}


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Creates a new user. Requires admin authentication."""
    _validate_password(body.senha)

    exists = await db.execute(select(User).where(User.email == body.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    user = User(
        nome=body.nome,
        email=body.email,
        senha_hash=await hash_password(body.senha),
        role=body.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
