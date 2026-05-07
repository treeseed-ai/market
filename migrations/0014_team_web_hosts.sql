CREATE TABLE IF NOT EXISTS team_web_hosts (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  ownership TEXT NOT NULL,
  name TEXT NOT NULL,
  account_label TEXT,
  allowed_environments_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  encrypted_payload_json TEXT,
  metadata_json TEXT,
  created_by_id TEXT,
  updated_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_web_hosts_team_provider
  ON team_web_hosts(team_id, provider, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_web_hosts_team_provider_name
  ON team_web_hosts(team_id, provider, name);
