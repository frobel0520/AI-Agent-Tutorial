import httpx

from app.config import Settings
from app.schemas import DifyAskResponse


async def ask_dify(settings: Settings, question: str, user: str) -> DifyAskResponse:
    if not settings.dify_api_key:
        raise ValueError(
            "DIFY_API_KEY must be configured. See docs/04-dify.md and deploy/dify-setup.md."
        )

    url = f"{settings.dify_api_base.rstrip('/')}/chat-messages"
    headers = {
        "Authorization": f"Bearer {settings.dify_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": {},
        "query": question,
        "response_mode": "blocking",
        "conversation_id": "",
        "user": user,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    answer = data.get("answer") or data.get("message") or "No answer returned from Dify."
    return DifyAskResponse(question=question, answer=answer, raw=data)
