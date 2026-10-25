from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import Note
from app.schemas import AskResponse, NoteRead
from app.services.llm_factory import build_chat_model, build_embeddings


class RagService:
    def __init__(
        self,
        settings: Settings,
        *,
        embeddings: Embeddings | None = None,
        chat_model: BaseChatModel | None = None,
    ) -> None:
        self.settings = settings
        self.embeddings = embeddings if embeddings is not None else build_embeddings(settings)
        self.chat_model = chat_model if chat_model is not None else build_chat_model(settings)
        self.vector_store = InMemoryVectorStore(self.embeddings)

    def ask(self, db: Session, question: str, top_k: int) -> AskResponse:
        # Each request reconstructs its local index from the durable SQLite
        # notes, so updates/deletions and restarts cannot leave stale vectors.
        self.rebuild_from_notes(db.query(Note).order_by(Note.id.asc()).all())
        source_docs = self.vector_store.similarity_search(question, k=top_k)
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

        chain = prompt | self.chat_model | StrOutputParser()
        answer = chain.invoke({"context": format_docs(source_docs), "question": question})
        note_ids = []
        for doc in source_docs:
            note_id = doc.metadata.get("note_id")
            if isinstance(note_id, int):
                note_ids.append(note_id)

        sources: list[NoteRead] = []
        if note_ids:
            notes = db.query(Note).filter(Note.id.in_(note_ids)).all()
            by_id = {note.id: note for note in notes}
            sources = [
                NoteRead.model_validate(by_id[note_id])
                for note_id in note_ids
                if note_id in by_id
            ]

        return AskResponse(
            question=question,
            answer=answer,
            provider=self.settings.llm_provider,
            sources=sources,
        )

    def rebuild_from_notes(self, notes: list[Note]) -> int:
        """Replace the disposable memory index without touching old disk indexes."""
        replacement = InMemoryVectorStore(self.embeddings)
        if notes:
            documents = [
                Document(
                    page_content=note.content,
                    metadata={"note_id": note.id, "title": note.title},
                )
                for note in notes
            ]
            replacement.add_documents(documents, ids=[f"note-{note.id}" for note in notes])
        self.vector_store = replacement
        return len(notes)
