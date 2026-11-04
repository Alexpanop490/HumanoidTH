from humanoid_atlas.db.repos import upsert_source


def ingest_manual_social(title: str, url: str, excerpt: str = "", platform: str = "manual_social") -> int:
    return upsert_source(
        {
            "source_type": "manual_social",
            "title": title,
            "url": url,
            "excerpt": excerpt[:1000],
            "platform": platform,
            "metadata": {"collection_note": "Manual URL/metadata only; no restricted scraping."},
        }
    )
