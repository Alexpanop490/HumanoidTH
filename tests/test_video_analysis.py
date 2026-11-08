from fastapi.testclient import TestClient

from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.pipeline.video_analysis import VideoObservations
from humanoid_atlas.viewer import server
from humanoid_atlas.viewer.server import create_app


def test_upload_returns_and_persists_web_import_record(monkeypatch):
    init_db()
    monkeypatch.setattr(server, "extract_video_frames", lambda video, suffix: (12.5, [{"timestamp_seconds": 0.0, "image": "frame"}]))
    monkeypatch.setattr(
        server,
        "analyze_frames_with_ollama",
        lambda frames: (
            VideoObservations(
                summary="A humanoid robot walks across a room.",
                robots_detected=["humanoid robot"],
                actions_observed=["walking"],
                setting="indoor room",
                confidence=0.82,
            ),
            "qwen2.5vl:3b",
        ),
    )
    client = TestClient(create_app())

    response = client.post(
        "/api/videos",
        files={"file": ("robot-demo.mp4", b"video bytes", "video/mp4")},
    )

    assert response.status_code == 201
    record = response.json()
    assert record["source_type"] == "video_upload"
    assert record["title"] == "robot-demo"
    assert record["robots_detected"] == ["humanoid robot"]
    assert record["review_status"] == "needs_review"
    assert client.get("/api/videos").json() == [record]
    assert client.get(f"/api/videos/{record['id']}").json() == record


def test_video_upload_rejects_unsupported_extension():
    init_db()
    response = TestClient(create_app()).post(
        "/api/videos",
        files={"file": ("notes.txt", b"not a video", "text/plain")},
    )
    assert response.status_code == 415


def test_video_upload_reports_ollama_unavailable(monkeypatch):
    init_db()

    def fail_analysis(frames):
        from humanoid_atlas.pipeline.video_analysis import OllamaUnavailableError

        raise OllamaUnavailableError("Could not analyze video with Ollama.")

    monkeypatch.setattr(server, "extract_video_frames", lambda video, suffix: (1.0, [{"timestamp_seconds": 0.0, "image": "frame"}]))
    monkeypatch.setattr(server, "analyze_frames_with_ollama", fail_analysis)
    response = TestClient(create_app()).post(
        "/api/videos",
        files={"file": ("robot-demo.mp4", b"video bytes", "video/mp4")},
    )

    assert response.status_code == 503
    assert "Ollama" in response.json()["detail"]
