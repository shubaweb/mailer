import os
import random
import string
import tempfile
import time
from datetime import datetime
from pathlib import Path
from celery import Celery

redis_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("mailer", broker=redis_url, backend=redis_url)
celery_app.conf.task_serializer = "json"


@celery_app.task(name="send_campaign")
def send_campaign_task(campaign_id: int) -> None:
    from app.database import SessionLocal
    from app.models import Campaign, CampaignEmail, GmailCredentials, SmtpSettings
    from app.services.gmail_service import send_email as send_gmail
    from app.services.smtp_service import send_email as send_smtp
    from app.templates import render_template

    db = SessionLocal()
    try:
        from app.config import UPLOADS_DIR, TEMPLATES_DIR
        from app.services.pdf_service import render_pdf

        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

        # Read all ORM relationship data into plain Python values BEFORE any commit.
        campaign_template_name = campaign.template_name
        static_attachments = [
            (a.original_name, UPLOADS_DIR / a.filename)
            for a in campaign.attachments
        ]
        template_info: dict | None = None
        if campaign.template:
            t = campaign.template
            template_info = {
                "path": TEMPLATES_DIR / t.filename,
                "file_type": t.file_type,
                "name_stem": Path(t.original_name).stem,
            }
        email_template_html: str | None = None
        email_template_subject: str | None = None
        if campaign.email_template:
            email_template_html = campaign.email_template.body
            email_template_subject = campaign.email_template.subject

        smtp_row = db.query(SmtpSettings).first()
        smtp_info: dict | None = None
        if smtp_row:
            smtp_info = {
                "host": smtp_row.host, "port": smtp_row.port,
                "username": smtp_row.username, "password": smtp_row.password,
                "encryption": smtp_row.encryption,
                "from_email": smtp_row.from_email, "from_name": smtp_row.from_name,
            }

        creds = db.query(GmailCredentials).first() if not smtp_info else None

        campaign.status = "running"
        db.commit()

        emails = (
            db.query(CampaignEmail)
            .filter(CampaignEmail.campaign_id == campaign_id)
            .all()
        )

        for email_rec in emails:
            tmp_pdf: Path | None = None
            try:
                to_addresses = ", ".join(
                    addr.strip() for addr in (email_rec.email or "").split(",") if addr.strip()
                )
                if not to_addresses:
                    email_rec.status = "failed"
                    email_rec.error_message = "No valid email address"
                    campaign.error_count += 1
                    db.commit()
                    continue

                now = datetime.utcnow()
                data = dict(email_rec.row_data or {})
                data.setdefault("email", email_rec.email or "")
                data.setdefault("first_name", email_rec.first_name or "")
                data.setdefault("last_name", email_rec.last_name or "")
                data.setdefault("company_name", email_rec.company_name or "")
                data["date"] = now.strftime("%d.%m.%Y")
                rnd = "".join(random.choices(string.digits, k=4)) + random.choice(string.ascii_uppercase)
                data["random_number"] = f"{rnd}/{now.year}"

                if email_template_html is not None:
                    html_body = email_template_html
                    subject = email_template_subject or ""
                    for key, value in data.items():
                        html_body = html_body.replace("{{" + key + "}}", str(value))
                        subject = subject.replace("{{" + key + "}}", str(value))
                else:
                    subject, html_body = render_template(
                        campaign_template_name,
                        first_name=email_rec.first_name or "",
                        last_name=email_rec.last_name or "",
                        company_name=email_rec.company_name or "",
                    )

                all_attachments = []

                if template_info:
                    pdf_bytes = render_pdf(
                        template_info["path"],
                        data,
                        template_info["file_type"],
                    )
                    safe_company = (data.get("company_name") or "").replace("/", "-").replace("\\", "-")
                    generated_name = (
                        f"{data['random_number'].replace('/', '_')}"
                        f"_{safe_company}"
                        f"_{data['date'].replace('.', '_')}.pdf"
                    )
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                        f.write(pdf_bytes)
                        tmp_pdf = Path(f.name)
                    all_attachments.append((generated_name, tmp_pdf))

                all_attachments.extend(static_attachments)

                if smtp_info:
                    send_smtp(
                        host=smtp_info["host"], port=smtp_info["port"],
                        username=smtp_info["username"], password=smtp_info["password"],
                        encryption=smtp_info["encryption"],
                        from_email=smtp_info["from_email"], from_name=smtp_info["from_name"],
                        to=to_addresses, subject=subject, html_body=html_body,
                        attachments=all_attachments or None,
                    )
                else:
                    send_gmail(
                        creds.client_id, creds.client_secret, creds.refresh_token,
                        to_addresses, subject, html_body,
                        attachments=all_attachments or None,
                    )
                email_rec.status = "sent"
                email_rec.sent_at = datetime.utcnow()
                campaign.sent_count += 1
            except Exception as exc:
                email_rec.status = "failed"
                email_rec.error_message = str(exc)
                campaign.error_count += 1
            finally:
                if tmp_pdf and tmp_pdf.exists():
                    tmp_pdf.unlink()

            db.commit()
            time.sleep(10)

        campaign.status = "completed"
        campaign.completed_at = datetime.utcnow()
        db.commit()

    except Exception:
        campaign.status = "failed"
        db.commit()
        raise
    finally:
        db.close()
