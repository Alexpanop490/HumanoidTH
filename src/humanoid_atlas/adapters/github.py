import httpx

from humanoid_atlas.config import get_settings
from humanoid_atlas.db.repos import upsert_contribution, upsert_source


def ingest_github(query: str, limit: int = 25) -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if get_settings().github_token:
        headers["Authorization"] = f"Bearer {get_settings().github_token}"
    response = httpx.get(
        "https://api.github.com/search/repositories",
        params={"q": query, "per_page": min(limit, 100)},
        headers=headers,
        timeout=20,
    )
    response.raise_for_status()
    count = 0
    for repo in response.json().get("items", []):
        upsert_source(
            {
                "source_type": "github",
                "title": repo.get("full_name"),
                "url": repo.get("html_url"),
                "excerpt": repo.get("description") or "",
                "author": repo.get("owner", {}).get("login"),
                "platform": "github",
                "metadata": {"stars": repo.get("stargazers_count"), "language": repo.get("language"), "query": query},
            }
        )
        upsert_contribution(
            {
                "contribution_type": "software_repository",
                "title": repo.get("full_name"),
                "description": repo.get("description"),
                "source_url": repo.get("html_url"),
                "license": (repo.get("license") or {}).get("spdx_id"),
                "verification_status": "pending",
            }
        )
        count += 1
    return {"sources": count, "contributions": count, "missing_keys": [] if get_settings().github_token else ["GITHUB_TOKEN optional"]}
