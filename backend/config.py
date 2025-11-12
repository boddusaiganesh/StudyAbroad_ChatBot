from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./study_abroad.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    gemini_api_key: str

    # Environment
    environment: str = "development"  # development, staging, production

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()
