import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
CONFIG = json.loads((ROOT / "app/config.json").read_text(encoding="utf-8"))
SOURCES = [s for s in CONFIG["sources"] if s["status"] == "사용" and s.get("listingUrl")]
SOURCE_BY_ID = {s["id"]: s for s in SOURCES}
PRIORITY = {"competitor": 0, "company": 1, "hospital": 2, "policy": 3}


def integer(name, default, low, high):
    try:
        value = int(os.getenv(name, str(default)))
        return value if low <= value <= high else default
    except ValueError:
        return default


def automation_settings():
    return {
        "enabled": os.getenv("AUTO_ENABLED", "false").lower() == "true",
        "sourceLimit": integer("AUTO_SOURCE_LIMIT", 12, 1, 12),
        "maxBodies": integer("AUTO_MAX_BODY_PER_DAY", 120, 1, 240),
    }


def database_path():
    path = Path(os.getenv("DATABASE_PATH", "data/news.db"))
    return path if path.is_absolute() else ROOT / path
