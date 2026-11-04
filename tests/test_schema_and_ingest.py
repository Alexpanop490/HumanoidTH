from humanoid_atlas.adapters.seed_yaml import ingest_seed_file
from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.db.repos import rows


def test_db_init_is_idempotent():
    init_db()
    init_db()
    tables = {r["name"] for r in rows("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"sources", "robot_models", "owned_inventory", "contributions", "perspective_annotations", "pipeline_runs"} <= tables


def test_seed_ingest_is_idempotent():
    init_db()
    ingest_seed_file("data/seeds/robot_models.seed.yml")
    ingest_seed_file("data/seeds/owned_inventory.seed.yml")
    ingest_seed_file("data/seeds/source_urls.seed.yml")
    first = rows("SELECT COUNT(*) c FROM robot_models")[0]["c"]
    first_inventory = rows("SELECT COUNT(*) c FROM owned_inventory")[0]["c"]
    ingest_seed_file("data/seeds/robot_models.seed.yml")
    ingest_seed_file("data/seeds/owned_inventory.seed.yml")
    assert rows("SELECT COUNT(*) c FROM robot_models")[0]["c"] == first
    assert rows("SELECT COUNT(*) c FROM owned_inventory")[0]["c"] == first_inventory
    assert rows("SELECT COUNT(*) c FROM sources")[0]["c"] >= 10
