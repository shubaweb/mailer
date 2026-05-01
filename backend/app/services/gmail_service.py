import base64
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def _flow(client_id: str, client_secret: str, redirect_uri: str) -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


def get_auth_url(client_id: str, client_secret: str, redirect_uri: str) -> str:
    flow = _flow(client_id, client_secret, redirect_uri)
    url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return url


def exchange_code_for_token(
    client_id: str, client_secret: str, code: str, redirect_uri: str
) -> dict:
    flow = _flow(client_id, client_secret, redirect_uri)
    flow.fetch_token(code=code)
    return {
        "refresh_token": flow.credentials.refresh_token,
        "access_token": flow.credentials.token,
    }


def get_user_email(client_id: str, client_secret: str, access_token: str) -> str:
    creds = Credentials(
        token=access_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    service = build("oauth2", "v2", credentials=creds)
    return service.userinfo().get().execute().get("email", "")


def send_email(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    to: str,
    subject: str,
    html_body: str,
    attachments: list[tuple[str, Path]] | None = None,
) -> None:
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    service = build("gmail", "v1", credentials=creds)

    if attachments:
        message: MIMEMultipart = MIMEMultipart("mixed")
        html_part = MIMEMultipart("alternative")
        html_part.attach(MIMEText(html_body, "html"))
        message.attach(html_part)

        for original_name, file_path in attachments:
            part = MIMEBase("application", "pdf")
            part.set_payload(file_path.read_bytes())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=original_name)
            message.attach(part)
    else:
        message = MIMEMultipart("alternative")
        message.attach(MIMEText(html_body, "html"))

    message["to"] = to
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()
