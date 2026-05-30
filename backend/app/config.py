import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ─── Database ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/datacron"

    # ─── Auth ──────────────────────────────────────────────────
    SECRET_KEY: str  # REQUIRED — no default, crashes on startup if missing
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 2880  # 48 hours

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        weak_values = {"changeme-in-production", "", "secret", "changeme", "supersecret-datacron-2026-key"}
        if v in weak_values or len(v) < 32 or len(set(v)) < 12:
            raise ValueError(
                "SECRET_KEY inválida. Defina uma chave segura (ex: openssl rand -hex 32)"
            )
        return v

    # ─── Gmail ────────────────────────────────────────────────
    GMAIL_USER: str = "datacroncompany@gmail.com"
    GMAIL_PASSWORD: str = "" # Senha de aplicativo do Gmail
    EMAIL_POLL_INTERVAL_MINUTES: int = 5

    # ─── Storage ──────────────────────────────────────────────
    PDF_STORAGE_PATH: str = "./pdfs_storage"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_BUCKET: str = "condo-documents"

    # ─── CORS ─────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # ─── App ──────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    ALERT_VARIATION_THRESHOLD: float = 0.15
    N8N_WEBHOOK_URL: str = ""
    OUTBOUND_EMAIL_WEBHOOK_URL: str = ""
    OUTBOUND_EMAIL_WEBHOOK_SECRET: str = ""
    ERROR_WEBHOOK_URL: str = ""
    INBOUND_WEBHOOK_SECRET: str = ""
    CRON_SECRET: str = ""
    NOTEBOOKLM_ENABLED: bool = False
    NOTEBOOKLM_AUTH_JSON: str = ""
    NOTEBOOKLM_STORAGE_PATH: str = ""
    NOTEBOOKLM_WORKER_INTERVAL_MINUTES: int = 10
    NOTEBOOKLM_MAX_ATTEMPTS: int = 3

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def secure_cookies(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def require_secret(self, name: str, value: str) -> str:
        if value:
            return value
        if self.ENVIRONMENT.lower() == "production":
            raise ValueError(f"{name} deve ser configurado em produção")
        return secrets.token_urlsafe(32)


settings = Settings()
