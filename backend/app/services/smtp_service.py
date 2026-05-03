import smtplib
import ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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
    if attachments:
        message: MIMEMultipart = MIMEMultipart("mixed")
        html_part = MIMEMultipart("alternative")
        html_part.attach(MIMEText(html_body, "html"))
        message.attach(html_part)
        for name, path in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(path.read_bytes())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=name)
            message.attach(part)
    else:
        message = MIMEMultipart("alternative")
        message.attach(MIMEText(html_body, "html"))

    sender = f"{from_name} <{from_email}>" if from_name else from_email
    message["From"] = sender
    message["To"] = to
    message["Subject"] = subject

    ctx = ssl.create_default_context()

    timeout = 15

    if encryption == "ssl":
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=timeout) as server:
            server.login(username, password)
            server.sendmail(from_email, to, message.as_bytes())
    elif encryption == "starttls":
        with smtplib.SMTP(host, port, timeout=timeout) as server:
            server.ehlo()
            server.starttls(context=ctx)
            server.login(username, password)
            server.sendmail(from_email, to, message.as_bytes())
    else:
        with smtplib.SMTP(host, port, timeout=timeout) as server:
            server.login(username, password)
            server.sendmail(from_email, to, message.as_bytes())
