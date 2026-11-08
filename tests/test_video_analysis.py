from fastapi.testclient import TestClient
from pathlib import Path
from types import SimpleNamespace

from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.pipeline import video_analysis
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
                humanoid_robot_detected=True,
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


def test_youtube_analysis_returns_and_persists_humanoid_observations(monkeypatch):
    init_db()
    analysis = {
        "video_id": "dQw4w9WgXcQ",
        "title": "Humanoid robot demo",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "source_type": "youtube",
        "summary": "A humanoid robot walks across a room.",
        "robots_detected": ["Unitree G1"],
        "humanoid_robot_detected": True,
        "actions_observed": ["walking"],
        "confidence": 0.91,
        "analysis_model": "qwen2.5vl:3b",
        "review_status": "needs_review",
    }
    def fake_analyze(video):
        assert video["video_id"] == "dQw4w9WgXcQ"
        return analysis

    monkeypatch.setattr(server, "analyze_youtube_video", fake_analyze)
    monkeypatch.setattr(server, "save_video_analysis_record", lambda record: record)

    response = TestClient(create_app()).post(
        "/api/youtube/analyze",
        json={"videos": [{"video_id": "dQw4w9WgXcQ", "title": "Humanoid robot demo"}]},
    )

    assert response.status_code == 200
    assert response.json()["analyzed"] == 1
    assert response.json()["videos"][0]["humanoid_robot_detected"] is True
    assert response.json()["videos"][0]["robots_detected"] == ["Unitree G1"]


def test_youtube_video_download_is_sampled_and_analyzed(monkeypatch):
    class FakeYoutubeDL:
        def __init__(self, options):
            self.path = options["outtmpl"].replace("%(id)s.%(ext)s", "dQw4w9WgXcQ.mp4")
            Path(self.path).write_bytes(b"video bytes")

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            assert exc_type is exc_value is traceback is None
            return False

        def extract_info(self, url, download):
            assert url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            assert download is True
            return {"title": "Visual humanoid robot test", "filepath": self.path}

        def prepare_filename(self, info):
            assert info["filepath"] == self.path
            return self.path

    monkeypatch.setattr(video_analysis, "yt_dlp", SimpleNamespace(YoutubeDL=FakeYoutubeDL))
    def fake_extract_frames(data, suffix):
        assert data == b"video bytes"
        assert suffix == ".mp4"
        return 12.0, [{"timestamp_seconds": 0.0, "image": "frame"}]

    monkeypatch.setattr(video_analysis, "extract_video_frames", fake_extract_frames)

    def fake_analyze_frames(frames):
        assert frames[0]["timestamp_seconds"] == 0.0
        return (
            VideoObservations(
                summary="A humanoid robot walks.",
                robots_detected=["Unitree G1"],
                humanoid_robot_detected=True,
                actions_observed=["walking"],
                confidence=0.9,
            ),
            "qwen2.5vl:3b",
        )

    monkeypatch.setattr(
        video_analysis,
        "analyze_frames_with_ollama",
        fake_analyze_frames,
    )

    result = video_analysis.analyze_youtube_video({"video_id": "dQw4w9WgXcQ", "title": "Visual humanoid robot test"})

    assert result["humanoid_robot_detected"] is True
    assert result["robots_detected"] == ["Unitree G1"]
    assert result["duration_seconds"] == 12.0
    assert result["review_status"] == "needs_review"
