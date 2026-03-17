from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ─── Database ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/datacron"

    # ─── Auth ──────────────────────────────────────────────────
    SECRET_KEY: str = "changeme-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ─── Gmail ────────────────────────────────────────────────
    GMAIL_CREDENTIALS_PATH: str = "./credentials.json"
    GMAIL_TOKEN_PATH: str = "./token.json"
    GMAIL_USER: str = "datacroncompany@gmail.com"
    EMAIL_POLL_INTERVAL_MINUTES: int = 5

    # ─── Storage ──────────────────────────────────────────────
    PDF_STORAGE_PATH: str = "./pdfs_storage"

    # ─── CORS ─────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # ─── App ──────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    ALERT_VARIATION_THRESHOLD: float = 0.20

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
