from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SmtpSettings(Base):
    __tablename__ = "smtp_settings"

    id = Column(Integer, primary_key=True)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False, default=587)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    encryption = Column(String, nullable=False, default="starttls")  # starttls | ssl | none
    from_email = Column(String, nullable=False)
    from_name = Column(String, nullable=True)


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TemplateFile(Base):
    __tablename__ = "template_files"

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "docx" or "pdf"
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


campaign_attachments = Table(
    "campaign_attachments",
    Base.metadata,
    Column("campaign_id", Integer, ForeignKey("campaigns.id", ondelete="CASCADE")),
    Column("attachment_id", Integer, ForeignKey("attachments.id", ondelete="CASCADE")),
)


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class GmailCredentials(Base):
    __tablename__ = "gmail_credentials"

    id = Column(Integer, primary_key=True)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    refresh_token = Column(Text, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    template_name = Column(String, nullable=False, default="default")
    template_id = Column(Integer, ForeignKey("template_files.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, nullable=False, default="pending")
    total_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    email_template_id = Column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String, nullable=True)

    emails = relationship("CampaignEmail", back_populates="campaign")
    attachments = relationship("Attachment", secondary=campaign_attachments)
    template = relationship("TemplateFile")
    email_template = relationship("EmailTemplate")


class CampaignEmail(Base):
    __tablename__ = "campaign_emails"

    id = Column(Integer, primary_key=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    email = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    row_data = Column(JSONB, nullable=True)
    status = Column(String, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    campaign = relationship("Campaign", back_populates="emails")
