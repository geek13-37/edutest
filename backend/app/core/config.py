from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "dev"

    database_url: str = "postgresql+psycopg://edutest:edutest@localhost:5432/edutest"

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_ttl_min: int = 30
    refresh_token_ttl_days: int = 14

    frontend_origin: str = "http://localhost:5173"

    # первый администратор создается скриптом scripts/create_admin.py из этих переменных
    admin_email: str = ""
    admin_password: str = ""

    openrouter_api_key: str = ""
    openrouter_model: str = "minimax/minimax-m3"
    # резервные модели через запятую: пробуются по очереди, если основная недоступна
    openrouter_fallback_models: str = "nvidia/nemotron-3-super-120b-a12b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    max_body_bytes: int = 1_000_000

    @property
    def is_prod(self) -> bool:
        return self.env.lower() in {"prod", "production"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]



@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.jwt_secret or len(settings.jwt_secret) < 32:
        if settings.is_prod:
            raise RuntimeError("JWT_SECRET must be set to a strong value (>= 32 chars)")
        settings.jwt_secret = settings.jwt_secret or "insecure-dev-secret-please-override-in-any-real-deploy"
    return settings


settings = get_settings()
