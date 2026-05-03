import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine
from app.api import gmail, campaigns, attachments, templates, email_templates, smtp
from app.config import settings

app = FastAPI(title="Mailer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gmail.router)
app.include_router(campaigns.router)
app.include_router(attachments.router)
app.include_router(templates.router)
app.include_router(email_templates.router)
app.include_router(smtp.router)


@app.on_event("startup")
def startup():
    for attempt in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception:
            if attempt == 29:
                raise
            time.sleep(1)
    Base.metadata.create_all(bind=engine)
    # Add template_id column to existing campaigns table if it was created before this migration
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "
            "template_id INTEGER REFERENCES template_files(id) ON DELETE SET NULL"
        ))
        conn.execute(text(
            "ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS row_data JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "
            "email_template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS smtp_settings (
                id SERIAL PRIMARY KEY,
                host VARCHAR NOT NULL,
                port INTEGER NOT NULL DEFAULT 587,
                username VARCHAR NOT NULL,
                password VARCHAR NOT NULL,
                encryption VARCHAR NOT NULL DEFAULT 'starttls',
                from_email VARCHAR NOT NULL,
                from_name VARCHAR
            )
        """))
        conn.commit()


@app.get("/api/health")
def health():
    return {"status": "ok"}
