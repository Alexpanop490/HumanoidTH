import json

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from humanoid_atlas.config import get_settings
from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.db.repos import now, rows
from humanoid_atlas.db.session import connect
from humanoid_atlas.pipeline.graph_metrics import rebuild_graph_cache
from humanoid_atlas.pipeline.taxonomy_stats import rebuild_stats_cache


templates = Jinja2Templates(directory="src/humanoid_atlas/viewer/templates")


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
        return StreamingResponse(iter(["\n".join(lines)]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={table_name}.csv"})

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
