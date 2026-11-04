from humanoid_atlas.db.repos import now
from humanoid_atlas.db.session import connect


def extract_basic_triplets() -> dict:
    created = 0
    with connect() as conn:
        robots = [dict(r) for r in conn.execute("SELECT id, canonical_name, developer_org, manufacturer, primary_use_case FROM robot_models")]
        for robot in robots:
            org = robot.get("developer_org") or robot.get("manufacturer")
            if org:
                conn.execute(
                    "INSERT OR IGNORE INTO triplets(subject,relation,object,confidence,created_at) VALUES(?,?,?,?,?)",
                    (org, "developed", robot["canonical_name"], 0.7, now()),
                )
                created += 1
            if robot.get("primary_use_case"):
                conn.execute(
                    "INSERT OR IGNORE INTO triplets(subject,relation,object,confidence,created_at) VALUES(?,?,?,?,?)",
                    (robot["canonical_name"], "used_for", robot["primary_use_case"], 0.6, now()),
                )
                created += 1
        for row in conn.execute("SELECT id, title FROM sources WHERE relevance_status='accepted'"):
            conn.execute(
                "INSERT OR IGNORE INTO triplets(subject,relation,object,confidence,source_id,created_at) VALUES(?,?,?,?,?,?)",
                (row["title"], "discusses", "humanoid/social robotics", 0.5, row["id"], now()),
            )
            created += 1
    return {"triplets_considered": created}
