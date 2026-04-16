CREATE TABLE IF NOT EXISTS team_storage_locators (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,
  bucket_name TEXT NOT NULL,
  manifest_key_template TEXT NOT NULL,
  preview_root_template TEXT NOT NULL,
  public_base_url TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  visibility TEXT NOT NULL,
  listing_enabled INTEGER NOT NULL DEFAULT 0,
  offer_mode TEXT NOT NULL,
  manifest_key TEXT,
  artifact_key TEXT,
  search_text TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_items_kind_slug
  ON catalog_items(kind, slug);

CREATE INDEX IF NOT EXISTS idx_catalog_items_team_kind
  ON catalog_items(team_id, kind, updated_at);

CREATE INDEX IF NOT EXISTS idx_catalog_items_visibility_listing
  ON catalog_items(visibility, listing_enabled, updated_at);

CREATE TABLE IF NOT EXISTS catalog_artifact_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  content_key TEXT NOT NULL,
  manifest_key TEXT,
  metadata_json TEXT,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_artifact_versions_item_version
  ON catalog_artifact_versions(item_id, version);

CREATE INDEX IF NOT EXISTS idx_catalog_artifact_versions_team_kind
  ON catalog_artifact_versions(team_id, kind, published_at);

CREATE TABLE IF NOT EXISTS catalog_item_collaborators (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  role TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_item_collaborators_subject_role
  ON catalog_item_collaborators(item_id, subject_type, subject_id, role);
