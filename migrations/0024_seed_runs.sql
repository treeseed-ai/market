CREATE TABLE IF NOT EXISTS seed_runs (
  id TEXT PRIMARY KEY,
  seed_name TEXT NOT NULL,
  seed_version INTEGER NOT NULL,
  environments_json TEXT NOT NULL,
  mode TEXT NOT NULL,
  state TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  manifest_hash TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  result_json TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_seed_runs_seed_created
  ON seed_runs(seed_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seed_runs_state_created
  ON seed_runs(state, created_at DESC);
