# Thailand Humanoid Atlas

## Project Goal

Thailand Humanoid Atlas is an open-source research database platform for mapping the humanoid and social-robotics ecosystem in Thailand.

The platform should collect, normalize, classify, and visualize four connected layers:

1. **Public and media perspectives** on humanoid, service, companion, education, medical, and social robots in Thailand.
2. **Contributions** from researchers, creators, labs, universities, companies, students, communities, and open-source builders.
3. **Robot model registry**, including commercial models, research prototypes, service robots, humanoid platforms, and imported robots used in Thailand.
4. **Owned robot inventory**, meaning the specific models that the project team owns, borrows, operates, tests, repairs, or deploys.

The first version should not try to be a perfect national robot census. It should be a transparent research atlas with provenance, confidence scores, audit trails, and community submission.

Current implementation status:

- The active web app is the Next.js + Prisma stack in this repository.
- Prisma Postgres is linked and seeded from `thailand_humanoid_atlas_seed_records.json`.
- The JSON seed file auto-syncs into the database during local dev.
- The legacy Python pipeline still exists under `src/humanoid_atlas/` and mirrors the same atlas ideas for reference.

---

## One-Sentence Positioning

An open-source atlas for understanding how Thailand discovers, discusses, builds, owns, and deploys humanoid robots.

---

## Scope

### Primary Scope

Thailand-related humanoid and social robotics records from public sources, curated submissions, and project-owned inventory.

### Include

- Humanoid robots.
- Social robots.
- Service robots with human-facing interaction.
- Companion robots.
- Elderly-care and hospital robots.
- Education robots.
- Exhibition, festival, museum, and public-demo robots.
- Research prototypes and university robotics projects.
- Open-source software and hardware contributions related to humanoid robotics.
- Public media coverage and public reactions.
- Team-owned or team-operated robot models.

### Exclude or Mark Carefully

- Industrial robot arms with no human-facing or humanoid relevance.
- Pure AI chatbot posts with no embodied robotics connection.
- Private personal data from non-public accounts.
- Scraped comments from platforms where the terms do not allow collection.
- Unverified vendor claims unless clearly labeled as vendor-provided.
- Full-text redistribution when source licenses do not permit it.

---

## Core Product Surfaces

1. **Home / Corpus Summary**
   - Total records.
   - Year range.
   - Media/platform distribution.
   - Number of robot models.
   - Number of contribution records.
   - Number of owned inventory records.
   - Pending review count.

2. **Perspective Dashboard**
   - Media/platform filters.
   - Sentiment and stance distribution.
   - Common themes: healthcare trust, job displacement, education, safety, ethics, privacy, national innovation, entertainment, accessibility.
   - Public/media attention over time.

3. **Robot Model Registry**
   - Robot model cards.
   - Manufacturer/developer.
   - Robot type.
   - Country of origin.
   - Thailand status: observed, deployed, imported, owned, tested, rumored, retired.
   - Use cases.
   - Source evidence.

4. **Owned Inventory**
   - Models owned by the project/team.
   - Ownership status: owned, borrowed, sponsored, on loan, under repair, ordered, planned.
   - Location/custody.
   - Condition.
   - Accessories.
   - Documentation status.
   - Usage log.
   - Public visibility flag.

5. **Contribution Map**
   - People, labs, organizations, projects, GitHub repos, papers, workshops, and demonstrations.
   - Contribution type: research, software, dataset, hardware, media analysis, field observation, event, education module, translation, repair, deployment.

6. **Network Graph**
   - People -> affiliated_with -> institution.
   - Institution -> developed -> robot/project.
   - Robot -> deployed_in -> hospital/school/event.
   - Media item -> discusses -> robot/model/topic.
   - Contribution -> uses -> robot/model/tool.
   - Public perspective -> concerns -> job displacement/privacy/safety.

7. **Database Browser**
   - Search and filter all records.
   - Export CSV/XLSX.
   - Open detail drawer.
   - Show provenance and confidence.

8. **Submit Data**
   - Community form for URLs, robot sightings, event records, papers, demos, owned model updates, and contribution claims.
   - Automated analysis should never publish without review.

9. **Admin Review**
   - Approve/reject/edit records.
   - Merge duplicates.
   - Confirm source evidence.
   - Correct taxonomy labels.
   - Hide sensitive or low-quality data.

---

## Atlas Pipeline Order

For the Research Atlas / OpenAtlas-style pipeline, use the layers in this order:

```text
dedupe -> relevance scoring -> NLP extraction -> graph model -> statistics/analytics -> caching
```

This is the operating sequence for both the legacy Python pipeline and the active web app data model.

### 1. Deduplication

Start here before any AI work, graph work, or enrichment.

```text
exact URL canonicalization -> unique index on url
platform + external_id uniqueness when available
TF-IDF + cosine similarity for near duplicates
MinHash/LSH later when corpus size grows
```

Recommended thresholds:

```text
similarity >= 0.95  -> almost duplicate
0.85-0.95           -> likely syndicated or copied
< 0.85              -> probably unique
```

### 2. Relevance Scoring

Use a weighted score that answers two questions:

```text
Is this about humanoid/social/service/education robotics?
Is this about Thailand or a Thailand-connected entity?
```

Suggested score:

```text
score = 0.45 * topic_score
      + 0.25 * scope_score
      + 0.15 * source_quality_score
      + 0.15 * evidence_density_score
```

Suggested review buckets:

```text
confidence >= 0.85        -> auto accept
0.60 <= confidence < 0.85 -> accept but audit later
confidence < 0.60         -> review or reject
```

### 3. NLP Extraction

Use structured extraction for:

- taxonomy labels
- entities
- evidence excerpts
- triplets
- perspective annotations

Preferred progression:

```text
rule-based labels -> TF-IDF / linear models -> embedding similarity -> LLM JSON extraction
```

The extractor should always be able to abstain when evidence is thin.

### 4. Graph Model

Build the graph from triplets:

```text
subject -> relation -> object
```

Use a directed weighted graph and cache graph summaries for the UI.

### 5. Statistics / Analytics

Use log transforms and nonparametric summaries for skewed counts, engagement, and trend analysis.

### 6. Caching

Cache any expensive summary, graph metric, or dashboard output and invalidate when source, entity, triplet, or taxonomy data changes.

---

## What Has Already Been Done

- Seed JSON import is wired into Prisma seed.
- The seed file auto-syncs in local dev.
- Prisma client output uses `generated/prisma`.
- The web app reads from Prisma Postgres instead of local SQLite.
- A live read verification script exists.
- The app has source ingestion, robot registry, contribution, inventory, perspective, graph, analytics, database, and admin pages.
- The main missing work is deeper algorithmic hardening, especially dedupe, scoring, and analytics upgrades.

---

## Recommended Initial Data Sources

### Must-Have for V1

1. **Seed YAML / CSV**
   - The safest first adapter.
   - Use it for robot models, owned inventory, known Thai robot companies, known university labs, and manually curated source URLs.

2. **RSS + Web Fetch**
   - News sites, university news, company blogs, government announcements.
   - Store source URL, title, excerpt, published date, and source metadata.

3. **GDELT / Global News Search**
   - Useful for broad news/media monitoring.
   - Use queries such as:
     - `humanoid robot Thailand`
     - `social robot Thailand`
     - `Dinsaw robot`
     - `หุ่นยนต์ฮิวแมนนอยด์ ไทย`
     - `หุ่นยนต์ดูแลผู้สูงอายุ ดินสอ`

4. **YouTube Data API**
   - Search for public videos and collect metadata.
   - Store title, channel, description excerpt, published date, view count, like count when available, and comments only when allowed and necessary.

5. **OpenAlex**
   - Research papers, authors, institutions, topics, citations, and concepts.
   - Query around humanoid robotics, social robotics, service robots, elder-care robots, Thailand, Thai universities, and HRI.

6. **Manual Submission / Approved Export for TikTok, Facebook, Instagram, X, Reddit**
   - Do not build risky scrapers first.
   - Start with URL submissions, public embeds, approved API access, or manually exported metadata.

7. **GitHub REST API**
   - Public robotics repositories, organization repos, code contributions, issues, releases, and stars.

8. **Data.go.th / Thai Government Open Data**
   - Optional for industry, education, health, aging society, innovation, and robotics-related datasets.

---

## Algorithms To Use

For your **Research Atlas / OpenAtlas**, the math models and algorithms should be used in layers:

```text
dedupe -> relevance scoring -> NLP extraction -> graph model -> statistics/analytics -> caching
```

The pipeline should stay topic-neutral in structure and topic-specific only in configuration, labels, and adapters.

### 1. Deduplication Model

Use this first, before any AI or graph work.

| Purpose | Algorithm / Model | How to implement |
| --- | --- | --- |
| Exact duplicate URL | URL canonicalization + `UNIQUE(url)` | Normalize URL, remove `utm_*`, `fbclid`, trailing slash, lowercase host |
| Same API item | `(platform, external_id)` uniqueness | Add unique index if source has IDs |
| Same/similar text | TF-IDF + cosine similarity | Convert text to TF-IDF vectors, compare similarity |
| Large-scale near duplicates | MinHash / LSH | Use later when corpus becomes too big |

Thresholds:

```text
similarity >= 0.95  -> almost duplicate
0.85-0.95           -> likely syndicated / copied
< 0.85              -> probably unique
```

### 2. Relevance Scoring Model

Every record should answer:

```text
Is this about the topic?
Is this inside the scope?
```

Suggested model:

```text
score = 0.45 * topic_score
      + 0.25 * scope_score
      + 0.15 * source_quality_score
      + 0.15 * evidence_density_score
```

### 3. Classification Model

Use taxonomy classification for each source.

| Level | Method | Use case |
| --- | --- | --- |
| Baseline | Keyword + regex rules | Fast, cheap, transparent |
| Better | TF-IDF + Logistic Regression / Linear SVM | When you have labeled examples |
| Semantic | Embedding similarity | Good for fuzzy topic matching |
| Advanced | LLM JSON classifier | Best for messy text, but expensive |

### 4. Relationship Extraction Model

Use subject-relation-object triplets.

### 5. Graph Model

Build a directed weighted graph from triplets and compute degree centrality, betweenness centrality, weakly connected components, and communities.

### 6. Analytics and Statistics Model

Use log transforms, geometric mean, bootstrap confidence intervals, and nonparametric tests for skewed data.

### 7. Geographic Model

Store only derived coordinates with confidence when place extraction is available. Do not treat inferred coordinates as exact.

### 8. Cache Algorithm

Cache graph metrics, node details, yearly taxonomy summaries, and dashboard summaries in a versioned cache table.

---

## Implementation Gaps To Close

After reading the current codebase, the main missing pieces are:

- Explicit URL canonicalization and duplicate detection before insert.
- A shared dedupe service for both seed import and ingest paths.
- A dedicated cache invalidation policy for graph and dashboard summaries.
- Stronger stats helpers for bootstrap and nonparametric analytics.
- More complete geographic extraction when the atlas starts mapping places.

These are the next code tasks if you want the atlas to match the full architecture described here.

---

## Seed Records to Add First

These are starting points, not complete facts. Every record should include source URL, source type, evidence note, confidence, and last verified date.

### Robot / Organization Seeds

- Dinsaw Robot / Dinsaw Mini Home AI.
- CT Asia Robotics.
- King Chulalongkorn Memorial Hospital physical AI / medical robot deployment.
- True Digital physical AI partnership records.
- Thai university humanoid/social robotics labs and projects.
- Imported humanoid platforms used in Thailand, if verified.
- Project-owned models from CreativeLabTH or partner labs.

### Research / Perspective Seeds

- Studies about job displacement perception and human-robot work interaction in Thailand.
- HRI, service robots, elderly care, healthcare robotics, MICE/service-sector robotics.
- Thai-language media posts discussing robots in hospitals, schools, exhibitions, and public service.

---

## Domain Configuration

```env
PROJECT_NAME=Thailand Humanoid Atlas
TOPIC_NAME=humanoid and social robotics
TOPIC_ADJECTIVE=humanoid-robotics-related
PRIMARY_SCOPE=Thailand humanoid and social robotics ecosystem
DATABASE_URL=sqlite:///data/processed/thailand_humanoid_atlas.db
DATABASE_READ_ONLY=false
AUTH_MODE=local
PUBLIC_DEMO_MODE=false
LLM_PROVIDER=none
```

---

## Repository Layout

```text
thailand-humanoid-atlas/
  app/                    # Next.js routes, pages, and actions
  lib/                    # Prisma client, ingest helpers, classifiers, seed importer
  prisma/                 # Prisma schema, config, migrations, seed entrypoints
  scripts/                # Dev sync, verification, ingest wrappers
  src/humanoid_atlas/     # Legacy Python pipeline and reference implementation
  tests/                  # Python smoke/unit tests
  tests-node/             # Playwright browser tests
  data/                   # Existing local data and legacy artifacts
  thailand_humanoid_atlas_seed_records.json
  thailand-humanoid-atlas-project.md
```

---

## Minimum Database Schema Additions

The base OpenAtlas schema should be extended with robot-specific tables.

```sql
CREATE TABLE IF NOT EXISTS robot_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT NOT NULL,
    manufacturer TEXT,
    developer_org TEXT,
    country_of_origin TEXT,
    robot_type TEXT NOT NULL,
    embodiment_level TEXT,
    primary_use_case TEXT,
    thailand_status TEXT NOT NULL DEFAULT 'observed',
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
    display_name TEXT NOT NULL,
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
    source_url TEXT,
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
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_robot_models_name ON robot_models(canonical_name);
CREATE INDEX IF NOT EXISTS idx_robot_models_status ON robot_models(thailand_status);
CREATE INDEX IF NOT EXISTS idx_owned_inventory_model ON owned_inventory(robot_model_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_perspective_source ON perspective_annotations(source_id);
CREATE INDEX IF NOT EXISTS idx_perspective_theme ON perspective_annotations(perception_theme);
```

---

## Taxonomy V1

### Robot Type

- humanoid_full_body
- humanoid_upper_body
- social_robot
- companion_robot
- eldercare_robot
- hospital_service_robot
- education_robot
- telepresence_robot
- entertainment_robot
- research_prototype
- industrial_humanoid
- service_robot_nonhumanoid
- unknown

### Embodiment Level

- full_body_humanoid
- torso_or_bust
- mobile_base_with_screen
- tabletop_social_robot
- software_only_simulation
- mixed_or_unclear

### Perspective Theme

- healthcare_and_eldercare_trust
- job_displacement
- human_robot_collaboration
- education_and_learning
- national_innovation
- entertainment_and_novelty
- privacy_and_surveillance
- safety_and_reliability
- cultural_acceptance
- accessibility_and_inclusion
- cost_and_affordability
- ethics_and_identity
- unclear

### Stance

- supportive
- cautious_supportive
- neutral
- skeptical
- opposed
- humorous_or_memetic
- unclear

### Sentiment

- positive
- mixed
- neutral
- negative
- unclear

### Contribution Type

- research_paper
- software_repository
- hardware_design
- dataset
- demo_or_exhibition
- workshop_or_course
- media_analysis
- field_observation
- translation_or_documentation
- repair_or_maintenance
- robot_deployment
- student_project
- policy_or_report
- other

### Thailand Status

- developed_in_thailand
- deployed_in_thailand
- imported_to_thailand
- observed_in_thailand
- owned_by_project
- tested_by_project
- used_in_event
- rumored_unverified
- retired_or_inactive
- unknown

---

## Relevance Classifier Rules

A record is accepted when both conditions are true:

1. It is related to humanoid/social/service robots or embodied AI.
2. It has a Thailand connection through location, organization, deployment, creator, media audience, event, market entry, or public discussion.

### Accept Examples

- Article about Dinsaw Robot in Thai hospitals.
- YouTube video reviewing a humanoid robot event in Bangkok.
- Thai university project about social robots.
- Public post discussing robots replacing jobs in Thailand.
- Team-owned Unitree/UBTech/NAO/other robot inventory record.

### Reject Examples

- Generic ChatGPT news with no robot embodiment.
- Industrial automation news with no human-facing robot relevance.
- Foreign humanoid robot news with no Thai connection.
- Personal private comments or private group posts.

### Uncertain Examples

- “AI robot” article where it may mean chatbot.
- Restaurant delivery robot with no social/humanoid interaction.
- Vendor press release claiming Thailand launch without independent evidence.

---

## Perspective Extraction Output

Every media/source record can have one or more perspective annotations.

```json
{
  "stance": "cautious_supportive",
  "sentiment": "mixed",
  "perception_theme": "job_displacement",
  "target_entity": "humanoid robots in service jobs",
  "evidence_excerpt": "short excerpt from the source",
  "confidence": 0.72,
  "method": "llm_with_evidence"
}
```

Rules:

- Do not infer public opinion from a single post.
- Label the data as “observed media signals,” not “Thailand public opinion.”
- Keep source provenance visible.
- Use aggregation only when sample size is meaningful.
- Separate creator framing from audience comments.

---

## Relationship Triplets

Allowed relations for V1:

```text
organization -> developed -> robot_model
organization -> deployed -> robot_model
robot_model -> used_for -> use_case
robot_model -> deployed_in -> place_or_institution
person -> affiliated_with -> organization
person -> contributed_to -> project
source -> discusses -> robot_model_or_topic
source -> expresses_concern_about -> theme
source -> supports -> theme_or_robot_model
contribution -> uses -> robot_model_or_tool
contribution -> released_as -> repo_paper_dataset_demo
owned_inventory -> instance_of -> robot_model
owned_inventory -> located_at -> location_label
```

---

## Data Governance

### Public Data Rule

The platform should store public metadata, source URLs, short excerpts, and analysis labels. It should avoid storing full comments or personal data unless the source license and platform terms clearly allow it.

### Private Inventory Rule

Owned inventory should default to private visibility. Public pages should hide serial numbers, precise storage location, purchase documents, and security-sensitive maintenance details unless explicitly marked public-safe.

### Contribution Claim Rule

A person or organization can submit a contribution claim, but it remains pending until reviewed. Public contributor profiles should not expose emails, phone numbers, private addresses, or sensitive personal identifiers.

### Corrections and Takedown

Add a visible correction request pathway. Every source detail page should include provenance and “request correction” action.

---

## MVP Build Order

1. Create project skeleton and config.
2. Add schema and migrations.
3. Add seed YAML adapter.
4. Add seed records for robot models, owned inventory, organizations, and source URLs.
5. Add database browser page.
6. Add rule-based relevance classifier.
7. Add perspective taxonomy and annotation table.
8. Add robot model registry page.
9. Add owned inventory page with private/public visibility.
10. Add contribution submission flow.
11. Add admin review queue.
12. Add GDELT/RSS adapter.
13. Add YouTube adapter.
14. Add OpenAlex adapter.
15. Add GitHub adapter.
16. Add graph metrics and network page.
17. Add analytics and method notes.
18. Add export.
19. Add tests and Playwright smoke checks.
20. Add deployment docs.

---

## Current Commands

```bash
pnpm dev
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm typecheck
pnpm build
tsx scripts/verify-prisma.ts
```

---

## CLI Commands Legacy

```bash
python -m humanoid_atlas db init
python -m humanoid_atlas ingest seeds --file data/seeds/robot_models.seed.yml
python -m humanoid_atlas ingest seeds --file data/seeds/owned_inventory.seed.yml
python -m humanoid_atlas ingest rss --feed all
python -m humanoid_atlas ingest gdelt --query "humanoid robot Thailand" --days 30
python -m humanoid_atlas ingest youtube --query "หุ่นยนต์ ดินสอ" --limit 50
python -m humanoid_atlas ingest openalex --query "humanoid robot Thailand" --from-year 2015
python -m humanoid_atlas filter relevance --pending
python -m humanoid_atlas analyze perspectives --pending
python -m humanoid_atlas analyze graph
python -m humanoid_atlas analyze stats
python -m humanoid_atlas export csv --table sources
python -m humanoid_atlas serve
```

---

## CLI Agent Prompt

```text
Build an open-source Thailand Humanoid Atlas platform in this repository.

Project topic:
Thailand humanoid and social robotics ecosystem.

Project scope:
Public and curated records about humanoid, social, companion, healthcare, education, service, and embodied-AI robots connected to Thailand, plus contribution records and robot models owned or operated by the project team.

Main goal:
Create a repeatable research database platform that collects public records, normalizes them, classifies relevance, extracts media/public perspectives, maps contributors and organizations, tracks robot models, tracks project-owned robot inventory, and exposes the data through an analyst-friendly web UI.

Important grounding:
Use the uploaded Open Source Research Atlas guide as the base architecture. Keep the pipeline pattern: source adapters -> normalized records -> dedupe -> relevance -> taxonomy/entity classification -> relationship extraction -> stats/graph cache -> FastAPI/Jinja UI -> submissions/admin review. Extend it for humanoid robotics, public perspective analysis, contribution records, robot model registry, and owned inventory.

Stack requirements:
- Python 3.11+
- FastAPI
- Jinja2
- SQLite first, clean path to PostgreSQL/Supabase later
- Typer CLI
- Pydantic
- httpx
- NetworkX
- pandas/openpyxl for export if available
- pytest
- Playwright smoke tests if the repo already supports it or if it can be added safely

Core pages:
- /
- /dashboard
- /perspectives
- /robots
- /inventory
- /contributions
- /network
- /analytics
- /database
- /submit-data
- /profile
- /admin/submitted-data

Core CLI:
- db init
- ingest seeds
- ingest rss
- ingest gdelt
- ingest youtube
- ingest openalex
- ingest github
- filter relevance
- analyze perspectives
- analyze nlp
- analyze graph
- analyze stats
- export csv
- serve

Data source adapters for V1:
1. seed_yaml: required; no credentials needed.
2. rss/web_fetch: public pages and university/company/government news.
3. gdelt: public news discovery.
4. youtube: optional, requires YOUTUBE_API_KEY.
5. openalex: public research metadata.
6. github: public repositories and contribution metadata.
7. manual_social: manual URL submission and approved metadata for Facebook, TikTok, Instagram, X, Reddit, or other platforms where automated access is restricted.

Do not build risky scrapers. Respect robots.txt, platform terms, API permissions, and copyright. Store source URLs, metadata, and short excerpts rather than redistributing full text when licensing is unclear.

Database requirements:
Start from the base OpenAtlas schema for sources, geo, entities, triplets, stats_cache, and submitted_data. Add these domain tables:
- robot_models
- owned_inventory
- contributions
- perspective_annotations
- pipeline_runs if not already present

Taxonomy requirements:
Create config/taxonomy.yml or data/taxonomy.yml with:
- robot_type
- embodiment_level
- perspective_theme
- stance
- sentiment
- contribution_type
- thailand_status
- source_type
- confidence_bucket

Perspective extraction:
For each accepted source, extract stance, sentiment, perception theme, target entity, evidence excerpt, confidence, and method. Add an abstention state when evidence is thin. Do not claim this represents all Thai public opinion; label it as observed public/media signals.

Owned inventory:
Default visibility should be private. Public views must hide serial numbers, precise storage location, purchase documents, and security-sensitive repair details unless marked public-safe.

Contribution records:
Allow community submissions for research papers, software repositories, hardware designs, datasets, demos, workshops, media analysis, field observations, translations, repairs, robot deployments, student projects, and policy reports. Require admin review before publishing.

Build order:
Phase 0: Inspect repo and report plan.
Phase 1: Config, package metadata, CLI skeleton.
Phase 2: Database schema, migrations, repositories.
Phase 3: Seed YAML adapter and initial seed files.
Phase 4: Relevance classifier and taxonomy.
Phase 5: Robot model registry and owned inventory pages.
Phase 6: Perspective annotation pipeline.
Phase 7: Contributions and submission/admin review.
Phase 8: GDELT/RSS/OpenAlex/GitHub/YouTube adapters with graceful missing-key behavior.
Phase 9: Network graph, analytics, cached APIs.
Phase 10: UI polish, export, tests, Playwright validation, docs.

Operating rules:
- Work phase by phase.
- Before each phase, state files to create/edit and checks to run.
- After each phase, stop and report completed work, changed files, commands/tests run, errors, missing credentials, outside-editor tasks, and readiness for approval.
- Use safe local fallbacks when keys are missing.
- Never hard-code private team inventory into public seed files unless visibility is explicitly set.
- Do not delete unrelated user changes.
- Do not mark a phase complete until checks pass or blockers are clearly listed.

Acceptance checks for MVP:
- `python -m humanoid_atlas db init` creates all required tables and indexes.
- Running db init twice is safe.
- Seed ingest inserts robot models and owned inventory without duplicates.
- Relevance classifier handles accepted, rejected, and uncertain examples.
- Perspective pipeline creates evidence-based annotations or abstains.
- Robot registry, inventory, contribution, database, analytics, network, and admin pages render.
- Export works for sources, robot_models, owned_inventory, contributions, and perspective_annotations.
- Tests cover schema, ingest idempotency, classifier outputs, graph empty states, and protected admin routes.
```

---

## UI/UX Creation Prompt

```text
Design the UI/UX for Thailand Humanoid Atlas, an open-source research database platform for Thailand's humanoid and social robotics ecosystem.

Product meaning:
This is not a marketing landing page. It is a dense, credible research atlas that helps users understand how Thailand discovers, discusses, builds, owns, and deploys humanoid/social robots.

Primary users:
- Robotics researchers
- HRI researchers
- Students
- Media researchers
- Policy and innovation teams
- Event/exhibition organizers
- Robotics contributors
- CreativeLabTH/internal operators
- Admin reviewers

Primary workflows:
1. Understand the current corpus at a glance.
2. Explore public/media perspectives by platform, theme, stance, sentiment, and time.
3. Browse robot models connected to Thailand.
4. Inspect project-owned robot inventory safely, with private/public visibility rules.
5. Discover contributors, organizations, labs, papers, demos, and repositories.
6. Explore relationship graph between robots, people, institutions, media, and themes.
7. Search/filter/export raw records.
8. Submit a new source, robot model, contribution, or inventory update.
9. Review pending submissions as admin.

Required routes/screens:
- Home / corpus summary
- Dashboard
- Perspectives
- Robot Model Registry
- Owned Inventory
- Contributions
- Network Graph
- Analytics
- Database Browser
- Submit Data
- User Profile
- Admin Review Queue

Design direction:
Use a modern research-console style: compact, serious, legible, and exploratory. Avoid generic SaaS hero sections, oversized cards, vague gradients, and marketing copy. The app should feel like a public-interest research instrument with a lab-grade interface.

Information architecture:
Use a persistent left sidebar on desktop and bottom/tab navigation or drawer navigation on mobile.
Top-level navigation:
- Overview
- Perspectives
- Robots
- Inventory
- Contributions
- Network
- Analytics
- Database
- Submit
- Admin

Home screen requirements:
- Show corpus size, source count, year range, latest pipeline update, robot model count, owned inventory count, contribution count, and pending review count.
- Show quick filters: year, platform, robot type, perspective theme, confidence.
- Show direct action buttons: Explore perspectives, Browse robots, Add source, Review queue.
- Empty state must tell the operator what CLI command to run next.

Perspectives screen requirements:
- Main chart: perspective theme over time.
- Side panel: stance/sentiment distribution.
- Platform filter: news, YouTube, academic, company, government, manual social, GitHub, submissions.
- Evidence table: source title, platform, theme, stance, confidence, excerpt, date.
- Clearly label the data as observed media/public signals, not complete public opinion.
- Show low-confidence labels with warning badges.

Robot registry screen requirements:
- Card/table hybrid for robot models.
- Filters: robot type, embodiment level, Thailand status, manufacturer, use case, confidence.
- Each robot detail page should show description, source evidence, deployment/use cases, related contributions, related media, and graph neighbors.
- Status badge examples: developed in Thailand, deployed in Thailand, imported, observed, owned by project, rumored/unverified.

Owned inventory screen requirements:
- Default to private/operator mode.
- Public-safe mode must hide serial numbers, precise location, purchase documents, and sensitive maintenance notes.
- Show model, display name, condition, ownership status, custodian, visibility, accessories, documentation status, and last updated.
- Add clear warnings before exposing private inventory fields.

Contributions screen requirements:
- Show contributions by type: research, software, hardware, dataset, demo, workshop, media analysis, field observation, repair, deployment, student project.
- Allow filtering by organization, robot model, license, verification status, and year.
- Contribution detail page should show source, contributor display name, organization, related robot, evidence, license, and verification status.

Network screen requirements:
- 2D graph first, 3D optional.
- Node types: robot, organization, person, source, topic, contribution, place, owned inventory.
- Edge examples: developed, deployed, used_for, discusses, affiliated_with, contributed_to, expresses_concern_about, instance_of.
- Node click opens a detail drawer with neighbors, evidence, confidence, and source links.
- Include search, relation filter, confidence filter, and graph size limit.
- Empty state should explain whether no triplets exist or filters are too narrow.

Analytics screen requirements:
- Trend charts with sample size.
- Engagement statistics should use log1p/geometric summaries where appropriate.
- Show confidence intervals and insufficient-data states.
- Method note must explain that correlations and media trends are not causal claims.

Database screen requirements:
- Dense table with stable columns and horizontal scrolling only inside the table container.
- Search by title, URL, robot model, organization, theme, entity, relation.
- Filters must remain visible after scrolling.
- Detail drawer should show raw metadata, derived labels, source evidence, and admin actions if authorized.
- Include CSV/XLSX export controls.

Submit-data requirements:
Submission types:
- Source URL
- Robot model
- Owned inventory update
- Contribution claim
- Event/demo record
- Correction request

Show statuses:
- queued
- fetching
- analyzed
- needs review
- approved
- rejected
- failed

If AI analysis is used, show evidence excerpt and confidence. If API keys are missing, show a graceful degraded state and let the user submit manually.

Admin requirements:
- Optimize for review speed.
- Use split view: submitted data on left, automated analysis/evidence on right.
- Actions: approve, reject, edit, merge duplicate, request more info, mark private, publish public-safe version.
- Non-admin users must not see admin actions.

Design system:
- Use color roles, not only palette names:
  - background
  - surface
  - surface-muted
  - border
  - text-primary
  - text-secondary
  - accent
  - success
  - warning
  - danger
  - low-confidence
  - private-data
  - public-safe
- Use compact typography suitable for dense tables.
- Use badges for robot type, status, confidence, visibility, and review state.
- Use clear focus states and keyboard navigation.
- Do not rely on color alone to communicate status.
- Respect reduced motion.

Responsive behavior:
Desktop:
- Sidebar navigation.
- Multi-column dashboards.
- Detail drawers on the right.

Tablet:
- Collapsible sidebar.
- Two-column cards and tables.
- Detail drawer can become a bottom sheet.

Mobile:
- Bottom navigation or hamburger drawer.
- Filters become a sheet.
- Tables become compact cards.
- Graph has search-first interaction and simplified node list.

Browser validation:
Use Playwright or equivalent browser testing. Visit desktop and mobile viewports for:
- /
- /dashboard
- /perspectives
- /robots
- /inventory
- /contributions
- /network
- /analytics
- /database
- /submit-data
- /profile
- /admin/submitted-data

Report:
- Routes visited
- Viewports tested
- Screenshots captured
- Console errors
- Page errors
- Failed network requests
- Missing assets
- Blank charts/maps/graphs
- Layout overlap
- Horizontal scroll outside table containers
- Clipped text
- Inaccessible controls
- Issues fixed
- Remaining blockers

Output format:
Design summary:
- <short UX direction>

Changed files or proposed files:
- <file>

Key workflows covered:
- <workflow>

Responsive behavior:
- <desktop/tablet/mobile notes>

Accessibility checks:
- <keyboard, contrast, labels, focus, reduced motion>

Playwright validation:
- Routes visited:
- Viewports tested:
- Console/page errors:
- Screenshots captured:
- Issues fixed:
- Remaining blockers:

Missing information:
- <none or exact missing item>

Developer must do outside editor:
- <none or exact task>
```

---

## Definition of Done for V1

- A new developer can run setup from README.
- `db init` creates all required tables.
- Seed ingest works and is idempotent.
- At least 20 curated seed records exist.
- Robot registry shows verified/unverified status clearly.
- Owned inventory supports private/public-safe visibility.
- Perspective annotations include evidence and confidence.
- Database page supports search/filter/export.
- Submissions are stored and reviewable.
- Admin can approve/reject/edit submissions.
- Graph and analytics pages render from cached APIs.
- Tests cover schema, ingest idempotency, classifier output, graph empty state, and admin protection.
- Method notes clearly explain limitations.
- Source policy explains licensing, privacy, and platform terms.
