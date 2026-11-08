import base64
import json
import math
import re
import tempfile
from pathlib import Path

import cv2
import httpx
from pydantic import BaseModel, Field, ValidationError

try:
    import yt_dlp
except ImportError:  # pragma: no cover - optional runtime dependency
    yt_dlp = None

from humanoid_atlas.config import get_settings


MAX_VIDEO_BYTES = 100 * 1024 * 1024
MAX_VIDEO_DURATION_SECONDS = 60 * 60
MAX_SAMPLED_FRAMES = 8
ALLOWED_VIDEO_SUFFIXES = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm"}


class InvalidVideoError(ValueError):
    pass


class OllamaUnavailableError(RuntimeError):
    pass


class VideoEvent(BaseModel):
    timestamp_seconds: float = Field(ge=0)
    description: str


class VideoObservations(BaseModel):
    summary: str
    robots_detected: list[str] = Field(default_factory=list)
    humanoid_robot_detected: bool
    actions_observed: list[str] = Field(default_factory=list)
    setting: str | None = None
    events: list[VideoEvent] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


def extract_video_frames(video_bytes: bytes, suffix: str) -> tuple[float, list[dict[str, object]]]:
    with tempfile.TemporaryDirectory(prefix="humanoid-atlas-video-") as temp_dir:
        video_path = Path(temp_dir) / f"upload{suffix}"
        video_path.write_bytes(video_bytes)
        capture = cv2.VideoCapture(str(video_path))
        try:
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = float(capture.get(cv2.CAP_PROP_FPS))
            if frame_count < 1 or not math.isfinite(fps) or fps <= 0:
                raise InvalidVideoError("The uploaded file does not contain a readable video stream.")

            duration_seconds = frame_count / fps
            if duration_seconds > MAX_VIDEO_DURATION_SECONDS:
                raise InvalidVideoError("Video duration must not exceed 60 minutes.")

            sample_count = min(frame_count, MAX_SAMPLED_FRAMES)
            sampled_frames = []
            for sample_index in range(sample_count):
                frame_index = round(sample_index * (frame_count - 1) / max(sample_count - 1, 1))
                capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
                success, frame = capture.read()
                if not success:
                    continue
                encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if not encoded:
                    continue
                sampled_frames.append(
                    {
                        "timestamp_seconds": frame_index / fps,
                        "image": base64.b64encode(buffer).decode("ascii"),
                    }
                )
        finally:
            capture.release()

    if not sampled_frames:
        raise InvalidVideoError("No readable frames could be extracted from the uploaded video.")
    return duration_seconds, sampled_frames


def analyze_frames_with_ollama(frames: list[dict[str, object]]) -> tuple[VideoObservations, str]:
    settings = get_settings()
    model = settings.ollama_vision_model
    timestamps = ", ".join(f"{frame['timestamp_seconds']:.2f}" for frame in frames)
    prompt = (
        "Analyze these sampled frames from a video about humanoid or social robotics. "
        f"The frames are in chronological order at seconds: {timestamps}. "
        "Return only the requested JSON. Describe only what is visibly supported by the frames; "
        "set humanoid_robot_detected to true only when a humanoid robot is clearly visible. "
        "When true, include its readable model name in robots_detected, or use 'humanoid robot' "
        "if the model cannot be identified. Do not list non-humanoid robots as humanoid. "
        "Do not infer a model name, identity, location, or action that is not visually clear. "
        "Use an empty list when no robot or event is clearly visible, null for an unknown setting, "
        "and timestamps in seconds for events. Keep evidence concise. "
        "Set confidence between 0 and 1 based on visual certainty."
    )
    try:
        response = httpx.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "images": [str(frame["image"]) for frame in frames],
                "format": VideoObservations.model_json_schema(),
                "stream": False,
            },
            timeout=180,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise OllamaUnavailableError(f"Could not analyze video with Ollama: {error}") from error

    try:
        response_text = response.json()["response"]
        observations = VideoObservations.model_validate(json.loads(response_text))
    except (KeyError, TypeError, json.JSONDecodeError, ValidationError) as error:
        raise OllamaUnavailableError("Ollama returned an invalid video-analysis response.") from error
    return observations, model


def analyze_youtube_video(video: dict[str, object]) -> dict[str, object]:
    video_id = video.get("video_id")
    if not isinstance(video_id, str) or re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id) is None:
        raise InvalidVideoError("YouTube returned an invalid video ID.")
    if yt_dlp is None:
        raise InvalidVideoError("yt-dlp is required to analyze YouTube videos.")

    with tempfile.TemporaryDirectory(prefix="humanoid-atlas-youtube-") as temp_dir:
        output_template = str(Path(temp_dir) / "%(id)s.%(ext)s")

        def reject_long_video(info: dict[str, object], *, incomplete: bool) -> str | None:
            duration = info.get("duration")
            if not incomplete and isinstance(duration, (int, float)) and duration > MAX_VIDEO_DURATION_SECONDS:
                return "Video duration must not exceed 60 minutes."
            return None

        options = {
            "format": "best[height<=480][ext=mp4]/best[height<=480]/best[ext=mp4]/best",
            "outtmpl": output_template,
            "max_filesize": MAX_VIDEO_BYTES,
            "merge_output_format": "mp4",
            "match_filter": reject_long_video,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
            candidates = [info.get("filepath"), info.get("_filename"), downloader.prepare_filename(info)]

        video_path = next(
            (Path(candidate) for candidate in candidates if isinstance(candidate, str) and Path(candidate).is_file()),
            None,
        )
        if video_path is None:
            video_path = next((path for path in Path(temp_dir).glob(f"{video_id}.*") if path.is_file()), None)
        if video_path is None:
            raise InvalidVideoError("The YouTube video could not be downloaded for analysis.")

        video_bytes = video_path.read_bytes()
        if len(video_bytes) > MAX_VIDEO_BYTES:
            raise InvalidVideoError("Video downloads must not exceed 100 MB.")
        duration_seconds, frames = extract_video_frames(video_bytes, video_path.suffix.lower())
        observations, model = analyze_frames_with_ollama(frames)

    return {
        **video,
        "source_type": "youtube",
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "title": video.get("title") or info.get("title") or "Untitled YouTube video",
        "description": video.get("description") or info.get("description") or "",
        "channel_title": video.get("channel_title") or info.get("uploader"),
        "duration_seconds": duration_seconds,
        **observations.model_dump(),
        "analysis_model": model,
        "review_status": "needs_review",
    }
