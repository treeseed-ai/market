CREATE TABLE IF NOT EXISTS capacity_provider_api_keys (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TEXT,
  rotated_from_key_id TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (rotated_from_key_id) REFERENCES capacity_provider_api_keys(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_capacity_provider_api_keys_provider_status
  ON capacity_provider_api_keys(capacity_provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_capacity_provider_api_keys_prefix
  ON capacity_provider_api_keys(key_prefix);
