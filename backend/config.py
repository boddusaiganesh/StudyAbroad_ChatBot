from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./study_abroad.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    gemini_api_key: str = ""  # Optional if using Ollama

    # AI Provider: "gemini" or "ollama"
    ai_provider: str = "ollama"  # Change to "gemini" to use Gemini API

    # Ollama settings
    ollama_url: str = "http://localhost:11434/api/generate"
    ollama_model: str = "llama2"  # or "mistral", "phi", etc.

    # Environment
    environment: str = "development"  # development, staging, production

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    # Validate production settings
    if settings.environment == "production":
        if settings.secret_key == "change-this-to-a-secure-random-string-in-production":
            raise ValueError("CRITICAL: Must change SECRET_KEY in production!")

        if settings.ai_provider == "gemini":
            if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key-here":
                raise ValueError("CRITICAL: GEMINI_API_KEY must be set when using Gemini!")

        if "sqlite" in settings.database_url.lower():
            print("WARNING: Using SQLite in production. Consider PostgreSQL for better performance.")

    return settings
