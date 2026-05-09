CREATE TABLE IF NOT EXISTS repository_hosts (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  provider TEXT NOT NULL,
  ownership TEXT NOT NULL,
  name TEXT NOT NULL,
  account_label TEXT,
  organization_or_owner TEXT NOT NULL,
  default_visibility TEXT NOT NULL DEFAULT 'private',
  software_repository_name_template TEXT NOT NULL DEFAULT '{hub}-site',
  content_repository_name_template TEXT NOT NULL DEFAULT '{hub}-content',
  branch_policy_json TEXT NOT NULL DEFAULT '{}',
  workflow_policy_json TEXT NOT NULL DEFAULT '{}',
  encrypted_payload_json TEXT,
  allowed_project_kinds_json TEXT NOT NULL DEFAULT '["knowledge_hub"]',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_id TEXT,
  updated_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_repository_hosts_team_provider
  ON repository_hosts(team_id, provider, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_hosts_team_provider_name
  ON repository_hosts(team_id, provider, name)
  WHERE team_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_hosts_platform_provider_name
  ON repository_hosts(provider, name)
  WHERE team_id IS NULL;

CREATE TABLE IF NOT EXISTS hub_repositories (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  role TEXT NOT NULL,
  repository_host_id TEXT,
  provider TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  default_branch TEXT,
  current_branch TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  access_policy_json TEXT NOT NULL DEFAULT '{}',
  release_policy_json TEXT NOT NULL DEFAULT '{}',
  publish_policy_json TEXT NOT NULL DEFAULT '{}',
  submodule_path TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hub_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (repository_host_id) REFERENCES repository_hosts(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_repositories_hub_role
  ON hub_repositories(hub_id, role);

CREATE TABLE IF NOT EXISTS hub_content_sources (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL,
  content_repository_id TEXT,
  production_source TEXT NOT NULL,
  overlay_policy TEXT NOT NULL,
  r2_bucket_name TEXT,
  r2_manifest_key TEXT,
  r2_public_base_url TEXT,
  latest_publish_id TEXT,
  latest_content_version TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hub_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (content_repository_id) REFERENCES hub_repositories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hub_launches (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  job_id TEXT,
  intent_json TEXT NOT NULL,
  plan_json TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL,
  current_phase TEXT,
  last_successful_phase TEXT,
  result_json TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (hub_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES remote_jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hub_launches_hub_created
  ON hub_launches(hub_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hub_launch_events (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  started_at TEXT,
  finished_at TEXT,
  error_json TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (launch_id) REFERENCES hub_launches(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_launch_events_launch_seq
  ON hub_launch_events(launch_id, seq);

CREATE TABLE IF NOT EXISTS hub_workspace_links (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  parent_repository_host_id TEXT,
  parent_owner TEXT,
  parent_name TEXT,
  parent_url TEXT,
  parent_branch TEXT,
  hub_mount_path TEXT,
  software_submodule_path TEXT,
  content_submodule_path TEXT,
  update_submodule_pointers_enabled INTEGER NOT NULL DEFAULT 0,
  access_policy_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hub_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_repository_host_id) REFERENCES repository_hosts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hub_workspace_links_hub
  ON hub_workspace_links(hub_id);

CREATE TABLE IF NOT EXISTS project_update_plans (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_ref TEXT,
  source_version TEXT,
  plan_json TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'planned',
  requires_decision INTEGER NOT NULL DEFAULT 0,
  decision_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hub_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_update_plans_hub
  ON project_update_plans(hub_id, created_at DESC);

CREATE TABLE IF NOT EXISTS provider_credential_sessions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project_id TEXT,
  job_id TEXT,
  host_kind TEXT NOT NULL,
  host_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  encrypted_payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES remote_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_credential_sessions_team_host
  ON provider_credential_sessions(team_id, host_kind, host_id, status);

CREATE INDEX IF NOT EXISTS idx_provider_credential_sessions_job
  ON provider_credential_sessions(job_id, status);
