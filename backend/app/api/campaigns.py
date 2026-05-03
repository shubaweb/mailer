import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models import Campaign, CampaignEmail, GmailCredentials, Attachment, TemplateFile, EmailTemplate, SmtpSettings
from app.schemas import CampaignOut, CampaignDetailOut

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


def _detect_delimiter(text: str) -> str:
    first_line = text.split("\n")[0]
    return ";" if first_line.count(";") > first_line.count(",") else ","


def _extract_row_fields(row: dict) -> dict:
    normalized = {k.lower().strip().replace(" ", "_"): (v or "").strip() for k, v in row.items() if k}
    return {
        "email": normalized.get("email") or normalized.get("email_email", ""),
        "first_name": normalized.get("first_name", ""),
        "last_name": normalized.get("last_name", ""),
        "company_name": normalized.get("company_name", ""),
        "row_data": normalized,
    }


@router.get("", response_model=List[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("", response_model=CampaignOut)
async def create_campaign(
    name: str = Form(...),
    file: UploadFile = File(...),
    attachment_ids: List[int] = Form(default=[]),
    template_id: Optional[int] = Form(default=None),
    email_template_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
):
    creds = db.query(GmailCredentials).first()
    smtp = db.query(SmtpSettings).first()
    if not smtp and (not creds or not creds.refresh_token):
        raise HTTPException(status_code=400, detail="Настройте Gmail или SMTP для отправки")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    delimiter = _detect_delimiter(decoded)
    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    rows = [_extract_row_fields(row) for row in reader]
    rows = [r for r in rows if r["email"]]

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    if template_id and not db.query(TemplateFile).filter(TemplateFile.id == template_id).first():
        raise HTTPException(status_code=400, detail="Template not found")
    if email_template_id and not db.query(EmailTemplate).filter(EmailTemplate.id == email_template_id).first():
        raise HTTPException(status_code=400, detail="Email template not found")

    campaign = Campaign(name=name, total_count=len(rows), template_id=template_id, email_template_id=email_template_id)
    db.add(campaign)
    db.flush()

    for row in rows:
        db.add(CampaignEmail(
            campaign_id=campaign.id,
            email=row["email"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            company_name=row["company_name"],
            row_data=row["row_data"],
        ))

    if attachment_ids:
        campaign.attachments = db.query(Attachment).filter(Attachment.id.in_(attachment_ids)).all()

    db.commit()
    db.refresh(campaign)

    from app.workers.tasks import send_campaign_task
    send_campaign_task.delay(campaign.id)

    return campaign


@router.get("/{campaign_id}", response_model=CampaignDetailOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.emails),
            joinedload(Campaign.attachments),
            joinedload(Campaign.template),
        )
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign
