from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas import AskRequest, AskResponse
from app.services.langchain_rag import RagService
from app.services.webhook_dispatcher import dispatch_event

router = APIRouter(prefix="/ask", tags=["langchain"])


def get_rag_service(settings: Settings = Depends(get_settings)) -> RagService:
    return RagService(settings)


@router.post("", response_model=AskResponse)
async def ask_question(
    payload: AskRequest,
    db: Session = Depends(get_db),
    rag: RagService = Depends(get_rag_service),
    settings: Settings = Depends(get_settings),
) -> AskResponse:
    result = rag.ask(db, payload.question, payload.top_k)
    await dispatch_event(
        db,
        settings,
        "ask.completed",
        {
            "question": result.question,
            "provider": result.provider,
            "source_count": len(result.sources),
        },
    )
    return result
