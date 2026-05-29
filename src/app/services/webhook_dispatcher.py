import hashlib
import hmac
import json
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import EventLog, WebhookDelivery, WebhookSubscription


def _matches_event(subscription: WebhookSubscription, event_type: str) -> bool:
    if subscription.event_types.strip() == "*":
        return True
    allowed = {item.strip() for item in subscription.event_types.split(",") if item.strip()}
    return event_type in allowed


def _sign_payload(secret: str, payload: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


async def dispatch_event(
    db: Session,
    settings: Settings,
    event_type: str,
    payload: dict,
) -> EventLog:
    serialized = json.dumps(payload, ensure_ascii=False, default=str)
    event = EventLog(event_type=event_type, payload=serialized)
    db.add(event)
    db.commit()
    db.refresh(event)

    subscriptions = db.query(WebhookSubscription).all()
    async with httpx.AsyncClient(timeout=10.0) as client:
        for subscription in subscriptions:
            if not _matches_event(subscription, event_type):
                continue

            body = {
                "id": event.id,
                "type": event_type,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "data": payload,
            }
            body_text = json.dumps(body, ensure_ascii=False)
            headers = {"Content-Type": "application/json", "X-Event-Type": event_type}
            secret = subscription.secret or settings.webhook_secret
            if secret:
                headers["X-Webhook-Signature"] = _sign_payload(secret, body_text)

            delivery = WebhookDelivery(
                event_id=event.id,
                subscription_id=subscription.id,
                success=0,
            )
            try:
                response = await client.post(subscription.url, content=body_text, headers=headers)
                delivery.status_code = response.status_code
                delivery.response_body = response.text[:2000]
                delivery.success = 1 if response.status_code < 400 else 0
            except httpx.HTTPError as exc:
                delivery.response_body = str(exc)[:2000]

            db.add(delivery)

    db.commit()
    return event
