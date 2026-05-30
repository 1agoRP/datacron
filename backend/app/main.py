"""
Datacron Backend — FastAPI Application
======================================
Entry point for the Datacron API server.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.workers.scheduler import start_scheduler, stop_scheduler

from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth,
    condominios,
    concessionarias,
    alertas,
    emails,
    importacoes,
    contratos,
    relatorios,
    dashboard,
    fornecedores,
    historico,
    webhooks,
    cron,
    faturas,
    auditoria,
    previsao,
)

# ─── Logging ────────────────────────────────────────────────
import traceback
import asyncio
import httpx
import logging

SENSITIVE_HEADER_NAMES = {"authorization", "cookie", "set-cookie", "x-api-key", "x-webhook-secret", "x-cron-secret"}


def _safe_headers(headers) -> dict:
    return {
        key: ("[REDACTED]" if key.lower() in SENSITIVE_HEADER_NAMES else value)
        for key, value in dict(headers).items()
    }


WEBHOOK_ERROR_URL = settings.ERROR_WEBHOOK_URL

async def _send_log_webhook(data: dict):
    if not WEBHOOK_ERROR_URL:
        return
    async with httpx.AsyncClient() as client:
        try:
            await client.post(WEBHOOK_ERROR_URL, json=data)
        except Exception:
            pass

class WebhookLoggingHandler(logging.Handler):
    # Mensagens de autenticação são eventos operacionais esperados, não erros do servidor
    _AUTH_NOISE_PATTERNS = (
        "Token inválido",
        "Token inv",
        "JWTError",
        "jose",
        "Failed to forward error to webhook",
    )

    def emit(self, record):
        if record.levelno >= logging.ERROR:
            msg_text = record.getMessage()
            # Filtra mensagens de auth e loop-back do próprio webhook
            for pattern in self._AUTH_NOISE_PATTERNS:
                if pattern in msg_text:
                    return

            try:
                msg = self.format(record)
                error_data = {
                    "type": "ApplicationLog",
                    "level": record.levelname,
                    "logger_name": record.name,
                    "message": msg_text,
                    "formatted_log": msg,
                }
                if record.exc_info:
                    error_data["traceback"] = "".join(traceback.format_exception(*record.exc_info))

                # Try to get the running loop to create a task
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(_send_log_webhook(error_data))
                except RuntimeError:
                    # No running event loop (e.g., during startup/shutdown)
                    pass
            except Exception:
                pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("datacron")
# Attach the webhook handler
webhook_handler = WebhookLoggingHandler()
webhook_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s"))
logger.addHandler(webhook_handler)


# Ensure PDF storage directory exists
os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)


# ─── Lifespan (startup / shutdown) ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Datacron API starting up...")

    # Strict CORS Check for Production
    if (
        settings.ENVIRONMENT.lower() == "production"
        and "*" in settings.allowed_origins_list
    ):
        logger.error(
            "VULNERABILIDADE CRÍTICA: CORS aberto '*' em ambiente de produção!"
        )
        raise RuntimeError(
            "Deploy cancelado por segurança. Defina ALLOWED_ORIGINS corretamente."
        )

    start_scheduler()

    yield  # ← Application is running here

    # Shutdown
    stop_scheduler()
    await engine.dispose()
    logger.info("Datacron API shut down")


# ─── App ────────────────────────────────────────────────────
app = FastAPI(
    title="Datacron API",
    description=(
        "Sistema inteligente de gerenciamento de concessionárias e "
        "recebimento automático de contas por e-mail para administradoras de condomínios."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Webhook-Secret", "X-Cron-Secret"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Content-Security-Policy", "frame-ancestors 'none'")
    if settings.ENVIRONMENT.lower() == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    return response

# ─── Webhook Error Forwarding ───────────────────────────────
import asyncio
import httpx
import traceback
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

WEBHOOK_ERROR_URL = settings.ERROR_WEBHOOK_URL

async def _send_error_webhook(data: dict):
    if not WEBHOOK_ERROR_URL:
        return
    async with httpx.AsyncClient() as client:
        try:
            await client.post(WEBHOOK_ERROR_URL, json=data)
        except Exception as e:
            logger.error(f"Failed to forward error to webhook: {e}")

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Só envia ao webhook erros genuinamente inesperados (5xx)
    # 401/403 são respostas normais de autenticação/autorização — não são falhas do servidor
    if exc.status_code not in (401, 403):
        asyncio.create_task(_send_error_webhook({
            "type": "HTTPException",
            "status_code": exc.status_code,
            "method": request.method,
            "url": str(request.url),
            "detail": exc.detail,
            "headers": _safe_headers(request.headers),
            "client_ip": request.client.host if request.client else "unknown"
        }))
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    asyncio.create_task(_send_error_webhook({
        "type": "ValidationError",
        "status_code": 422,
        "method": request.method,
        "url": str(request.url),
        "errors": errors,
        "headers": _safe_headers(request.headers),
        "client_ip": request.client.host if request.client else "unknown"
    }))
    return JSONResponse(status_code=422, content={"detail": errors})

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    asyncio.create_task(_send_error_webhook({
        "type": "UnhandledException",
        "status_code": 500,
        "method": request.method,
        "url": str(request.url),
        "exception": str(exc),
        "traceback": traceback.format_exc(),
        "headers": _safe_headers(request.headers),
        "client_ip": request.client.host if request.client else "unknown"
    }))
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


# ─── Routers ────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(condominios.router, prefix=API_PREFIX)
app.include_router(concessionarias.router, prefix=API_PREFIX)
app.include_router(alertas.router, prefix=API_PREFIX)
app.include_router(emails.router, prefix=API_PREFIX)
app.include_router(importacoes.router, prefix=API_PREFIX)
app.include_router(contratos.router, prefix=API_PREFIX)
app.include_router(relatorios.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(fornecedores.router, prefix=API_PREFIX)
app.include_router(historico.router, prefix=API_PREFIX)
app.include_router(webhooks.router, prefix=API_PREFIX)
app.include_router(cron.router, prefix=API_PREFIX)
app.include_router(faturas.router, prefix=API_PREFIX)
app.include_router(auditoria.router, prefix=API_PREFIX)
app.include_router(previsao.router, prefix=API_PREFIX)


# ─── Health check ───────────────────────────────────────────
@app.get("/api/health", tags=["Sistema"])
async def health():
    """API health check endpoint."""
    return {
        "status": "ok",
        "service": "Datacron API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Datacron API — acesse /api/docs para a documentação"}
