CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_team_id
  ON projects(team_id);

CREATE TABLE IF NOT EXISTS project_connections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  project_api_base_url TEXT,
  execution_owner TEXT NOT NULL,
  runner_registration_state TEXT NOT NULL DEFAULT 'pending',
  runner_key_prefix TEXT,
  runner_key_hash TEXT,
  runner_registered_at TEXT,
  runner_last_seen_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_capability_grants (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  operation TEXT NOT NULL,
  execution_class TEXT NOT NULL,
  allowed_targets_json TEXT NOT NULL,
  default_dispatch_mode TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_capability_grants_project_operation
  ON project_capability_grants(project_id, namespace, operation);

CREATE TABLE IF NOT EXISTS team_api_keys (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions_json TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_api_keys_prefix
  ON team_api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  project_id TEXT,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_project
  ON entitlements(project_id);

CREATE TABLE IF NOT EXISTS remote_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  preferred_mode TEXT NOT NULL,
  selected_target TEXT NOT NULL,
  capability_json TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_json TEXT,
  requested_by_type TEXT NOT NULL,
  requested_by_id TEXT,
  assigned_runner_id TEXT,
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remote_jobs_project_status
  ON remote_jobs(project_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_remote_jobs_project_idempotency
  ON remote_jobs(project_id, idempotency_key);

CREATE TABLE IF NOT EXISTS remote_job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES remote_jobs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_remote_job_events_job_seq
  ON remote_job_events(job_id, seq);

CREATE TABLE IF NOT EXISTS knowledge_packs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT,
  source_kind TEXT NOT NULL,
  source_ref TEXT,
  install_strategy TEXT NOT NULL,
  visibility TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_packs_team_id
  ON knowledge_packs(team_id);
