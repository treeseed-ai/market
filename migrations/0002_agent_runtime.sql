CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  agent_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
