CREATE TABLE IF NOT EXISTS runtime_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT NOT NULL,
  record_key TEXT NOT NULL,
  lookup_key TEXT,
  secondary_key TEXT,
  status TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  UNIQUE(record_type, record_key)
);

CREATE INDEX IF NOT EXISTS idx_runtime_records_type_lookup_updated
  ON runtime_records(record_type, lookup_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_records_type_status_updated
  ON runtime_records(record_type, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS cursor_state (
  agent_slug TEXT NOT NULL,
  cursor_key TEXT NOT NULL,
  status TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  PRIMARY KEY(agent_slug, cursor_key)
);

CREATE INDEX IF NOT EXISTS idx_cursor_state_updated
  ON cursor_state(updated_at DESC);

CREATE TABLE IF NOT EXISTS lease_state (
  model TEXT NOT NULL,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  claimed_by TEXT,
  claimed_at TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  PRIMARY KEY(model, item_key)
);

CREATE INDEX IF NOT EXISTS idx_lease_state_status_expires
  ON lease_state(status, lease_expires_at ASC);

CREATE INDEX IF NOT EXISTS idx_lease_state_claimed_by
  ON lease_state(claimed_by, updated_at DESC);

CREATE TABLE IF NOT EXISTS message_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_type TEXT NOT NULL,
  status TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  related_model TEXT,
  related_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  claimed_by TEXT,
  claimed_at TEXT,
  lease_expires_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  meta_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_queue_claimable
  ON message_queue(status, available_at ASC, priority DESC);

CREATE INDEX IF NOT EXISTS idx_message_queue_related
  ON message_queue(related_model, related_id, created_at DESC);
