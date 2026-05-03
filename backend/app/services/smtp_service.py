import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path


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
