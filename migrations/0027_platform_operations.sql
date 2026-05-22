CREATE TABLE IF NOT EXISTS platform_operations (
	id TEXT PRIMARY KEY,
	namespace TEXT NOT NULL,
	operation TEXT NOT NULL,
	status TEXT NOT NULL,
	target TEXT NOT NULL,
	idempotency_key TEXT,
	input_json TEXT NOT NULL DEFAULT '{}',
	output_json TEXT,
	error_json TEXT,
	requested_by_type TEXT NOT NULL,
	requested_by_id TEXT,
	assigned_runner_id TEXT,
	lease_expires_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	started_at TEXT,
	finished_at TEXT,
	cancelled_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_operations_idempotency
	ON platform_operations(namespace, operation, idempotency_key)
	WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_operations_runnable
	ON platform_operations(status, created_at ASC);

CREATE TABLE IF NOT EXISTS platform_operation_events (
	id TEXT PRIMARY KEY,
	operation_id TEXT NOT NULL,
	seq INTEGER NOT NULL,
	kind TEXT NOT NULL,
	data_json TEXT NOT NULL DEFAULT '{}',
	created_at TEXT NOT NULL,
	FOREIGN KEY (operation_id) REFERENCES platform_operations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_operation_events_seq
	ON platform_operation_events(operation_id, seq);

CREATE TABLE IF NOT EXISTS market_operation_runners (
	id TEXT PRIMARY KEY,
	runner_key TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	environment TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'online',
	version TEXT,
	capabilities_json TEXT NOT NULL DEFAULT '[]',
	active_job_count INTEGER NOT NULL DEFAULT 0,
	max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
	heartbeat_at TEXT,
	metadata_json TEXT NOT NULL DEFAULT '{}',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_repository_claims (
	id TEXT PRIMARY KEY,
	repository_key TEXT NOT NULL,
	runner_id TEXT NOT NULL,
	workspace_path TEXT NOT NULL,
	branch TEXT,
	commit_sha TEXT,
	claim_state TEXT NOT NULL DEFAULT 'active',
	lease_expires_at TEXT,
	metadata_json TEXT NOT NULL DEFAULT '{}',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_repository_claims_active
	ON platform_repository_claims(repository_key, runner_id)
	WHERE claim_state = 'active';

CREATE INDEX IF NOT EXISTS idx_platform_repository_claims_runner
	ON platform_repository_claims(runner_id, claim_state);
