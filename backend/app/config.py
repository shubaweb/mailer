from pathlib import Path
from pydantic_settings import BaseSettings

UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

TEMPLATES_DIR = Path("/app/uploads/templates")
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    database_url: str = "postgresql://mailer:mailer@db:5432/mailer"
    redis_url: str = "redis://redis:6379/0"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    @property
    def oauth_redirect_uri(self) -> str:
        return f"{self.backend_url}/api/gmail/callback"

    class Config:
        env_file = ".env"


settings = Settings()
