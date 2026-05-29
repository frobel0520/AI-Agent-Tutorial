from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.database import Note, SessionLocal, init_db
from app.routers import ask, notes, webhooks
from app.schemas import HealthResponse
from app.services.langchain_rag import RagService


def seed_notes(settings: Settings) -> None:
    db = SessionLocal()
    try:
        if db.query(Note).count() > 0:
            return
        samples = [
            Note(
                title="RESTful API 基礎",
                content="REST 使用 HTTP 動詞操作資源：GET 讀取、POST 建立、PUT 更新、DELETE 刪除。",
            ),
            Note(
                title="LangChain 是什麼",
                content="LangChain 提供 Document、Retriever、Chain 等元件，方便把 LLM 接到你自己的資料。",
            ),
            Note(
                title="WebHook 概念",
                content="WebHook 是事件驅動的 HTTP callback。當系統發生事件時，會 POST JSON 到你註冊的 URL。",
            ),
        ]
        db.add_all(samples)
        db.commit()
        rag = RagService(settings)
        for note in samples:
            db.refresh(note)
            rag.sync_note(note)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    init_db()
    seed_notes(settings)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description=(
            "Hands-on tutorial API for LangChain, RESTful API, Dify, and WebHooks. "
            "Open /docs for interactive learning."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(notes.router)
    app.include_router(ask.router)
    app.include_router(webhooks.router)

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
        return HealthResponse(
            status="ok",
            app_name=settings.app_name,
            llm_provider=settings.llm_provider,
            docs_url="/docs",
        )

    return app


app = create_app()
