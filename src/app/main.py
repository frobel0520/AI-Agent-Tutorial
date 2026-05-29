import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.database import Note, SessionLocal, init_db
from app.routers import ask, notes, webhooks
from app.schemas import HealthResponse
from app.services.langchain_rag import RagService

logger = logging.getLogger(__name__)
_seed_lock = asyncio.Lock()
_seed_done = False
STATIC_DIR = Path(__file__).resolve().parents[2] / "static"


def seed_notes(settings: Settings) -> None:
    global _seed_done
    db = SessionLocal()
    try:
        if db.query(Note).count() > 0:
            _seed_done = True
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
        _seed_done = True
        logger.info("Seed notes completed")
    finally:
        db.close()


async def seed_notes_background(settings: Settings) -> None:
    global _seed_done
    async with _seed_lock:
        if _seed_done:
            return
        await asyncio.to_thread(seed_notes, settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    init_db()
    if settings.app_env == "production":
        seed_task = asyncio.create_task(seed_notes_background(settings))
    else:
        await seed_notes_background(settings)
        seed_task = None
    yield
    if seed_task is not None:
        seed_task.cancel()
        try:
            await seed_task
        except asyncio.CancelledError:
            pass


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

    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/learn", include_in_schema=False)
    def learn_page() -> FileResponse:
        return FileResponse(STATIC_DIR / "learn.html")

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/learn")

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
