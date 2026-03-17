"""
Datacron Backend — FastAPI Application
======================================
Entry point for the Datacron API server.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, condominios, concessionarias, faturas, alertas, emails, importacoes
from app.workers.scheduler import start_scheduler, stop_scheduler

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("datacron")

# Ensure PDF storage directory exists
os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)


# ─── Lifespan (startup / shutdown) ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Datacron API starting up...")

    # Create all database tables (for development; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")

    # Start background scheduler
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

# ─── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router,             prefix=API_PREFIX)
app.include_router(condominios.router,      prefix=API_PREFIX)
app.include_router(concessionarias.router,  prefix=API_PREFIX)
app.include_router(faturas.router,          prefix=API_PREFIX)
app.include_router(alertas.router,          prefix=API_PREFIX)
app.include_router(emails.router,           prefix=API_PREFIX)
app.include_router(importacoes.router,      prefix=API_PREFIX)


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
