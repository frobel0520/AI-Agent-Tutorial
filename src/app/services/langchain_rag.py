from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import Note
from app.schemas import AskResponse, NoteRead
from app.services.llm_factory import build_chat_model, build_embeddings


def chroma_collection_name(settings: Settings) -> str:
    # Separate collections per LLM provider because embedding dimensions differ
    # (mock=384, gemini=3072, ollama=3072, openai=1536).
    return f"tutorial_notes_{settings.llm_provider.lower()}"


class RagService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.embeddings = build_embeddings(settings)
        self.chat_model = build_chat_model(settings)
        self.vector_store = Chroma(
            collection_name=chroma_collection_name(settings),
            embedding_function=self.embeddings,
            persist_directory=str(settings.chroma_path),
        )

    def _reset_collection(self) -> None:
        existing = self.vector_store.get()
        if existing and existing.get("ids"):
            self.vector_store.delete(ids=existing["ids"])

    def sync_note(self, note: Note) -> None:
        document = Document(
            page_content=note.content,
            metadata={"note_id": note.id, "title": note.title},
        )
        existing = self.vector_store.get(where={"note_id": note.id})
        if existing and existing.get("ids"):
            self.vector_store.delete(ids=existing["ids"])
        try:
            self.vector_store.add_documents([document], ids=[f"note-{note.id}"])
        except Exception as exc:
            if "dimension" not in str(exc).lower():
                raise
            self._reset_collection()
            self.vector_store.add_documents([document], ids=[f"note-{note.id}"])

    def remove_note(self, note_id: int) -> None:
        existing = self.vector_store.get(where={"note_id": note_id})
        if existing and existing.get("ids"):
            self.vector_store.delete(ids=existing["ids"])

    def ask(self, db: Session, question: str, top_k: int) -> AskResponse:
        retriever = self.vector_store.as_retriever(search_kwargs={"k": top_k})
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a patient tutor. Answer using only the provided context. "
                    "If the answer is not in the context, say you do not know.",
                ),
                ("human", "Context:\n{context}\n\nQuestion: {question}"),
            ]
        )

        def format_docs(docs: list[Document]) -> str:
            chunks: list[str] = []
            for doc in docs:
                title = doc.metadata.get("title", "Untitled")
                chunks.append(f"[{title}] {doc.page_content}")
            return "\n\n".join(chunks) if chunks else "No notes yet."

        chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.chat_model
            | StrOutputParser()
        )
        answer = chain.invoke(question)

        source_docs = retriever.invoke(question)
        note_ids = []
        for doc in source_docs:
            note_id = doc.metadata.get("note_id")
            if isinstance(note_id, int):
                note_ids.append(note_id)

        sources: list[NoteRead] = []
        if note_ids:
            notes = db.query(Note).filter(Note.id.in_(note_ids)).all()
            sources = [NoteRead.model_validate(note) for note in notes]

        return AskResponse(
            question=question,
            answer=answer,
            provider=self.settings.llm_provider,
            sources=sources,
        )

    def rebuild_from_notes(self, notes: list[Note]) -> int:
        """Rebuild local Chroma index from persisted notes (needed after Render cold start)."""
        for note in notes:
            self.sync_note(note)
        return len(notes)


def rebuild_chroma_index(settings: Settings, notes: list[Note]) -> int:
    rag = RagService(settings)
    return rag.rebuild_from_notes(notes)
