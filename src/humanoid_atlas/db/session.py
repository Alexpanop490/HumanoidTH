import sqlite3
from pathlib import Path

from humanoid_atlas.config import get_settings


def get_db_path() -> Path:
    path = get_settings().database_path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
