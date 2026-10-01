from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application runtime configuration loaded from environment variables and .env file.
    """
    PROJECT_NAME: str = "FinFlow API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database Configuration (PostgreSQL 16 via asyncpg)
    DATABASE_URL: str = "postgresql+asyncpg://finflow:secret@localhost:5432/finflow_db"

    # Security & JWT Tokens
    JWT_SECRET: str = "super-secret-jwt-key-change-this-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days default

    # Financial Configuration
    DEFAULT_CURRENCY_SYMBOL: str = "k-Toman"

    # CORS Settings
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-delimited origin strings into list of allowed URLs."""
        if isinstance(self.ALLOWED_ORIGINS, list):
            return self.ALLOWED_ORIGINS
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
