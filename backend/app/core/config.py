import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LexiEase API"
    DATABASE_URL: str
    FIREBASE_CREDENTIALS_PATH: str = ""
    TESTING: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
