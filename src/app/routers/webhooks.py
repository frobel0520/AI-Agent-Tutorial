from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import EventLog, WebhookSubscription, get_db
from app.schemas import DifyAskRequest, DifyAskResponse, EventRead, WebhookCreate, WebhookRead
from app.services.dify_client import ask_dify
from app.services.webhook_dispatcher import dispatch_event

router = APIRouter(tags=["webhooks", "dify"])


@router.post("/webhooks", response_model=WebhookRead, status_code=status.HTTP_201_CREATED)
def create_webhook(payload: WebhookCreate, db: Session = Depends(get_db)) -> WebhookSubscription:
    subscription = WebhookSubscription(
        url=str(payload.url),
        event_types=payload.event_types,
        secret=payload.secret,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("/webhooks", response_model=list[WebhookRead])
def list_webhooks(db: Session = Depends(get_db)) -> list[WebhookSubscription]:
    return db.query(WebhookSubscription).order_by(WebhookSubscription.id.desc()).all()


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(webhook_id: int, db: Session = Depends(get_db)) -> None:
    subscription = db.get(WebhookSubscription, webhook_id)
    if subscription is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(subscription)
    db.commit()


@router.get("/events", response_model=list[EventRead])
def list_events(db: Session = Depends(get_db)) -> list[EventLog]:
    return db.query(EventLog).order_by(EventLog.id.desc()).limit(50).all()


@router.post("/dify/ask", response_model=DifyAskResponse)
async def dify_ask(
    payload: DifyAskRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> DifyAskResponse:
    try:
        result = await ask_dify(settings, payload.question, payload.user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Dify request failed: {exc}") from exc

    await dispatch_event(
        db,
        settings,
        "dify.ask.completed",
        {"question": result.question, "provider": "dify"},
    )
    return result
