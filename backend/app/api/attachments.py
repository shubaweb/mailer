from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Attachment
from app.schemas import AttachmentOut
from app.config import UPLOADS_DIR

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


@router.get("", response_model=List[AttachmentOut])
def list_attachments(db: Session = Depends(get_db)):
    return db.query(Attachment).order_by(Attachment.created_at.desc()).all()


@router.post("", response_model=AttachmentOut)
async def upload_attachment(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Разрешены только PDF файлы")

    content = await file.read()
    stored_name = f"{uuid4().hex}.pdf"
    (UPLOADS_DIR / stored_name).write_bytes(content)

    attachment = Attachment(
        filename=stored_name,
        original_name=file.filename or stored_name,
        size=len(content),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.delete("/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Файл не найден")

    file_path = UPLOADS_DIR / attachment.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(attachment)
    db.commit()
    return {"message": "Deleted"}
