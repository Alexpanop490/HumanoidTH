import base64
import json
import math
import tempfile
from pathlib import Path

import cv2
import httpx
from pydantic import BaseModel, Field, ValidationError

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
        "do not infer a robot model, identity, location, or action that is not clear. "
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
