# Market Operations Runner Plan

## Purpose

Create a TreeSeed-owned `market-operations-runner` so the Market API can expose complete Market operations without writing local repository files, embedding agent worker runners, or depending on team capacity providers for platform maintenance.

This plan keeps the capacity-provider agent architecture reserved for team-owned project work. Capacity providers continue to belong to teams and process team/project portfolios. The Market control plane gets its own deterministic operations executor for TreeSeed platform work.

## Decision Summary

TreeSeed should introduce a separate **Market operations runner**:

```text
Market API
  validates intent, permissions, approvals, and state
  creates deterministic operation jobs
  stores progress, events, outputs, errors, and audit records
  never writes local repo files
  never runs agent handlers
  never embeds the capacity-provider manager/runner

SDK operations
  owns reusable operation contracts and implementations
  provides git/repository workflow primitives
  provides deploy/provision/reconcile primitives
  provides job claiming, leasing, event, and idempotency helpers
  provides typed clients used by API, CLI, and runners

market-operations-runner
  TreeSeed-owned execution process
  claims platform jobs
  invokes SDK operations
  owns platform credentials
  may maintain a persistent /data checkout cache
  reports progress/results back to Market API or DB

team capacity providers
  team-owned or team-attached execution capacity
  process project/portfolio work
  clone project repositories
  run agent handlers, workdays, and task execution
  are not required for Market control-plane repair or deployment
```

## Non-Goals

Do not reintroduce any of the following into the Market API process:

* agent manager loop
* agent worker runner
* capacity-provider runtime
* Codex/agent handler execution
* workday manager implementation
* local filesystem content writes
* direct Git branch/commit/push from request handlers
* customer/team capacity-provider execution paths

Do not make Market deployment, Market database migration, or Market repository repair depend on a team capacity provider. That creates a circular dependency: the control plane would depend on team execution capacity to fix itself.

## Architecture Roles

### Market API

The Market API owns browser/API-facing control-plane behavior:

* auth and account/session flows
* teams, members, roles, invites, permissions
* projects and portfolio records
* repository/web/host records
* provider registry and capacity-provider key rotation
* platform operation job creation
* deployment intent records
* approval records and decisions
* operation progress/events/results projection
* catalog, templates, knowledge packs
* usage, reports, audits, and operational status

The API should expose complete Market operations by creating operation records and returning job/status handles, not by executing repository or infrastructure mutation inline.

### SDK operations

The SDK becomes the complete shared implementation layer for Market operations. It should include both non-repository and repository-bound operations.

Non-repository SDK operations:

* team/project CRUD clients
* host and repository-host clients
* credential-session clients
* capacity-provider registry clients
* provider key rotation clients
* deployment intent clients
* catalog/template/knowledge-pack clients
* seed planning/apply contracts
* D1/Postgres migration helpers as applicable
* Cloudflare resource reconciliation
* Railway service/deployment reconciliation
* GitHub workflow dispatch and monitoring
* environment/config resolution
* operation event/status clients

Repository-bound SDK operations:

* clone/fetch/checkout helpers
* worktree creation and cleanup
* branch naming and branch policy
* path policy enforcement
* content read/write helpers
* frontmatter serialization/parsing helpers
* relation update helpers for content records
* package/reference rewrite helpers
* staged file detection
* verification command execution
* commit message generation
* commit creation
* push and PR/workflow dispatch
* conflict detection and reporting
* rollback/partial failure semantics
* release/save/stage orchestration

The SDK should be complete enough that `trsd`, GitHub Actions, the Market operations runner, and future platform automation can call the same implementation without duplicating Git or deployment logic.

### Market operations runner

The `market-operations-runner` is a TreeSeed platform service, not a team capacity provider.

It should:

* authenticate as a platform service principal
* claim deterministic platform jobs
* lease jobs safely
* run one job at a time or a bounded pool of jobs
* call SDK operations
* stream progress events
* write outputs/errors
* heartbeat runner health
* use platform credentials from secure environment/secrets
* maintain a persistent `/data` workspace for repository clones when useful
* support one-shot and daemon modes

It should not:

* register as a team capacity provider
* advertise runtime capabilities to teams
* run agent specs or agent handlers
* process team portfolios
* expose team-configurable budgets or lanes
* depend on capacity-provider API keys

## Naming

Use a name that avoids collision with agent worker runners.

Preferred:

```text
market-operations-runner
```

Acceptable alternatives:

```text
platform-job-runner
control-plane-operations-worker
```

Avoid:

```text
worker-runner
agent-runner
capacity-runner
processing-runner
```

## Job Model

### Recommended table strategy

Reuse the existing `remote_jobs` / `remote_job_events` shape where possible, but introduce platform-specific naming or classification so these jobs do not look like team capacity-provider tasks.

Option A: extend `remote_jobs` with platform operation conventions.

```text
namespace = platform | market | deploy | repository | seed | infrastructure
operation = deploy_api | deploy_web | publish_content | migrate_database | save_market_repo | release_market | provision_environment | dispatch_workflow
selected_target = market_operations_runner | github_actions | cli | railway_job
```

Option B: add explicit platform tables.

```sql
CREATE TABLE platform_operations (
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

CREATE UNIQUE INDEX idx_platform_operations_idempotency
  ON platform_operations(namespace, operation, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_platform_operations_runnable
  ON platform_operations(status, created_at ASC);
```

```sql
CREATE TABLE platform_operation_events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES platform_operations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_platform_operation_events_seq
  ON platform_operation_events(operation_id, seq);
```

If keeping `remote_jobs`, add a clear classification layer in SDK types so API code never needs to hand-roll ad hoc JSON conventions.

### Runner registration

Add platform-runner records if operational visibility requires them.

```sql
CREATE TABLE market_operation_runners (
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
```

This is platform-owned identity, not team-owned capacity-provider identity.

### Repository claims

Reuse the repository-claim pattern, but make it platform-specific or generic.

```sql
CREATE TABLE platform_repository_claims (
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

CREATE UNIQUE INDEX idx_platform_repository_claims_active
  ON platform_repository_claims(repository_key, runner_id)
  WHERE claim_state = 'active';
```

## SDK Package Changes

### New SDK modules

Add or consolidate these modules under `packages/sdk/src/operations`:

```text
packages/sdk/src/operations/platform-jobs.ts
packages/sdk/src/operations/platform-runner.ts
packages/sdk/src/operations/operation-dispatch.ts
packages/sdk/src/operations/operation-events.ts
packages/sdk/src/operations/repository-workspaces.ts
packages/sdk/src/operations/repository-claims.ts
packages/sdk/src/operations/market-repository.ts
packages/sdk/src/operations/market-deploy.ts
packages/sdk/src/operations/market-database.ts
packages/sdk/src/operations/platform-runner-client.ts
```

### SDK contracts

Define typed contracts for platform operations.

```ts
type PlatformOperationNamespace =
  | "market"
  | "repository"
  | "deploy"
  | "database"
  | "seed"
  | "infrastructure"
  | "catalog";

type PlatformOperationStatus =
  | "queued"
  | "leased"
  | "running"
  | "waiting_for_approval"
  | "succeeded"
  | "failed"
  | "cancelled";

type PlatformOperationTarget =
  | "market_operations_runner"
  | "github_actions"
  | "cli"
  | "railway_job";
```

Repository operation examples:

```ts
type MarketRepositoryOperation =
  | "read_content_record"
  | "write_content_record"
  | "create_related_content"
  | "create_decision_from_proposals"
  | "save_market_repo"
  | "stage_market_changes"
  | "release_market"
  | "publish_market_content";
```

Infrastructure operation examples:

```ts
type MarketInfrastructureOperation =
  | "provision_environment"
  | "reconcile_cloudflare"
  | "reconcile_railway"
  | "deploy_market_api"
  | "deploy_market_web"
  | "monitor_environment";
```

Database operation examples:

```ts
type MarketDatabaseOperation =
  | "plan_migration"
  | "apply_migration"
  | "backup_database"
  | "restore_database"
  | "verify_schema";
```

### SDK runner core

Extract generic runner mechanics from the old worker-runner architecture:

* claim next job
* renew lease
* append ordered events
* mark running/succeeded/failed/cancelled
* idempotency handling
* retry handling
* cancellation checks
* heartbeat
* queue depth reporting
* bounded concurrency
* graceful shutdown

Suggested API:

```ts
export interface PlatformOperationExecutorContext {
  operationId: string;
  workspaceRoot: string;
  environment: "local" | "staging" | "prod";
  emit(event: PlatformOperationEventInput): Promise<void>;
  checkpoint(output: unknown): Promise<void>;
  throwIfCancelled(): Promise<void>;
}

export interface PlatformOperationExecutor<TInput = unknown, TOutput = unknown> {
  namespace: PlatformOperationNamespace;
  operation: string;
  run(input: TInput, context: PlatformOperationExecutorContext): Promise<TOutput>;
}
```

### SDK operation registry

Create an operation registry for platform jobs.

```ts
export function createMarketPlatformOperationRegistry() {
  return createOperationRegistry([
    createDeployMarketApiOperation(),
    createDeployMarketWebOperation(),
    createPublishMarketContentOperation(),
    createProvisionEnvironmentOperation(),
    createApplyDatabaseMigrationOperation(),
    createSaveMarketRepositoryOperation(),
    createStageMarketChangesOperation(),
    createReleaseMarketOperation(),
    createCreateRelatedContentOperation(),
    createCreateDecisionFromProposalsOperation(),
  ]);
}
```

### SDK repository workflow requirements

The SDK must be able to perform repository-bound operations without relying on the Market API filesystem.

Minimum requirements:

* accept an explicit repository descriptor
* clone or update the repository into a runner workspace
* create a bounded branch/worktree
* enforce path policy before writing
* write content records safely
* update related records atomically where possible
* run verification commands when configured
* produce a diff summary
* commit changes
* push branch
* optionally dispatch GitHub workflow or create PR
* report exact changed paths and commit SHA
* clean up or retain workspace according to policy

Suggested repository descriptor:

```ts
export interface PlatformRepositoryDescriptor {
  provider: "github";
  owner: string;
  name: string;
  defaultBranch: string;
  cloneUrl: string;
  writeMode: "branch" | "direct" | "pull_request";
  pathPolicies: PlatformRepositoryPathPolicy[];
}
```

## Market API Changes

### Remove direct local file writing

Remove API request-handler calls that write to:

```text
process.cwd()/src/content/**
```

Replace direct filesystem helpers with job-creation endpoints.

Current local-content write routes should become intent endpoints:

```http
POST /v1/projects/:projectId/local-content/decisions/from-proposals
POST /v1/projects/:projectId/local-content/:collection
POST /v1/projects/:projectId/local-content/:collection/related
```

Replace implementation behavior:

```text
Before:
  validate request
  write MD/MDX file under process.cwd()
  update related local files
  return created record

After:
  validate request
  create platform operation job
  return { ok, job }
  runner executes SDK repository operation
  API exposes job events and result
```

These routes may keep their URL shape temporarily for UI compatibility, but internally they should enqueue platform operations.

### Add platform operation endpoints

Add explicit platform operation endpoints:

```http
GET  /v1/platform/operations
POST /v1/platform/operations
GET  /v1/platform/operations/:operationId
GET  /v1/platform/operations/:operationId/events
POST /v1/platform/operations/:operationId/cancel
POST /v1/platform/operations/:operationId/retry
```

Admin/system scoped endpoints for runner use:

```http
POST /v1/platform/runners/register
POST /v1/platform/runners/heartbeat
POST /v1/platform/runners/jobs/claim
POST /v1/platform/runners/jobs/:operationId/events
POST /v1/platform/runners/jobs/:operationId/checkpoint
POST /v1/platform/runners/jobs/:operationId/complete
POST /v1/platform/runners/jobs/:operationId/fail
```

These should use platform service credentials, not team capacity-provider API keys.

### Add operation creation helpers

Market API should create jobs through SDK contracts, not hand-built JSON.

Example:

```ts
await platformOperations.create({
  namespace: "repository",
  operation: "create_related_content",
  target: "market_operations_runner",
  idempotencyKey,
  input: {
    projectId,
    collection,
    parent: { collection: parentCollection, slug: parentSlug },
    child: payload,
    repository: marketRepositoryDescriptor,
  },
  requestedBy: principal,
});
```

### Permission model

Market API validates human/team permissions before creating jobs.

Runner validates platform service auth before claiming jobs.

Recommended scopes:

```text
platform:operations:create
platform:operations:read
platform:operations:cancel
platform:operations:retry
platform:runners:register
platform:runners:claim
platform:runners:update
platform:repository:write
platform:deploy:write
platform:database:migrate
```

Do not reuse capacity-provider scopes such as:

```text
provider:register
provider:heartbeat
provider:tasks:claim
provider:tasks:update
```

### UI behavior

For repo-writing actions, UI should move from immediate mutation to job-aware state:

```text
submit action
  -> API returns operation id
  -> UI shows queued/running state
  -> UI streams or polls events
  -> UI shows result: created record, branch, commit, PR/workflow link, changed paths
```

For local development, keep the same job path. Do not preserve a special API direct-write mode unless absolutely necessary for tests. If a local fast path is required, implement it in the local market operations runner, not in the API request handler.

## Market Operations Runner Package

### Location

Recommended location:

```text
packages/sdk/src/operations/runner-core.ts
src/api/platform-operation-routes.ts
src/market-operations-runner/
  entrypoint.js
  config.js
  registry.js
  runner.js
  health.js
```

If TypeScript source is preferred:

```text
src/market-operations-runner/
  entrypoint.ts
  config.ts
  registry.ts
  runner.ts
  health.ts
```

The runner is part of the top-level Market project deployment, but not part of the Market API process.

### Runtime modes

```bash
node ./dist/market-operations-runner/entrypoint.js run
node ./dist/market-operations-runner/entrypoint.js once --operation-id op_...
node ./dist/market-operations-runner/entrypoint.js healthcheck
node ./dist/market-operations-runner/entrypoint.js version
```

### Required environment

```bash
TREESEED_MARKET_API_BASE_URL=https://api.treeseed.ai
TREESEED_MARKET_ID=prod
TREESEED_PLATFORM_RUNNER_ID=market-ops-prod-1
TREESEED_PLATFORM_RUNNER_SECRET=...
TREESEED_PLATFORM_RUNNER_DATA_DIR=/data
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=production
```

Repository/deploy credentials should be supplied as deployed secrets:

```bash
GH_TOKEN=...
RAILWAY_API_TOKEN=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

Database credentials depend on the selected database backend:

```bash
TREESEED_DATABASE_URL=postgres://...
# or current D1 configuration during transition
TREESEED_API_D1_DATABASE_ID=...
```

### Runner loop

```text
boot
  load config
  register or heartbeat
  load operation registry
  ensure workspace root exists

loop
  claim next runnable operation
  renew lease while running
  execute SDK operation
  emit events/checkpoints
  mark succeeded or failed
  respect cancellation
  sleep/backoff when no work

shutdown
  stop claiming work
  finish or release active job according to policy
  final heartbeat
```

### Deployment topology

Add a separate Railway service:

```yaml
services:
  api:
    enabled: true
    provider: railway
    railway:
      serviceName: treeseed-market-api
      buildCommand: npm run build:api
      startCommand: node ./dist/market-api/server.js
      healthcheckPath: /healthz

  marketOperationsRunner:
    enabled: true
    provider: railway
    railway:
      serviceName: treeseed-market-operations-runner
      buildCommand: npm run build:market-operations-runner
      startCommand: node ./dist/market-operations-runner/entrypoint.js run
      healthcheckPath: /healthz
      volumeMountPath: /data
```

This is not a processing/agent service. It is a platform operations service.

## Deployment and Operations

### Staging

Staging should have its own runner identity and workspace.

```text
TREESEED_MARKET_ID=staging
TREESEED_PLATFORM_RUNNER_ID=market-ops-staging-1
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=staging
```

Staging operations may write to the `staging` branch or staging-specific release branches.

### Production

Production should use stricter approval and release policy.

```text
TREESEED_MARKET_ID=prod
TREESEED_PLATFORM_RUNNER_ID=market-ops-prod-1
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=production
```

Production operations that mutate the Market repo or database should support approval gates.

Examples requiring approval:

* production database migration
* production release
* production infrastructure reconciliation that destroys/replaces resources
* direct push to protected branch

### GitHub Actions integration

Some platform operations may be better delegated to GitHub Actions.

The Market operations runner can either:

* execute the full operation itself, or
* dispatch a GitHub workflow and monitor it, recording progress in Market.

This should be a per-operation target choice.

```text
selected_target = market_operations_runner
selected_target = github_actions
selected_target = railway_job
selected_target = cli
```

## Database Direction

The current Market control plane has grown beyond a small edge-local database. It includes users, sessions, teams, projects, hosts, deployments, credentials, capacity providers, tasks, events, approvals, catalog, artifacts, reports, and operation state.

Recommended direction:

### Short term

Keep the current D1 path while the runner/API boundary is cleaned up.

Do not combine the database migration with the first runner extraction unless necessary.

### Medium term

Add database abstraction support for PostgreSQL:

```text
DatabaseProvider = d1 | postgres
```

Introduce `TREESEED_DATABASE_URL` for Railway PostgreSQL.

Keep D1 support where Cloudflare-local hub/runtime use cases benefit from it.

### Long term

Move the Market control-plane database to Railway PostgreSQL if the Market API remains Railway-hosted and the schema continues to grow.

Reasons:

* stronger relational behavior
* better concurrency
* richer migrations
* easier reporting and introspection
* fewer limits for operational jobs
* simpler fit with Railway-hosted API and runner services

The operations runner should be database-backend agnostic through SDK/store interfaces.

## Migration Sequence

### Phase 1 — Lock boundary and remove direct API writes

* Add a boundary test that fails on API filesystem writes under `src/content`.
* Replace direct local-content write handlers with operation creation.
* Preserve current UI behavior through job polling where possible.
* Keep direct filesystem write helpers only inside SDK repository operations or tests.

Acceptance:

* Market API request handlers do not call `fs.writeFile` for repository content.
* Market API request handlers do not write under `process.cwd()/src/content`.
* UI can submit content mutations and receive an operation id.

### Phase 2 — Add SDK platform operation contracts

* Add typed platform operation contracts.
* Add operation status/event schemas.
* Add platform runner client.
* Add job creation/claim/update helpers.
* Add idempotency helpers.

Acceptance:

* API can create platform jobs through SDK contracts.
* Runner can claim and update jobs through SDK contracts.
* Tests cover serialization and state transitions.

### Phase 3 — Extract reusable runner core

* Extract claim/lease/event/heartbeat logic from worker-runner patterns.
* Rename generically so it does not imply agent capacity.
* Add cancellation and retry semantics.
* Add bounded concurrency.

Acceptance:

* Unit tests cover claim, lease renewal, completion, failure, retry, cancellation, and idempotency.

### Phase 4 — Implement market-operations-runner

* Add runner entrypoint.
* Add config schema.
* Add healthcheck/version commands.
* Add operation registry.
* Add local `once` mode for tests.
* Add daemon `run` mode for Railway.

Acceptance:

```bash
node ./dist/market-operations-runner/entrypoint.js version
node ./dist/market-operations-runner/entrypoint.js healthcheck
node ./dist/market-operations-runner/entrypoint.js once --operation-id op_test
node ./dist/market-operations-runner/entrypoint.js run
```

### Phase 5 — Move repository operations to SDK execution

* Port local-content create/update/relation logic into SDK repository operations.
* Add branch/worktree support.
* Add path policies.
* Add commit/push/PR or workflow dispatch support.
* Return changed paths, branch, commit SHA, PR/workflow links.

Acceptance:

* Existing content creation flows work through platform operations.
* No local API filesystem writes remain.
* Runner can mutate a checkout and report a commit/branch.

### Phase 6 — Add Railway deployment service

* Add `marketOperationsRunner` service to topology.
* Add build script.
* Add Railway env sync for runner secrets.
* Add volume for `/data`.
* Add staging/prod service identities.

Acceptance:

* Staging runner claims and completes a no-op operation.
* Staging runner executes a safe repository read operation.
* Staging runner executes a test repository write operation on a non-production branch.

### Phase 7 — Optional PostgreSQL migration plan

* Add database provider abstraction.
* Add Postgres schema/migrations.
* Add migration/export/import tooling.
* Add dual-read or maintenance-window migration plan.
* Add rollback plan.

Acceptance:

* Market API and operations runner can run against Postgres in staging.
* D1 remains available until production migration is approved.

## Boundary Tests

Add or update tests:

```text
test/lib/web-runtime-boundaries.test.ts
test/api/market-api-platform-operations.test.ts
test/lib/platform-operation-runner.test.ts
packages/sdk/test/utils/platform-operations.test.ts
packages/sdk/test/utils/repository-save-orchestrator.test.ts
```

Assertions:

* Market API does not import `@treeseed/agent` runtime modules.
* Market API does not start manager/worker/runner loops.
* Market API does not call content filesystem write helpers in request handlers.
* Market API creates platform operation jobs for repo mutations.
* Platform runner can claim, lease, execute, complete, fail, and retry jobs.
* Platform runner uses platform service auth, not provider API keys.
* Capacity-provider API keys cannot claim platform operations.
* Platform runner does not register as a team capacity provider.
* SDK repository operations enforce path policy.
* SDK repository operations report changed paths and commit metadata.

## Acceptance Criteria

This change is done when:

1. Market API exposes complete Market operations through DB/job-backed contracts.
2. Market API no longer writes local repository files.
3. Market API does not embed the old worker runner or capacity-provider runtime.
4. A TreeSeed-owned `market-operations-runner` exists outside the API process.
5. The runner claims deterministic platform jobs and invokes SDK operations.
6. SDK operations include complete non-repo Market operations.
7. SDK operations include complete repo-bound Market operations.
8. Team capacity providers remain internal to teams and are not used for Market self-maintenance.
9. Platform jobs have events, retries, cancellation, and idempotency.
10. Staging can execute a safe repo operation through the runner.
11. Production repo/database operations can require approval.
12. Database migration to PostgreSQL has a separate plan and does not block runner extraction.

## Implementation Notes

The conceptual reuse from the old worker-runner architecture should be high, but naming and trust boundaries matter.

Reuse:

* job/event ledger pattern
* claim/lease/heartbeat pattern
* queue depth and scaling pattern
* repository claim/workspace pattern
* progress reporting pattern
* SDK workflow operation implementations

Do not reuse directly:

* agent handler execution
* workday manager loop
* capacity-provider registration
* provider API key scopes
* task credit/capacity reservation model for platform jobs
* team/provider budget and lane UI concepts

The clean result is a Market that can operate itself through deterministic platform jobs while keeping the knowledge-coop execution model intact: teams get capacity providers for their project work; TreeSeed gets a platform runner for Market operations.
