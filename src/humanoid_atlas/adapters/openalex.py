from urllib.parse import quote

import httpx

from humanoid_atlas.db.repos import upsert_contribution, upsert_source


def ingest_openalex(query: str, from_year: int = 2015, limit: int = 25) -> dict:
    url = f"https://api.openalex.org/works?search={quote(query)}&filter=from_publication_date:{from_year}-01-01&per-page={limit}"
    response = httpx.get(url, timeout=20)
    response.raise_for_status()
    count = 0
    for work in response.json().get("results", []):
        source_url = work.get("doi") or work.get("id")
        title = work.get("display_name") or "Untitled OpenAlex work"
        upsert_source(
            {
                "source_type": "openalex",
                "title": title,
                "url": source_url,
                "excerpt": work.get("abstract_inverted_index") and "OpenAlex abstract metadata available." or "",
                "published_at": str(work.get("publication_year") or ""),
                "platform": "openalex",
                "metadata": {"openalex_id": work.get("id"), "query": query},
            }
        )
        upsert_contribution(
            {
                "contribution_type": "research_paper",
                "title": title,
                "source_url": source_url,
                "license": work.get("license"),
                "verification_status": "pending",
            }
        )
        count += 1
    return {"sources": count, "contributions": count}
