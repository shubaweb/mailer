from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str


class EmailTemplateOut(EmailTemplateCreate):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class GmailCredentialsCreate(BaseModel):
    client_id: str
    client_secret: str


class GmailStatus(BaseModel):
    connected: bool
    email: Optional[str] = None


class CampaignEmailOut(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    company_name: Optional[str]
    status: str
    error_message: Optional[str]
    sent_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CampaignOut(BaseModel):
    id: int
    name: str
    template_name: str
    status: str
    total_count: int
    sent_count: int
    error_count: int
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TemplateFileOut(BaseModel):
    id: int
    original_name: str
    file_type: str
    size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AttachmentOut(BaseModel):
    id: int
    original_name: str
    size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CampaignDetailOut(CampaignOut):
    emails: List[CampaignEmailOut] = []
    attachments: List[AttachmentOut] = []
    template: Optional[TemplateFileOut] = None
