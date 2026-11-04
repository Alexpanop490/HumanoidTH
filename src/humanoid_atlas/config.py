from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Thailand Humanoid Atlas"
    topic_name: str = "humanoid and social robotics"
    primary_scope: str = "Thailand humanoid and social robotics ecosystem"
    database_url: str = "sqlite:///data/processed/thailand_humanoid_atlas.db"
    database_read_only: bool = False
    auth_mode: str = "local"
    public_demo_mode: bool = False
    llm_provider: str = "none"
    youtube_api_key: str = ""
    github_token: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_path(self) -> Path:
        if not self.database_url.startswith("sqlite:///"):
            raise ValueError("Only sqlite:/// URLs are supported in this first release")
        return Path(self.database_url.replace("sqlite:///", "", 1))


@lru_cache
def get_settings() -> Settings:
    return Settings()
