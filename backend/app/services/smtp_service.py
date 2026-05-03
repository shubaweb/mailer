import imaplib
import logging
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path

logger = logging.getLogger(__name__)


_SENT_FOLDER_CANDIDATES = ["Sent", "Sent Items", "Sent Messages", "INBOX.Sent", "Отправленные"]


def _save_to_sent(host: str, username: str, password: str, raw: bytes) -> None:
    ctx = ssl.create_default_context()
    imap = None
    try:
        try:
            imap = imaplib.IMAP4_SSL(host, 993, ssl_context=ctx)
            logger.info("IMAP: connected via SSL to %s:993", host)
        except Exception as e:
            logger.warning("IMAP SSL failed (%s), trying STARTTLS on 143", e)
            imap = imaplib.IMAP4(host, 143)
            imap.starttls(ssl_context=ctx)
        imap.login(username, password)

        sent_folder = None
        _, folders = imap.list()
        for folder_line in (folders or []):
            decoded = folder_line.decode() if isinstance(folder_line, bytes) else folder_line
            # LIST response format: (attributes) "delimiter" folder-name
            folder_name = decoded.rsplit('"."', 1)[-1].strip().strip('"')
            for candidate in _SENT_FOLDER_CANDIDATES:
                if candidate.lower() == folder_name.lower():
                    sent_folder = folder_name
                    break
            if sent_folder:
                break

        if not sent_folder:
            sent_folder = "Sent"

        imap.append(sent_folder, "\\Seen", imaplib.Time2Internaldate(time.time()), raw)
    except Exception as e:
        logger.error("IMAP save to Sent failed: %s", e)
    finally:
        if imap:
            try:
                imap.logout()
            except Exception:
                pass


def send_email(
    host: str,
    port: int,
    username: str,
    password: str,
    encryption: str,
    from_email: str,
    from_name: str | None,
    to: str,
    subject: str,
    html_body: str,
    attachments: list[tuple[str, Path]] | None = None,
) -> None:
    msg = EmailMessage()
    msg["From"] = formataddr((from_name, from_email)) if from_name else from_email
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html_body, subtype="html", charset="utf-8")

    if attachments:
        for name, path in attachments:
            data = path.read_bytes()
            msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=name)

    ctx = ssl.create_default_context()
    timeout = 15
    to_list = [addr.strip() for addr in to.split(",") if addr.strip()]
    raw = msg.as_bytes()

    if encryption == "ssl":
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=timeout) as server:
            server.login(username, password)
            server.send_message(msg, from_addr=from_email, to_addrs=to_list)
    elif encryption == "starttls":
        with smtplib.SMTP(host, port, timeout=timeout) as server:
            server.ehlo()
            server.starttls(context=ctx)
            server.login(username, password)
            server.send_message(msg, from_addr=from_email, to_addrs=to_list)
    else:
        with smtplib.SMTP(host, port, timeout=timeout) as server:
            server.login(username, password)
            server.send_message(msg, from_addr=from_email, to_addrs=to_list)

    _save_to_sent(host, username, password, raw)
