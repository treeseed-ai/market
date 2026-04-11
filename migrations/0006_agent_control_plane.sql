CREATE TABLE IF NOT EXISTS work_days (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  state TEXT NOT NULL,
  capacity_budget INTEGER NOT NULL DEFAULT 0,
  capacity_used INTEGER NOT NULL DEFAULT 0,
  graph_version TEXT,
  summary_json TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  payload_hash TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  claimed_by TEXT,
  lease_expires_at TEXT,
  available_at TEXT NOT NULL,
  last_error_code TEXT,
  last_error_message TEXT,
  graph_version TEXT,
  parent_task_id TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_runnable
  ON tasks (state, priority DESC, available_at ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_work_day_agent
  ON tasks (work_day_id, agent_id, created_at);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_events_seq
  ON task_events (task_id, seq);

CREATE TABLE IF NOT EXISTS task_outputs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  output_json TEXT NOT NULL,
  output_ref TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_runs (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL,
  corpus_hash TEXT NOT NULL,
  graph_version TEXT NOT NULL,
  query_json TEXT,
  seed_ids_json TEXT,
  selected_node_ids_json TEXT,
  stats_json TEXT,
  snapshot_ref TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body_json TEXT NOT NULL,
  rendered_ref TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);
