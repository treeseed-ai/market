CREATE TABLE IF NOT EXISTS project_hosting (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  hosting_kind TEXT NOT NULL,
  registration TEXT NOT NULL DEFAULT 'none',
  market_base_url TEXT,
  source_repo_owner TEXT,
  source_repo_name TEXT,
  source_repo_url TEXT,
  source_repo_workflow_path TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_environments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  deployment_profile TEXT NOT NULL,
  base_url TEXT,
  cloudflare_account_id TEXT,
  pages_project_name TEXT,
  worker_name TEXT,
  r2_bucket_name TEXT,
  d1_database_name TEXT,
  queue_name TEXT,
  railway_project_name TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_environments_project_environment
  ON project_environments(project_id, environment);

CREATE TABLE IF NOT EXISTS project_infrastructure_resources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  provider TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  logical_name TEXT NOT NULL,
  locator TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_infrastructure_resource_unique
  ON project_infrastructure_resources(project_id, environment, provider, resource_kind, logical_name);

CREATE TABLE IF NOT EXISTS project_deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  deployment_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  source_ref TEXT,
  release_tag TEXT,
  commit_sha TEXT,
  triggered_by_type TEXT,
  triggered_by_id TEXT,
  metadata_json TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_deployments_project_environment
  ON project_deployments(project_id, environment, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_pools (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  name TEXT NOT NULL,
  registration_identity TEXT,
  service_base_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  min_workers INTEGER NOT NULL DEFAULT 0,
  max_workers INTEGER NOT NULL DEFAULT 1,
  target_queue_depth INTEGER NOT NULL DEFAULT 1,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_pools_project_environment_name
  ON agent_pools(project_id, environment, name);

CREATE TABLE IF NOT EXISTS agent_pool_registrations (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  runner_id TEXT,
  manager_id TEXT,
  service_name TEXT,
  heartbeat_at TEXT NOT NULL,
  desired_workers INTEGER,
  observed_queue_depth INTEGER,
  observed_active_leases INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (pool_id) REFERENCES agent_pools(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_pool_registrations_pool_heartbeat
  ON agent_pool_registrations(pool_id, heartbeat_at DESC);
