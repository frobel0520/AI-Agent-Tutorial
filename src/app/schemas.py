from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, examples=["LangChain 入門"])
    content: str = Field(..., min_length=1, examples=["LangChain 是建構 LLM 應用的框架。"])


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)


class NoteRead(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, examples=["LangChain 可以做什麼？"])
    top_k: int = Field(default=3, ge=1, le=10)


class AskResponse(BaseModel):
    question: str
    answer: str
    provider: str
    sources: list[NoteRead]


class WebhookCreate(BaseModel):
    url: HttpUrl
    event_types: str = Field(default="*", examples=["note.created,ask.completed"])
    secret: str | None = None


class WebhookRead(BaseModel):
    id: int
    url: str
    event_types: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EventRead(BaseModel):
    id: int
    event_type: str
    payload: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    app_name: str
    llm_provider: str
    docs_url: str
    storage: str = Field(description="sqlite or postgres")
    persistent_data: bool = Field(description="True when using Supabase/Postgres")


class DifyAskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    user: str = Field(default="tutorial-user")


class DifyAskResponse(BaseModel):
    question: str
    answer: str
    provider: str = "dify"
    raw: dict | None = None
