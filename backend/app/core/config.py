"""
Application configuration using Pydantic Settings.
Reads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "YellowBird"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./transport.db"

    # JWT Authentication
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600  # 365 days — permanent until manual logout

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost", "capacitor://localhost"]

    # Mapbox
    MAPBOX_ACCESS_TOKEN: str = ""

    # GPS Tracking
    GPS_UPDATE_INTERVAL_SECONDS: int = 3
    OVERSPEED_LIMIT_KMH: float = 60.0

    # Password Reset
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15
    FRONTEND_URL: str = "http://localhost:5173"

    # SMTP Email (Gmail SMTP for OTP & Password Reset)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "yellowbird.authentication@gmail.com"
    SMTP_PASSWORD: str = "fukiqarvuaawtysd"
    SMTP_FROM_EMAIL: str = "yellowbird.authentication@gmail.com"

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
