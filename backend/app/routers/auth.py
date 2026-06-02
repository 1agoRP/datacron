import secrets
from datetime import timedelta, datetime, timezone
from html import escape
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, select
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
from app.models.refresh_token import RefreshToken
from app.services.email_sender import send_notification_email

router = APIRouter(prefix="/auth", tags=["AutenticaÃ§Ã£o"])

MIN_PASSWORD_LENGTH = 8
ACCESS_COOKIE_NAME = "datacron_token"
REFRESH_COOKIE_NAME = "datacron_refresh_token"


def _cookie_settings() -> dict:
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": settings.secure_cookies,
        "path": "/",
    }


def _auth_expires_delta() -> timedelta:
    return timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


def _auth_expires_in_seconds() -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _refresh_expires_delta() -> timedelta:
    return timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)


def _refresh_max_age_seconds() -> int:
    return settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60


def _set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        max_age=_auth_expires_in_seconds(),
        **_cookie_settings(),
    )


def _set_refresh_cookie(response: Response, token: str, expires: datetime) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=_refresh_max_age_seconds(),
        expires=expires.strftime("%a, %d %b %Y %H:%M:%S GMT"),
        **_cookie_settings(),
    )


def _clear_auth_cookies(response: Response) -> None:
    cookie_settings = _cookie_settings()
    response.delete_cookie(ACCESS_COOKIE_NAME, path=cookie_settings["path"], samesite=cookie_settings["samesite"], secure=cookie_settings["secure"])
    response.delete_cookie(REFRESH_COOKIE_NAME, path=cookie_settings["path"], samesite=cookie_settings["samesite"], secure=cookie_settings["secure"])


class RegisterRequest(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: str = "geral"

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    role: Optional[str] = None
    whatsapp: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


def _validate_password(senha: str) -> None:
    if len(senha) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres",
        )


def _generate_temporary_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "Fox" + "".join(secrets.choice(alphabet) for _ in range(length))


def _password_reset_email_html(nome: str, temporary_password: str) -> str:
    safe_nome = escape(nome)
    safe_password = escape(temporary_password)
    return f"""
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <h2 style="margin:0 0 12px 0;">Nova senha FOX</h2>
      <p>Ola, {safe_nome}.</p>
      <p>Recebemos uma solicitacao de recuperacao de senha para o seu acesso FOX.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;margin:18px 0;">
        <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:6px;">Senha temporaria</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:0.04em;color:#0f172a;">{safe_password}</div>
      </div>
      <p>Use esta senha para entrar no sistema e altere-a em Configuracoes assim que possivel.</p>
      <p style="color:#64748b;font-size:13px;">Se voce nao solicitou esta alteracao, avise a administracao imediatamente.</p>
    </div>
    """


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginRequest, db: AsyncSession = Depends(get_db)):
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
        expires_delta=_auth_expires_delta(),
    )
    
    # Gerar Refresh Token
    refresh_token_str = secrets.token_urlsafe(32)
    refresh_expires = datetime.now(timezone.utc) + _refresh_expires_delta()
    
    new_rt = RefreshToken(
        token=refresh_token_str,
        user_id=user.id,
        expires_at=refresh_expires
    )
    db.add(new_rt)
    await db.commit()
    
    _set_access_cookie(response, token)
    _set_refresh_cookie(response, refresh_token_str, refresh_expires)

    return TokenResponse(
        access_token=token,
        expires_in=_auth_expires_in_seconds(),
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


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generates a temporary password and sends it to the registered user email."""
    success_message = "Se o e-mail estiver cadastrado, uma nova senha sera enviada em instantes."

    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()
    if not user or not user.ativo:
        return {"message": success_message}

    temporary_password = _generate_temporary_password()
    user.senha_hash = await hash_password(temporary_password)
    db.add(user)
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    sent = await send_notification_email(
        to=user.email,
        subject="FOX - nova senha de acesso",
        message_text=f"Sua nova senha temporaria FOX e: {temporary_password}",
        html_body=_password_reset_email_html(user.nome, temporary_password),
        tipo="transacional",
    )
    if not sent:
        await db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Nao foi possivel enviar a nova senha. Tente novamente em alguns minutos.",
        )

    await db.commit()
    return {"message": success_message}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Refreshes the access token using a valid HttpOnly refresh token cookie."""
    token_str = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token_str:
        raise HTTPException(status_code=401, detail="Refresh token nÃ£o encontrado")
        
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == token_str))
    rt = result.scalar_one_or_none()
    
    if not rt:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token invÃ¡lido")
        
    # Ensure timezone info is present (SQLite often drops it)
    rt_expires = rt.expires_at
    if rt_expires.tzinfo is None:
        rt_expires = rt_expires.replace(tzinfo=timezone.utc)
        
    if rt_expires < datetime.now(timezone.utc):
        await db.delete(rt)
        await db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token expirado")
        
    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()
    
    if not user or not user.ativo:
        raise HTTPException(status_code=401, detail="UsuÃ¡rio inativo")
        
    # Rotacionar o refresh token (consumir o atual e gerar um novo)
    await db.delete(rt)
    
    new_refresh_str = secrets.token_urlsafe(32)
    new_refresh_expires = datetime.now(timezone.utc) + _refresh_expires_delta()
    new_rt = RefreshToken(
        token=new_refresh_str,
        user_id=user.id,
        expires_at=new_refresh_expires
    )
    db.add(new_rt)
    await db.commit()
    
    condo_uuid_list = await get_user_condo_ids(user, db)
    condo_ids = [str(cid) for cid in condo_uuid_list] if condo_uuid_list is not None else []
    
    access_token = create_access_token(
        data={
            "sub": str(user.id), 
            "email": user.email, 
            "role": user.role, 
            "nome": user.nome, 
        },
        expires_delta=_auth_expires_delta(),
    )
    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, new_refresh_str, new_refresh_expires)
    
    return TokenResponse(
        access_token=access_token,
        expires_in=_auth_expires_in_seconds(),
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


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Logs out the user and invalidates their refresh token."""
    token_str = request.cookies.get(REFRESH_COOKIE_NAME)
    if token_str:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token_str))
        rt = result.scalar_one_or_none()
        if rt:
            await db.delete(rt)
            await db.commit()
            
    _clear_auth_cookies(response)
    return {"message": "Logout realizado com sucesso"}


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
            "last_active": "SessÃ£o Atual"
        }
    ]

