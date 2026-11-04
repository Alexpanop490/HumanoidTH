from pathlib import Path

from .session import connect, get_db_path


def init_db() -> Path:
    schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    with connect() as conn:
        conn.executescript(schema)
    return get_db_path()
