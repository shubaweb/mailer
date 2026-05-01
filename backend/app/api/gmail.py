from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GmailCredentials
from app.schemas import GmailCredentialsCreate, GmailStatus
from app.services.gmail_service import get_auth_url, exchange_code_for_token, get_user_email
from app.config import settings

router = APIRouter(prefix="/api/gmail", tags=["gmail"])


@router.get("/status", response_model=GmailStatus)
def get_status(db: Session = Depends(get_db)):
    creds = db.query(GmailCredentials).first()
    if not creds or not creds.refresh_token:
        return GmailStatus(connected=False)
    return GmailStatus(connected=True, email=creds.email)


@router.post("/credentials")
def save_credentials(data: GmailCredentialsCreate, db: Session = Depends(get_db)):
    creds = db.query(GmailCredentials).first()
    if creds:
        creds.client_id = data.client_id
        creds.client_secret = data.client_secret
        creds.refresh_token = None
        creds.email = None
    else:
        creds = GmailCredentials(client_id=data.client_id, client_secret=data.client_secret)
        db.add(creds)
    db.commit()
    return {"message": "Credentials saved"}


@router.get("/auth-url")
def get_google_auth_url(db: Session = Depends(get_db)):
    creds = db.query(GmailCredentials).first()
    if not creds:
        raise HTTPException(status_code=400, detail="No credentials configured")
    url = get_auth_url(creds.client_id, creds.client_secret, settings.oauth_redirect_uri)
    return {"url": url}


@router.get("/callback")
def oauth_callback(code: str, db: Session = Depends(get_db)):
    creds = db.query(GmailCredentials).first()
    if not creds:
        raise HTTPException(status_code=400, detail="No credentials configured")

    token_info = exchange_code_for_token(
        creds.client_id, creds.client_secret, code, settings.oauth_redirect_uri
    )
    creds.refresh_token = token_info["refresh_token"]
    creds.email = get_user_email(creds.client_id, creds.client_secret, token_info["access_token"])
    db.commit()

    return RedirectResponse(url=f"{settings.frontend_url}/settings?connected=true")


@router.delete("/disconnect")
def disconnect(db: Session = Depends(get_db)):
    creds = db.query(GmailCredentials).first()
    if creds:
        creds.refresh_token = None
        creds.email = None
        db.commit()
    return {"message": "Disconnected"}
