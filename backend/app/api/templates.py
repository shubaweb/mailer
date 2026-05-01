import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import TemplateFile
from app.schemas import TemplateFileOut
from app.config import TEMPLATES_DIR

router = APIRouter(prefix="/api/templates", tags=["templates"])

ALLOWED_EXTENSIONS = {"docx", "pdf"}


@router.get("", response_model=List[TemplateFileOut])
def list_templates(db: Session = Depends(get_db)):
    return db.query(TemplateFile).order_by(TemplateFile.created_at.desc()).all()


@router.post("", response_model=TemplateFileOut)
async def upload_template(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lstrip(".").lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only DOCX and PDF files are allowed")

    content = await file.read()
    stored_name = f"{uuid.uuid4()}.{ext}"
    (TEMPLATES_DIR / stored_name).write_bytes(content)

    record = TemplateFile(
        filename=stored_name,
        original_name=file.filename,
        file_type=ext,
        size=len(content),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    record = db.query(TemplateFile).filter(TemplateFile.id == template_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")

    file_path = TEMPLATES_DIR / record.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(record)
    db.commit()
