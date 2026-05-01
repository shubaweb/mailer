from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import EmailTemplate
from app.schemas import EmailTemplateOut, EmailTemplateCreate

router = APIRouter(prefix="/api/email-templates", tags=["email-templates"])


@router.get("", response_model=List[EmailTemplateOut])
def list_email_templates(db: Session = Depends(get_db)):
    return db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()


@router.post("", response_model=EmailTemplateOut)
def create_email_template(payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    t = EmailTemplate(**payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/{template_id}", response_model=EmailTemplateOut)
def get_email_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    return t


@router.put("/{template_id}", response_model=EmailTemplateOut)
def update_email_template(template_id: int, payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in payload.model_dump().items():
        setattr(t, key, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}")
def delete_email_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
