import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

from humanoid_atlas.db.repos import upsert_source


def ingest_rss(feed_url: str, limit: int = 25) -> dict:
    response = httpx.get(feed_url, timeout=20, follow_redirects=True)
    response.raise_for_status()
    root = ET.fromstring(response.text)
    count = 0
    for item in root.findall(".//item")[:limit]:
        title = item.findtext("title") or "Untitled RSS item"
        link = item.findtext("link") or f"rss:{feed_url}:{title}"
        excerpt = item.findtext("description") or ""
        upsert_source(
            {
                "source_type": "rss",
                "title": title.strip(),
                "url": link.strip(),
                "excerpt": excerpt.strip(),
                "published_at": item.findtext("pubDate"),
                "platform": "rss",
                "metadata": {"feed_url": feed_url, "fetched_at": datetime.now(timezone.utc).isoformat()},
            }
        )
        count += 1
    return {"sources": count}
