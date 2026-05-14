ALTER TABLE task_estimates
  ADD COLUMN execution_profile_id TEXT NOT NULL DEFAULT 'standard-code-model';

ALTER TABLE task_usage_actuals
  ADD COLUMN execution_profile_id TEXT NOT NULL DEFAULT 'standard-code-model';

CREATE INDEX IF NOT EXISTS idx_task_estimates_project_signature_profile
  ON task_estimates(project_id, task_signature, execution_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_usage_actuals_project_signature_profile
  ON task_usage_actuals(project_id, task_signature, execution_profile_id, created_at DESC);

ALTER TABLE task_estimate_profiles RENAME TO task_estimate_profiles_legacy;

CREATE TABLE IF NOT EXISTS task_estimate_profiles (
  task_signature TEXT NOT NULL,
  execution_profile_id TEXT NOT NULL DEFAULT 'standard-code-model',
  sample_count INTEGER NOT NULL DEFAULT 0,
  completed_sample_count INTEGER NOT NULL DEFAULT 0,
  interrupted_sample_count INTEGER NOT NULL DEFAULT 0,
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
  credits_variance REAL,
  confidence_score REAL,
  outlier_count INTEGER NOT NULL DEFAULT 0,
  partial_credits REAL,
  first_sample_at TEXT,
  last_sample_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (task_signature, execution_profile_id)
);

INSERT OR REPLACE INTO task_estimate_profiles (
  task_signature,
  execution_profile_id,
  sample_count,
  completed_sample_count,
  interrupted_sample_count,
  input_tokens_p50,
  input_tokens_p90,
  output_tokens_p50,
  output_tokens_p90,
  quota_minutes_p50,
  quota_minutes_p90,
  files_changed_p50,
  files_changed_p90,
  credits_p50,
  credits_p90,
  credits_variance,
  confidence_score,
  outlier_count,
  partial_credits,
  first_sample_at,
  last_sample_at,
  updated_at
)
SELECT
  task_signature,
  'standard-code-model',
  sample_count,
  sample_count,
  0,
  input_tokens_p50,
  input_tokens_p90,
  output_tokens_p50,
  output_tokens_p90,
  quota_minutes_p50,
  quota_minutes_p90,
  files_changed_p50,
  files_changed_p90,
  credits_p50,
  credits_p90,
  NULL,
  CASE WHEN sample_count >= 20 THEN 1.0 WHEN sample_count > 0 THEN sample_count / 20.0 ELSE 0 END,
  0,
  NULL,
  updated_at,
  updated_at,
  updated_at
FROM task_estimate_profiles_legacy;

DROP TABLE task_estimate_profiles_legacy;
