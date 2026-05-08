ALTER TABLE work_policies ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE work_policies ADD COLUMN start_cron TEXT NOT NULL DEFAULT '0 9 * * 1-5';
ALTER TABLE work_policies ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 480;
ALTER TABLE work_policies ADD COLUMN max_runners INTEGER NOT NULL DEFAULT 1;
ALTER TABLE work_policies ADD COLUMN max_workers_per_runner INTEGER NOT NULL DEFAULT 4;
ALTER TABLE work_policies ADD COLUMN daily_credit_budget INTEGER NOT NULL DEFAULT 0;
ALTER TABLE work_policies ADD COLUMN closeout_grace_minutes INTEGER NOT NULL DEFAULT 15;

UPDATE work_policies
SET daily_credit_budget = daily_task_credit_budget
WHERE daily_credit_budget = 0 AND daily_task_credit_budget > 0;

CREATE TABLE IF NOT EXISTS workday_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  work_day_id TEXT,
  requested_by TEXT,
  reason TEXT,
  payload_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workday_requests_project_environment_state
  ON workday_requests(project_id, environment, state, created_at ASC);

CREATE TABLE IF NOT EXISTS workday_manager_leases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  work_day_id TEXT,
  manager_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workday_manager_leases_active
  ON workday_manager_leases(project_id, environment, state, heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS worker_runners (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  runner_service_name TEXT NOT NULL,
  volume_identity TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  max_local_workers INTEGER NOT NULL DEFAULT 4,
  active_local_workers INTEGER NOT NULL DEFAULT 0,
  available_capacity INTEGER NOT NULL DEFAULT 4,
  last_heartbeat_at TEXT,
  claimed_repository_ids_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_runners_identity
  ON worker_runners(project_id, environment, runner_id);

CREATE INDEX IF NOT EXISTS idx_worker_runners_state_capacity
  ON worker_runners(project_id, environment, state, available_capacity DESC);

CREATE TABLE IF NOT EXISTS repository_claims (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  runner_service_name TEXT NOT NULL,
  volume_identity TEXT NOT NULL,
  last_seen_commit TEXT,
  last_task_at TEXT,
  claim_state TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_claims_runner_repo
  ON repository_claims(project_id, repository_id, runner_id);

CREATE INDEX IF NOT EXISTS idx_repository_claims_repo_state
  ON repository_claims(project_id, repository_id, claim_state, updated_at DESC);

CREATE TABLE IF NOT EXISTS runner_scale_decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  work_day_id TEXT,
  runner_id TEXT,
  runner_service_name TEXT,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runner_scale_decisions_project_workday
  ON runner_scale_decisions(project_id, environment, work_day_id, created_at DESC);
