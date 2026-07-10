from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI-Agent-Tutorial"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///./data/app.db"
    chroma_dir: str = "./data/chroma"

    llm_provider: str = "mock"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    # Free cloud tier for Render (https://aistudio.google.com/apikey)
    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    webhook_secret: str = "change-me-in-production"

    dify_api_base: str = "http://localhost/v1"
    dify_api_key: str = ""

    @property
    def dify_configured(self) -> bool:
        return bool(self.dify_api_key.strip())

    @property
    def llm_ready(self) -> bool:
        """Whether the configured LLM provider can serve requests."""
        provider = self.llm_provider.lower()
        if provider == "ollama":
            return True  # checked separately via HTTP
        if provider == "openai":
            return bool(self.openai_api_key.strip())
        if provider == "gemini":
            return bool(self.google_api_key.strip())
        if provider == "mock":
            return True
        return False

    @property
    def data_dir(self) -> Path:
        return Path("data")

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_dir)

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def storage_backend(self) -> str:
        scheme = urlparse(self.sqlalchemy_database_url).scheme
        if scheme.startswith("postgresql"):
            return "postgres"
        return "sqlite"

    @property
    def persistent_data(self) -> bool:
        return self.storage_backend == "postgres"


def normalize_database_url(database_url: str) -> str:
    """Support Supabase postgres:// URLs and ensure psycopg driver."""
    url = database_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
