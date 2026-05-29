from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import Note, get_db
from app.schemas import NoteCreate, NoteRead, NoteUpdate
from app.services.langchain_rag import RagService
from app.services.webhook_dispatcher import dispatch_event

router = APIRouter(prefix="/notes", tags=["notes"])


def get_rag_service(settings: Settings = Depends(get_settings)) -> RagService:
    return RagService(settings)


@router.get("", response_model=list[NoteRead])
def list_notes(db: Session = Depends(get_db)) -> list[Note]:
    return db.query(Note).order_by(Note.id.desc()).all()


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    rag: RagService = Depends(get_rag_service),
    settings: Settings = Depends(get_settings),
) -> Note:
    note = Note(title=payload.title, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    rag.sync_note(note)
    await dispatch_event(
        db,
        settings,
        "note.created",
        {"note_id": note.id, "title": note.title},
    )
    return note


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int, db: Session = Depends(get_db)) -> Note:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    rag: RagService = Depends(get_rag_service),
    settings: Settings = Depends(get_settings),
) -> Note:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content

    db.commit()
    db.refresh(note)
    rag.sync_note(note)
    await dispatch_event(
        db,
        settings,
        "note.updated",
        {"note_id": note.id, "title": note.title},
    )
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    rag: RagService = Depends(get_rag_service),
    settings: Settings = Depends(get_settings),
) -> None:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    rag.remove_note(note_id)
    await dispatch_event(db, settings, "note.deleted", {"note_id": note_id})
