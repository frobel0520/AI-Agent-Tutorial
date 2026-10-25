import sys
from pathlib import Path

from langchain_core.embeddings import Embeddings
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from app.config import Settings
from app.database import Base, Note
from app.services.langchain_rag import RagService
from app.services.llm_factory import MockChatModel


class TopicEmbeddings(Embeddings):
    """Synthetic topic fixture, not a production embedding quality score."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        text = text.lower()
        return [float('python' in text), float('garden' in text), 0.1]


def test_fresh_request_rebuilds_from_sqlite_and_preserves_old_index(tmp_path: Path) -> None:
    old_index = tmp_path / 'old-chroma'
    old_index.mkdir()
    sentinel = old_index / 'keep.bin'
    sentinel.write_bytes(b'old index preserved')
    engine = create_engine('sqlite:///' + str(tmp_path / 'notes.db'))
    Base.metadata.create_all(engine)
    settings = Settings(chroma_dir=str(old_index), llm_provider='mock', _env_file=None)

    def service() -> RagService:
        return RagService(settings, embeddings=TopicEmbeddings(), chat_model=MockChatModel())

    with Session(engine) as db:
        python_note = Note(title='Python lesson', content='Python types and functions')
        garden_note = Note(title='Garden lesson', content='Garden soil and flowers')
        db.add_all([python_note, garden_note])
        db.commit()
        first = service().ask(db, 'Python', 1)
        assert [note.id for note in first.sources] == [python_note.id]
        assert 'Python types and functions' in first.answer
        assert 'Garden soil and flowers' not in first.answer

        python_note.content = 'Garden tree care'
        garden_note.content = 'Python async tutorial'
        db.commit()
        assert [note.id for note in service().ask(db, 'Python', 1).sources] == [garden_note.id]
        db.delete(garden_note)
        db.commit()
        assert [note.id for note in service().ask(db, 'Python', 10).sources] == [python_note.id]
        db.delete(python_note)
        db.commit()
        empty = service().ask(db, 'Python', 3)
        assert empty.sources == []
        assert 'No notes yet.' in empty.answer

    assert sentinel.read_bytes() == b'old index preserved'
    assert list(old_index.iterdir()) == [sentinel]
    engine.dispose()


def test_rebuild_replaces_old_documents_and_deterministic_mock() -> None:
    from app.services.llm_factory import build_embeddings

    settings = Settings(llm_provider='mock', _env_file=None)
    embedding = build_embeddings(settings)
    assert embedding.embed_query('same fixture') == embedding.embed_query('same fixture')
    service = RagService(settings, embeddings=TopicEmbeddings(), chat_model=MockChatModel())
    assert service.rebuild_from_notes([Note(id=1, title='Python', content='Python')]) == 1
    assert service.rebuild_from_notes([Note(id=2, title='Garden', content='Garden')]) == 1
    assert service.vector_store.get_by_ids(['note-1']) == []
    assert len(service.vector_store.get_by_ids(['note-2'])) == 1
    assert service.rebuild_from_notes([]) == 0
    assert service.vector_store.get_by_ids(['note-2']) == []
