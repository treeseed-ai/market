CREATE TABLE IF NOT EXISTS capacity_providers (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  owner_team_id TEXT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  billing_scope TEXT NOT NULL DEFAULT 'team',
  monthly_credit_budget REAL NOT NULL DEFAULT 0,
  daily_credit_budget REAL NOT NULL DEFAULT 0,
  max_concurrent_workdays INTEGER NOT NULL DEFAULT 1,
  max_concurrent_workers INTEGER NOT NULL DEFAULT 1,
  capacity_model_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_capacity_providers_team_status
  ON capacity_providers(team_id, status, provider);

CREATE TABLE IF NOT EXISTS capacity_provider_hosts (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  role TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capacity_provider_hosts_unique
  ON capacity_provider_hosts(capacity_provider_id, host_id, role);

CREATE TABLE IF NOT EXISTS capacity_provider_lanes (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  business_model TEXT NOT NULL DEFAULT 'custom',
  model_family TEXT,
  model_class TEXT,
  region_policy TEXT,
  unit TEXT NOT NULL DEFAULT 'treeseed_credit',
  scarcity_level TEXT NOT NULL DEFAULT 'medium',
  hard_limits_json TEXT NOT NULL DEFAULT '{}',
  routing_policy_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_provider_lanes_provider
  ON capacity_provider_lanes(capacity_provider_id, business_model, scarcity_level);

CREATE TABLE IF NOT EXISTS capacity_grants (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  lane_id TEXT,
  grant_scope TEXT NOT NULL DEFAULT 'team',
  team_id TEXT NOT NULL,
  project_id TEXT,
  environment TEXT,
  state TEXT NOT NULL DEFAULT 'active',
  daily_credit_limit REAL,
  weekly_credit_limit REAL,
  monthly_credit_limit REAL,
  daily_usd_limit REAL,
  weekly_quota_minutes REAL,
  monthly_provider_units REAL,
  priority_weight REAL NOT NULL DEFAULT 1,
  overflow_policy TEXT NOT NULL DEFAULT 'soft_grant',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (lane_id) REFERENCES capacity_provider_lanes(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_grants_team_project
  ON capacity_grants(team_id, project_id, state);

CREATE INDEX IF NOT EXISTS idx_capacity_grants_provider_lane
  ON capacity_grants(capacity_provider_id, lane_id, state);

CREATE TABLE IF NOT EXISTS capacity_reservations (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  lane_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  work_day_id TEXT,
  task_id TEXT,
  state TEXT NOT NULL DEFAULT 'reserved',
  reserved_credits REAL NOT NULL,
  consumed_credits REAL NOT NULL DEFAULT 0,
  reserved_provider_units REAL,
  consumed_provider_units REAL,
  reserved_usd REAL,
  consumed_usd REAL,
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (lane_id) REFERENCES capacity_provider_lanes(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_reservations_project_workday_state
  ON capacity_reservations(project_id, work_day_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_capacity_reservations_provider_state
  ON capacity_reservations(capacity_provider_id, lane_id, state);

CREATE TABLE IF NOT EXISTS capacity_ledger_entries (
  id TEXT PRIMARY KEY,
  capacity_provider_id TEXT NOT NULL,
  lane_id TEXT,
  reservation_id TEXT,
  team_id TEXT NOT NULL,
  project_id TEXT,
  work_day_id TEXT,
  task_id TEXT,
  phase TEXT NOT NULL,
  credits REAL NOT NULL,
  provider_units REAL,
  usd REAL,
  source TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (lane_id) REFERENCES capacity_provider_lanes(id) ON DELETE SET NULL,
  FOREIGN KEY (reservation_id) REFERENCES capacity_reservations(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_capacity_ledger_project_workday_created
  ON capacity_ledger_entries(project_id, work_day_id, created_at ASC);

CREATE TABLE IF NOT EXISTS capacity_routing_decisions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  work_day_id TEXT,
  project_id TEXT NOT NULL,
  selected_provider_id TEXT NOT NULL,
  selected_lane_id TEXT NOT NULL,
  selected_model TEXT,
  decision TEXT NOT NULL DEFAULT 'selected',
  reason TEXT NOT NULL,
  candidate_json TEXT NOT NULL DEFAULT '[]',
  score_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_provider_id) REFERENCES capacity_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_lane_id) REFERENCES capacity_provider_lanes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_capacity_routing_decisions_project_workday
  ON capacity_routing_decisions(project_id, work_day_id, created_at DESC);

CREATE TABLE IF NOT EXISTS task_estimates (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  work_day_id TEXT,
  project_id TEXT NOT NULL,
  estimate_phase TEXT NOT NULL,
  task_signature TEXT NOT NULL,
  confidence TEXT NOT NULL,
  estimated_credits_p50 REAL NOT NULL,
  estimated_credits_p90 REAL NOT NULL,
  reserved_credits REAL NOT NULL,
  estimated_input_tokens_p50 INTEGER,
  estimated_input_tokens_p90 INTEGER,
  estimated_output_tokens_p50 INTEGER,
  estimated_output_tokens_p90 INTEGER,
  estimated_quota_minutes_p50 REAL,
  estimated_quota_minutes_p90 REAL,
  features_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_estimates_project_signature
  ON task_estimates(project_id, task_signature, created_at DESC);

CREATE TABLE IF NOT EXISTS task_usage_actuals (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  work_day_id TEXT,
  project_id TEXT NOT NULL,
  task_signature TEXT NOT NULL,
  capacity_provider_id TEXT,
  lane_id TEXT,
  business_model TEXT NOT NULL,
  model_name TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_input_tokens INTEGER,
  quota_minutes REAL,
  wall_minutes REAL,
  files_opened INTEGER,
  files_changed INTEGER,
  diff_lines_added INTEGER,
  diff_lines_removed INTEGER,
  test_runs INTEGER,
  retry_count INTEGER,
  actual_credits REAL NOT NULL,
  actual_usd REAL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (capacity_provider_id) REFERENCES capacity_providers(id) ON DELETE SET NULL,
  FOREIGN KEY (lane_id) REFERENCES capacity_provider_lanes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_usage_actuals_project_signature
  ON task_usage_actuals(project_id, task_signature, created_at DESC);

CREATE TABLE IF NOT EXISTS task_estimate_profiles (
  task_signature TEXT PRIMARY KEY,
  sample_count INTEGER NOT NULL DEFAULT 0,
  input_tokens_p50 INTEGER,
  input_tokens_p90 INTEGER,
  output_tokens_p50 INTEGER,
  output_tokens_p90 INTEGER,
  quota_minutes_p50 REAL,
  quota_minutes_p90 REAL,
  files_changed_p50 REAL,
  files_changed_p90 REAL,
  credits_p50 REAL,
  credits_p90 REAL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  work_day_id TEXT,
  task_id TEXT,
  kind TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  severity TEXT NOT NULL DEFAULT 'medium',
  requested_by_type TEXT NOT NULL DEFAULT 'worker',
  requested_by_id TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  recommendation_json TEXT NOT NULL DEFAULT '{}',
  policy_snapshot_json TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT,
  decided_by_type TEXT,
  decided_by_id TEXT,
  decided_at TEXT,
  decision_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_team_state
  ON approval_requests(team_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_project_workday
  ON approval_requests(project_id, work_day_id, state, created_at DESC);
