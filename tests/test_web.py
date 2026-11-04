from fastapi.testclient import TestClient

from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.viewer.server import create_app


def test_required_routes_render():
    init_db()
    client = TestClient(create_app())
    for path in [
        "/",
        "/dashboard",
        "/perspectives",
        "/robots",
        "/inventory",
        "/contributions",
        "/analytics",
        "/database",
        "/submit-data",
        "/profile",
        "/admin",
    ]:
        response = client.get(path)
        assert response.status_code == 200, path


def test_admin_actions_protected():
    init_db()
    client = TestClient(create_app())
    response = client.post("/admin/1/approve")
    assert response.status_code == 403
