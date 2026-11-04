from pathlib import Path

import pandas as pd
import typer

from humanoid_atlas.adapters.gdelt import ingest_gdelt
from humanoid_atlas.adapters.github import ingest_github
from humanoid_atlas.adapters.openalex import ingest_openalex
from humanoid_atlas.adapters.rss import ingest_rss
from humanoid_atlas.adapters.seed_yaml import ingest_seed_file
from humanoid_atlas.adapters.youtube import ingest_youtube
from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.db.repos import insert_perspective
from humanoid_atlas.db.session import connect
from humanoid_atlas.pipeline.graph_metrics import rebuild_graph_cache
from humanoid_atlas.pipeline.nlp import extract_basic_triplets
from humanoid_atlas.pipeline.perception import annotate
from humanoid_atlas.pipeline.relevance import classify_text
from humanoid_atlas.pipeline.taxonomy_stats import rebuild_stats_cache

app = typer.Typer(help="Thailand Humanoid Atlas")
db_app = typer.Typer()
ingest_app = typer.Typer()
filter_app = typer.Typer()
analyze_app = typer.Typer()
export_app = typer.Typer()
app.add_typer(db_app, name="db")
app.add_typer(ingest_app, name="ingest")
app.add_typer(filter_app, name="filter")
app.add_typer(analyze_app, name="analyze")
app.add_typer(export_app, name="export")


@db_app.command("init")
def db_init() -> None:
    path = init_db()
    typer.echo(f"Initialized SQLite database: {path}")


@ingest_app.command("seeds")
def ingest_seeds(file: Path = typer.Option(..., "--file", exists=True, readable=True)) -> None:
    init_db()
    typer.echo(ingest_seed_file(file))


@ingest_app.command("rss")
def rss(feed: str = typer.Option("all", "--feed"), limit: int = 25) -> None:
    init_db()
    if feed == "all":
        typer.echo("No RSS registry configured yet. Pass --feed <url> or add URLs to seed files.")
        raise typer.Exit(0)
    typer.echo(ingest_rss(feed, limit=limit))


@ingest_app.command("gdelt")
def gdelt(query: str = typer.Option(..., "--query"), days: int = 30, limit: int = 25) -> None:
    init_db()
    typer.echo(ingest_gdelt(query, days=days, limit=limit))


@ingest_app.command("youtube")
def youtube(query: str = typer.Option(..., "--query"), limit: int = 25) -> None:
    init_db()
    typer.echo(ingest_youtube(query, limit=limit))


@ingest_app.command("openalex")
def openalex(query: str = typer.Option(..., "--query"), from_year: int = typer.Option(2015, "--from-year"), limit: int = 25) -> None:
    init_db()
    typer.echo(ingest_openalex(query, from_year=from_year, limit=limit))


@ingest_app.command("github")
def github(query: str = typer.Option(..., "--query"), limit: int = 25) -> None:
    init_db()
    typer.echo(ingest_github(query, limit=limit))


@filter_app.command("relevance")
def filter_relevance(pending: bool = False) -> None:
    init_db()
<<<<<<< HEAD
    updated = 0
    query = "SELECT id,title,excerpt FROM sources WHERE relevance_status = ?" if pending else "SELECT id,title,excerpt FROM sources"
    params: tuple[str, ...] | tuple[()] = ("pending",) if pending else ()
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
=======
    where = "WHERE relevance_status='pending'" if pending else ""
    updated = 0
    with connect() as conn:
        rows = conn.execute(f"SELECT id,title,excerpt FROM sources {where}").fetchall()
>>>>>>> alex
        for row in rows:
            result = classify_text(row["title"], row["excerpt"])
            conn.execute(
                "UPDATE sources SET relevance_status=?, relevance_reason=?, relevance_confidence=?, updated_at=datetime('now') WHERE id=?",
                (result["status"], result["reason"], result["confidence"], row["id"]),
            )
            updated += 1
    typer.echo({"classified": updated})


@analyze_app.command("perspectives")
def analyze_perspectives(pending: bool = False) -> None:
    init_db()
<<<<<<< HEAD
    query = """
        SELECT s.id,title,excerpt FROM sources s
        LEFT JOIN perspective_annotations pa ON pa.source_id=s.id
        WHERE s.relevance_status = ?
    """
    params: tuple[str, ...] = ("accepted",)
    if pending:
        query += " AND pa.id IS NULL"
    created = 0
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
=======
    where = "WHERE s.relevance_status='accepted'"
    if pending:
        where += " AND pa.id IS NULL"
    created = 0
    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT s.id,title,excerpt FROM sources s
            LEFT JOIN perspective_annotations pa ON pa.source_id=s.id
            {where}
            """
        ).fetchall()
>>>>>>> alex
    for row in rows:
        annotation = annotate(row["title"], row["excerpt"]).model_dump()
        insert_perspective(row["id"], annotation)
        created += 1
    typer.echo({"annotations_considered": created, "label": "observed public/media signals"})


@analyze_app.command("nlp")
def analyze_nlp() -> None:
    init_db()
    typer.echo(extract_basic_triplets())


@analyze_app.command("graph")
def analyze_graph() -> None:
    init_db()
    extract_basic_triplets()
    typer.echo(rebuild_graph_cache())


@analyze_app.command("stats")
def analyze_stats() -> None:
    init_db()
    typer.echo(rebuild_stats_cache())


@export_app.command("csv")
def export_csv(table: str = typer.Option(..., "--table"), out: Path = typer.Option(Path("data/exports"), "--out")) -> None:
    init_db()
    allowed = {"sources", "robot_models", "owned_inventory", "contributions", "perspective_annotations", "submitted_data"}
    if table not in allowed:
        raise typer.BadParameter(f"Table must be one of {sorted(allowed)}")
    out.mkdir(parents=True, exist_ok=True)
<<<<<<< HEAD
    table_name = table
    with connect() as conn:
        df = pd.read_sql_query("SELECT * FROM " + table_name, conn)
    csv_path = out / f"{table_name}.csv"
    xlsx_path = out / f"{table_name}.xlsx"
=======
    with connect() as conn:
        df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
    csv_path = out / f"{table}.csv"
    xlsx_path = out / f"{table}.xlsx"
>>>>>>> alex
    df.to_csv(csv_path, index=False)
    df.to_excel(xlsx_path, index=False)
    typer.echo({"csv": str(csv_path), "xlsx": str(xlsx_path), "rows": len(df)})


@app.command("serve")
def serve(host: str = "127.0.0.1", port: int = 8000, reload: bool = False) -> None:
    init_db()
    import uvicorn

    uvicorn.run("humanoid_atlas.viewer.server:create_app", factory=True, host=host, port=port, reload=reload)
