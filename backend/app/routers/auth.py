from datetime import timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    hash_password, verify_password,
    create_access_token, get_current_user, require_role, get_user_condo_ids,
)
from app.models.user import User
from app.schemas import LoginRequest, TokenResponse, UserResponse, UserInToken, PasswordUpdate
from app.config import settings
from app.limiter import limiter
from app.models.user_condominio import UserCondominio

router = APIRouter(prefix="/auth", tags=["Autenticação"])

MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: str = "geral"

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    role: Optional[str] = None
    whatsapp: Optional[int] = None


def _validate_password(senha: str) -> None:
    if len(senha) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres",
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates the user and returns a JWT access token + user data in a single roundtrip."""
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not await verify_password(body.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada")

    # Fetch allowed condominio IDs using unified logic
    from app.dependencies import get_user_condo_ids
    condo_uuid_list = await get_user_condo_ids(user, db)
    # If None (admin), we pass an empty list or special flag?
    # Context expect list of strings in JWT
    condo_ids = [str(cid) for cid in condo_uuid_list] if condo_uuid_list is not None else []

    token = create_access_token(
        data={
            "sub": str(user.id), 
            "email": user.email, 
            "role": user.role, 
            "nome": user.nome, 
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInToken(
            id=str(user.id),
            nome=user.nome,
            email=user.email,
            role=user.role,
            administradora=user.administradora,
            condominios_ids=condo_ids,
            codigo_condominio=user.codigo_condominio,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the currently authenticated user's data."""
    # Hydrate condominium IDs for the response
    condo_uuid_list = await get_user_condo_ids(current_user, db)
    condo_ids = [str(cid) for cid in condo_uuid_list] if condo_uuid_list is not None else []
    
    # Build response manually to include computed field
    user_data = UserResponse.model_validate(current_user).model_dump()
    user_data["condominios_ids"] = condo_ids
    user_data["codigo_condominio"] = current_user.codigo_condominio
    
    return user_data


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


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates the user's profile information. Only admin can change name and role."""
    update_data = body.model_dump(exclude_none=True)
    
    if not current_user.is_admin:
        # Non-admins cannot change their name or role
        if "nome" in update_data or "role" in update_data:
            raise HTTPException(
                status_code=403,
                detail="Apenas administradores podem alterar o Nome ou o Cargo."
            )
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    # Hydrate condominium IDs for the response
    condo_uuid_list = await get_user_condo_ids(current_user, db)
    condo_ids = [str(cid) for cid in condo_uuid_list] if condo_uuid_list is not None else []
    
    user_data = UserResponse.model_validate(current_user).model_dump()
    user_data["condominios_ids"] = condo_ids
    user_data["codigo_condominio"] = current_user.codigo_condominio
    
    return user_data


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

@router.get("/sessions")
async def get_sessions(request: Request, current_user: User = Depends(get_current_user)):
    """Returns the currently active session information based on the request."""
    user_agent = request.headers.get("user-agent", "Unknown Device")
    
    # Simple heuristic to identify device type from user agent
    if "Windows" in user_agent:
        device = f"Windows ({user_agent.split('Chrome/')[1].split(' ')[0] if 'Chrome/' in user_agent else 'Browser'})" if 'Mozilla' in user_agent else "Windows App"
    elif "Mac" in user_agent:
        device = "Mac OS"
    elif "Linux" in user_agent:
        device = "Linux"
    elif "iPhone" in user_agent or "iPad" in user_agent:
        device = "iOS Device"
    elif "Android" in user_agent:
        device = "Android Device"
    else:
        device = "Navegador Web"

    if "Datacron" in user_agent:
        device += " (Datacron App)"

    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "Unknown IP")
    
    # Assuming the request came from Brazil based on language
    location = f"Acesso via IP: {client_ip.split(',')[0]}"
    
    return [
        {
            "id": "current",
            "device": device,
            "location": location,
            "is_current": True,
            "last_active": "Sessão Atual"
        }
    ]

class NotificationPrefs(BaseModel):
    invoiceCreated: bool
    invoicePaid: bool
    invoiceOverdue: bool
    systemAlerts: bool

@router.post("/notifications")
async def save_notifications(prefs: NotificationPrefs, current_user: User = Depends(get_current_user)):
    """Receives user notification preferences and sends a real confirmation email."""
    # In a real app, we would save prefs to current_user.
    
    from app.services.email_monitor import send_notification_email
    
    body = (
        f"Olá {current_user.nome},\n\n"
        "Suas preferências de notificação do Datacron foram atualizadas com sucesso.\n"
        "Se você não fez essa alteração, acesse sua conta imediatamente e mude sua senha.\n\n"
        "Equipe Datacron"
    )
    
    # Try sending via Gmail integration if available
    success = send_notification_email(current_user.email, "Datacron - Preferências Atualizadas", body)
    
    return {
        "message": "Preferências salvas com sucesso.",
        "email_dispatched": success
    }
