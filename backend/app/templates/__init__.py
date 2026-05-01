from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent

TEMPLATE_SUBJECTS = {
    "default": "Привет, {first_name}!",
}


def render_template(template_name: str, **kwargs: str) -> tuple[str, str]:
    template_path = TEMPLATES_DIR / f"{template_name}.html"
    html = template_path.read_text(encoding="utf-8")

    for key, value in kwargs.items():
        html = html.replace("{{" + key + "}}", value)

    subject_tpl = TEMPLATE_SUBJECTS.get(template_name, "Письмо от Mailer")
    subject = subject_tpl.format(**kwargs)

    return subject, html
