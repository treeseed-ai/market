CREATE TABLE IF NOT EXISTS agent_pool_scale_decisions (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  desired_workers INTEGER NOT NULL,
  observed_queue_depth INTEGER NOT NULL DEFAULT 0,
  observed_active_leases INTEGER NOT NULL DEFAULT 0,
  work_day_id TEXT,
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (pool_id) REFERENCES agent_pools(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_pool_scale_decisions_pool_created
  ON agent_pool_scale_decisions(pool_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_workday_summaries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  work_day_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  state TEXT,
  started_at TEXT,
  ended_at TEXT,
  summary_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_workday_summaries_project_environment_created
  ON project_workday_summaries(project_id, environment, created_at DESC);

CREATE TABLE IF NOT EXISTS work_policies (
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  daily_task_credit_budget INTEGER NOT NULL DEFAULT 0,
  max_queued_tasks INTEGER NOT NULL DEFAULT 0,
  max_queued_credits INTEGER NOT NULL DEFAULT 0,
  autoscale_json TEXT NOT NULL,
  credit_weights_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, environment)
);

CREATE TABLE IF NOT EXISTS priority_overrides (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  model TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  priority REAL NOT NULL DEFAULT 0,
  estimated_credits REAL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_priority_overrides_project_priority
  ON priority_overrides(project_id, priority DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS priority_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  work_day_id TEXT,
  snapshot_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_priority_snapshots_project_generated
  ON priority_snapshots(project_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS task_credit_ledger (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  work_day_id TEXT NOT NULL,
  task_id TEXT,
  phase TEXT NOT NULL,
  credits REAL NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_credit_ledger_work_day_created
  ON task_credit_ledger(work_day_id, created_at ASC);

CREATE TABLE IF NOT EXISTS scale_decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  pool_name TEXT NOT NULL,
  work_day_id TEXT,
  desired_workers INTEGER NOT NULL,
  observed_queue_depth INTEGER NOT NULL DEFAULT 0,
  observed_active_leases INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scale_decisions_project_environment_pool_created
  ON scale_decisions(project_id, environment, pool_name, created_at DESC);
