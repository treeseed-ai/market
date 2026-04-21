CREATE TABLE IF NOT EXISTS project_summary_snapshots (
  project_id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_summary_snapshots_team_generated
  ON project_summary_snapshots(team_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS team_inbox_items (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project_id TEXT,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  href TEXT,
  item_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_inbox_items_team_created
  ON team_inbox_items(team_id, created_at DESC);
