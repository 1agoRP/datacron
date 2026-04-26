from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator


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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v in ("changeme-in-production", "", "secret", "changeme"):
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
    ALERT_VARIATION_THRESHOLD: float = 0.20

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
