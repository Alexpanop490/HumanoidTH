import json

from humanoid_atlas.db.session import connect
import youtube_converter


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_youtube_api_videos_are_saved_in_humanoid_video_analyses(monkeypatch):
    def fake_get(url, **kwargs):
        if url.endswith("/search"):
            return FakeResponse(
                {
                    "items": [
                        {
                            "id": {"videoId": "video-123"},
                            "snippet": {
                                "title": "Humanoid robot demo",
                                "description": "A robot walking.",
                                "channelTitle": "Robotics Lab",
                                "publishedAt": "2026-01-02T03:04:05Z",
                            },
                        }
                    ]
                }
            )
        return FakeResponse(
            {
                "items": [
                    {
                        "snippet": {
                            "title": "Humanoid robot demo",
                            "description": "A robot walking.",
                            "channelTitle": "Robotics Lab",
                            "publishedAt": "2026-01-02T03:04:05Z",
                            "tags": ["humanoid"],
                        },
                        "statistics": {"viewCount": "120"},
                        "contentDetails": {"duration": "PT1M2S"},
                    }
                ]
            }
        )

    monkeypatch.setattr(youtube_converter.httpx, "get", fake_get)
    monkeypatch.setattr(
        youtube_converter,
        "classify_video",
        lambda title, description: {
            "category": "humanoid_robot",
            "confidence": 0.85,
            "method": "metadata_rule_based",
        },
    )
    monkeypatch.setattr(youtube_converter, "query_robot_spec", lambda robot_id: None)
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key")

    imported = youtube_converter.ingest_and_store_video_records("humanoid robot", limit=1)
    imported_again = youtube_converter.ingest_and_store_video_records("humanoid robot", limit=1)

    with connect() as conn:
        rows = conn.execute("SELECT * FROM video_analyses").fetchall()

    assert len(imported) == 1
    assert len(imported_again) == 1
    assert len(rows) == 1
    payload = json.loads(rows[0]["analysis_json"])
    assert rows[0]["filename"] == "Humanoid robot demo"
    assert rows[0]["media_type"] == "video/youtube"
    assert rows[0]["duration_seconds"] == 62
    assert payload["source_type"] == "youtube"
    assert payload["video_id"] == "video-123"
    assert payload["category"] == "humanoid_robot"
    assert payload["view_count"] == 120
    assert payload["summary"] == "A robot walking."
    assert payload["robots_detected"] == []
    assert payload["actions_observed"] == []
    assert payload["events"] == []
    assert payload["evidence"] == []
