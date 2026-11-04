import os
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    db_path = tmp_path / "atlas.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    from humanoid_atlas.config import get_settings

    get_settings.cache_clear()
    yield db_path
    get_settings.cache_clear()
