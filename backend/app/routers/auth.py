from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    hash_password, verify_password,
    create_access_token, get_current_user,
)
from app.models.user import User
from app.schemas import LoginRequest, TokenResponse, UserResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates the user and returns a JWT access token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(body.senha, user.senha_hash):
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


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    nome: str,
    email: str,
    senha: str,
    db: AsyncSession = Depends(get_db),
):
    """Creates a new user (development only, remove in production)."""
    exists = await db.execute(select(User).where(User.email == email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    user = User(
        nome=nome,
        email=email,
        senha_hash=hash_password(senha),
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
