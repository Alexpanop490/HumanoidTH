from datetime import datetime, timezone

import httpx

from humanoid_atlas.config import get_settings
from humanoid_atlas.db.repos import upsert_source


def ingest_youtube(query: str, limit: int = 25) -> dict:
    key = get_settings().youtube_api_key
    if not key:
        return {"sources": 0, "missing_keys": ["YOUTUBE_API_KEY"]}
    response = httpx.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={"part": "snippet", "q": query, "type": "video", "maxResults": min(limit, 50), "key": key},
        timeout=20,
    )
    response.raise_for_status()
    count = 0
    for item in response.json().get("items", []):
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId")
        if not video_id:
            continue
        upsert_source(
            {
                "source_type": "youtube",
                "title": snippet.get("title") or "Untitled YouTube video",
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "excerpt": snippet.get("description") or "",
                "published_at": snippet.get("publishedAt"),
                "author": snippet.get("channelTitle"),
                "platform": "youtube",
                "metadata": {"query": query, "fetched_at": datetime.now(timezone.utc).isoformat()},
            }
        )
        count += 1
    return {"sources": count}

