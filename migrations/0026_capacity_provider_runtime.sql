CREATE TABLE IF NOT EXISTS capacity_provider_registrations (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  runtime_version TEXT NOT NULL,
  market_id TEXT NOT NULL,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  budgets_json TEXT NOT NULL DEFAULT '{}',
  health_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'online',
  registered_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  disconnected_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_provider_registrations_provider_seen
  ON capacity_provider_registrations(capacity_provider_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS capacity_provider_deployments (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  capacity_provider_id TEXT NOT NULL,
  launch_mode TEXT NOT NULL,
  host_kind TEXT NOT NULL,
  host_id TEXT,
  status TEXT NOT NULL,
  image_ref TEXT,
  service_refs_json TEXT NOT NULL DEFAULT '{}',
  env_refs_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT,
  created_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_provider_deployments_provider_created
  ON capacity_provider_deployments(capacity_provider_id, created_at DESC);
