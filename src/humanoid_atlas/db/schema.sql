PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    author TEXT,
    platform TEXT,
    raw_meta TEXT NOT NULL DEFAULT '{}',
    relevance_status TEXT NOT NULL DEFAULT 'pending',
    relevance_reason TEXT,
    relevance_confidence REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT DEFAULT 'Thailand',
    latitude REAL,
    longitude REAL,
    source_meta TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    canonical_key TEXT NOT NULL UNIQUE,
    source_meta TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS triplets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    relation TEXT NOT NULL,
    object TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE(subject, relation, object, source_id)
);

CREATE TABLE IF NOT EXISTS stats_cache (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submitted_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    submitter_name TEXT,
    submitter_contact TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    review_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS robot_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT NOT NULL UNIQUE,
    manufacturer TEXT,
    developer_org TEXT,
    country_of_origin TEXT,
    robot_type TEXT NOT NULL,
    embodiment_level TEXT,
    primary_use_case TEXT,
    thailand_status TEXT NOT NULL DEFAULT 'observed_in_thailand',
    status_confidence REAL NOT NULL DEFAULT 0.5,
    official_url TEXT,
    description TEXT,
    source_meta TEXT NOT NULL DEFAULT '{}',
    first_seen_year INTEGER,
    last_verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS owned_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    robot_model_id INTEGER REFERENCES robot_models(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL UNIQUE,
    ownership_status TEXT NOT NULL,
    owner_org TEXT,
    custodian TEXT,
    location_label TEXT,
    serial_number TEXT,
    public_serial_safe INTEGER NOT NULL DEFAULT 0,
    acquisition_date TEXT,
    acquisition_source TEXT,
    condition_status TEXT,
    firmware_version TEXT,
    accessories TEXT NOT NULL DEFAULT '[]',
    documentation_links TEXT NOT NULL DEFAULT '[]',
    visibility TEXT NOT NULL DEFAULT 'private',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_name TEXT,
    contributor_type TEXT,
    organization TEXT,
    contribution_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    related_robot_model_id INTEGER REFERENCES robot_models(id) ON DELETE SET NULL,
    source_url TEXT UNIQUE,
    license TEXT,
    visibility TEXT NOT NULL DEFAULT 'public',
    verification_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS perspective_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    stance TEXT,
    sentiment TEXT,
    perception_theme TEXT,
    target_entity TEXT,
    evidence_excerpt TEXT,
    confidence REAL NOT NULL DEFAULT 0.5,
    method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(source_id, perception_theme, target_entity, evidence_excerpt)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_relevance ON sources(relevance_status);
CREATE INDEX IF NOT EXISTS idx_triplets_relation ON triplets(relation);
CREATE INDEX IF NOT EXISTS idx_robot_models_name ON robot_models(canonical_name);
CREATE INDEX IF NOT EXISTS idx_robot_models_status ON robot_models(thailand_status);
CREATE INDEX IF NOT EXISTS idx_owned_inventory_model ON owned_inventory(robot_model_id);
CREATE INDEX IF NOT EXISTS idx_owned_inventory_visibility ON owned_inventory(visibility);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_perspective_source ON perspective_annotations(source_id);
CREATE INDEX IF NOT EXISTS idx_perspective_theme ON perspective_annotations(perception_theme);
