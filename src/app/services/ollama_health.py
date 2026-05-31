import httpx

from app.config import Settings


def check_ollama_ready(settings: Settings) -> bool:
    if settings.llm_provider.lower() != "ollama":
        return True

    try:
        with httpx.Client(timeout=8.0) as client:
            response = client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        return False
