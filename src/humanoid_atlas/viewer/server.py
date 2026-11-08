import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import httpx
from pydantic import BaseModel, Field

from humanoid_atlas.config import get_settings
from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.db.repos import now, rows
from humanoid_atlas.db.session import connect
from humanoid_atlas.pipeline.graph_metrics import rebuild_graph_cache
from humanoid_atlas.pipeline.taxonomy_stats import rebuild_stats_cache
from humanoid_atlas.pipeline.video_analysis import (
    ALLOWED_VIDEO_SUFFIXES,
    MAX_VIDEO_BYTES,
    InvalidVideoError,
    OllamaUnavailableError,
    analyze_youtube_video,
    analyze_frames_with_ollama,
    extract_video_frames,
)
from youtube_converter import save_video_analysis_record


templates = Jinja2Templates(directory="src/humanoid_atlas/viewer/templates")


class YoutubeImportRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)


class YoutubeVideoInput(BaseModel):
    video_id: str = Field(pattern=r"^[A-Za-z0-9_-]{11}$")
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=5000)
    channel_title: str | None = Field(default=None, max_length=300)
    published_at: str | None = None


class YoutubeAnalyzeRequest(BaseModel):
    videos: list[YoutubeVideoInput] = Field(min_length=1, max_length=3)


def _stats() -> dict:
    cached = rows("SELECT value_json FROM stats_cache WHERE key='overview'")
    return json.loads(cached[0]["value_json"]) if cached else rebuild_stats_cache()


def _graph() -> dict:
    cached = rows("SELECT value_json FROM stats_cache WHERE key='graph_summary'")
    return json.loads(cached[0]["value_json"]) if cached else rebuild_graph_cache()


def render(request: Request, template: str, **context):
    base = {"request": request, "settings": get_settings(), "stats": _stats()}
    base.update(context)
    return templates.TemplateResponse(request, template, base)


ALLOWED_TABLES = {
    "sources": "sources",
    "robot_models": "robot_models",
    "owned_inventory": "owned_inventory",
    "contributions": "contributions",
    "perspective_annotations": "perspective_annotations",
    "submitted_data": "submitted_data",
    "video_analyses": "video_analyses",
}


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(title=get_settings().project_name)
    app.mount("/static", StaticFiles(directory="src/humanoid_atlas/viewer/static"), name="static")

    @app.get("/")
    @app.get("/dashboard")
    def dashboard(request: Request):
        latest = rows("SELECT pipeline_name,status,finished_at FROM pipeline_runs ORDER BY id DESC LIMIT 1")
        return render(request, "dashboard.html", latest=latest[0] if latest else None)

    @app.post("/api/youtube/import")
    def import_youtube_videos(payload: YoutubeImportRequest):
        from youtube_converter import ingest_and_store_video_records

        try:
            result = ingest_and_store_video_records(payload.query.strip(), limit=payload.limit)
        except httpx.HTTPStatusError as error:
            try:
                api_error = error.response.json().get("error", {}).get("message")
            except (ValueError, AttributeError):
                api_error = None
            message = api_error or f"YouTube API returned HTTP {error.response.status_code}."
            raise HTTPException(status_code=502, detail=message) from error
        except httpx.RequestError as error:
            raise HTTPException(status_code=502, detail="Could not connect to the YouTube API.") from error

        if result.get("missing_keys"):
            raise HTTPException(status_code=503, detail="YOUTUBE_API_KEY is not configured for the Humanoid API server.")
        return {"imported": len(result), "videos": result}

    @app.post("/api/youtube/analyze")
    def analyze_youtube_videos(payload: YoutubeAnalyzeRequest):
        analyzed = []
        failed = []
        for video in payload.videos:
            try:
                result = analyze_youtube_video(video.model_dump())
                save_video_analysis_record(result)
                analyzed.append(result)
            except Exception as error:
                failed.append({"video_id": video.video_id, "error": str(error)})

        if not analyzed:
            detail = failed[0]["error"] if failed else "No videos were analyzed."
            raise HTTPException(status_code=503, detail=detail)
        return {"analyzed": len(analyzed), "failed": len(failed), "videos": analyzed, "errors": failed}

    @app.post("/api/videos", status_code=201)
    def analyze_video(file: UploadFile = File(...)):
        filename = (file.filename or "upload").replace("\\", "/").rsplit("/", 1)[-1]
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_VIDEO_SUFFIXES:
            raise HTTPException(status_code=415, detail="Upload a supported video file: AVI, M4V, MKV, MOV, MP4, or WebM.")

        video_bytes = file.file.read(MAX_VIDEO_BYTES + 1)
        if len(video_bytes) > MAX_VIDEO_BYTES:
            raise HTTPException(status_code=413, detail="Video uploads must not exceed 100 MB.")
        if not video_bytes:
            raise HTTPException(status_code=422, detail="The uploaded video is empty.")

        try:
            duration_seconds, frames = extract_video_frames(video_bytes, suffix)
            observations, model = analyze_frames_with_ollama(frames)
        except InvalidVideoError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except OllamaUnavailableError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

        timestamp = now()
        record_id = str(uuid.uuid4())
        record = {
            "id": record_id,
            "source_type": "video_upload",
            "title": Path(filename).stem,
            "filename": filename,
            "media_type": file.content_type or "application/octet-stream",
            "duration_seconds": round(duration_seconds, 3),
            **observations.model_dump(),
            "analysis_model": model,
            "review_status": "needs_review",
            "created_at": timestamp,
        }
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO video_analyses
                    (id,filename,media_type,duration_seconds,analysis_model,analysis_json,created_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    record_id,
                    filename,
                    record["media_type"],
                    record["duration_seconds"],
                    model,
                    json.dumps(record, ensure_ascii=False),
                    timestamp,
                ),
            )
        return record

    @app.get("/api/videos")
    def list_video_analyses():
        return [
            json.loads(row["analysis_json"])
            for row in rows("SELECT analysis_json FROM video_analyses ORDER BY created_at DESC")
        ]

    @app.get("/api/videos/{video_id}")
    def get_video_analysis(video_id: str):
        matches = rows("SELECT analysis_json FROM video_analyses WHERE id=?", (video_id,))
        if not matches:
            raise HTTPException(status_code=404, detail="Video analysis not found.")
        return json.loads(matches[0]["analysis_json"])

    @app.get("/perspectives")
    def perspectives(request: Request):
        items = rows(
            """
            SELECT s.title,s.url,s.platform,s.published_at,pa.*
            FROM perspective_annotations pa JOIN sources s ON s.id=pa.source_id
            ORDER BY pa.created_at DESC LIMIT 200
            """
        )
        return render(request, "perspectives.html", items=items, label="observed public/media signals")

    @app.get("/robots")
    def robots(request: Request):
        items = rows("SELECT * FROM robot_models ORDER BY canonical_name")
        return render(request, "robots.html", items=items)

    @app.get("/inventory")
    def inventory(request: Request, mode: str = "operator"):
        items = rows(
            """
            SELECT oi.*, rm.canonical_name robot_model
            FROM owned_inventory oi LEFT JOIN robot_models rm ON rm.id=oi.robot_model_id
            ORDER BY oi.updated_at DESC
            """
        )
        public_mode = mode == "public"
        return render(request, "inventory.html", items=items, public_mode=public_mode)

    @app.get("/contributions")
    def contributions(request: Request):
        items = rows("SELECT * FROM contributions ORDER BY updated_at DESC")
        return render(request, "contributions.html", items=items)

    @app.get("/analytics")
    def analytics(request: Request):
        return render(request, "analytics.html", graph=_graph())

    @app.get("/database")
    def database(request: Request, table: str = "sources", q: str = ""):
        table_name = ALLOWED_TABLES.get(table, "sources")
        allowed = sorted(ALLOWED_TABLES)
        query = "SELECT * FROM " + table_name
        params: tuple = ()
        if q:
            if table_name in {"sources", "submitted_data"}:
                query += " WHERE title LIKE ? OR url LIKE ?"
                params = (f"%{q}%", f"%{q}%")
            else:
                query += " WHERE CAST(id AS TEXT) LIKE ?"
                params = (f"%{q}%",)
        query += " ORDER BY id DESC LIMIT 250"
        data = rows(query, params)
        return render(request, "database.html", table=table_name, q=q, rows=data, allowed=allowed)

    @app.get("/database/export.csv")
    def database_export(table: str = "sources"):
        table_name = ALLOWED_TABLES.get(table, "sources")
        data = rows("SELECT * FROM " + table_name)
        headers = list(data[0].keys()) if data else ["empty"]
        lines = [",".join(headers)]
        for row in data:
            lines.append(",".join(str(row.get(h, "")).replace(",", " ") for h in headers))
        return StreamingResponse(
            iter(["\n".join(lines)]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={table_name}.csv"},
        )

    @app.get("/submit-data")
    def submit_data(request: Request):
        return render(request, "submit.html")

    @app.post("/submit-data")
    def submit_post(
        submission_type: str = Form(...),
        title: str = Form(...),
        url: str = Form(""),
        notes: str = Form(""),
        submitter_name: str = Form(""),
        submitter_contact: str = Form(""),
    ):
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO submitted_data(submission_type,title,url,notes,submitter_name,submitter_contact,status,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?, ?,?)
                """,
                (submission_type, title, url, notes, submitter_name, submitter_contact, "queued", now(), now()),
            )
        return RedirectResponse("/admin", status_code=303)

    @app.get("/profile")
    def profile(request: Request):
        return render(request, "profile.html")

    @app.get("/admin")
    @app.get("/admin/submitted-data")
    def admin_submitted(request: Request, admin: int = 0):
        data = rows("SELECT * FROM submitted_data ORDER BY id DESC")
        return render(request, "admin_submitted.html", items=data, admin_mode=bool(admin))

    @app.post("/admin/{submission_id}/{action}")
    @app.post("/admin/submitted-data/{submission_id}/{action}")
    def admin_action(submission_id: int, action: str, admin: int = 0):
        if not admin:
            raise HTTPException(status_code=403, detail="Admin action requires local admin mode.")
        status = {"approve": "approved", "reject": "rejected", "needs-info": "needs review"}.get(action, "queued")
        with connect() as conn:
            conn.execute("UPDATE submitted_data SET status=?, updated_at=? WHERE id=?", (status, now(), submission_id))
        return RedirectResponse("/admin", status_code=303)

    return app
