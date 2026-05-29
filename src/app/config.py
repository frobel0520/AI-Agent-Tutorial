from functools import lru_cache
from pathlib import Path

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
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    webhook_secret: str = "change-me-in-production"

    dify_api_base: str = "http://localhost/v1"
    dify_api_key: str = ""
    dify_app_id: str = ""

    @property
    def data_dir(self) -> Path:
        return Path("data")

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_dir)


@lru_cache
def get_settings() -> Settings:
    return Settings()
