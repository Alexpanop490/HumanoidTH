from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from humanoid_atlas.db.repos import upsert_source


def ingest_gdelt(query: str, days: int = 30, limit: int = 25) -> dict:
    url = (
        "https://api.gdeltproject.org/api/v2/doc/doc"
        f"?query={quote(query)}&mode=artlist&format=json&maxrecords={limit}&timespan={days}d"
    )
    response = httpx.get(url, timeout=20)
    response.raise_for_status()
    articles = response.json().get("articles", [])
    for article in articles:
        upsert_source(
            {
                "source_type": "gdelt",
                "title": article.get("title") or "Untitled GDELT article",
                "url": article.get("url") or f"gdelt:{article.get('seendate')}:{article.get('title')}",
                "excerpt": article.get("snippet") or "",
                "published_at": article.get("seendate"),
                "platform": article.get("domain") or "gdelt",
                "metadata": {"query": query, "fetched_at": datetime.now(timezone.utc).isoformat(), "source": article},
            }
        )
    return {"sources": len(articles)}
