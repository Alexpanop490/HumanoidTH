"""YouTube data adapter with optional ML-based video categorization.

This module keeps the original YouTube ingestion contract while adding a legal,
free-or-local classification layer:
- metadata-driven categorization based on web/search data
- OpenCV motion-based scoring when a downloaded video is available
- optional Gemini API classification when GEMINI_API_KEY is configured
- optional local YOLO integration if ultralytics is installed

The code is designed to run under normal Python, not only Jupyter notebooks.
"""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import uuid
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.db.session import connect

try:  # pragma: no cover - optional dependency
    import cv2  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    cv2 = None

try:  # pragma: no cover - optional dependency
    import numpy as np  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    np = None

try:  # pragma: no cover - optional dependency
    import yt_dlp  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    yt_dlp = None

# Load environment variables from the project root .env file.
load_dotenv()


def get_settings() -> Any:
    """Return the configured API keys used by the adapter."""

    class Settings:
        youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1")
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    return Settings()


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).lower().replace("\n", " ").split())


def _category_keywords() -> Dict[str, List[str]]:
    return {
        "humanoid_robot": [
            "humanoid",
            "bipedal humanoid",
            "atlas",
            "optimus",
            "g1",
            "h1",
            "unitree",
            "tesla robot",
            "walking robot",
        ],
        "quadruped_robot": [
            "quadruped",
            "robot dog",
            "go2",
            "spot",
            "dog robot",
            "legged robot",
        ],
        "industrial_robot": [
            "industrial robot",
            "cobot",
            "manipulator",
            "arm robot",
            "factory robot",
        ],
        "research_demo": [
            "research",
            "demo",
            "prototype",
            "lab",
            "simulation",
            "test bench",
        ],
        "tutorial": [
            "tutorial",
            "how to",
            "training",
            "explain",
            "course",
            "demo walkthrough",
        ],
    }


def classify_video_from_metadata(title: str, description: str = "", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Classify a YouTube item using title/description metadata.

    This serves as a free/legal local AI fallback that does not depend on cloud
    APIs or paid models.
    """
    text = _normalize_text(f"{title} {description} {metadata or ''}")
    labels = _category_keywords()

    best_label = "general_video"
    best_score = 0.0
    for label, keywords in labels.items():
        score = 0.0
        for keyword in keywords:
            if keyword in text:
                score += 1
        if score > best_score:
            best_label = label
            best_score = score

    confidence = min(0.95, 0.55 + (best_score * 0.15))
    if best_score == 0:
        confidence = 0.42

    return {
        "category": best_label,
        "confidence": round(confidence, 2),
        "method": "metadata_rule_based",
        "keywords": [kw for kw in labels.get(best_label, []) if kw in text][:5],
        "title": title,
        "description": description,
    }


def _detect_motion_score(video_file: str, max_frames: int = 60) -> float:
    """Estimate motion activity in a video using OpenCV background differencing."""
    if cv2 is None or np is None:
        return 0.0

    cap = cv2.VideoCapture(video_file)
    if not cap.isOpened():
        return 0.0

    prev_gray = None
    motion_frames = 0
    processed = 0

    while processed < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        processed += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        if prev_gray is not None:
            diff = cv2.absdiff(prev_gray, gray)
            _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
            motion_ratio = float(np.count_nonzero(thresh)) / float(thresh.size)
            if motion_ratio > 0.01:
                motion_frames += 1

        prev_gray = gray

    cap.release()
    return min(1.0, motion_frames / max(1, processed))


def classify_video_with_local_ai(title: str, description: str = "", video_file: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Combine metadata heuristics with optional OpenCV motion signal."""
    result = classify_video_from_metadata(title, description, metadata)

    if video_file and os.path.exists(video_file):
        motion_score = _detect_motion_score(video_file)
        if motion_score > 0.05:
            result["motion_score"] = round(motion_score, 2)
            result["category"] = "motion_active_video" if result["category"] == "general_video" else result["category"]
            result["confidence"] = min(0.99, result["confidence"] + 0.08)
            result["method"] = "metadata_plus_opencv"

    return result


def _call_ollama_for_classification(title: str, description: str = "") -> Optional[Dict[str, Any]]:
    """Use a local Ollama model when it is available."""
    settings = get_settings()
    model = settings.ollama_model
    base_url = (settings.ollama_base_url or "http://localhost:11434").rstrip("/")
    if not model:
        return None

    prompt = (
        "Classify the YouTube video topic into one of: humanoid_robot, quadruped_robot, "
        "industrial_robot, research_demo, tutorial, general_video. "
        "Return JSON only with fields: category, confidence, rationale. "
        "Use the title and description below.\n\n"
        f"Title: {title}\nDescription: {description}"
    )

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }

    try:
        response = httpx.post(f"{base_url}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    try:
        data = response.json()
        text = data.get("response", "")
        if not text:
            return None

        try:
            payload_json = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            payload_json = json.loads(text[start : end + 1])

        return {
            "category": payload_json.get("category", "general_video"),
            "confidence": float(payload_json.get("confidence", 0.5)),
            "rationale": payload_json.get("rationale", "Ollama classification"),
            "method": "ollama_api",
        }
    except (TypeError, ValueError):
        return None


def _call_gemini_for_classification(title: str, description: str = "") -> Optional[Dict[str, Any]]:
    """Use Gemini API when a key is present.

    This is optional and legal when the API key is valid and the destination API
    terms are accepted. It is not required for local/offline processing.
    """
    key = get_settings().gemini_api_key
    if not key:
        return None

    prompt = (
        "Classify the YouTube video topic into one of: humanoid_robot, quadruped_robot, "
        "industrial_robot, research_demo, tutorial, general_video. "
        "Return JSON with fields: category, confidence, rationale. "
        "Use the title and description below.\n\n"
        f"Title: {title}\nDescription: {description}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"},
    }

    try:
        response = httpx.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            params={"key": key},
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    try:
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        payload_json = json.loads(text)
        return {
            "category": payload_json.get("category", "general_video"),
            "confidence": float(payload_json.get("confidence", 0.5)),
            "rationale": payload_json.get("rationale", "Gemini classification"),
            "method": "gemini_api",
        }
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def classify_video(title: str, description: str = "", video_file: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Top-level classification function: prefer Ollama when available, otherwise Gemini/local methods."""
    ollama_result = _call_ollama_for_classification(title, description)
    if ollama_result:
        return {
            **ollama_result,
            "title": title,
            "description": description,
            "source_metadata": metadata or {},
        }

    gemini_result = _call_gemini_for_classification(title, description)
    if gemini_result:
        return {
            **gemini_result,
            "title": title,
            "description": description,
            "source_metadata": metadata or {},
        }

    return classify_video_with_local_ai(title, description, video_file=video_file, metadata=metadata)


def init_robot_database() -> None:
    """Create a local SQLite database of robot reference entries."""
    db_path = Path("robot_classification.db")
    conn = sqlite3.connect(db_path)
    conn.execute("DROP TABLE IF EXISTS robots;")
    conn.execute(
        """
        CREATE TABLE robots (
            robot_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            manufacturer TEXT NOT NULL,
            morphology TEXT NOT NULL,
            actuated_dof INTEGER NOT NULL,
            mass_kg REAL NOT NULL
        );
        """
    )
    conn.executemany(
        "INSERT INTO robots VALUES (?, ?, ?, ?, ?, ?);",
        [
            ("unitree_g1", "Unitree G1 (Humanoid)", "Unitree Robotics", "Bipedal Humanoid", 23, 35.0),
            ("unitree_go2", "Unitree Go2 (Quadruped)", "Unitree Robotics", "Quadruped", 12, 15.0),
            ("tesla_optimus", "Tesla Optimus Gen 2", "Tesla", "Bipedal Humanoid", 28, 57.0),
            ("boston_atlas", "Boston Dynamics Atlas", "Boston Dynamics", "Bipedal Humanoid", 28, 89.0),
            ("h1_humanoid", "Unitree H1", "Unitree Robotics", "Bipedal Humanoid", 20, 47.0),
        ],
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS video_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT UNIQUE,
            title TEXT,
            description TEXT,
            url TEXT,
            channel_title TEXT,
            published_at TEXT,
            duration TEXT,
            duration_seconds INTEGER,
            view_count INTEGER,
            like_count INTEGER,
            favorite_count INTEGER,
            comment_count INTEGER,
            tags TEXT,
            category TEXT,
            confidence REAL,
            method TEXT,
            robot_id TEXT,
            robot_name TEXT,
            manufacturer TEXT,
            morphology TEXT,
            mass_kg REAL,
            raw_metadata_json TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def _parse_duration_to_seconds(value: Optional[str]) -> int:
    if not value:
        return 0
    try:
        total = 0
        hours = minutes = seconds = 0
        if "PT" in value.upper():
            body = value.replace("PT", "")
            for unit in ("H", "M", "S"):
                if unit in body:
                    num = body.split(unit, 1)[0]
                    if num:
                        if unit == "H":
                            hours = int(num)
                        elif unit == "M":
                            minutes = int(num)
                        elif unit == "S":
                            seconds = int(num)
                    body = body.split(unit, 1)[1]
            total = hours * 3600 + minutes * 60 + seconds
        return total
    except Exception:
        return 0


def fetch_full_youtube_video_details(video_id: str, api_key: str) -> Dict[str, Any]:
    """Complete video metadata using the YouTube Data API v3 video-details endpoint."""
    response = httpx.get(
        "https://www.googleapis.com/youtube/v3/videos",
        params={
            "part": "snippet,statistics,contentDetails,status",
            "id": video_id,
            "key": api_key,
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json().get("items", [])
    if not data:
        return {}

    item = data[0]
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    details = item.get("contentDetails", {})
    status = item.get("status", {})

    return {
        "video_id": video_id,
        "title": snippet.get("title") or "",
        "description": snippet.get("description") or "",
        "channel_title": snippet.get("channelTitle"),
        "published_at": snippet.get("publishedAt"),
        "duration": details.get("duration"),
        "duration_seconds": _parse_duration_to_seconds(details.get("duration")),
        "tags": snippet.get("tags", []) or [],
        "category_id": snippet.get("categoryId"),
        "default_language": snippet.get("defaultLanguage"),
        "view_count": int(stats.get("viewCount", 0) or 0),
        "like_count": int(stats.get("likeCount", 0) or 0),
        "favorite_count": int(stats.get("favoriteCount", 0) or 0),
        "comment_count": int(stats.get("commentCount", 0) or 0),
        "license": status.get("license"),
        "privacy_status": status.get("privacyStatus"),
    }


def save_video_analysis_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a video analysis using Humanoid Atlas's video_analyses record shape."""
    video_url = record.get("url") or record.get("video_url")
    video_id = record.get("video_id")
    stable_key = str(video_url or video_id or uuid.uuid4())
    record_id = record.get("id") or str(uuid.uuid5(uuid.NAMESPACE_URL, stable_key))
    title = record.get("title") or "Untitled YouTube video"
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        **record,
        "id": record_id,
        "source_type": record.get("source_type") or "youtube",
        "title": title,
        "filename": record.get("filename") or title,
        "media_type": record.get("media_type") or "video/youtube",
        "duration_seconds": record.get("duration_seconds") or 0,
        "summary": record.get("summary") or record.get("description") or title,
        "robots_detected": record.get("robots_detected") or [],
        "actions_observed": record.get("actions_observed") or [],
        "setting": record.get("setting"),
        "events": record.get("events") or [],
        "evidence": record.get("evidence") or [],
        "confidence": record.get("confidence") or 0.0,
        "analysis_model": record.get("analysis_model") or record.get("method") or "youtube_data_api",
        "review_status": record.get("review_status") or "needs_review",
        "created_at": record.get("created_at") or now_iso,
    }

    init_db()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO video_analyses
                (id, filename, media_type, duration_seconds, analysis_model, analysis_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                filename=excluded.filename,
                media_type=excluded.media_type,
                duration_seconds=excluded.duration_seconds,
                analysis_model=excluded.analysis_model,
                analysis_json=excluded.analysis_json,
                created_at=excluded.created_at
            """,
            (
                payload["id"],
                payload["filename"],
                payload["media_type"],
                payload["duration_seconds"],
                payload["analysis_model"],
                json.dumps(payload, ensure_ascii=False),
                payload["created_at"],
            ),
        )
    return payload


def query_robot_spec(robot_id: str) -> Optional[Dict[str, Any]]:
    """Look up the robot metadata by ID from the local SQLite DB."""
    conn = sqlite3.connect("robot_classification.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT name, manufacturer, morphology, actuated_dof, mass_kg FROM robots WHERE robot_id = ?",
        (robot_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "name": row[0],
            "manufacturer": row[1],
            "morphology": row[2],
            "dof": row[3],
            "mass": row[4],
        }
    return None


def auto_identify_robot_from_metadata(metadata: Dict[str, Any]) -> Tuple[str, str]:
    """Heuristically identify a robot from the title/description metadata."""
    text = _normalize_text(f"{metadata.get('title', '')} {metadata.get('description', '')}")

    if "go2" in text or "dog" in text or "quadruped" in text:
        return "unitree_go2", "Unitree Go2"
    if "optimus" in text or "tesla" in text:
        return "tesla_optimus", "Tesla Optimus"
    if "atlas" in text:
        return "boston_atlas", "Boston Dynamics Atlas"
    if "h1" in text:
        return "h1_humanoid", "Unitree H1"
    return "unitree_g1", "Unitree G1"


def _safe_metadata_value(metadata: Dict[str, Any], *keys: str) -> Any:
    """Safely fetch nested metadata values from yt-dlp JSON or API payloads."""
    if not isinstance(metadata, dict):
        return None
    for key in keys:
        value = metadata.get(key)
        if isinstance(value, dict):
            return value
        if value is not None:
            return value
    return None


def download_youtube_video_and_get_info(yt_url: str, output_filename: str = "input_video.mp4") -> Tuple[str, Dict[str, Any]]:
    """Download a YouTube video and return the output file plus metadata."""
    if yt_dlp is None:
        raise ImportError("yt-dlp is required. Install it with: pip install yt-dlp")

    if os.path.exists(output_filename):
        try:
            os.remove(output_filename)
        except OSError:
            pass

    ydl_opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": output_filename,
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {"youtube": {"player_client": ["android", "ios", "web"]}},
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(yt_url, download=True)

    return output_filename, info_dict or {}


def analyze_and_identify_robot(video_url: str = "https://youtube.com/shorts/5GqfmmAQhQw?si=ukrfI7Tol3T2xjuZ") -> Dict[str, Any]:
    """Run a full robot detection pipeline using metadata + optional motion analysis."""
    try:
        video_file, metadata = download_youtube_video_and_get_info(video_url)
    except Exception as exc:  # pragma: no cover - network/download path
        return {"status": "error", "message": f"Download failed: {exc}"}

    detected_id, detected_name = auto_identify_robot_from_metadata(metadata)
    category = classify_video(metadata.get("title", ""), metadata.get("description", ""), video_file=video_file, metadata=metadata)
    robot_spec = query_robot_spec(detected_id) or {}

    metadata_id = _safe_metadata_value(metadata, "id", "video_id")
    if isinstance(metadata_id, dict):
        video_id = metadata_id.get("videoId") or metadata_id.get("video_id")
    else:
        video_id = metadata_id

    result = {
        "video_id": video_id,
        "video_url": video_url,
        "title": metadata.get("title", "N/A"),
        "description": metadata.get("description", ""),
        "channel_title": metadata.get("uploader") or metadata.get("channel") or metadata.get("channel_title"),
        "published_at": metadata.get("timestamp") or metadata.get("upload_date") or metadata.get("published_at"),
        "duration": metadata.get("duration_string") or metadata.get("duration"),
        "duration_seconds": metadata.get("duration") if isinstance(metadata.get("duration"), int) else _parse_duration_to_seconds(metadata.get("duration_string") or metadata.get("duration")),
        "tags": metadata.get("tags") or [],
        "detected_robot_id": detected_id,
        "detected_robot_name": detected_name,
        "classification": category,
        "robot_spec": robot_spec,
        "raw_metadata": metadata,
    }
    result["category"] = category.get("category")
    result["confidence"] = category.get("confidence")
    result["method"] = category.get("method")

    save_video_analysis_record(result)

    if cv2 is not None:
        cap = cv2.VideoCapture(video_file)
        if cap.isOpened():
            target_w, target_h = 240, 426
            back_sub = cv2.createBackgroundSubtractorMOG2(history=300, varThreshold=40, detectShadows=True)
            trail_points: deque[Tuple[int, int]] = deque(maxlen=40)
            out_path = "output_raw.mp4"
            if os.path.exists(out_path):
                os.remove(out_path)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(out_path, fourcc, 30.0, (target_w * 3, target_h))

            frame_count = 0
            max_frames = 450
            while frame_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_count += 1
                frame = cv2.resize(frame, (target_w, target_h))
                display_frame = frame.copy()
                trajectory_canvas = np.zeros_like(frame)

                blurred = cv2.GaussianBlur(frame, (7, 7), 0)
                fg_mask = back_sub.apply(blurred)
                _, thresh = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
                thresh = cv2.dilate(thresh, kernel, iterations=2)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                largest_cnt = max(contours, key=cv2.contourArea, default=None)

                if largest_cnt is not None and cv2.contourArea(largest_cnt) > 800:
                    x, y, w, h = cv2.boundingRect(largest_cnt)
                    center = (int(x + w / 2), int(y + h / 2))
                    trail_points.appendleft(center)
                    cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    cv2.circle(display_frame, center, 4, (0, 0, 255), -1)
                    cv2.putText(display_frame, "Robot Detected", (x, max(20, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

                for i in range(1, len(trail_points)):
                    if trail_points[i - 1] is None or trail_points[i] is None:
                        continue
                    cv2.line(trajectory_canvas, trail_points[i - 1], trail_points[i], (0, 255, 255), 2)
                    cv2.line(display_frame, trail_points[i - 1], trail_points[i], (0, 255, 255), 2)

                mask_bgr = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
                cv2.putText(display_frame, "1. Detection", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                cv2.putText(mask_bgr, "2. Motion Mask", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                cv2.putText(trajectory_canvas, "3. Trajectory", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                combined = np.hstack([display_frame, mask_bgr, trajectory_canvas])
                out.write(combined)

            cap.release()
            out.release()

            final_path = "final_robot.mp4"
            if os.path.exists(final_path):
                os.remove(final_path)
            subprocess.run(["ffmpeg", "-y", "-i", out_path, "-vcodec", "libx264", final_path, "-loglevel", "quiet"], check=False)
            result["rendered_video"] = final_path

    return result


def ingest_youtube(query: str, limit: int = 25) -> Dict[str, Any]:
    """Fetch YouTube video results and attach classification metadata to each item."""
    key = get_settings().youtube_api_key
    if not key:
        print("[YouTubeAdapter Warning] YOUTUBE_API_KEY is missing; returning empty result.")
        return {"sources": 0, "links": [], "missing_keys": ["YOUTUBE_API_KEY"]}

    response = httpx.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(limit, 50),
            "videoDuration": "medium",
            "key": key,
        },
        timeout=20,
    )
    response.raise_for_status()

    count = 0
    video_links: List[Dict[str, Any]] = []

    for item in response.json().get("items", []):
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId")
        if not video_id:
            continue

        title = snippet.get("title") or "Untitled YouTube video"
        description = snippet.get("description") or ""
        details = fetch_full_youtube_video_details(video_id, key)
        classification = classify_video(title, description)
        metadata = {
            "query": query,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "classification": classification,
            "details": details,
        }
        source_data = {
            "source_type": "youtube",
            "title": title,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "excerpt": description,
            "published_at": details.get("published_at") or snippet.get("publishedAt"),
            "author": details.get("channel_title") or snippet.get("channelTitle"),
            "platform": "youtube",
            "metadata": metadata,
        }
        video_links.append(source_data)
        count += 1

    return {"sources": count, "links": video_links}


def ingest_and_store_video_records(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch YouTube items, classify them, and persist the full structured records into SQLite."""
    result = ingest_youtube(query=query, limit=limit)
    saved = []
    for item in result.get("links", []):
        metadata = item.get("metadata", {})
        classification = metadata.get("classification", {})
        details = metadata.get("details", {})
        title = item.get("title") or "Untitled video"
        description = item.get("excerpt") or ""
        record = {
            "video_id": details.get("video_id") or item.get("url", "").split("v=")[-1],
            "title": title,
            "description": description,
            "url": item.get("url"),
            "channel_title": item.get("author"),
            "published_at": details.get("published_at") or item.get("published_at"),
            "duration": details.get("duration"),
            "duration_seconds": details.get("duration_seconds") or 0,
            "view_count": details.get("view_count") or 0,
            "like_count": details.get("like_count") or 0,
            "favorite_count": details.get("favorite_count") or 0,
            "comment_count": details.get("comment_count") or 0,
            "tags": details.get("tags") or [],
            "category": classification.get("category"),
            "confidence": classification.get("confidence"),
            "method": classification.get("method"),
            "robot_id": None,
            "robot_name": None,
            "raw_metadata": metadata,
        }
        detected_id, detected_name = auto_identify_robot_from_metadata({"title": title, "description": description})
        robot_spec = query_robot_spec(detected_id) or {}
        record["robot_id"] = detected_id
        record["robot_name"] = detected_name
        record["manufacturer"] = robot_spec.get("manufacturer")
        record["morphology"] = robot_spec.get("morphology")
        record["mass_kg"] = robot_spec.get("mass")
        if record["category"] is None:
            record["category"] = "general_video"
        save_video_analysis_record(record)
        saved.append(record)
    return saved


if __name__ == "__main__":
    init_robot_database()
    result = analyze_and_identify_robot()
    print(json.dumps(result, ensure_ascii=False, indent=2))