from pathlib import Path

import yaml

from humanoid_atlas.db.repos import upsert_contribution, upsert_owned_inventory, upsert_robot_model, upsert_source


def ingest_seed_file(path: str | Path) -> dict:
    payload = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    counts = {"robot_models": 0, "owned_inventory": 0, "sources": 0, "contributions": 0, "organizations": 0}
    for item in payload.get("robot_models", []):
        upsert_robot_model(item)
        counts["robot_models"] += 1
    for item in payload.get("owned_inventory", []):
        upsert_owned_inventory(item)
        counts["owned_inventory"] += 1
    for item in payload.get("sources", []):
        item.setdefault("source_type", "seed_yaml")
        upsert_source(item)
        counts["sources"] += 1
    for item in payload.get("organizations", []):
        upsert_source(
            {
                "source_type": "seed_yaml",
                "title": item["name"],
                "url": item.get("source_url") or f"seed:organization:{item['name']}",
                "excerpt": item.get("description", ""),
                "platform": "organization_seed",
                "metadata": item,
            }
        )
        counts["organizations"] += 1
    for item in payload.get("contributions", []):
        upsert_contribution(item)
        counts["contributions"] += 1
    return counts
