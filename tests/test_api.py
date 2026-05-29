import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

TEST_DATA = ROOT / "data" / "pytest"
TEST_DATA.mkdir(parents=True, exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite:///{(TEST_DATA / 'test.db').as_posix()}"
os.environ["CHROMA_DIR"] = str(TEST_DATA / "chroma")
os.environ["LLM_PROVIDER"] = "mock"


@pytest.fixture(scope="session")
def client() -> TestClient:
    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["llm_provider"] == "mock"


def test_notes_crud_and_ask(client: TestClient) -> None:
    create = client.post(
        "/notes",
        json={"title": "Test", "content": "LangChain helps build LLM apps."},
    )
    assert create.status_code == 201
    note_id = create.json()["id"]

    listing = client.get("/notes")
    assert listing.status_code == 200
    assert any(item["id"] == note_id for item in listing.json())

    ask = client.post("/ask", json={"question": "What does LangChain help with?"})
    assert ask.status_code == 200
    body = ask.json()
    assert "Mock LLM" in body["answer"]
    assert body["provider"] == "mock"


def test_webhook_registration_and_events(client: TestClient) -> None:
    webhook = client.post(
        "/webhooks",
        json={"url": "https://example.com/hook", "event_types": "*"},
    )
    assert webhook.status_code == 201

    events = client.get("/events")
    assert events.status_code == 200
    assert isinstance(events.json(), list)
