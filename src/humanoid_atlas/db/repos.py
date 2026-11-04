import json
from datetime import datetime, timezone
from typing import Iterable

from .session import connect


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_source(item: dict) -> int:
    timestamp = now()
    raw_meta = json.dumps(item.get("metadata", item.get("raw_meta", {})), ensure_ascii=False)
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sources(source_type,title,url,excerpt,published_at,author,platform,raw_meta,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(url) DO UPDATE SET
              title=excluded.title, excerpt=excluded.excerpt, published_at=excluded.published_at,
              author=excluded.author, platform=excluded.platform, raw_meta=excluded.raw_meta, updated_at=excluded.updated_at
            """,
            (
                item["source_type"],
                item["title"],
                item["url"],
                item.get("excerpt", "")[:1000],
                item.get("published_at"),
                item.get("author"),
                item.get("platform"),
                raw_meta,
                timestamp,
                timestamp,
            ),
        )
        return int(conn.execute("SELECT id FROM sources WHERE url=?", (item["url"],)).fetchone()["id"])


def upsert_robot_model(item: dict) -> int:
    timestamp = now()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO robot_models(canonical_name,manufacturer,developer_org,country_of_origin,robot_type,embodiment_level,
              primary_use_case,thailand_status,status_confidence,official_url,description,source_meta,first_seen_year,last_verified_at,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(canonical_name) DO UPDATE SET
              manufacturer=excluded.manufacturer, developer_org=excluded.developer_org, robot_type=excluded.robot_type,
              embodiment_level=excluded.embodiment_level, primary_use_case=excluded.primary_use_case,
              thailand_status=excluded.thailand_status, status_confidence=excluded.status_confidence,
              official_url=excluded.official_url, description=excluded.description, source_meta=excluded.source_meta,
              last_verified_at=excluded.last_verified_at, updated_at=excluded.updated_at
            """,
            (
                item["canonical_name"],
                item.get("manufacturer"),
                item.get("developer_org"),
                item.get("country_of_origin"),
                item.get("robot_type", "unknown"),
                item.get("embodiment_level"),
                item.get("primary_use_case"),
                item.get("thailand_status", "observed_in_thailand"),
                item.get("status_confidence", 0.5),
                item.get("official_url"),
                item.get("description"),
                json.dumps(item.get("source_meta", {}), ensure_ascii=False),
                item.get("first_seen_year"),
                item.get("last_verified_at"),
                timestamp,
                timestamp,
            ),
        )
        return int(conn.execute("SELECT id FROM robot_models WHERE canonical_name=?", (item["canonical_name"],)).fetchone()["id"])


def upsert_owned_inventory(item: dict) -> int:
    timestamp = now()
    model_id = item.get("robot_model_id")
    if not model_id and item.get("robot_model"):
        with connect() as conn:
            row = conn.execute("SELECT id FROM robot_models WHERE canonical_name=?", (item["robot_model"],)).fetchone()
            model_id = row["id"] if row else None
    visibility = item.get("visibility") or "private"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO owned_inventory(robot_model_id,display_name,ownership_status,owner_org,custodian,location_label,serial_number,
              public_serial_safe,acquisition_date,acquisition_source,condition_status,firmware_version,accessories,documentation_links,
              visibility,notes,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(display_name) DO UPDATE SET
              robot_model_id=excluded.robot_model_id, ownership_status=excluded.ownership_status, owner_org=excluded.owner_org,
              custodian=excluded.custodian, location_label=excluded.location_label, serial_number=excluded.serial_number,
              public_serial_safe=excluded.public_serial_safe, condition_status=excluded.condition_status,
              firmware_version=excluded.firmware_version, accessories=excluded.accessories,
              documentation_links=excluded.documentation_links, visibility=excluded.visibility, notes=excluded.notes,
              updated_at=excluded.updated_at
            """,
            (
                model_id,
                item["display_name"],
                item.get("ownership_status", "planned"),
                item.get("owner_org"),
                item.get("custodian"),
                item.get("location_label"),
                item.get("serial_number"),
                1 if item.get("public_serial_safe") else 0,
                item.get("acquisition_date"),
                item.get("acquisition_source"),
                item.get("condition_status"),
                item.get("firmware_version"),
                json.dumps(item.get("accessories", []), ensure_ascii=False),
                json.dumps(item.get("documentation_links", []), ensure_ascii=False),
                visibility,
                item.get("notes"),
                timestamp,
                timestamp,
            ),
        )
        return int(conn.execute("SELECT id FROM owned_inventory WHERE display_name=?", (item["display_name"],)).fetchone()["id"])


def upsert_contribution(item: dict) -> int:
    timestamp = now()
    source_url = item.get("source_url") or f"manual:{item['title']}"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO contributions(contributor_name,contributor_type,organization,contribution_type,title,description,
              related_robot_model_id,source_url,license,visibility,verification_status,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(source_url) DO UPDATE SET
              contributor_name=excluded.contributor_name, organization=excluded.organization, contribution_type=excluded.contribution_type,
              title=excluded.title, description=excluded.description, license=excluded.license,
              visibility=excluded.visibility, verification_status=excluded.verification_status, updated_at=excluded.updated_at
            """,
            (
                item.get("contributor_name"),
                item.get("contributor_type"),
                item.get("organization"),
                item.get("contribution_type", "other"),
                item["title"],
                item.get("description"),
                item.get("related_robot_model_id"),
                source_url,
                item.get("license"),
                item.get("visibility", "public"),
                item.get("verification_status", "pending"),
                timestamp,
                timestamp,
            ),
        )
        return int(conn.execute("SELECT id FROM contributions WHERE source_url=?", (source_url,)).fetchone()["id"])


def insert_perspective(source_id: int, item: dict) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO perspective_annotations(source_id,stance,sentiment,perception_theme,target_entity,evidence_excerpt,confidence,method,created_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                source_id,
                item.get("stance"),
                item.get("sentiment"),
                item.get("perception_theme"),
                item.get("target_entity"),
                item.get("evidence_excerpt", "")[:500],
                item.get("confidence", 0.5),
                item.get("method", "rules_with_evidence"),
                now(),
            ),
        )


def rows(query: str, params: Iterable = ()) -> list[dict]:
    with connect() as conn:
        return [dict(row) for row in conn.execute(query, tuple(params)).fetchall()]
