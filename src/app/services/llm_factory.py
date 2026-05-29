from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.embeddings import FakeEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import Settings


class MockChatModel(BaseChatModel):
    """Deterministic chat model for learning without API keys."""

    @property
    def _llm_type(self) -> str:
        return "mock"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        from langchain_core.outputs import ChatGeneration, ChatResult

        user_text = ""
        for message in messages:
            if isinstance(message, HumanMessage):
                user_text = message.content

        answer = (
            "[Mock LLM] Based on your notes, here is a tutorial-style answer. "
            f"Question: {user_text}. "
            "Switch LLM_PROVIDER to ollama or openai when you are ready for real models."
        )
        generation = ChatGeneration(message=AIMessage(content=answer))
        return ChatResult(generations=[generation])


def build_embeddings(settings: Settings) -> Embeddings:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        return OpenAIEmbeddings(api_key=settings.openai_api_key)
    if provider == "ollama":
        return OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
        )
    return FakeEmbeddings(size=384)


def build_chat_model(settings: Settings) -> BaseChatModel:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            temperature=0.2,
        )
    if provider == "ollama":
        return ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.2,
        )
    return MockChatModel()
