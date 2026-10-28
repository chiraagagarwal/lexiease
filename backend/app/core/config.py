import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "LexiEase API"
    DATABASE_URL: str = "sqlite:///./lexiease.db"
    FIREBASE_CREDENTIALS_PATH: str = ""
    TESTING: bool = False
    GEMINI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GCP_PROJECT_ID: str = ""
    TRUST_PROXY_HEADERS: bool = False
    RATE_LIMIT_GUEST_AI_PER_MINUTE: int = 15
    RATE_LIMIT_USER_AI_PER_MINUTE: int = 60
    CORS_ORIGINS: str = "*"

    model_config = SettingsConfigDict(
        env_file=(str(BASE_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
