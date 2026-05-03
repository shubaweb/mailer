from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SmtpSettings
from app.schemas import SmtpSettingsCreate, SmtpStatusOut

router = APIRouter(prefix="/api/smtp", tags=["smtp"])


def _to_status(s: SmtpSettings) -> SmtpStatusOut:
    return SmtpStatusOut(
        configured=True,
        host=s.host,
        port=s.port,
        username=s.username,
        encryption=s.encryption,
        from_email=s.from_email,
        from_name=s.from_name,
    )


@router.get("/status", response_model=SmtpStatusOut)
def get_smtp_status(db: Session = Depends(get_db)):
    s = db.query(SmtpSettings).first()
    return _to_status(s) if s else SmtpStatusOut(configured=False)


@router.post("/settings", response_model=SmtpStatusOut)
def save_smtp_settings(payload: SmtpSettingsCreate, db: Session = Depends(get_db)):
    s = db.query(SmtpSettings).first()
    if s:
        for key, value in payload.model_dump().items():
            setattr(s, key, value)
    else:
        s = SmtpSettings(**payload.model_dump())
        db.add(s)
    db.commit()
    db.refresh(s)
    return _to_status(s)


@router.delete("/settings")
def delete_smtp_settings(db: Session = Depends(get_db)):
    s = db.query(SmtpSettings).first()
    if s:
        db.delete(s)
        db.commit()
    return {"ok": True}


@router.post("/test")
def test_smtp(db: Session = Depends(get_db)):
    s = db.query(SmtpSettings).first()
    if not s:
        raise HTTPException(status_code=400, detail="SMTP не настроен")
    from app.services.smtp_service import send_email
    try:
        send_email(
            host=s.host,
            port=s.port,
            username=s.username,
            password=s.password,
            encryption=s.encryption,
            from_email=s.from_email,
            from_name=s.from_name,
            to=s.from_email,
            subject="Тест подключения Mailer",
            html_body="<p>SMTP работает корректно.</p>",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}
