import json

from humanoid_atlas.db.repos import now
from humanoid_atlas.db.session import connect


def rebuild_stats_cache() -> dict:
    with connect() as conn:
        payload = {
            "sources": conn.execute("SELECT COUNT(*) c FROM sources").fetchone()["c"],
            "accepted_sources": conn.execute("SELECT COUNT(*) c FROM sources WHERE relevance_status='accepted'").fetchone()["c"],
            "robot_models": conn.execute("SELECT COUNT(*) c FROM robot_models").fetchone()["c"],
            "owned_inventory": conn.execute("SELECT COUNT(*) c FROM owned_inventory").fetchone()["c"],
            "contributions": conn.execute("SELECT COUNT(*) c FROM contributions").fetchone()["c"],
            "pending_review": conn.execute("SELECT COUNT(*) c FROM submitted_data WHERE status IN ('queued','needs review')").fetchone()["c"],
            "perspective_themes": [dict(r) for r in conn.execute("SELECT perception_theme, COUNT(*) count FROM perspective_annotations GROUP BY perception_theme")],
            "robot_status": [dict(r) for r in conn.execute("SELECT thailand_status, COUNT(*) count FROM robot_models GROUP BY thailand_status")],
        }
        conn.execute(
            "INSERT OR REPLACE INTO stats_cache(key,value_json,updated_at) VALUES(?,?,?)",
            ("overview", json.dumps(payload), now()),
        )
    return payload
